# Story 4.14: Remove Browser Mock-Mode Override From E2E Harness

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 2  
**Type:** Post-epic hardening / test seam retirement

---

## Story

**As a** developer maintaining browser auth E2Es,  
**I want** the browser auth stub flow to live in shared test helpers with the dedicated Playwright config as the primary mock-mode control,  
**So that** future auth E2Es use one consistent path without leaving open-ended browser-global overrides in production feature code.

---

## Background

Story 4.13 removed browser-auth bootstrap from production auth state wiring, but one browser-only seam still remained:

- `apps/mobile/tests/migration-flow.spec.ts` forced `window.__VALUESNAP_E2E_USE_MOCK__ = false`
- `apps/mobile/lib/env.ts` and `apps/mobile/lib/testHarness.ts` still supported that override path
- The deterministic Supabase password-auth fetch stub still lived inline inside the migration spec

This follow-up removes the last general-purpose browser mock-mode override, centralizes the auth stub behind reusable Playwright helpers, and corrects the config-only assumption by keeping a helper-owned runtime safeguard for deterministic browser auth E2Es.

---

## Acceptance Criteria

### AC1: Dedicated Playwright config remains the primary mock-mode authority

**Given** the migration browser E2E runs with `playwright.migration.config.ts`  
**When** the app boots in the browser test environment  
**Then** mock mode is controlled primarily by the config-provided `EXPO_PUBLIC_USE_MOCK=false`  
**And** any browser runtime safeguard is owned only by the shared auth test helper rather than by production auth bootstrap seams.

### AC2: App code no longer carries a browser mock-mode override seam

**Given** `apps/mobile/lib/env.ts` and `apps/mobile/lib/testHarness.ts`  
**When** this cleanup is complete  
**Then** no helper remains for browser-local mock-mode overrides  
**And** the remaining harness surface is limited to auth snapshot publication only.

### AC3: Supabase password-auth stubbing is reusable across E2Es

**Given** auth-focused Playwright specs will need deterministic sign-in behavior  
**When** this cleanup is complete  
**Then** the password-auth fetch stub lives in a reusable helper module  
**And** the migration spec consumes that helper instead of inlining the interception logic.

### AC4: Migration coverage remains green without the mock override

**Given** `apps/mobile/tests/migration-flow.spec.ts`  
**When** the mock override is removed  
**Then** the spec still signs in, shows the migration banner, imports guest data, and passes consistently.

---

## Scope

| What | File | Change type |
|---|---|---|
| Remove browser mock-mode override support | `apps/mobile/lib/testHarness.ts` | **Modify** |
| Remove env dependency on harness override | `apps/mobile/lib/env.ts` | **Modify** |
| Reusable Supabase auth helper | `apps/mobile/tests/helpers/supabaseAuth.ts` | **Create** |
| Migration spec uses shared helper path | `apps/mobile/tests/migration-flow.spec.ts` | **Modify** |
| Sprint tracking | `docs/sprint-artifacts/epic-4-plan.md` | **Modify** |
| Sprint tracking | `docs/sprint-artifacts/sprint-status.yaml` | **Modify** |

---

## Tasks

- [x] **Task 1:** Remove the remaining browser mock-mode override from app code and the migration spec (AC1, AC2)
- [x] **Task 2:** Extract reusable Supabase password-auth Playwright helpers (AC3)
- [x] **Task 3:** Re-run migration and focused regression verification to prove the migration path remains green after retiring the general-purpose override seam (AC4)

---

## Dev Notes

### Implementation Notes

- This story deliberately keeps the auth snapshot publication path intact because it is now a narrow, harness-owned synchronization point rather than an auth-state bootstrap seam.
- The reusable helper should cover both deterministic password-auth stubbing and the common sign-in/wait flow so future E2Es follow the same path by default.

### Verification Target

- `apps/mobile/__tests__/AuthContext.test.tsx`
- `apps/mobile/__tests__/history-migration.test.tsx`
- `apps/mobile/tests/migration-flow.spec.ts`
- `npm run test:prod-harness-guard`

---

## Dev Agent Record

### Agent Model Used

GitHub Copilot (GPT-5.4)

### Debug Log References

_none_

### Completion Notes List

- Removed the remaining general-purpose browser mock-mode override from app code and the migration Playwright spec.
- Extracted deterministic Supabase password-auth interception and sign-in helpers into shared Playwright helper utilities.
- Kept auth readiness synchronization through the harness-owned auth snapshot boundary only.
- Corrected the config-only overstep by adding a helper-owned runtime real-API safeguard that is encoded in app code and blocked from production bundles by the existing guard.
- Verified `__tests__/AuthContext.test.tsx`, `__tests__/history-migration.test.tsx`, `tests/migration-flow.spec.ts`, and `npm run test:prod-harness-guard`.

### File List

- docs/sprint-artifacts/epic-4-plan.md
- docs/sprint-artifacts/sprint-status.yaml
- docs/sprint-artifacts/4-14-remove-browser-mock-mode-override-from-e2e-harness.md
- apps/mobile/lib/testHarness.ts
- apps/mobile/lib/env.ts
- apps/mobile/tests/helpers/supabaseAuth.ts
- apps/mobile/tests/migration-flow.spec.ts