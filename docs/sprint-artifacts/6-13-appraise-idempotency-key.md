# Story 6-13: Appraise Idempotency Key

Status: done

## Story

As a ValueSnap developer,
I want `POST /api/appraise` to support an idempotency key contract with server-side dedupe,
so that retry logic and replayed submissions cannot create duplicate valuation rows for one user action.

## Background

Story 5.5-7 introduced bounded retries for appraise submissions. That improved resilience, but it also created a duplicate-write risk:

- request succeeds on backend and persists a valuation
- response is dropped/aborted client-side
- client retries same logical submission
- backend inserts another valuation without dedupe

Epic 6 now explicitly pulls this risk forward. The idempotency contract must be in place before retry-heavy stories (notably 6-7) are accepted as complete.

## Acceptance Criteria

1. `POST /api/appraise` accepts an idempotency key via HTTP `Idempotency-Key` header (preferred)
2. Requests with the same key and same principal scope do not create duplicate persisted valuations
3. Replay response is stable for the same key (same persisted identity, including `valuation_id`)
4. Contract semantics are explicitly key-only for this endpoint: once a key is recorded for a principal, subsequent requests with the same key replay the stored response
5. Key scope is explicitly defined and enforced as `(principal_type, principal_id, idempotency_key)` where principal is authenticated `user_id` when valid auth exists, otherwise `guest_session_id` (or explicit fallback principal when absent)
6. Missing-key behavior is explicitly defined and documented as backward-compatible optional mode for now
7. Idempotency record retention policy is defined and implemented (24-hour TTL for this story) and documented
8. Mobile client sends the idempotency key and reuses the same key across retry attempts for one submission
9. Automated coverage exists for: first submit, replay with same key, key reuse across retry attempts, and expired-key behavior
10. Story includes a `## Code Review` section before status moves to `done`

## Tasks / Subtasks

- [x] Task A - Finalize contract and runtime semantics (AC: 1, 4, 5, 6)
  - [x] Decide canonical key input (`Idempotency-Key` header as default)
  - [x] Lock key-only replay behavior for this endpoint (no payload hash conflict branch in this story)
  - [x] Define missing-key optional mode and document compatibility reasoning
  - [x] Define principal resolution order (authenticated user, else guest session fallback)

- [x] Task B - Backend dedupe persistence and lookup (AC: 2, 3, 5, 7)
  - [x] Add idempotency record storage (table/model/index) scoped to principal + key
  - [x] Set and enforce 24-hour TTL for stored idempotency records
  - [x] Persist response identity for stable replay
  - [x] Enforce no second valuation insert for replayed logical request

- [x] Task C - Wire appraise handler to contract (AC: 1, 2, 3, 4, 5, 6)
  - [x] Parse idempotency key input in appraise route/service path
  - [x] Perform idempotency lookup before expensive AI/eBay calls (prevents duplicate token spend)
  - [x] Resolve first-write vs replay path deterministically
  - [x] Return stable replay payload

- [x] Task D - Mobile client integration (AC: 8, 9)
  - [x] Generate one key per user-initiated appraisal submit
  - [x] Reuse key across `fetchWithRetry` attempts
  - [x] Ensure a fresh key is generated for a new user submit action

- [x] Task E - Tests and verification (AC: 9)
  - [x] Backend tests for dedupe, replay stability, and key-only replay handling
  - [x] Mobile/API tests proving retry path reuses a single key
  - [x] Backend tests for principal scoping and expired-key behavior
  - [x] Confirm existing appraisal flow still works in happy path

- [x] Task F - Documentation (AC: 1, 6, 7)
  - [x] Document chosen contract shape and behavior in deployment/API docs
  - [x] Record key-retention/cleanup policy used by dedupe storage

## Dev Notes

### Scope boundaries

- This story is a data-integrity contract story, not an AI-quality story.
- AI output quality work belongs to Story 6-14.
- Retry UX refinements belong to Story 6-7 and should consume this contract.

### Suggested implementation direction

- Preferred key source: `Idempotency-Key` header
- Semantics for this endpoint are key-only: same principal + same key always replays stored response
- Scope dedupe key by principal context (authenticated user id or guest session id) to avoid global collisions
- Resolve idempotency before AI/eBay calls to avoid duplicate cost on retries
- Missing key remains optional for backward compatibility in this story; stricter enforcement can be a future migration
- Retention policy for this story: 24-hour TTL for idempotency records

### Files likely impacted

- `backend/main.py` or appraise route module
- `backend/services/` appraisal pipeline files
- `backend/models.py` and/or persistence/migration artifacts
- `backend/migrations/` for idempotency table
- `apps/mobile/lib/api.ts`
- `apps/mobile/__tests__/api.test.ts`
- `backend/tests/` for contract and dedupe behavior
- `docs/deployment/README.md` (or equivalent contract docs)

### References

- `docs/sprint-artifacts/epic-6-plan.md` (Story 6-13 section)
- `docs/sprint-artifacts/5.5-7-network-polish.md` (retry context and duplicate-write caveat)
- `docs/sprint-artifacts/epic-5.5-retrospective.md` (action item to track idempotency explicitly)

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `.venv/bin/pytest backend/tests/test_appraise_persistence.py backend/tests/test_idempotency_repository.py`
- `.venv/bin/pytest backend/tests`
- `npm run lint` (from `apps/mobile`)
- `npm test -- --runInBand __tests__/api.test.ts` (from `apps/mobile`)
- `npm test -- --runInBand` (from `apps/mobile`)
- `.venv/bin/pytest backend/tests/test_appraise_persistence.py backend/tests/test_idempotency_repository.py` (post-review fixes)
- `.venv/bin/pytest backend/tests` (post-review fixes)
- `npm test -- --runInBand __tests__/api.test.ts && npm run lint` (from `apps/mobile`, post-review fixes)
- `npm test -- --runInBand` (from `apps/mobile`, post-review fixes)

### Completion Notes List

- Implemented appraise idempotency backend flow with `Idempotency-Key` lookup before AI/eBay work and stable replay payload return.
- Added principal scoping resolution (`user` via valid bearer token, otherwise guest session, otherwise `anonymous`) and optional missing-key compatibility mode.
- Added `AppraiseIdempotencyRepository` with 24-hour TTL persistence and unique scope-key upsert behavior.
- Added Supabase migration `003_create_idempotency_keys_table.sql` with RLS service-role policy and supporting indexes.
- Updated mobile API client to generate one idempotency key per submission and reuse it across `fetchWithRetry` attempts.
- Added/updated automated coverage for replay behavior, principal scoping, expired-record path, and mobile key reuse across retries.
- Regression results: backend `160 passed, 10 skipped`; mobile `30 suites / 313 tests passed`; lint passed.
- Code review fix: replaced replay-cache-after-write behavior with reservation-first idempotency (`processing` -> `completed`) so concurrent same-key requests cannot run duplicate valuation inserts.
- Code review fix: keyed requests now fail with `IDEMPOTENCY_UNAVAILABLE` before appraise work if the idempotency reservation cannot be written safely.
- Code review fix: duplicate same-key requests that arrive while the first request is still processing now return `409 IDEMPOTENCY_IN_PROGRESS` without AI/eBay/valuation work.
- Post-review regression results: backend `163 passed, 10 skipped`; mobile `30 suites / 313 tests passed`; mobile lint passed.

### File List

- `backend/main.py`
- `backend/services/idempotency.py`
- `backend/migrations/003_create_idempotency_keys_table.sql`
- `backend/tests/test_appraise_persistence.py`
- `backend/tests/test_idempotency_repository.py`
- `apps/mobile/lib/api.ts`
- `apps/mobile/__tests__/api.test.ts`
- `docs/deployment/README.md`
- `docs/sprint-artifacts/6-13-appraise-idempotency-key.md`
- `docs/sprint-artifacts/sprint-status.yaml`

## Code Review

### Senior Developer Review (AI)

**Reviewer:** GPT-5.5  
**Date:** 2026-05-14  
**Outcome:** Approved after fixes

#### Findings

- [x] **HIGH:** Original implementation checked for replay before processing but only wrote the idempotency record after valuation persistence, leaving a concurrent same-key race that could create duplicate valuation rows.
- [x] **HIGH:** Original implementation ignored idempotency persistence failure, allowing keyed requests to succeed without a durable replay record.
- [x] **MEDIUM:** Retention documentation overstated cleanup behavior; implementation performs 24-hour replay expiry, while physical row cleanup remains an operational follow-up.
- [x] **MEDIUM:** Tests missed in-progress duplicate and reservation-unavailable paths.
- [x] **LOW:** Task wording still referenced conflicting-payload handling despite the chosen key-only contract.

#### Resolution

- Implemented reservation-first idempotency via `AppraiseIdempotencyRepository.start_request()`.
- Added `processing` / `completed` state to the idempotency migration.
- Added `409 IDEMPOTENCY_IN_PROGRESS` for duplicate scoped keys already being processed.
- Added `503 IDEMPOTENCY_UNAVAILABLE` for keyed requests when the store cannot reserve the key safely.
- Updated tests for replay, in-progress duplicate, reservation failure, principal scope, expired-key behavior, and mobile retry key reuse.
- Clarified docs that 24-hour TTL is enforced for replay lookup and physical cleanup is a deferred operational follow-up.

## Change Log

- 2026-05-14 - Story drafted from Epic 6 Phase 1 priority and added to sprint artifacts.
- 2026-05-14 - Story contract tightened after validation: key-only semantics, principal scoping, pre-AI lookup, optional missing-key mode, and 24-hour TTL.
- 2026-05-14 - Implemented appraise idempotency end-to-end (backend contract, migration, mobile header propagation, docs, and tests); moved story to review.
- 2026-05-14 - Code review fixed reservation race and store-failure handling; story approved and moved to done.
