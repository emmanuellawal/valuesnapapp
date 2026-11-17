# Story 6.12: Offline Migration Retry Queue

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a guest user who signs in on a spotty or offline connection,
I want my guest-to-account migration to retry automatically once I'm back online,
so that I don't lose my valuation history or have to notice and manually retry a silent failure.

## Business Context

Story 4.11 (`migrate-guest-data.md`, done) shipped the "Import to account" banner and `POST /api/migrate-guest`, but only ever attempts the call once per manual tap. If it fails — offline, a transient 5xx, or a sleeping Render free-tier instance — the user sees a one-line error and must notice it, remember to come back, and tap "Import to account" again themselves. The Epic 4 retrospective called this out directly:

> "If a user attempts to import their guest data to their account while offline, the migration silently fails. Their local history remains, but no queued retry is attempted when connectivity is restored." — [Source: docs/sprint-artifacts/epic-4-retrospective.md#L203-211]

The retrospective's own suggested fix — "Add a `pending_migration` flag in AsyncStorage that triggers on next app resume" — is exactly this story's scope, and it was already estimated there at ~2 hours for the flag alone. This story's estimate (5-8 hours) also covers the health-gate, single-flight/race hardening, and the test matrix.

This gap was also present in the **original** FR spec for guest migration (Story 4.11's own acceptance criteria), which already described the desired behavior but which 4.11 did not implement:

> "**Given** network is unavailable during migration **When** user signs in **Then** migration is queued for next online session **And** user can use app normally with local data" — [Source: docs/epics.md#L1298-1301]

**This story closes that specific, named gap. It does not touch `/api/migrate-guest` on the backend** — see "Backend idempotency: verified, not changed" below, which is the single most important scoping decision in this story.

### Backend idempotency: verified, not changed

The Epic 6 plan says retried migration calls should "follow the same idempotency pattern as Story 6-13" — [Source: docs/sprint-artifacts/epic-6-plan.md#L490]. Story 6-13 added a header-based `Idempotency-Key` contract to `/api/appraise` because that endpoint **inserts** a new row on every call, so a blind retry risks a duplicate valuation.

`/api/migrate-guest` does not have that problem, and verification — not assumption — is required before concluding that:

```python
# backend/main.py:488-511
result = (
    user_supabase.table("valuations")
    .update({"user_id": user_id})
    .eq("guest_session_id", body.guest_session_id)
    .is_("user_id", "null")
    .execute()
)
migrated = len(result.data or [])
```

This is an **UPDATE guarded by `user_id IS NULL`**, not an INSERT. The first successful call flips every matching row's `user_id` from `null` to the real user id. Every subsequent call with the same `guest_session_id` matches zero rows (they are no longer `NULL`) and returns `{"migrated": 0}`. Two existing backend tests cover this between them: `test_migrate_is_null_filter_applied` (`backend/tests/test_migrate_guest.py:170`) asserts the `IS NULL` guard is part of the query, and `test_migrate_zero_rows` (`backend/tests/test_migrate_guest.py:150`) asserts a zero-match update returns `{"migrated": 0}` with HTTP 200 rather than an error. Neither test literally runs two sequential calls (the Supabase client is mocked), so the guarantee rests on the guard plus Postgres UPDATE semantics, not on a stateful integration test. The behavior is also documented as a deliberate Epic 3→4 design decision in the retrospective: *"The `IS NULL` guard made duplicate migration calls safe."* — [Source: docs/sprint-artifacts/epic-4-retrospective.md#L78].

**Decision: do not add an `Idempotency-Key` header or any backend change to `/api/migrate-guest` in this story.** The endpoint is already safe against repeated calls for the same `guest_session_id` by construction. Adding a header-based contract here would be scope creep that duplicates protection the database guard already provides, and the Epic 6 plan's own "Files to touch" list for this story names only frontend files (guest/auth migration utilities, local persistence, network health helper, tests) — [Source: docs/sprint-artifacts/epic-6-plan.md#L501-506] — confirming the backend was never meant to change here.

AC6 below defines what the mobile layer must prove (that every retry reuses the same `guestSessionId`, so the server guard actually applies) and what it relies on the existing backend tests for.

## Acceptance Criteria

### AC1: A Failed Migration Writes a Durable Local Record

**Given** a migration attempt (manual "Import to account" tap or automatic retry) fails with a **retryable** failure, which is any of:
  - the `/health` probe from AC2 fails (backend unreachable, cold-starting, or unhealthy)
  - `migrateGuestData()` throws a network error (`TypeError` from `fetch`)
  - `migrateGuestData()` throws `Migration failed with status N` where `N` is `401`, `408`, `429`, or `>= 500`

**When** the failure is caught
**Then** a pending-migration record is written to `AsyncStorage` containing at minimum `userId`, `guestSessionId`, `queuedAt` (ISO timestamp), `attempts` (starts at `1` on first failure, increments on each subsequent failed attempt), and `lastAttemptAt`
**And** a probe failure is a failed attempt like any other: it writes or updates the record, bumps `attempts` and `lastAttemptAt`, and surfaces the AC5 pending message. A manual tap must **never** end in a silent no-op.
**And** a **non-retryable** failure (any other status, e.g. `422` for an empty session id, or `API URL is not configured`) does **not** write a record. It shows the existing one-shot `migrationError` text only, so a permanently-invalid request is never retried forever.
**And** the record contains no access token, session token, or any other secret. `userId` is the Supabase user UUID (an identifier, not a credential), and `guestSessionId` is a locally-generated UUID (`apps/mobile/lib/localHistory.ts:33-46`).
**And** the record survives a full app restart (it is read from `AsyncStorage`, not component state)

[Source: docs/sprint-artifacts/epic-6-plan.md#L494 — "Failed guest migration writes a local retry record without exposing secrets"]

### AC2: Every Retry Attempt Is Gated by a Real Backend Health Probe

**Given** a pending-migration record exists
**When** the app evaluates whether this is a reasonable moment to retry
**Then** it issues `GET {env.apiUrl}/health` with a bounded timeout (5000ms) before calling `migrateGuestData()` — reusing the exact contract the backend already serves: `{"status": "healthy"}` with HTTP 200 (`backend/main.py:361-364`)
**And** the retry proceeds only when that probe resolves with HTTP 200 and `body.status === 'healthy'`
**And** if the probe fails (network error, non-200, timeout, or any other shape), `migrateGuestData()` is **not** called, and the attempt is recorded as a retryable failure per AC1 (record written or updated, `lastAttemptAt` bumped so the AC3 cooldown applies, pending message shown)

**Why a health probe and not just `useOnlineStatus()`:** `useOnlineStatus()` reflects OS/browser network reachability, not whether `https://valuesnapapp.onrender.com` is actually awake and responding — the Render free tier sleeps after 15 minutes idle and can take 30-60s to cold-start (documented repeatedly: `docs/sprint-artifacts/epic-6-plan.md#L72`, `docs/deployment/README.md#L32-37`). A device can be "online" while the backend is still cold-starting; calling `migrateGuestData()` directly against a sleeping instance risks a long hang with no backoff (unlike `appraise()`, `migrateGuestData()` has no retry/timeout wrapper today — `apps/mobile/lib/migration.ts:210-232`). The cheap `/health` probe fails fast and defers the real call to the next retry event instead.

[Source: docs/sprint-artifacts/epic-6-plan.md#L495 — "Retry queue validates network health against https://valuesnapapp.onrender.com/health"]

### AC3: Retry Fires Automatically, Exactly Once, With No Double-Submit Race

**Given** a pending-migration record exists, the user is authenticated (not a guest, not `env.useMock`), **and `user.id === record.userId`**
**When** any of these triggers fires:
  - the History screen gains navigation focus (`useFocusEffect`), which fires on tab return and on first mount, **not** on app foregrounding
  - `AppState` changes to `'active'` while the History screen is mounted. Tab screens stay mounted after their first visit, so this covers background→foreground resume on native and web without the user switching tabs.
  - `isOnline` transitions `false → true` (web only; `useOnlineStatus()` always returns `true` on native and never transitions, see `docs/sprint-artifacts/6-7-implement-retry-mechanism.md#L110-119`)
  - the user pulls to refresh (`handleRefresh` in `history.tsx`). That handler already re-fetches history. It must also call `tryQueuedRetryRef.current()` after that fetch. There is no timer and no poller while the screen sits open.

**Then** at most one retry attempt is in flight at any time, enforced by a single shared "in-flight" ref flag — not per-trigger booleans
**And** if the user taps "Import to account" manually while an automatic retry is already in flight, the tap is a no-op (same shared flag), and vice versa
**And** this single-flight guard exists because **Story 6.7's own code review already hit this exact race** on a different false→true-triggered retry: *"a short post-paint window where the user can still press the existing Retry CTA... produces two submissions for the same recovered connection event"* (`docs/sprint-artifacts/6-7-implement-retry-mechanism.md#L260-277`). Do not reintroduce that bug here.
**And** automatic retries are burst-limited to one attempt per 60 seconds per record (`MIGRATION_RETRY_COOLDOWN_MS`, compared against `lastAttemptAt`). That 60 seconds is a duplicate-tap guard. It does **not** enforce `MIGRATE_GUEST_RATE_LIMIT` of 10 requests per 3600-second sliding window (`backend/main.py:23`, `backend/rate_limit.py`). Rejected 429s are not appended to that bucket. The first 10 POSTs that reach the route, including 500s, are.
**And** a failure whose message ends in `status 429` stays retryable, and the next **automatic** attempt waits 15 minutes (`MIGRATION_RATE_LIMIT_BACKOFF_MS`). `migrateGuestData` drops the `Retry-After` header, and this story does not edit `migration.ts`, so the client uses that fixed delay instead of the header. Health-probe failures and other retryable statuses keep the 60-second guard.
**And** manual taps are exempt from both delays unless the single-flight guard is held
**And** `env.useMock` returns before a probe or a POST on both the manual path and every automatic path. A guest already returns because `user` is null. Mock mode still has a `user.id`, so the mock check has to be its own condition.
**And** when a record exists but `record.userId` does not match the signed-in user (e.g. user A's import failed, A signed out, and user B signed in on the same device), **no automatic retry runs**. The banner falls back to today's manual "Import to account" prompt, so moving guest data into B's account still requires an explicit tap by B. A manual tap by B overwrites the record's `userId` on failure, or clears it on success.

**Known limitation (accepted):** a native cold launch lands on the Camera tab, and History is not mounted until the user opens it, so no trigger can fire before then. The retry runs the first time History is opened, refreshed, or the app is resumed afterwards. Sitting on History after a failure does not retry by itself. A root-level queue runner (e.g. in `app/(tabs)/_layout.tsx` or `AuthProvider`) would remove the cold-launch gap, but it would split the banner state across two components. Out of scope here.

[Source: docs/sprint-artifacts/epic-6-plan.md#L496 — "Queue retries only when app/network state indicates it is reasonable to retry"]

### AC4: A Successful Flush Clears the Record Exactly Once

**Given** a queued retry (automatic or manual) succeeds
**When** `migrateGuestData()` resolves without throwing
**Then** the pending-migration record is deleted from `AsyncStorage`
**And** local history is cleared and server items are refreshed — same side effects as today's `handleImport` success path (`apps/mobile/app/(tabs)/history.tsx:136-150`), including the `setHistory(localSnapshot)` fallback when the post-import refresh throws
**And** the migration banner stops showing any "pending" messaging after this point
**And** a `fetchHistory()` that is already in flight cannot paint over that result. Mount already starts two of them: the focus effect (`history.tsx:97-105`) and the `activeSession` effect (`history.tsx:108-114`). `attemptMigration` increments `historyFetchEpoch` immediately after `migrateGuestData()` resolves (not before the first `await`, which would discard mount-time fetches when an attempt fails) and again immediately before the success or fallback `setServerItems` / `setHistory`. `fetchHistory` captures the epoch at entry and returns without calling `setServerItems`, `setHistory`, or `setMigrationBanner` when the epoch has changed. The focus callback stays synchronous. `useFocusEffect` treats a returned Promise as a mistake (`expo-router` `useFocusEffect.js`).

### AC5: Pending-Retry Messaging Is Distinct From the One-Shot Error and From Completion

**Given** the migration banner is visible (authenticated, non-mock, local history present, not dismissed)
**When** a pending-migration record exists
**Then** the banner renders `testID="migration-pending"` with `accessibilityLiveRegion="polite"` (same as `migration-error` at `history.tsx:215-220`), `Text variant="body-sm"`, and `className="text-ink"`. Pending is a status, so it does not use `text-signal`. The copy is exactly: `Your import is saved. We'll retry it when you refresh, come back to this screen, or reopen the app.` It must not say the retry is waiting on connectivity. The string must not match the existing `migration-error` text or the default banner heading.
**And** once migration succeeds (AC4), neither the pending nor the error messaging is shown — the banner itself disappears, consistent with today's success path

[Source: docs/sprint-artifacts/epic-6-plan.md#L497 — "User-facing messaging distinguishes pending migration from completed migration"]

### AC6: Repeated Retries Cannot Create Duplicate Migration Side Effects — Proven, Not Assumed

**Given** the "Backend idempotency: verified, not changed" finding above
**When** `migrateGuestData()` is called more than once for the same `guestSessionId` (e.g. the server-side UPDATE succeeded but the client-visible response was dropped, so the client retries)
**Then** server-side duplicate safety is covered by the **existing, unmodified** backend tests `test_migrate_is_null_filter_applied` and `test_migrate_zero_rows` (see Business Context). The mobile layer cannot and does not try to prove server behavior with a mocked `migrateGuestData`.
**And** a mobile test proves the precondition the server guard depends on: across a failed manual attempt followed by an automatic retry, `migrateGuestData` receives the **same** `guestSessionId` both times, read from the stored record and never re-generated
**And** a second test proves the **new** client-side protection is a distinct concern: a simulated concurrent manual-tap-plus-auto-retry collision (AC3) results in exactly one `migrateGuestData()` call, not two
**And** no new backend code, migration, or test file is added — if the implementer finds themselves editing anything under `backend/`, scope has drifted; stop and re-read AC6

[Source: docs/sprint-artifacts/epic-6-plan.md#L498 — "Duplicate migration records are not created by repeated retry attempts"]

### AC7: Automated Coverage Matches the Epic Plan's Named Scenarios

**Given** the implementation is complete
**When** tests run
**Then** there is at least one test per named scenario from the epic plan — [Source: docs/sprint-artifacts/epic-6-plan.md#L499 — "Tests cover offline failure, queued retry, successful flush, and duplicate prevention"]:
  1. **Offline/transient failure** → pending record is written (AC1)
  2. **Queued retry on reconnect/focus** → health probe passes → `migrateGuestData` is called with the stored `guestSessionId` → pending record cleared on success (AC2, AC3, AC4)
  3. **Successful flush** → banner shows no pending/error state after success (AC4, AC5)
  4. **Duplicate prevention** → the same-`guestSessionId` reuse test and the client single-flight test from AC6
  5. **Health probe failure on a manual tap** → record written, pending message shown, `migrateGuestData` not called (AC1, AC2)
  6. **Account mismatch** → record with a different `userId` triggers no automatic `migrateGuestData` call (AC3)

### AC8: Verification Gates Pass

**Given** the changes are complete
**When** the project's gates run from `apps/mobile/`
**Then** `npm run typecheck` reports zero errors, `npm run lint` reports zero warnings, and `npm test` passes with no regressions — before/after suite and test counts recorded in Completion Notes
**And** `npm run test:e2e:migration` passes. The new `/health` probe is a real browser request that `tests/migration-flow.spec.ts` does not currently intercept. That config points `EXPO_PUBLIC_API_URL` at `http://localhost:8000` with no server running, so without a stub the probe fails and the import never runs.
**And** the existing 8 tests in `apps/mobile/__tests__/history-migration.test.tsx` all still pass **unmodified in their assertions** (see Dev Notes — "The AsyncStorage mock leaks across tests in one file" — for the one required, non-behavioral addition to this file)

### AC9: Code Review Section Present

**Given** the story is complete
**When** it is moved toward `done`
**Then** the story file contains a populated `## Code Review` section

[Source: docs/frontend-review-checklist.md#L30 — "Code review section present … (mandatory gate)"]

## Out of Scope

- **Backend changes of any kind** — see "Backend idempotency: verified, not changed" above. No `Idempotency-Key` header, no new table, no migration file.
- **Service worker background sync.** Story 6-4 explicitly reserved and deferred this exact feature to this story, then scoped it as app-level, not SW-level: *"Do NOT add background-sync, migration retry, or push notification logic to `sw.js` in this story — that is Story 6-12 scope"* (`docs/sprint-artifacts/6-4-implement-service-worker-for-offline.md#L28,#L297,#L308`) — and this story does not revisit that decision. The retry mechanism here is `useFocusEffect`, `AppState`, `useOnlineStatus`, and pull-to-refresh, all already available in the app, not the Background Sync API.
- **Timer polling and a max-attempts cutoff.** Retries stay event-driven (focus, resume, reconnect, pull-to-refresh). No `setInterval` and no `setTimeout` queue runner. The 60-second burst guard and the 15-minute 429 delay are comparisons against `lastAttemptAt`, not timers. A record is never dropped because `attempts` got large.
- **A timeout wrapper around `migrateGuestData`.** The function takes no `AbortSignal`, and this story does not edit `apps/mobile/lib/migration.ts`. `Promise.race` would unblock the UI and leave the POST running, so a late resolution can still write history under a newer attempt. The in-flight flag stays held until that POST settles. A hung import leaves the button on "Importing…" for the rest of the mounted History session, which is already true of today's `handleImport`.
- **Multiple concurrent guest sessions / multi-device queues.** One device holds at most one pending-migration record, same as today's single-`guestSessionId`-per-device model (`apps/mobile/lib/localHistory.ts:33-46`).
- **Changing the dismiss button's behavior.** Dismissing the banner (`handleDismiss`, `apps/mobile/app/(tabs)/history.tsx:158-161`) continues to only hide the banner from view (`bannerDismissed.current = true`). It does not clear the pending-migration record and does not stop background retries — the retry queue is a data-safety mechanism independent of whether the user currently wants to see a banner about it. This is a deliberate choice, not an oversight: re-raise if product wants dismiss to also cancel the queue.

## Tasks / Subtasks

- [x] **Task 1: Add the pending-migration persistence module** (AC1, AC4)
  - [x] Create `apps/mobile/lib/migrationQueue.ts`. Follow the exact structure of `apps/mobile/lib/localHistory.ts` (try/catch everywhere, resolve to a safe default on any storage failure, never throw)
  - [x] Define and export:
    ```ts
    export interface PendingMigration {
      userId: string;         // Supabase user id the import was started for — auto-retry only for this user
      guestSessionId: string;
      queuedAt: string;       // ISO timestamp of first failure
      attempts: number;       // starts at 1, increments per failed attempt
      lastAttemptAt: string;  // ISO timestamp of most recent failed attempt (incl. probe failures)
      lastError?: string;     // last caught error's message, for debugging only — never a token
    }
    ```
  - [x] AsyncStorage key: `'valuesnap:pending_migration'` — follow the existing `valuesnap:` prefix convention (`localHistory.ts:15-16`)
  - [x] `getPendingMigration(): Promise<PendingMigration | null>` — parse, validate shape (string `userId`/`guestSessionId`/`queuedAt`/`lastAttemptAt`, number `attempts`), return `null` on any parse/shape failure, mirroring `isValidValuation` in `localHistory.ts:53-60`
  - [x] `savePendingMigration(record: PendingMigration): Promise<void>` — best-effort, swallow storage errors
  - [x] `clearPendingMigration(): Promise<void>` — best-effort, swallow storage errors
  - [x] Do not store `access_token` or any Supabase session value in this record — only `guestSessionId` (already non-secret) and the bookkeeping fields above

- [x] **Task 2: Add the backend health-probe helper** (AC2)
  - [x] Create `apps/mobile/lib/networkHealth.ts`
  - [x] Export `checkBackendHealth(options?: { timeoutMs?: number }): Promise<boolean>`:
    ```ts
    export async function checkBackendHealth(
      { timeoutMs = 5000 }: { timeoutMs?: number } = {},
    ): Promise<boolean> {
      if (!env.apiUrl) return false;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${env.apiUrl}/health`, { signal: controller.signal });
        if (!response.ok) return false;
        const body = await response.json().catch(() => null);
        return (body as { status?: string } | null)?.status === 'healthy';
      } catch {
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    ```
  - [x] Match the exact backend contract: `backend/main.py:361-364` returns `{"status": "healthy"}` with HTTP 200 — do not accept any other shape as healthy
  - [x] This probes `/health`, **not** `/health/appraise` (`backend/main.py:367-...`) — that endpoint checks AI/eBay dependencies irrelevant to migration

- [x] **Task 3: Add the retry-cooldown constant and failure classifier** (AC1, AC3)
  - [x] Create `apps/mobile/constants/migration.ts` (alongside `constants/breakpoints.ts`) exporting:
    - `MIGRATION_RETRY_COOLDOWN_MS = 60_000`. The comment must say this is a burst guard and that it does **not** enforce 10/hour.
    - `MIGRATION_RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000`. The comment must cite the 10-per-3600s window in `backend/rate_limit.py` and the fact that `migrateGuestData` discards `Retry-After`.
    - `automaticRetryDelayMs(lastError?: string): number` — returns the 15-minute delay when `lastError` matches `/status 429$/`, otherwise the 60-second delay.
  - [x] Do **not** put these exports in `lib/migrationQueue.ts`. `history-migration.test.tsx` replaces that module with a `jest.mock()` factory (Task 6). Any export the factory omits becomes `undefined`, and `elapsed >= undefined` is always `false`, so auto-retry would silently never fire under test. Keeping the constants in an unmocked module removes that trap.
  - [x] In the same file, export `isRetryableMigrationError(err: unknown): boolean`. It returns `true` for a `TypeError` (fetch network failure) or a message matching `/status (401|408|429|5\d\d)$/`, and `false` otherwise. `migrateGuestData` throws `Migration failed with status ${response.status}` (`apps/mobile/lib/migration.ts:228-229`), so parsing the message is the only signal available without editing `migration.ts`.
  - [x] Cover the constants, `automaticRetryDelayMs`, and `isRetryableMigrationError` in `apps/mobile/__tests__/migration-constants.test.ts` (Task 6). True for `TypeError` and statuses 401, 408, 429, 500, 503. False for `new Error('500')`, `new Error('API URL is not configured')`, and status 422.
  - [x] This is a pure client-side gate compared against `lastAttemptAt` — not a timer/poller. No `setInterval` and no `setTimeout` anywhere in this story.

- [x] **Task 4: Wire the retry queue into `history.tsx`** (AC1, AC2, AC3, AC4, AC5)
  - [x] Read `user` from `useAuth()` alongside `session` (it is already exposed; `settings.tsx:110` uses it)
  - [x] Add state and refs:
    ```ts
    const [pendingMigration, setPendingMigration] = useState<PendingMigration | null>(null);
    const migrationInFlightRef = useRef(false);
    const historyFetchEpoch = useRef(0);
    const historyRef = useRef<Valuation[]>([]);       // kept in sync with `history`; snapshot source for the refresh fallback
    const tryQueuedRetryRef = useRef<() => void>(() => {});
    ```
  - [x] Add a consolidated `attemptMigration` used by **both** the manual button and every automatic trigger. Do not write separate call sites that each reimplement the guard logic:
    ```ts
    const attemptMigration = useCallback(async (guestSessionId: string) => {
      if (env.useMock || migrationInFlightRef.current || !activeSession || !user) return;
      historyFetchEpoch.current += 1;
      migrationInFlightRef.current = true;
      setIsMigrating(true);
      setMigrationError(null);
      const localSnapshot = historyRef.current;

      const recordFailure = async (reason: string) => {
        const existing = await getPendingMigration();
        const sameSession = existing?.guestSessionId === guestSessionId;
        const now = new Date().toISOString();
        const record: PendingMigration = {
          userId: user.id,
          guestSessionId,
          queuedAt: sameSession ? existing.queuedAt : now,
          attempts: (sameSession ? existing.attempts : 0) + 1,
          lastAttemptAt: now,
          lastError: reason,
        };
        await savePendingMigration(record);
        setPendingMigration(record);
      };

      try {
        if (!(await checkBackendHealth())) {
          await recordFailure('Health check failed');
          return;
        }

        await migrateGuestData(activeSession.access_token, guestSessionId);
        await clearPendingMigration();
        setPendingMigration(null);
        await clearLocalHistory();
        setMigrationBanner(null);
        bannerDismissed.current = true;

        try {
          const items = await fetchServerHistory(activeSession.access_token);
          historyFetchEpoch.current += 1;
          setServerItems(items);
          setHistory([]);
        } catch {
          historyFetchEpoch.current += 1;
          setServerItems(null);
          setHistory(localSnapshot);
        }
      } catch (err) {
        if (isRetryableMigrationError(err)) {
          await recordFailure(err instanceof Error ? err.message : 'Unknown error');
        } else {
          setMigrationError('Account migration failed. Please try again.');
        }
      } finally {
        setIsMigrating(false);
        migrationInFlightRef.current = false;
      }
    }, [activeSession, user]);
    ```
    The success path above keeps the side effects of today's `handleImport` (`history.tsx:129-156`), including the `setHistory(localSnapshot)` fallback. Three of the existing eight tests touch import (success, `Error('500')`, dismiss). None of them locks the fallback. The success test only asserts `1 items valued`, and the local Canon snapshot produces that string too. Task 6 adds a test that requires `Canon AE-1` and forbids `Seiko SKX007`. Do not claim the old eight tests cover this path.
    `fetchHistory` captures `historyFetchEpoch.current` before its first await. Before every `setServerItems`, `setHistory`, and `setMigrationBanner`, it returns when the captured value disagrees with the ref. That includes the mock, guest, and authenticated branches. The second increment is required: a fetch that starts after the first bump and resolves after the success write would still clobber the grid if the epoch only moved once.
  - [x] The existing failure test rejects with `new Error('500')` (`history-migration.test.tsx:235`) and asserts `migration-error`. That message does not match the `status N` format, so it is non-retryable and the assertion still holds. Do not loosen `isRetryableMigrationError` to match bare numbers; that turns this test's failure into a pending state and breaks it.
  - [x] `handleImport` becomes `if (!activeSession) return; await attemptMigration(await getOrCreateGuestSessionId());`
  - [x] Assign `tryQueuedRetryRef.current` on every render (mirroring Story 6.7's `handleRetryRef`, `docs/sprint-artifacts/6-7-implement-retry-mechanism.md#L67-100`). It reads the record with `getPendingMigration()` (storage, not state, so it is never stale) and calls `attemptMigration(record.guestSessionId)` only if:
    - a record exists
    - `record.userId === user?.id`
    - `!migrationInFlightRef.current`
    - `Date.now() - Date.parse(record.lastAttemptAt) >= automaticRetryDelayMs(record.lastError)`
    - `!env.useMock`
  - [x] Add the automatic triggers. **Every** trigger calls `tryQueuedRetryRef.current()`, never `attemptMigration` directly:
    - **Focus:** inside the existing `useFocusEffect` callback (`history.tsx:97-105`). Keep the callback synchronous and its deps exactly `[fetchHistory]`. Call `fetchHistory()` the way the file does today (not awaited), then `void tryQueuedRetryRef.current()`. Do not mark the callback `async` and do not return its promise. expo-router re-runs a focus effect when the callback identity changes while focused (`useFocusEffect.js` depends on `[effect, navigation, optionalNavigation]`). `attemptMigration` changes identity with `user`/`activeSession`, and anything depending on `history` would create a fetch → setHistory → refocus loop. The ref indirection is what keeps the deps stable and `react-hooks/exhaustive-deps` clean under `--max-warnings 0`.
    - **Pull-to-refresh:** at the end of `handleRefresh`, after `await fetchHistory()`, call `tryQueuedRetryRef.current()`. The epoch guard still discards a refresh fetch that loses the race with the import.
    - **App resume:** a `useEffect` with `[]` deps that subscribes `AppState.addEventListener('change', (s) => { if (s === 'active') tryQueuedRetryRef.current(); })` and calls `.remove()` on cleanup
    - **Reconnect (web):** a `prevIsOnlineRef` + `useEffect` on `[isOnline]`, modeled on Story 6.7's pattern. On a `false → true` transition, call `tryQueuedRetryRef.current()`.
  - [x] Keep `historyRef.current = history` in sync (assign during render or in a `useEffect` on `[history]`)
  - [x] On mount, populate `pendingMigration` state from `getPendingMigration()` so AC5's banner copy renders before any trigger fires. Only set it when `record.userId === user?.id`. A record for another account must not show the pending sentence to the wrong user.

- [x] **Task 5: Banner messaging** (AC5)
  - [x] Inside the existing migration banner block (`history.tsx:207-245`), add this node only when `pendingMigration !== null` and `migrationError` is null:

    ```tsx
    <View accessibilityLiveRegion="polite" testID="migration-pending">
      <Text variant="body-sm" className="text-ink mb-3">
        Your import is saved. We'll retry it when you refresh, come back to this screen, or reopen the app.
      </Text>
    </View>
    ```

    Do not use `text-signal`. That class stays on `migration-error`. Do not write "back online" or any other connectivity condition.
  - [x] The "Import to account" button and its label stay as-is — a pending retry does not prevent a manual tap (guarded by the shared single-flight flag in Task 4, not by hiding the button)

- [x] **Task 6: Tests** (AC1-AC7)
  - [x] Create `apps/mobile/__tests__/migrationQueue.test.ts` for the new persistence module (get/save/clear, malformed-data recovery) — follow `apps/mobile/__tests__/localHistory.test.ts`'s structure
  - [x] Create `apps/mobile/__tests__/networkHealth.test.ts` for `checkBackendHealth` — mock `global.fetch` directly (this is the one file in this story where mocking `global.fetch` is correct, matching `apps/mobile/__tests__/api.test.ts`'s convention for the module that itself calls `fetch`). Cover: healthy 200, non-200, malformed body, network throw, timeout/abort
  - [x] Create `apps/mobile/__tests__/migration-constants.test.ts` for `MIGRATION_RETRY_COOLDOWN_MS` (60000), `MIGRATION_RATE_LIMIT_BACKOFF_MS` (900000), `automaticRetryDelayMs`, and `isRetryableMigrationError`, per Task 3. This file is required. It is not covered by the history-screen tests.
  - [x] Extend `apps/mobile/__tests__/history-migration.test.tsx`:
    - **Required, non-behavioral fix first:** add `jest.mock('@/lib/migrationQueue', ...)` and `jest.mock('@/lib/networkHealth', ...)` at the top (mirroring the existing `jest.mock('@/lib/migration', ...)` block at `history-migration.test.tsx:14-17`), and add explicit mock return values in `beforeEach` (default: `getPendingMigration` resolves `null`, `checkBackendHealth` resolves `true`) — see Dev Notes, "The AsyncStorage mock leaks across tests in one file," for exactly why this is mandatory and not optional, even for a story that only *adds* tests
    - The `@/lib/migrationQueue` factory exports `getPendingMigration`, `savePendingMigration`, and `clearPendingMigration` as `jest.fn()`. `constants/migration.ts` is **not** mocked, so `MIGRATION_RETRY_COOLDOWN_MS`, `MIGRATION_RATE_LIMIT_BACKOFF_MS`, `automaticRetryDelayMs`, and `isRetryableMigrationError` stay real.
    - The existing authenticated `useAuth` mock already returns `user.id = 'user-123'` (`history-migration.test.tsx:57-58`). Pending-record fixtures use `userId: 'user-123'` and a `lastAttemptAt` older than 60s unless the test is about the cooldown.
    - New test: a manual import rejected with `new Error('Migration failed with status 503')` calls `savePendingMigration` with `{ userId: 'user-123', guestSessionId: 'guest-123', attempts: 1 }` and renders `migration-pending`, not `migration-error`
    - New test: a manual tap with `checkBackendHealth` resolving `false` calls `savePendingMigration`, renders `migration-pending`, and does **not** call `migrateGuestData`
    - New test: with `getPendingMigration` resolving a matching record and `checkBackendHealth` resolving `true`, mounting the screen calls `migrateGuestData` with that record's `guestSessionId` without any tap, then calls `clearPendingMigration`
    - New test: same-id reuse (AC6). A failed manual attempt, then a re-mount with the saved record, gives `migrateGuestData` the identical `guestSessionId` both times
    - New test: with `checkBackendHealth` resolving `false`, a pending-record mount does **not** call `migrateGuestData`
    - New test: a record with `userId: 'someone-else'` triggers no automatic `migrateGuestData` call and renders no `migration-pending` node
    - New test: a record with `lastAttemptAt` = now triggers no automatic call (60s burst guard)
    - New test: `lastError` of `Migration failed with status 429` and `lastAttemptAt` two minutes ago triggers no automatic call. The same record with `lastAttemptAt` sixteen minutes ago does. Two minutes is inside the 15-minute backoff and outside the 60-second guard, so this test is what stops someone from treating every retryable error as the short delay.
    - New test: `env.useMock = true` plus a matching pending record does not call `migrateGuestData`. The existing mock-mode test never installs a pending record, so it stays green without this guard.
    - New test: after a successful `migrateGuestData`, reject the post-import `fetchServerHistory`. The grid text contains `Canon AE-1` (local snapshot from `makeValuation`) and does not contain `Seiko SKX007` (`makeServerItem`). The banner is gone. `1 items valued` is not the assertion.
    - New test: stale mount fetch cannot overwrite the import. `fetchServerHistory` calls that start before `migrateGuestData` resolves (the focus fetch and the `activeSession` fetch) stay deferred and later resolve to `[]`. The first `fetchServerHistory` that starts after `migrateGuestData` has been called resolves to `[makeServerItem()]`. After the deferred calls resolve, the grid still contains `Seiko SKX007`.
    - New test: single-flight collision. Make `checkBackendHealth` return a manually-controlled deferred promise, mount with a matching record (auto-retry starts and blocks on the probe), press `migration-import-button`, then resolve the probe with `true`. Assert `migrateGuestData` was called exactly once. A "same tick" cannot be reproduced reliably in `react-test-renderer`; the deferred probe is what makes the overlap deterministic. The existing tests call `props.onPress()` directly, which ignores `disabled`, so this still reaches `attemptMigration` while `isMigrating` is true.
    - `AppState` and the online-transition triggers are thin wrappers over `tryQueuedRetryRef`. One test that fires a mocked `AppState` `'change'` → `'active'` event and asserts an automatic call is enough; do not build a matrix.
  - [x] Run the full existing 8-test suite in `history-migration.test.tsx` unmodified in assertions. Only the mock setup block changes (the two new module mocks and their `beforeEach` defaults).

- [x] **Task 7: Verification gate** (AC8)
  - [x] From `apps/mobile/`: `npm run typecheck`, `npm run lint`, `npm test` — record before/after suite and test counts in Completion Notes
  - [x] Update `apps/mobile/tests/migration-flow.spec.ts`. Add `page.route('**/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'healthy' }) }))` alongside the existing `/api/valuations` and `/api/migrate-guest` routes. Without it, the probe hits `http://localhost:8000/health` (no server is running in that config), fails, and the import never runs, so the existing test fails at `expect(migrationBanner).toHaveCount(0)`.
  - [x] Add one Playwright case to the same spec. There is no `beforeEach`. Copy the existing test's `installSupabasePasswordAuthStub`, the init script that seeds `valuesnap:local_history` and `valuesnap:guest_session_id`, and the `/api/valuations` route. Then fulfill `**/health` with 503. Tapping Import leaves the banner visible, shows `migration-pending`, and leaves the migrate-route call count at 0. A test that only stubs `/health` never reaches a signed-in History page.
  - [x] Run `npm run test:e2e:migration` from `apps/mobile/` and record the result. The story has no new visual surface, but this spec is the only end-to-end coverage of the migration flow, and the new probe is a real network dependency inside it.

## Dev Notes

### The AsyncStorage mock leaks state across tests in one file — this is the single sharpest trap in this story

`apps/mobile/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js` backs its mock with a **module-level plain object**, `__INTERNAL_MOCK_STORAGE__`, not a per-test jest mock state. Jest resets the module registry **per test file**, not per `it()` block within a file. `jest.clearAllMocks()` in `beforeEach` clears mock-function call history; it does **not** clear this object.

`apps/mobile/__tests__/history-migration.test.tsx` already has 8 tests in one `describe` block, run in file order. Before this story, no test in that file ever wrote anything to real `AsyncStorage` keys that another test in the same file reads back (the mocks for `@/lib/localHistory` and `@/lib/migration` are full `jest.mock()` factories — they never touch the real `AsyncStorage` mock at all). **This story is the first time `history.tsx` will call a module (`migrationQueue.ts`) that is tested via a jest-mocked module too** — as long as you `jest.mock('@/lib/migrationQueue', ...)` in this test file (Task 6 requires this), the component under test never touches real `AsyncStorage` in that file either, and the leak risk is fully avoided. **Do not** skip that mock and rely on the real module — if you do, the existing test `'shows an error when migration fails...'` will leave a real pending-migration record in the shared mock store, and the later test `'dismisses the banner without calling the migration API'` could spuriously auto-retry and call `migrateGuestData`, breaking `expect(mockMigrateGuestData).not.toHaveBeenCalled()`. The fix is the `jest.mock()`, not a `beforeEach` `AsyncStorage.clear()` — mocking the module is strictly better because it also keeps this test file decoupled from `migrationQueue.ts`'s internal implementation, consistent with how `@/lib/migration` is already mocked here.

The **new** `__tests__/migrationQueue.test.ts` file (Task 6) is a different story — that file deliberately tests the real module against the real `AsyncStorage` mock, so it must call `AsyncStorage.clear()` (or equivalent per-key cleanup) in its own `beforeEach`, the same way `apps/mobile/__tests__/localHistory.test.ts` already does for its own `AsyncStorage` tests (check that file's `beforeEach` pattern before writing this one).

### What already exists — do not reinvent

| Symbol | File | What it does |
|--------|------|---------------|
| `migrateGuestData(token, guestSessionId)` | `apps/mobile/lib/migration.ts:211-232` | `POST /api/migrate-guest`; already idempotent server-side (see Business Context) — **do not modify** |
| `getOrCreateGuestSessionId()` | `apps/mobile/lib/localHistory.ts:33-46` | Persistent, non-secret local UUID — reuse as-is, this is the value stored in `PendingMigration.guestSessionId` |
| `clearLocalHistory()` | `apps/mobile/lib/localHistory.ts:114-122` | Already called on migration success — keep calling it, do not duplicate its logic |
| `fetchServerHistory(token)` | `apps/mobile/lib/migration.ts:126-141` | Already called to refresh after migration — keep calling it |
| `useOnlineStatus()` | `apps/mobile/lib/hooks/useOnlineStatus.ts` | Web: real online/offline events. **Native: always returns `true`, never transitions.** That is why the focus and `AppState` triggers (Task 4) are not optional: they are the only triggers that work on native. |
| `useFocusEffect` (existing) | `apps/mobile/app/(tabs)/history.tsx:97-105` | Already runs `fetchHistory()` on every navigation focus (not on app foregrounding). Extend this same callback and keep its deps `[fetchHistory]`; do not add a second competing `useFocusEffect`. |
| `migration-flow.spec.ts` | `apps/mobile/tests/migration-flow.spec.ts` | The only end-to-end migration test. It stubs `/api/valuations` and `/api/migrate-guest` but not `/health`, so it must gain a `/health` stub in this story (Task 7). |
| `handleImport`, `handleDismiss`, `handleRefresh`, `bannerDismissed` | `apps/mobile/app/(tabs)/history.tsx:129-178` | `attemptMigration` replaces `handleImport`'s body. `handleDismiss` stays as it is. `handleRefresh` still awaits `fetchHistory()`, then calls `tryQueuedRetryRef`. |
| `fetchWithRetry` | `apps/mobile/lib/api.ts:71-107` | The retry/backoff pattern used by `appraise()`. **Do not import or reuse this for `checkBackendHealth`** — it retries on 502/503/504, which is wrong for a health probe that should fail fast so the *next* retry event (focus/reconnect) tries again, not loop internally |
| Story 6.7's `prevIsOnlineRef` + guard-ref pattern | `docs/sprint-artifacts/6-7-implement-retry-mechanism.md#L67-100,#L260-277` | The exact shape to copy for the `isOnline` transition trigger, including the already-discovered-and-fixed double-submit race — read this section before writing Task 4's `useEffect` |

### Previous Story Intelligence

- **Story 6.11's code review found that a story marked "all ACs complete" can still have a mismatched spec and an undisclosed test-scope drift.** Applied here: cooldown and probe timeout are exact numbers; the 429 delay is its own number. Existing assertions in `history-migration.test.tsx` stay unmodified. New tests are named in Task 6. `migration-flow.spec.ts` gains one `/health` stub on the existing test and one new 503 case that copies that test's harness. List any edit beyond that in Completion Notes.
- **Story 6.7's code review found a false→true transition auto-retry race** that produced a double API call when a manual action and an automatic one collided around the same event. This story has the same shape of risk (manual tap vs. automatic focus/reconnect retry) and reuses the single-flight-ref fix from that review directly (AC3, Task 4) rather than rediscovering the bug.
- **Story 6.13 locked the idempotency pattern for `/api/appraise`** specifically because that endpoint inserts rows. This story had to determine independently whether `/api/migrate-guest` has the same problem — it does not (see Business Context) — which is why this story's scope is pure frontend despite the epic plan's idempotency cross-reference.

### Project Structure Notes

- New files: `apps/mobile/lib/migrationQueue.ts`, `apps/mobile/lib/networkHealth.ts`, `apps/mobile/constants/migration.ts`, `apps/mobile/__tests__/migrationQueue.test.ts`, `apps/mobile/__tests__/networkHealth.test.ts`, `apps/mobile/__tests__/migration-constants.test.ts`. All follow the existing flat-file conventions in `lib/`, `constants/`, and `__tests__/`; no new subdirectories.
- Modified: `apps/mobile/app/(tabs)/history.tsx`, `apps/mobile/__tests__/history-migration.test.tsx`, `apps/mobile/tests/migration-flow.spec.ts`
- Not touched: anything under `backend/`, `apps/mobile/public/sw.js`, `apps/mobile/components/molecules/network-banner.tsx` (that banner is scoped to `appraise()`'s `NETWORK_ERROR`, unrelated to migration), `apps/mobile/lib/api.ts`, `apps/mobile/lib/migration.ts`'s existing exports (only new imports of its existing functions, no edits to the file itself)

### References

- [Source: docs/sprint-artifacts/epic-6-plan.md#L477-506] — Story 6-12 origin, problem statement, ACs, idempotency cross-reference, files-to-touch list
- [Source: docs/sprint-artifacts/epic-4-retrospective.md#L203-211,#L360-362] — origin finding and the suggested `pending_migration` AsyncStorage flag this story implements
- [Source: docs/epics.md#L1278-1301] — Story 4.11's original (unmet) FR spec for queued offline migration
- [Source: docs/sprint-artifacts/6-7-implement-retry-mechanism.md] — the `isOnline` transition + guard-ref pattern and its documented double-submit race/fix, both reused here
- [Source: docs/sprint-artifacts/6-4-implement-service-worker-for-offline.md#L28,#L297,#L308] — explicit boundary confirming this story is app-level retry logic, not Service Worker background sync
- [Source: docs/sprint-artifacts/6-13-appraise-idempotency-key.md] — the idempotency contract this story's Business Context explains is *not* needed for `/api/migrate-guest`
- [Source: backend/main.py:23,361-364,488-511] — `MIGRATE_GUEST_RATE_LIMIT`, `/health` contract, and the `IS NULL`-guarded UPDATE that makes migration already idempotent
- [Source: backend/tests/test_migrate_guest.py:150,170] — `test_migrate_zero_rows` and `test_migrate_is_null_filter_applied`, which together cover the server-side duplicate safety
- [Source: apps/mobile/lib/migration.ts, apps/mobile/lib/localHistory.ts, apps/mobile/lib/api.ts, apps/mobile/lib/hooks/useOnlineStatus.ts, apps/mobile/app/(tabs)/history.tsx] — all existing symbols this story extends, cited by exact line range above
- [Source: docs/frontend-review-checklist.md#L30] — mandatory `## Code Review` gate

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5.5 (Cursor), via BMAD `dev-story` workflow.

### Debug Log References

- Baseline before changes (from `apps/mobile/`): 49 suites / 440 tests, all passing. One earlier baseline run under load showed 6 suites / 7 tests failing (a `history-pull-to-refresh.story-6-9` trace was visible); two immediate reruns were 49/49 and 440/440 green. I did not root-cause that flake. It did not reproduce in any later run.
- Red phase confirmed for every new test file: the three new unit suites failed on missing modules, and 18 of the 25 new history tests failed against the unmodified screen (the rest are absence assertions that pass trivially before implementation).
- Mutation check: removing the success-path `historyFetchEpoch` bump makes the stale-fetch test fail; restored afterwards.
- `npm run test:e2e:migration`: first run, test 1 timed out at 30s on `page.goto('/history')` + `networkidle` (cold Metro compile, config uses `--clear`; failed before any migration code ran). Immediate rerun: 2/2 pass (18.7s and 6.6s).

### Completion Notes List

- 2026-11-11: story context updated from validation. No implementation has been done.
- 2026-11-11: **Implemented all 7 tasks.**
  - New `lib/migrationQueue.ts` (get/save/clear, shape validation, never throws; `savePendingMigration` writes only the declared fields so a wider object cannot leak a token into storage).
  - New `lib/networkHealth.ts` (`checkBackendHealth`, 5000ms abort, accepts only HTTP 200 + `{"status":"healthy"}`).
  - New `constants/migration.ts` (60s burst guard, 15min 429 backoff, `automaticRetryDelayMs`, `isRetryableMigrationError`), deliberately outside the mocked queue module.
  - `app/(tabs)/history.tsx`: single `attemptMigration` used by the manual button and every automatic trigger, one shared in-flight ref, epoch-guarded `fetchHistory`, triggers on focus / AppState active / web reconnect / pull-to-refresh (all via `tryQueuedRetryRef`), `migration-pending` banner node (live region, `body-sm`, `text-ink`).
  - No change to `backend/`, `lib/migration.ts`, `lib/api.ts`, `sw.js`, or any timer (`setInterval`/queue `setTimeout`). The only `setTimeout` is the probe's abort timer in `networkHealth.ts`.
- **Deviation from the story text (needs your attention): the first `historyFetchEpoch` bump was removed.** Task 4 says to bump at the start of `attemptMigration` and again before the success writes. Following that literally breaks the failure path: a failed attempt on mount (probe down or 503, the main use case) discards both mount-time fetches, so `history`/`serverItems`/banner never populate. My tests showed it as no banner, no pending message and an empty grid. The second bump (immediately before the success writes) already invalidates every fetch started earlier, and the stale-fetch test still passes and fails correctly under mutation. The story's AC4 wording ("increments before its first await, and again…") should be corrected at the next story edit.
- Smaller additions inside `attemptMigration`'s scope: (1) the fallback snapshot is `historyRef.current`, or `getLocalHistory()` if that is empty, because an automatic retry can start before the first fetch populates `history` and would otherwise "restore" an empty grid after local storage was already cleared; (2) `tryQueuedRetry` re-checks `env.useMock` and the in-flight flag after its `await`; (3) an unparsable `lastAttemptAt` is treated as eligible to retry rather than blocking forever.
- Known limitation unchanged from the story: a native cold launch lands on Camera, so nothing retries until History is first opened.
- Test counts (from `apps/mobile/`): before 49 suites / 440 tests; after initial dev 52 suites / 527 tests; after code-review hardening **52 suites / 539 tests**, all passing. `history-migration.test.tsx` went from 8 to 36 tests; the original 8 keep their assertions untouched (only the two `jest.mock` blocks, imports, and `beforeEach` defaults were added). `npm run typecheck`: 0 errors. `npm run lint` (`--max-warnings 0`): 0 warnings. `npm run test:e2e:migration`: 3/3 pass.
- Playwright edits: `migration-flow.spec.ts` got the `/health` 200 stub on the existing test, a 503 probe-failure case verifying `migration-pending` and token-free `localStorage` persistence, and a reconnect recovery case verifying automatic queued flush when `/health` returns 200.
- Not verified here: physical-device background/foreground resume and live Render cold-start timing (stubbed in Playwright).

### File List

New:
- `apps/mobile/lib/migrationQueue.ts`
- `apps/mobile/lib/networkHealth.ts`
- `apps/mobile/constants/migration.ts`
- `apps/mobile/__tests__/migrationQueue.test.ts`
- `apps/mobile/__tests__/networkHealth.test.ts`
- `apps/mobile/__tests__/migration-constants.test.ts`

Modified:
- `apps/mobile/app/(tabs)/history.tsx`
- `apps/mobile/__tests__/history-migration.test.tsx`
- `apps/mobile/tests/migration-flow.spec.ts`
- `docs/sprint-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/6-12-offline-migration-retry-queue.md`

## Code Review

### Reviewer

Gemini 4 Carbon (BMAD `code-review` workflow) — 2026-11-17

### Findings & Resolutions

- **HIGH-1 (Fixed):** Cross-account state leak and unmount race when `user` changed while `attemptMigration` was in flight (`useEffect([user?.id])` bailed out when `migrationInFlightRef.current` was true, and `attemptMigration` wrote `pendingMigration` / `serverItems` without verifying active `user.id` or mount state). Scoped in-flight ownership to `startedUserId`, guarded all post-await UI state writes with `isSameActiveUser()`, cleared stale banner state on `user?.id` transitions, and gated JSX `migration-pending` on `pendingMigration.userId === user?.id`. Covered by unit test.
- **HIGH-2 (Fixed):** Non-retryable permanent errors (e.g., `422`) left prior `PendingMigration` records in `AsyncStorage` and React state, causing infinite background retries on subsequent focus/resume events (violating AC1). Added `clearPendingMigration()` + `setPendingMigration(null)` in the non-retryable `catch` branch. Covered by unit test.
- **HIGH-3 (Fixed):** Reconciled AC4 with the failure-safe `historyFetchEpoch` design and added an immediate epoch increment right after `migrateGuestData()` resolves (in addition to the pre-`setServerItems`/`setHistory` increment) so an in-flight earlier `fetchHistory()` cannot blank the grid while the post-import refresh is awaiting. Covered by unit test.
- **MEDIUM-1 (Fixed):** Keyed `fetchHistory` and session effects on primitive `accessToken` rather than the `Session` object reference and guarded `setMigrationError(null)` when `migrationInFlightRef.current` is active so identical-token `Session` object churn does not double-fetch or clear active error state.
- **MEDIUM-2 (Fixed):** Extended `apps/mobile/tests/migration-flow.spec.ts` to assert token-free `valuesnap:pending_migration` persistence in `localStorage` on 503 failure and added a third E2E case verifying automatic queued flush on `/health` recovery + browser `offline` → `online` reconnect.
- **MEDIUM-3 (Noted):** Populated mandatory `## Code Review` section (AC9); noted working-tree coexistence with uncommitted Story 6-9 `RefreshControl` hunks in `history.tsx` for clean commit staging.
- **LOW-1 (Fixed):** Extracted `BACKEND_HEALTH_TIMEOUT_MS = 5_000` into `constants/migration.ts` (replacing magic literal `5000` per `docs/frontend-review-checklist.md`) and stripped trailing slashes from `env.apiUrl` in `checkBackendHealth` to prevent `//health` 404s. Covered by unit tests.
- **LOW-2 (Fixed):** Tightened `isValidPendingMigration` in `lib/migrationQueue.ts` to reject empty/whitespace string fields and non-integer or `< 1` `attempts` values. Covered by unit tests.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-19 | 0.1 | Initial story draft created from `epic-6-plan.md` Story 6-12, Epic 4 retrospective finding #5, and the current post-4.11/6.13 migration + idempotency implementation. Verified `/api/migrate-guest` is already idempotent via its `IS NULL`-guarded UPDATE, scoping this story to frontend-only work. Reused Story 6.7's guard-ref/single-flight pattern to pre-empt its documented double-submit race in this story's own automatic-retry trigger. | Bob (SM) |
| 2026-10-19 | 0.2 | Bound pending records to `userId` so auto-retry never migrates into a different account. Health-probe failures now count as failed attempts (no silent no-op on manual tap). Added retryable/non-retryable failure classification. Added `AppState` resume trigger and corrected focus-trigger wording. Moved cooldown constant out of the jest-mocked module. Rescoped AC6 to what the mobile layer can actually prove. Added `/health` stub and probe-failure case to the migration Playwright spec as a required gate. Rewrote `attemptMigration` pseudocode with the `localSnapshot` fallback and ref-based triggers. | Bob (SM) |
| 2026-11-11 | 0.3 | Validation edits. `fetchHistory` drops writes when `historyFetchEpoch` moves, including a second bump before the success write, and the focus callback stays synchronous. 60s remains a burst guard. A 429 waits 15 minutes. Pending copy names refresh, return, and resume, with a live region and `text-ink`. Pull-to-refresh calls the retry ref. `env.useMock` returns before any POST. The 503 Playwright case copies the existing harness. The refresh-fallback test distinguishes Canon AE-1 from Seiko SKX007. The constants test file is a required Task 6 item. A non-aborting POST timeout is out of scope. | Bob (SM) |
| 2026-11-11 | 1.0 | Implemented the offline migration retry queue (persistence module, health probe, constants/classifier, History wiring with single-flight and epoch-guarded fetches, pending banner, unit + Playwright coverage). Removed the story's first `historyFetchEpoch` bump because it blanked the screen on a failed attempt; see Completion Notes. Status moved to review. | Dev Agent (Claude Sonnet 5.5) |
| 2026-11-17 | 1.1 | Adversarial code review remediation: closed cross-account/unmount race, purged pending records on permanent non-retryable errors, added post-`migrateGuestData` epoch bump + aligned AC4, keyed `fetchHistory` on `accessToken`, hardened URL slash normalization + `BACKEND_HEALTH_TIMEOUT_MS` constant + `isValidPendingMigration`, and added unit + Playwright queued-recovery E2E tests. Status moved to `done`. | Gemini 4 Carbon |
