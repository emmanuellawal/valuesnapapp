---
story_key: "6-12-offline-migration-retry-queue"
validation_date: "2026-11-11"
validator_model: "Grok 4.7, then party-mode review"
original_score: 6
final_score: 9
improvements_found: 8
improvements_applied: 8
status: "improved"
---

# Validation Report: 6-12-offline-migration-retry-queue

**Story:** Offline Migration Retry Queue
**Validated:** 2026-11-11
**Validator:** Grok 4.7, with the apply list narrowed in party mode

---

## Executive Summary

**Quality Score:** 6/10 → 9/10 (+3)

**Improvements Found:** 8 total
- 🔴 Critical: 1
- 🟡 Medium: 4
- 🟢 Low: 3

**Improvements Applied:** 8 (100% of findings, every one in the party's narrowed form)

**Verdict:** The draft's backend decision was right and stayed. The draft's mount path was not. A successful import could be painted over by a history fetch that was already in flight, and the story told the dev that 60 seconds stays under a 10-per-hour limit. Both are fixed in the story file. Status stays `ready-for-dev`.

---

## Validator Scorecard

🎯 **Validator Scorecard**

Found 8 improvements:
- 🔴 **Critical (1):** in-flight `fetchHistory` writes can replace the post-import grid.
- 🟡 **Medium (4):** the 60-second cooldown was justified with false rate-limit math; the sample banner sentence described a retry that does not fire while the user stays on History; `env.useMock` was missing from the sketch; the new Playwright case had no harness.
- 🟢 **Low (3):** "6 of the 8 tests" was false; the pending node skipped the live region already on the error node; the constants test file was unnamed in Task 6, and a fake POST timeout would have been a new bug.

**Why the draft missed them:** It audited `POST /api/migrate-guest` and the assertions in the existing test file. It treated `history.tsx` as one call site. Mount already starts two `fetchHistory()` calls, and the success test's `1 items valued` string is true for both the server item and the local snapshot.

**Quality Score:** 6/10 → 9/10 (+3)

---

## Quality Score Breakdown

| Dimension | Before | After | Change |
|-----------|--------|-------|--------|
| **Completeness** | 1/2 | 2/2 | +1 |
| **Clarity** | 1/2 | 2/2 | +1 |
| **Actionability** | 1/2 | 1/2 | 0 |
| **Accuracy** | 1/2 | 2/2 | +1 |
| **Context Depth** | 2/2 | 2/2 | 0 |
| **TOTAL** | **6/10** | **9/10** | **+3** |

Actionability stays at 1. `fetchHistory` is specified by the setStates it must guard, not by a full rewritten function. A missed branch still reopens the race. The new stale-fetch test is what makes that miss fail the suite.

**What changed:** epoch on both sides of the import write, 60-second burst guard plus a 15-minute 429 delay, honest pending copy, pull-to-refresh as a trigger, an explicit mock-mode return, a Playwright harness sentence, a Canon-versus-Seiko fallback test, a live region on the pending node, and a named constants test. A non-aborting POST timeout was refused.

---

## Detailed Findings

### Finding 1: Critical — Stale history fetches can overwrite a successful import

**Location:** AC4 / Task 4 (`docs/sprint-artifacts/6-12-offline-migration-retry-queue.md`)

**Description:** `useFocusEffect` starts `fetchHistory()` without awaiting it (`history.tsx` 97–105). The `activeSession` effect starts a second one (108–114). Whichever `setServerItems` lands last wins. After the queue record is cleared, a late empty response can show an empty collection with the banner already dismissed.

**Reasoning:** Awaiting the focus fetch does not stop the other effect. An `async` focus callback is also wrong: expo-router logs when `useFocusEffect` returns a Promise.

**Applied change:** `historyFetchEpoch` increments before the first await in `attemptMigration`, and again immediately before the success or fallback writes. `fetchHistory` captures the epoch and skips `setServerItems`, `setHistory`, and `setMigrationBanner` when it has moved. The focus callback stays synchronous. Task 6 defers the mount fetches, resolves the post-import fetch to Seiko, then releases the mount fetches as `[]`, and requires `Seiko SKX007` to remain.

**Status:** modified

**User notes:** Party accepted the epoch and the test. The second increment was added because a fetch that starts after the first bump can still finish last.

---

### Finding 2: Medium — 60 seconds is not "well under" 10 per hour

**Location:** AC3 / Task 3

**Description:** The draft set `MIGRATION_RETRY_COOLDOWN_MS = 60_000` and said that stays under `MIGRATE_GUEST_RATE_LIMIT` of 10/hour. The limiter is 10 timestamps per 3600 seconds. Rejected 429s are not appended. The first 10 POSTs that reach the route, including 500s, fill the window. `migrateGuestData` throws away `Retry-After`.

**Reasoning:** Changing the base delay to 6 minutes would punish ordinary retries to repair a bad sentence.

**Applied change:** 60 seconds stays, labeled as a burst guard. `automaticRetryDelayMs` returns 15 minutes when `lastError` matches `status 429`. Manual taps stay exempt. A history test uses a 429 that is two minutes old (must not fire) and one that is sixteen minutes old (must fire).

**Status:** modified

**User notes:** Party rejected stretching the base cooldown. Party accepted the comment fix and the 429-only delay.

---

### Finding 3: Medium — The sample sentence described a retry the triggers do not perform

**Location:** AC3 / AC5 / Task 4 / Task 5

**Description:** After a failed probe the user is usually still on History and still online. Nothing retried until they left and came back. The sample sentence said the import would finish once they were back online. `handleRefresh` only called `fetchHistory`.

**Reasoning:** The Import button still worked, so this was a false sentence, not a trap. A timer while the screen sits open reopened polling the story had already refused.

**Applied change:** Pending copy is fixed: "Your import is saved. We'll retry it when you refresh, come back to this screen, or reopen the app." `handleRefresh` calls the retry ref after its fetch. No `setTimeout`.

**Status:** modified

**User notes:** Party rejected a mounted timer.

---

### Finding 4: Medium — Mock mode was named in AC3 and absent from the sketch

**Location:** AC3 / Task 4 / Task 6

**Description:** `tryQueuedRetry` compared `userId` only. In mock mode that id still matches, so a leftover pending record would POST. Guest mode was already safe because `user` is null. The existing mock-mode test never installs a pending record.

**Applied change:** `attemptMigration` returns immediately when `env.useMock` is true, before the in-flight flag and before the probe. One new test covers mock mode plus a matching record.

**Status:** modified

**User notes:** Party kept this as a task bullet and a test, not a new acceptance-criterion number. The condition is also stated on AC3 so the task and the AC agree.

---

### Finding 5: Medium — The 503 Playwright case had nothing to sign in with

**Location:** Task 7 (`apps/mobile/tests/migration-flow.spec.ts`)

**Description:** The spec is one test. The auth stub, localStorage seed, and `/api/valuations` route live inside that test. There is no `beforeEach`. A second test that only stubs `/health` never reaches History.

**Applied change:** Task 7 tells the dev to copy `installSupabasePasswordAuthStub`, the `valuesnap:local_history` and `valuesnap:guest_session_id` seed, and the valuations route, then fulfill `/health` with 503 and assert the banner, `migration-pending`, and a migrate-route count of 0.

**Status:** modified

**User notes:** Party asked for one sentence, not a pasted spec. The task uses that sentence.

---

### Finding 6: Low — "6 of the 8 tests" did not lock the fallback

**Location:** Task 4 / Task 6

**Description:** Eight tests exist. Three touch import. The success test asserts `1 items valued`, which the local Canon snapshot also produces.

**Applied change:** That claim is gone. The fallback test requires `Canon AE-1` and forbids `Seiko SKX007` after the post-import `fetchServerHistory` rejects. The banner must be gone.

**Status:** modified

**User notes:** Party made the distinguishing test required. "1 items valued" is explicitly not the assertion.

---

### Finding 7: Low — Pending state was silent to a screen reader

**Location:** AC5 / Task 5 (`history.tsx` 215–220)

**Description:** `migration-error` already uses `accessibilityLiveRegion="polite"` and `variant="body-sm"`. The draft's pending node had a test id and a free choice of copy, including the false "back online" example.

**Applied change:** The pending node copies the live region and the type size. The class is `text-ink`. `text-signal` stays on the error.

**Status:** modified

**User notes:** Party refused copying the error color onto a non-error status.

---

### Finding 8: Low — Constants test was unscheduled, and a fake timeout was rejected

**Location:** Task 3 / Task 6 / Out of Scope

**Description:** Project Structure named `migration-constants.test.ts`. Task 6 did not. A `Promise.race` around `migrateGuestData` cannot abort the socket, because that function takes no `AbortSignal` and the story forbids editing it. The late resolution can still write the UI.

**Applied change:** Task 6 requires the constants test (60000, 900000, the delay helper, and the classifier). Out of Scope states that the in-flight flag stays held until the POST settles, and that a hung import sticks "Importing…" for the rest of the mounted session, which is already true today.

**Status:** modified

**User notes:** Party accepted the file name and rejected the 408 wrapper.

---

## User Decisions

**Total Findings:** 8
**Accepted as first proposed:** 0
**Rejected outright:** 0
**Modified:** 8
**Acceptance Rate:** 100% in the party's form

**Modified Improvements:**
- Critical: stale `fetchHistory` overwrite — epoch plus a second bump, synchronous focus callback, deferred-fetch test
- Medium: rate-limit math — keep 60 seconds, add a 15-minute 429 delay, manual taps exempt
- Medium: banner copy and triggers — fixed sentence, pull-to-refresh calls the retry ref, no timer
- Medium: `env.useMock` guard plus one test
- Medium: 503 Playwright case copies the existing harness
- Low: delete the "6 of 8" claim; Canon AE-1 versus Seiko SKX007 fallback test
- Low: live region and `body-sm` on the pending node; color stays `text-ink`
- Low: name the constants test; document the hung POST; no timeout wrapper

**Refused inside those findings:**
- Stretching the base cooldown from 60 seconds to 6 minutes
- A `setTimeout` while History stays open
- A new AC number for mock mode
- Pasting the Playwright spec into the story
- Using `text-signal` on the pending node
- A `Promise.race` timeout that cannot abort `migrateGuestData`

---

## Validator Notes

### Analysis Methodology

The pass re-read the current History screen, `migrateGuestData`, the rate limiter, the migration unit tests, the Playwright spec, `useFocusEffect`, and the AsyncStorage Jest mock. Epic 6's story block, the Epic 4 retrospective, and the idempotency decision were checked against that code.

**Core question:** Can the dev agent implement this without a clarification question?

**Before:** No. Following Task 4 as written shipped the fetch race, and the cooldown comment was false.

**After:** Yes, with one residual. The epoch rule names every setState it must guard, and the new test fails if the guard is missing. The function body of `fetchHistory` is still the dev's to edit.

### Patterns Observed

- **Auditing the endpoint and missing the screen:** The `IS NULL` update, the health contract, and the single-flight lesson from Story 6.7 were all real. The bug was in two fetches that already existed on mount.
- **A green assertion that cannot see the branch:** `1 items valued` is true for the success path and the fallback path. The story was treating that as coverage.
- **A comment that overclaims a constant:** 60 seconds was given a job (stay under 10/hour) that the arithmetic does not do.

### Recommendations

- Run `dev-story` for 6-12 against this file. Do not reopen a client timeout around `migrateGuestData` inside that story.
- The known cold-launch limit remains: nothing retries until History is opened, because the screen is not mounted on the Camera tab.

---

## Competitive Stats

**Validator Performance:**
- Findings identified: 8
- Quality improvement: +3 points
- User acceptance rate: 100% in the party's narrowed form

**Validator Success:** The idempotency scope survived. The mount-order race and the rate-limit sentence did not.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-11-11 | Validation completed — 8 improvements applied to story 0.3 | Grok 4.7 |

---

_This validation report was generated by the validate-create-story workflow._
