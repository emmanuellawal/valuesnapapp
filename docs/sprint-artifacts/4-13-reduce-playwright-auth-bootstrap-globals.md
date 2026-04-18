# Story 4.13: Reduce Playwright Auth Bootstrap Globals

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 2  
**Type:** Post-epic hardening / test seam reduction

---

## Story

**As a** developer maintaining the migration E2E coverage,  
**I want** the Playwright migration flow to sign in through the real auth UI instead of bootstrapping authenticated state through browser globals,  
**So that** the remaining test seam is narrower, more production-realistic, and easier to retire fully later.

---

## Background

Story 4.12 centralized the browser E2E seam, but one high-value shortcut still remained:

- `apps/mobile/tests/migration-flow.spec.ts` seeded `__VALUESNAP_E2E_AUTH__`
- The spec also wrote `valuesnap:e2e-auth` into localStorage
- `apps/mobile/contexts/AuthContext.tsx` still consumed that override path

That kept the migration spec stable, but it meant authenticated app state could still be injected outside the real sign-in flow.

This follow-up story removes that auth bootstrap path and replaces it with a deterministic, intercepted password sign-in through the actual `/auth/sign-in` screen.

---

## Acceptance Criteria

### AC1: Migration spec signs in through the real auth screen

**Given** `apps/mobile/tests/migration-flow.spec.ts`  
**When** the migration E2E authenticates the user  
**Then** it fills the sign-in form and submits through `supabase.auth.signInWithPassword()`  
**And** it no longer injects an authenticated session into browser globals or localStorage before app boot.

### AC2: Retired browser auth bootstrap path is removed from app code

**Given** the production auth wiring in `AuthContext.tsx` and `lib/testHarness.ts`  
**When** this cleanup is complete  
**Then** no browser auth override helper remains  
**And** authenticated state is sourced only from Supabase session restoration or real auth state changes.

### AC3: Deterministic E2E behavior is preserved

**Given** Playwright cannot depend on a live Supabase project for this story  
**When** the migration spec signs in  
**Then** the Supabase password-auth request is intercepted and fulfilled deterministically by Playwright  
**And** the rest of the migration path still executes through production app code.

### AC4: Production guard covers the retired auth storage seam

**Given** the auth bootstrap localStorage key is no longer required  
**When** the production bundle guard runs  
**Then** it also fails if `valuesnap:e2e-auth` appears in any exported production JS artifact.

### AC5: Migration verification stays green

**Given** the dedicated migration Playwright config and the focused mobile Jest suite  
**When** the refactor is complete  
**Then** the migration E2E still passes  
**And** the impacted unit tests still pass without weakened assertions.

---

## Scope

| What | File | Change type |
|---|---|---|
| Real auth-path migration spec | `apps/mobile/tests/migration-flow.spec.ts` | **Modify** |
| Remove auth bootstrap helper support | `apps/mobile/lib/testHarness.ts` | **Modify** |
| Remove auth override consumption | `apps/mobile/contexts/AuthContext.tsx` | **Modify** |
| Extend production harness guard | `apps/mobile/scripts/assert-no-test-harness-in-prod.mjs` | **Modify** |
| Sprint tracking | `docs/sprint-artifacts/epic-4-plan.md` | **Modify** |
| Sprint tracking | `docs/sprint-artifacts/sprint-status.yaml` | **Modify** |

---

## Tasks

- [x] **Task 1:** Replace the migration spec's auth bootstrap with a real sign-in form flow backed by Playwright network interception (AC1, AC3)
- [x] **Task 2:** Remove browser auth override support from `AuthContext.tsx` and `lib/testHarness.ts` (AC2)
- [x] **Task 3:** Extend the production bundle guard to cover the retired auth storage key (AC4)
- [x] **Task 4:** Re-run focused verification for the impacted auth and migration paths (AC5)

---

## Dev Notes

### Implementation Notes

- This story intentionally does **not** remove the separate mock-mode override yet; the original Expo web env regression should stay isolated until a dedicated follow-up proves it can be removed safely.
- The goal here is narrower auth-state setup, not full elimination of every browser-local harness primitive.
- Keep the auth readiness snapshot publication path intact for Playwright synchronization.

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

- Replaced browser-auth bootstrap in the migration Playwright spec with a real `/auth/sign-in` submission flow.
- Fulfilled the Supabase password-auth request inside Playwright so the spec remains deterministic without a live auth backend.
- Removed the browser auth override helper path from `AuthContext.tsx` and `apps/mobile/lib/testHarness.ts`.
- Extended the production bundle guard to fail if the retired `valuesnap:e2e-auth` storage seam reappears.
- Verified with focused Jest (`AuthContext`, migration unit coverage), the dedicated Playwright migration spec, and `npm run test:prod-harness-guard`.

### File List

- docs/sprint-artifacts/epic-4-plan.md
- docs/sprint-artifacts/sprint-status.yaml
- docs/sprint-artifacts/4-13-reduce-playwright-auth-bootstrap-globals.md
- apps/mobile/tests/migration-flow.spec.ts
- apps/mobile/lib/testHarness.ts
- apps/mobile/contexts/AuthContext.tsx
- apps/mobile/scripts/assert-no-test-harness-in-prod.mjs