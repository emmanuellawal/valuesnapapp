# Epic 4: User Authentication — Retrospective

**Date:** April 2, 2026
**Epic Duration:** March 26, 2026 – ~April 1, 2026 (~1 week)
**Team:** Elawa (Developer)
**Status:** ✅ COMPLETE

---

## Epic Overview

**Goal:** Transform ValueSnap from an anonymous tool into a personalized platform with full email/password auth, Google OAuth, guest mode, account management, and guest-to-account data migration.

**What was delivered:**
```
Guest Mode:  5-item local cap → upgrade prompt after 3rd valuation
                                        ↓
Registration / Sign-In / Google OAuth → AuthContext (JWT, session persistence)
                                        ↓
History Tab: server-fetched valuations (authenticated) / local (guest)
                                        ↓
Migration: "Import to account" banner → POST /api/migrate-guest → server refresh
                                        ↓
Settings: email, sign-in method, sign out, delete account (GDPR erasure)
                                        ↓
Test Harness: production bundle clean — no test seams in shipped code
```

**Stories Completed:** 14/14 (100%)
— 10 core auth stories + 4 post-epic hardening stories (4-4-2, 4-12, 4-13, 4-14)

| Story | Title | Tests Added |
|-------|-------|-------------|
| ✅ 4-1 | Configure Supabase Auth | Infrastructure only |
| ✅ 4-2 | Implement User Registration | 12 (register + OAuth) |
| ✅ 4-3 | Implement User Sign-In | 9 |
| ✅ 4-4 | Implement Google OAuth Sign-In | 12 (scoped to 4-2/4-3 screens) |
| ✅ 4-4-2 | OAuth Test Hardening | +4 (cancel/network paths) |
| ✅ 4-5 | Implement Sign Out | 5 |
| ✅ 4-6 | Implement Session Persistence + AuthContext | 6+ |
| ✅ 4-7 | Implement Guest Mode | 8+ |
| ✅ 4-8 | Build Settings Screen | 9+ |
| ✅ 4-9 | Account Deletion Confirmation | 7 |
| ✅ 4-10 | Execute Account Deletion | 5 frontend + 5 backend |
| ✅ 4-11 | Migrate Guest Data to Account | 8 frontend + 10 backend |
| ✅ 4-12 | Consolidate Browser E2E Test Harness | Architecture only |
| ✅ 4-13 | Reduce Playwright Auth Bootstrap Globals | Architecture only |
| ✅ 4-14 | Remove Browser Mock-Mode Override From E2E Harness | Architecture cleanup |

---

## What Went Well ✅

### 1. **AuthContext First — The Right Call**

**Decision:** Story 4.6 (Session Persistence + AuthContext) was built before Stories 4.2–4.4 despite being listed sixth, because it's the backbone every other story depends on. The execution plan explicitly prioritised it as step 1.

**Outcome:** Downstream stories (registration, sign-in, guest mode, settings, deletion, migration) all consumed `useAuth()` without modification. `isLoading`, `user`, `isGuest`, and `signOut` were stable from day one. No auth state rework was needed across 10 dependent stories.

**Key Learning:** For infrastructure stories that underpin the entire epic, build order should be driven by dependency graph, not story number. The plan correctly identified this — and following it paid off.

---

### 2. **Form Pattern Locked In Early and Reused**

**Decision:** Story 4.2 introduced the full form stack: Zod schema validation + `react-hook-form` + custom `FormInput` atom.

**Outcome:** Stories 4.3 (sign-in) and 4.9 (delete confirmation) reused `FormInput` and the same validation pattern with no duplication. Three forms, one atom, one validation approach.

**Key Learning:** Establishing a repeatable form pattern on the first screen pays dividends immediately on the second. Investing 30 extra minutes in a reusable atom in Story 4.2 saved time in every subsequent form story.

---

### 3. **Guest-to-Account Migration Was Seamless**

**Decision (from Epic 3):** Store `guest_session_id` alongside every guest valuation from day one. Epic 4 claimed it.

**Outcome:** Story 4.11 required zero schema changes. The migration endpoint (`POST /api/migrate-guest`) was a single SQL update: `UPDATE valuations SET user_id = ? WHERE guest_session_id = ? AND user_id IS NULL`. The `IS NULL` guard made duplicate migration calls safe. History tab switched from AsyncStorage to server as the source of truth after migration without a new data model.

**Evidence:**
- 10 backend tests covered all migration scenarios including duplicate calls, auth errors, and boundary conditions
- 8 frontend tests covered banner display, import flow, error recovery, and dismissal
- 0 schema migrations required post-Epic 3

**Key Learning:** The Epic 3 retrospective highlighted "guest session pre-wiring" as a win — Epic 4 confirmed it. A small design decision made 1 week earlier saved a significant rework story.

---

### 4. **GDPR Deletion Order Caught and Correct**

**Decision (Story 4.10):** Delete valuations *before* deleting the Supabase Auth user. The `valuations` table uses `ON DELETE SET NULL` on `user_id`. If the auth user is deleted first, the valuations become orphaned (not erased), violating GDPR erasure requirement NFR-S7.

**Outcome:** GDPR NFR-S7 met correctly in MVP. The ordering is documented and tested with a backend test specifically verifying that `valuations delete fails → auth user is NOT deleted` (fail-safe ordering).

**Key Learning:** Deletion order in multi-table auth architectures is a security/compliance concern, not just a code detail. Document and test the order explicitly; don't assume it's obvious.

---

### 5. **Test Coverage Comprehensive, Gaps Caught Quickly**

**Volume:** 100+ frontend Jest tests across 11 auth-related test files, 15+ backend tests for the 3 new endpoints, 1 Playwright migration E2E spec.

**Gap catch rate:** The only post-review gap addition was Story 4-4-2 (OAuth cancel/dismiss + network error paths), identified during a party-mode review of Story 4.4. The fix was 4 tests, no production code changes, closed in 0.5 story points.

**Key Learning:** Party-mode (all-hands consensus review) on Story 4.4 found the gaps before they shipped. The cost was minimal; the 4 tests were trivial to add because production code already handled the branches correctly — the tests were just missing.

---

### 6. **Test Harness Kept Clean of Production Code**

**Problem that triggered Stories 4.12–4.14:** Browser-global test seams (`window.__VALUESNAP_E2E_AUTH__`, `window.__VALUESNAP_E2E_USE_MOCK__`, `window.__VALUESNAP_AUTH_SNAPSHOT__`) were scattered across `AuthContext.tsx`, `env.ts`, and `history.tsx`. Test-only code was leaking into production feature files.

**Outcome of 3-story harness sequence:**
- All browser globals consolidated into `lib/testHarness.ts` (39 lines)
- Feature code reads normalized abstractions, never `window.*` directly
- Auth bootstrap path removed from `AuthContext.tsx` — Playwright uses real sign-in screen instead
- `apps/mobile/scripts/assert-no-test-harness-in-prod.mjs` + GitHub Actions CI guard prevent regression
- `apps/mobile/tests/helpers/supabaseAuth.ts` (168 lines) is the reusable E2E auth helper for all future Playwright specs

**Key Learning:** Test seams that start in feature code will spread. The harness consolidation required 3 stories explicitly because the seam had already spread to 3 different files. Centralising test infrastructure from the first seam is far cheaper.

---

### 7. **Bearer JWT Pattern Standardised Across All Backend Endpoints**

**Decision:** All three new protected endpoints (`POST /api/migrate-guest`, `GET /api/valuations`, `DELETE /api/account`) use identical auth: `Authorization: Bearer <jwt>` header → `supabase.auth.get_user(token)` → user ID.

**Outcome:** Every future protected endpoint has a clear, tested implementation pattern to follow. No per-endpoint auth logic, no inconsistency.

**Key Learning:** Auth pattern consistency is as important as the auth itself. Inconsistent patterns (some use cookies, some use headers, some use query params) create subtle bugs and security gaps. Decide once, apply everywhere.

---

### 8. **Accessibility Regression Fixed at the Right Time**

**Problem identified:** Story 4.5 code review found that `SettingsRow` rendered all rows (including non-interactive info rows like Email and Version) as `SwissPressable`, causing screen readers to announce them as buttons — incorrect.

**Decision:** Defer the fix to Story 4.8 where the Settings screen was being rebuilt anyway. Not deferred indefinitely — assigned a specific landing story.

**Outcome:** Fix applied in 4.8. Non-interactive rows render as `Box`, interactive rows as `SwissPressable`. All accessibility tests pass. No awkward mid-story interruption to 4.5.

**Key Learning:** "Defer to the next story that touches this screen" is a legitimate and efficient triage for non-blocking accessibility findings. The key is that the deferred story is specific and close — not "some future sprint."

---

## What Could Be Improved ⚠️

### 1. **Service-Role Key Exposure in Frontend `.env`**

**Problem discovered in Story 4.1:** The pre-existing `apps/mobile/.env` contained the backend service-role key under what should have been the anon-key variable. This was a credential exposure: if any frontend bundle had been sent to production with this value, the service-role key would have been accessible to all clients.

**Impact:** Required immediate credential rotation before Story 4.1 could be marked done.

**Root Cause:** The `.env` file was likely set up during Epic 0/1 development when both keys were available and the distinction wasn't yet security-critical.

**Lesson Learned:** Security boundary between `EXPO_PUBLIC_*` (bundled, client-visible) and non-prefixed (server-only) environment variables should be validated as part of any story that introduces a new service key. A `.env` lint rule or pre-commit check that fails on `EXPO_PUBLIC_SUPABASE_SERVICE` would prevent this class of error permanently.

---

### 2. **Four Stories Added Beyond Original 10 — Not Planned For**

**Original plan:** 10 stories.
**Actual delivery:** 14 stories (4 additions: 4-4-2, 4-12, 4-13, 4-14).

| Addition | Reason | Preventable? |
|----------|--------|--------------|
| 4-4-2 | OAuth test gaps found post-review | Partially — a pre-review test checklist would have caught these |
| 4-12 | Test seam sprawl to clean up | Yes — centralize harness from the first seam |
| 4-13 | Auth bootstrap global to retire | Yes — same root cause as 4-12 |
| 4-14 | Mock-mode override global to retire | Yes — same root cause as 4-12 |

**Impact:** ~10–15 hours of unplanned work. The harness cleanup (4-12, 4-13, 4-14) was correctness work, not gold-plating, but it arose directly from not centralising the test seam at the time it was first created.

**Lesson Learned:** Every time a test writes `window.__APP_*`, it should go through a central harness module, not directly into feature files. The first seam sets the pattern for all subsequent seams. If the first one is scattered, all subsequent ones will be too.

---

### 3. **Three OAuth Edge Cases (F4, F5, F6) Remain Untested**

**Status:** Three async edge cases in the Google OAuth flow are explicitly acknowledged as untested and deferred to a future Story 4.4.3 (not scheduled):
- Async race condition between browser close and `onAuthStateChange`
- Token refresh during active browser session
- Multi-tap race on the Google sign-in button

**Impact for now:** Low — these are corner cases. Impact grows if OAuth usage increases.

**Lesson Learned:** When you name a deferred story (4.4.3), create it in the backlog immediately. "Future story" without a backlog entry has historically meant "never story."

---

### 4. **Partial Account Deletion Failure Not Handled**

**Problem:** If `DELETE /api/account` successfully deletes all valuations but then fails to delete the Supabase Auth user, the user's data is gone but their auth account still exists. The system is in an inconsistent state.

**Current handling:** Returns HTTP 500; the partial failure is logged. User can retry, but their valuations are already gone.

**Impact:** Rare edge case (Supabase Auth delete rarely fails independently). Accepted for MVP.

**Lesson Learned:** For destructive multi-step operations that cross system boundaries (app database + identity provider), a compensation pattern (log the auth user ID for manual cleanup) is more robust than pure atomic guarantees. A simple "pending deletion" record written before the first delete would enable cleanup tooling.

---

### 5. **Offline Migration Not Queued**

**Problem:** If a user attempts to import their guest data to their account while offline, the migration silently fails. Their local history remains, but no queued retry is attempted when connectivity is restored.

**Current handling:** Network error shown, button re-enabled. User must manually retry.

**Impact:** Moderate — this affects the first sign-in experience for users who authenticate on a spotty connection.

**Lesson Learned:** One-time irreversible flows (migration, account deletion) are the most important candidates for an offline queue. Adding a "pending migration" flag in AsyncStorage that triggers on next app resume would close this gap.

---

### 6. **Story 4-1 Revealed a Security Gap That Should Have Been Caught Earlier**

**(See also "What Could Be Improved #1 above.)**

The `.env` file was in place since Epic 0. Epics 1, 2, and 3 ran without a review of what credentials were being bundled. Had any of those epics shipped a production web export, the service-role key would have shipped with it.

**Lesson Learned:** Any epic that installs a new service or credential should include a line item to verify bundle exposure. A simple `grep -r "SUPABASE_SERVICE" apps/mobile/` in CI would have caught this in Epic 2 or 3.

---

## Metrics & Velocity

### Story Completion

| Phase | Stories | Type | Notes |
|-------|---------|------|-------|
| A: Auth Foundation | 4.6, 4.2, 4.3 | Frontend | AuthContext built first; screens followed |
| B: OAuth + Sign Out | 4.4, 4.4-2, 4.5 | Frontend | Google OAuth + gap fill micro-story |
| C: Guest Mode | 4.7 | Frontend | Banner, listing gate, 5-item cap |
| D: Account Management | 4.8, 4.9, 4.10 | Frontend + Backend | Settings, deletion confirmation, GDPR erasure |
| E: Migration | 4.11 | Frontend + Backend | Guest claim + server history endpoint |
| F: Harness Cleanup | 4.12, 4.13, 4.14 | Architecture | Test seam consolidation |

**Estimate accuracy:** ~1 week vs 2–3 week estimate. Fastest complex epic to date. Execution order (AuthContext first) eliminated blockers; pre-built foundation (Epic 3 guest session, Supabase client) removed weeks of groundwork.

---

### Code Quality

| Area | Metric |
|------|--------|
| Auth screens (register, sign-in, delete-confirm, settings) | 1,085 lines |
| Auth infrastructure (AuthContext, supabase.ts, migration.ts, localHistory.ts) | 425 lines |
| Frontend auth test files | 11 files, ~2,002 lines |
| Backend new endpoints | 3 (`/api/account`, `/api/migrate-guest`, `/api/valuations`) |
| Frontend Jest tests (approx) | 100+ across all auth files |
| Backend tests added (Epic 4) | 15+ |
| Playwright E2E specs | 3 total (migration-flow, screenshots, error-boundary) |
| Playwright test helpers | `supabaseAuth.ts` — 168 lines |
| Test harness | `testHarness.ts` — 39 lines |
| New npm packages | 3 (`react-hook-form`, `zod`, `@hookform/resolvers`) |
| Breaking changes | 0 |

### Architecture Deliverables

| Component | Lines | Purpose |
|-----------|-------|---------|
| `contexts/AuthContext.tsx` | 104 | Session state, `useAuth()`, `signOut()` |
| `lib/supabase.ts` | 40 | Singleton client, AsyncStorage adapter |
| `lib/migration.ts` | 161 | Server history fetch, guest migration, mapper |
| `lib/localHistory.ts` | 120 | Guest storage (+ `clearLocalHistory()` added) |
| `lib/testHarness.ts` | 39 | Centralised E2E browser globals |
| `tests/helpers/supabaseAuth.ts` | 168 | Reusable Playwright auth stub helper |
| `app/auth/register.tsx` | 392 | Registration screen |
| `app/auth/sign-in.tsx` | 327 | Sign-in screen |
| `app/(tabs)/settings.tsx` | 212 | Settings screen |
| `app/account/delete-confirm.tsx` | 130 | Deletion confirmation screen |

---

## Key Learnings

### Technical

1. **`EXPO_PUBLIC_*` variables are bundled and client-visible** — Any key under this prefix ships with the app. Service-role keys must never use this prefix. Enforce with CI grep.

2. **Auth `onAuthStateChange` fires on every token refresh, not just sign-in/out** — Handle `TOKEN_REFRESHED` silently. Don't treat it as a sign-in or sign-out event.

3. **Deletion order in multi-table auth: data first, identity second** — Delete application records before deleting the identity provider record. `ON DELETE SET NULL` does not satisfy GDPR erasure; explicit deletion does.

4. **`expo-web-browser.openAuthSessionAsync` result type must be checked** — `{ type: 'success' | 'cancel' | 'dismiss' }` are all valid. Only `success` should trigger navigation; cancel/dismiss should be silent.

5. **`Linking.createURL('/')` not a hardcoded string** — Resolves dynamically to `exp://` in Expo Go and `mobile://` in production. Hardcoding a redirect URL breaks either dev or prod.

6. **Test seams in feature files spread** — The first `window.__APP_*` in a feature file is the last time it's cheap to fix. Centralise from day one.

7. **`model_dump(mode='json', exclude_none=True)` pattern continues to apply** — All new backend endpoints that touch Pydantic + Supabase need this pattern (learned in Epic 3, confirmed in Epic 4's new endpoints).

### Process

8. **Build dependency backbone before any dependent story** — Story 4.6 (AuthContext) being built first, despite being 6th in the plan, was the single biggest velocity decision in Epic 4. When a story is a structural dependency, sequence it first regardless of numbering.

9. **"Party mode" code review catches what solo review misses** — The F2/F3 OAuth gap in Story 4.4 was found only during a party-mode review. All-hands review for complex flows (auth, deletion, migration) is worth the cost.

10. **Deferred findings need specific landing stories, not vague "future" notes** — "Future Story 4.4.3" for F4/F5/F6 OAuth edge cases is only useful if that story exists in the backlog. Without a backlog entry, it's a comment, not a commitment.

11. **Test harness consolidation earlier would have avoided 3 cleanup stories** — 4-12, 4-13, 4-14 together represent ~10–15 hours of work that would have been ~2 hours if the first test seam had gone through a central harness module. The pattern must be established before the first seam, not after the tenth.

---

## Risks Mitigated

| Risk | Mitigation Applied | Status |
|------|--------------------|--------|
| Service-role key exposure in client bundle | Immediate rotation + `.env` audit + `EXPO_PUBLIC_` boundary enforcement | ✅ Resolved |
| Token refresh causing spurious sign-out | `TOKEN_REFRESHED` handled silently in `onAuthStateChange` | ✅ Resolved |
| Guest data lost when user signs up | `guest_session_id` migration flow + "Import to account" banner | ✅ Resolved |
| Orphaned data if auth user deleted first | Valuations deleted before auth user; fail-safe ordering + test | ✅ Resolved |
| OAuth test flows non-deterministic | Playwright fetch interception + `supabaseAuth.ts` helper | ✅ Resolved |
| Test seams shipping in production build | CI guard script + GitHub Actions workflow | ✅ Resolved |
| OAuth cancel/dismiss causing confusing UX | Result type check: only `success` triggers navigation | ✅ Resolved |
| Partial account deletion inconsistency | Logged; rare edge case accepted for MVP | ⚠️ Accepted |
| Offline migration data loss | Manual retry available; queue deferred | ⚠️ Deferred |
| F4/F5/F6 OAuth edge cases untested | Acknowledged; Story 4.4.3 named but not yet scheduled | ⚠️ Deferred |
| NFR-S10 max concurrent sessions | Supabase does not enforce natively; documented limitation | ⚠️ Accepted |

---

## Epic 4 Exit Criteria — Final Check

| Criterion | Status |
|-----------|--------|
| Users can register with email/password | ✅ |
| Users can sign in with email/password | ✅ |
| Users can sign in with Google OAuth | ✅ |
| Session persists across app restarts | ✅ |
| Guest mode: 5-item cap, upgrade prompt after 3rd valuation | ✅ |
| Listing gate redirects guests to registration | ✅ |
| Settings screen: email, sign-in method, sign out, delete account | ✅ |
| Account deletion erases all data (GDPR NFR-S7) | ✅ |
| Guest data migrated to account on first sign-in | ✅ |
| History tab shows server data when authenticated | ✅ |
| Test seams absent from production bundle (CI guard) | ✅ |
| All 14 stories reach `done` in sprint-status.yaml | ✅ |

---

## Recommendations for Epic 5+

### 1. Create Story 4.4.3 in the Backlog (High Priority)

The three deferred OAuth edge cases (F4: async race on browser close, F5: token refresh during browser session, F6: multi-tap race) are named but have no backlog entry. Create the story now while context is fresh.

### 2. Add CI Lint for `EXPO_PUBLIC_*` Service Keys

A single grep in CI — `grep -r "EXPO_PUBLIC.*SERVICE" apps/mobile/` — prevents the credential exposure from Story 4.1 from recurring. This should be a permanent CI check, not a one-time fix.

### 3. Establish the "Harness-First" Rule

For any future test seam that requires browser globals, `window.*` reads, or Playwright-only behaviour: it must go through `lib/testHarness.ts` and nowhere else. Document this as a project convention.

### 4. "Pending" Pattern for Destructive Multi-Step Operations

For account deletion and future destructive operations that cross system boundaries, write a `pending_deletion` record before starting the first delete step. This enables cleanup tooling if partial failure occurs. Low effort, high safety margin.

### 5. Offline Migration Queue (AsyncStorage Retry)

Add a `pending_migration` flag to AsyncStorage that triggers on next app resume. One-time migration on a spotty connection should not silently fail. This is a small story (~2 hours) that has outsized impact on new-user first-session experience.

### 6. `GET /api/history` Was Built — Update Epic 3 Retro Carry-Forward

The Epic 3 retrospective called for `GET /api/history` backend endpoint as an Epic 4 prerequisite. Epic 4 delivered it as `GET /api/valuations`. The carry-forward item is resolved — note this for tracking.

### 7. Centralise Breakpoint Constants (Carry Forward from Epic 3)

Stories 3.3, 3.6, and potentially Epic 5 screens all use the 1024px threshold. Define `BREAKPOINTS.desktop = 1024` in a shared constants file before the number appears in a third or fourth location.
