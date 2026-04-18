# Story 4.12: Consolidate Browser E2E Test Harness

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 3  
**Type:** Post-epic hardening / architectural cleanup

---

## Story

**As a** developer maintaining a production-grade auth and migration flow,  
**I want** the browser-only E2E seam isolated behind a single test harness boundary,  
**So that** Playwright remains deterministic without leaking test-specific globals through production feature code.

---

## Background

The guest-to-account migration E2E was stabilized with localhost-only browser globals:

- `__VALUESNAP_E2E_AUTH__`
- `__VALUESNAP_E2E_USE_MOCK__`
- `__VALUESNAP_AUTH_SNAPSHOT__`

That solved the immediate flake, but the bridge is currently spread across three production files:

- `apps/mobile/contexts/AuthContext.tsx`
- `apps/mobile/lib/env.ts`
- `apps/mobile/app/(tabs)/history.tsx`

This story consolidates those hooks into one browser test harness module, moves snapshot publication to the app boundary, and adds a production-bundle guard in CI.

---

## Acceptance Criteria

### AC1: Single entry point for all test harness state

**Given** the mobile web app runs in a browser E2E context  
**When** test bootstrap injects auth, session, or environment overrides  
**Then** all such injection flows through one module (`apps/mobile/lib/testHarness.ts` or equivalent)  
**And** no feature code (`AuthContext`, `env`, `history`, or any screen) reads `window.__VALUESNAP_E2E_*` directly.

### AC2: Feature code consumes normalized abstractions only

**Given** `AuthContext.tsx`, `env.ts`, and `history.tsx`  
**When** they need auth session, mock-mode flag, or session state  
**Then** they consume values from existing interfaces (context, env getter, helper imports)  
**And** the test harness module is the sole place that bridges browser globals into those interfaces  
**And** removing the test harness module leaves zero references to `__VALUESNAP_E2E` in feature code.

### AC3: Production build exclusion verified by CI

**Given** a production web export of the mobile app  
**When** the output JS bundle is scanned  
**Then** the strings `__VALUESNAP_E2E_AUTH__`, `__VALUESNAP_E2E_USE_MOCK__`, and `__VALUESNAP_AUTH_SNAPSHOT__` do not appear in any production JS artifact  
**And** a CI step fails if any marker is present.

### AC4: Existing migration E2E coverage remains green

**Given** `apps/mobile/tests/migration-flow.spec.ts`  
**When** the refactored harness is used  
**Then** the migration banner appears, import succeeds, and server data replaces local data  
**And** the spec passes repeatedly without introducing new flakiness.

### AC5: Existing unit coverage remains green

**Given** the current mobile Jest suite  
**When** the harness refactor is complete  
**Then** the existing behavior-oriented tests still pass  
**And** no assertions are weakened to accommodate the refactor.

### AC6: Auth snapshot publication is harness-owned

**Given** the browser auth readiness snapshot used by Playwright  
**When** auth state changes  
**Then** snapshot publication is owned by a dedicated harness boundary/module, not `AuthContext`  
**And** `AuthContext` contains no direct test synchronization logic.

### AC7: Localhost/dev guard is centralized

**Given** the current localhost / `__DEV__` checks  
**When** the refactor is complete  
**Then** exactly one test-harness environment guard exists  
**And** feature code does not contain hostname- or `__DEV__`-based branches for E2E harness purposes.

---

## Scope

| What | File | Change type |
|---|---|---|
| Centralized browser harness helpers | `apps/mobile/lib/testHarness.ts` | **Create** |
| Root auth snapshot boundary | `apps/mobile/components/TestHarnessBoundary.tsx` | **Create** |
| AuthContext override consumption | `apps/mobile/contexts/AuthContext.tsx` | **Modify** |
| Env override consumption | `apps/mobile/lib/env.ts` | **Modify** |
| Remove history-level direct harness fallback | `apps/mobile/app/(tabs)/history.tsx` | **Modify** |
| Root layout boundary wiring | `apps/mobile/app/_layout.tsx` | **Modify** |
| Production bundle guard script | `apps/mobile/scripts/assert-no-test-harness-in-prod.mjs` | **Create** |
| Mobile package script | `apps/mobile/package.json` | **Modify** |
| CI workflow for production bundle guard | `.github/workflows/mobile-prod-harness-guard.yml` | **Create** |

---

## Tasks

- [x] **Task 1:** Create a centralized browser test harness module and root boundary (AC1, AC6, AC7)
- [x] **Task 2:** Refactor `AuthContext`, `env`, and `history` to consume the harness without direct browser-global access (AC1, AC2, AC7)
- [x] **Task 3:** Add a production web bundle guard script and wire it into mobile package scripts + GitHub Actions (AC3)
- [x] **Task 4:** Run the migration-focused mobile verification set: AuthContext/unit tests, migration unit test, migration Playwright spec, and production bundle guard (AC4, AC5)

---

## Dev Notes

### Implementation Notes

- Keep the test-only seam browser-local and dev-only, but centralize the guard in the harness module.
- Avoid embedding the exact `__VALUESNAP_*` marker strings in production-app source where possible; the production bundle guard should enforce that the final exported JS does not contain them.
- The harness boundary should live at the app root and publish auth readiness from outside `AuthContext`.
- `history.tsx` should rely on `useAuth()` after the refactor rather than maintaining a second test-only session source.

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

- Story created from the post-epic architectural review of the migration E2E stabilization seam.
- Centralized all browser test harness reads and writes in `apps/mobile/lib/testHarness.ts`.
- Moved auth readiness snapshot publication to `apps/mobile/components/TestHarnessBoundary.tsx` and wired it in `app/_layout.tsx`.
- Removed direct browser-global harness reads from `AuthContext`, `env`, and `history`.
- Added `npm run test:prod-harness-guard` plus a GitHub Actions workflow to verify production exports do not contain forbidden `__VALUESNAP_*` markers.
- Verified with focused Jest, full mobile Jest, the production export guard, and the dedicated migration Playwright spec.

### File List

- docs/sprint-artifacts/epic-4-plan.md
- docs/sprint-artifacts/sprint-status.yaml
- docs/sprint-artifacts/4-12-consolidate-browser-e2e-test-harness.md
- apps/mobile/lib/testHarness.ts
- apps/mobile/components/TestHarnessBoundary.tsx
- apps/mobile/contexts/AuthContext.tsx
- apps/mobile/lib/env.ts
- apps/mobile/app/_layout.tsx
- apps/mobile/app/(tabs)/history.tsx
- apps/mobile/scripts/assert-no-test-harness-in-prod.mjs
- apps/mobile/package.json
- .github/workflows/mobile-prod-harness-guard.yml