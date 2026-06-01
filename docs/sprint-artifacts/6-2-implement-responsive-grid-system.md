# Story 6.2: Implement Responsive Grid System

Status: done

## Story

As a ValueSnap user,
I want the app to adapt its grid layout to my screen size,
so that content is readable and well-organized on any device.

## Acceptance Criteria

1. Mobile (`width < BREAKPOINTS.tablet` = 600px) renders single-column grid with 16px gap; no horizontal scrolling.
2. Tablet (`width >= BREAKPOINTS.tablet` and `< BREAKPOINTS.desktop`) renders two-column grid with 24px gap; no horizontal scrolling.
3. Desktop (`width >= BREAKPOINTS.desktop` and `< BREAKPOINTS.largeDesktop`) renders three-column grid with 24px gap; no horizontal scrolling.
4. Wide desktop (`width >= BREAKPOINTS.largeDesktop` = 1440px) renders four-column grid with 32px gap; no horizontal scrolling.
5. All column counts and gap values derive from `BREAKPOINTS` constants (`tablet: 600`, `desktop: 1024`, `largeDesktop: 1440`). No inline breakpoint literals are introduced.
6. All gap values use the existing Swiss spacing scale: 16px = `space-4`, 24px = `space-6`, 32px = `space-8`.
7. Grid surfaces (history screen) use a wider max-width container so columns are not artificially constrained by the existing 640px text-page cap.
8. `HistoryGrid` and `HistoryGridSkeleton` display the correct column count and gap on the history screen at all breakpoints; no visual regression on mobile.
9. A `getGridConfig(viewportWidth)` pure function is exported from `apps/mobile/constants/breakpoints.ts` — testable without React.
10. A `useGridColumns()` hook is exported from `apps/mobile/lib/hooks/` — reactive wrapper for `getGridConfig`.
11. Focused unit tests cover `getGridConfig` boundary values: 599, 600, 1023, 1024, 1439, 1440.

## Background

### What already exists — DO NOT reinvent

- `BREAKPOINTS` (`tablet: 600`, `desktop: 1024`, `largeDesktop: 1440`) is in `apps/mobile/constants/breakpoints.ts`. `computeRailWidth` was added by Story 6-1 in the same file. `getGridConfig` belongs there too.
- `HistoryGrid` (`apps/mobile/components/organisms/history-grid.tsx`) already accepts `numColumns?: number` (default 2) and computes `columnWidth` via `calc()`. Keep the `calc()` approach — it works correctly on Expo Web/PWA and is the established codebase pattern.
- `HistoryGridSkeleton` (`apps/mobile/components/molecules/history-grid-skeleton.tsx`) mirrors the same `numColumns` + hardcoded `gap = 16` pattern.
- `history.tsx` already computes `numColumns` inline using `BREAKPOINTS`. That calculation must be replaced with the new `useGridColumns()` hook.
- `ScreenContainer` (`apps/mobile/components/primitives/screen-container.tsx`) has `max-w-2xl` (≈ 640px) hardcoded. On a 1440px desktop, this constrains a 3-column grid to ~200px per card. This is the primary UX problem. Adding a `wide` prop fixes it without breaking any existing callers.
- Hooks live in `apps/mobile/lib/hooks/` with a barrel at `apps/mobile/lib/hooks/index.ts`. See `useOnlineStatus.ts` for the exact module pattern to follow.

### The ScreenContainer container-width problem

`history.tsx` wraps everything in `<ScreenContainer>` which applies `max-w-2xl` (672px) to its inner `Box`. Even though `numColumns` is correctly set to 3 at desktop widths, the container cap means each card is only ~200px wide. The fix is a `wide` prop that swaps to `max-w-5xl` (1024px) on grid surfaces, matching the UX spec container target for desktop.

### The gap standardization gap

Both `HistoryGrid` and `HistoryGridSkeleton` hardcode `const gap = 16`. This matches the mobile spec (16px) but is wrong at tablet (should be 24px) and desktop (should be 24px at 1024–1440px, 32px at 1440px+). Adding a `gap` prop (default 16 for backward compat) and passing the `useGridColumns()` gap value from `history.tsx` completes the fix.

## Tasks / Subtasks

- [x] Task A — Add `getGridConfig` pure function to `apps/mobile/constants/breakpoints.ts` (AC: 1–6, 9)
  - [x] Add `export interface GridConfig { numColumns: number; gap: number; }` before the function
  - [x] Add `export function getGridConfig(viewportWidth: number): GridConfig` using `BREAKPOINTS` constants (no inline literals)
  - [x] Values: mobile → `{numColumns: 1, gap: 16}`, tablet → `{2, 24}`, desktop → `{3, 24}`, wide → `{4, 32}`
  - [x] Do NOT add `useWindowDimensions()` to this file — it must remain a pure module with no React dependency

- [x] Task B — Add `useGridColumns()` hook (AC: 10)
  - [x] Create `apps/mobile/lib/hooks/useGridColumns.ts`:
    - Import `useWindowDimensions` from `react-native` and `getGridConfig, GridConfig` from `@/constants/breakpoints`
    - Export `function useGridColumns(): GridConfig { const { width } = useWindowDimensions(); return getGridConfig(width); }`
  - [x] Export `useGridColumns` and `GridConfig` from `apps/mobile/lib/hooks/index.ts`

- [x] Task C — Add `wide` prop to `ScreenContainer` (AC: 7)
  - [x] Add `wide?: boolean` to `ScreenContainerProps` interface in `apps/mobile/components/primitives/screen-container.tsx`
  - [x] Replace hardcoded `max-w-2xl` in the inner `Box` className with `wide ? 'max-w-5xl' : 'max-w-2xl'`
  - [x] No other behavior changes; all existing callers omit `wide` and get the current 640px constraint unchanged

- [x] Task D — Add `gap` prop to `HistoryGrid` (AC: 6, 8)
  - [x] Add `gap?: number` to `HistoryGridProps` in `apps/mobile/components/organisms/history-grid.tsx` (default 16 — preserves backward compat)
  - [x] Remove the `const gap = 16` line from inside the function body — the `gap = 16` default in the destructured function signature takes its place
  - [x] Column width formula and `flex-row flex-wrap` layout are unchanged

- [x] Task E — Add `gap` prop to `HistoryGridSkeleton` (AC: 6, 8)
  - [x] Same change in `apps/mobile/components/molecules/history-grid-skeleton.tsx`
  - [x] Add `gap?: number` to `HistoryGridSkeletonProps` (default 16)
  - [x] Replace hardcoded `const gap = 16`

- [x] Task F — Update `history.tsx` to use `useGridColumns()` and `wide` container (AC: 1–4, 7–8)
  - [x] Import `useGridColumns` from `@/lib/hooks`
  - [x] Replace the five-line `numColumns` calculation with `const { numColumns, gap } = useGridColumns();`
  - [x] Pass `gap={gap}` to both `<HistoryGrid>` and `<HistoryGridSkeleton>`
  - [x] Add `wide` prop to `<ScreenContainer>`: `<ScreenContainer wide>`
  - [x] Remove `width` from `useWindowDimensions()` destructuring — `width` is NOT used elsewhere in this component after the refactor
  - [x] Remove `useWindowDimensions` from the `react-native` import line entirely: `import { View } from 'react-native'` (keeping only `View`; leaving `useWindowDimensions` imported but unused will cause a lint error)
  - [x] Update `apps/mobile/__tests__/history-migration.test.tsx` mock — the test mocks `@/lib/hooks` with a factory that only returns `useOnlineStatus`. After this task, `history.tsx` also calls `useGridColumns` from that module. Add `useGridColumns: jest.fn(() => ({ numColumns: 1, gap: 16 }))` to the mock object to prevent `TypeError: useGridColumns is not a function` crashing the test suite

- [x] Task G — Tests (AC: 11)
  - [x] Create `apps/mobile/__tests__/grid-layout.test.ts` with `getGridConfig` boundary tests (no React, pure unit tests):
    - `599` → `{numColumns: 1, gap: 16}` (mobile, below tablet)
    - `600` → `{numColumns: 2, gap: 24}` (tablet threshold exact)
    - `1023` → `{numColumns: 2, gap: 24}` (just below desktop)
    - `1024` → `{numColumns: 3, gap: 24}` (desktop threshold exact)
    - `1439` → `{numColumns: 3, gap: 24}` (just below largeDesktop)
    - `1440` → `{numColumns: 4, gap: 32}` (largeDesktop threshold exact)
  - [x] Verify `npm run test:ci` remains green after all changes

## Dev Notes

### Exact changes per file

**`apps/mobile/constants/breakpoints.ts`** — add below `computeRailWidth`:

```ts
export interface GridConfig {
  numColumns: number;
  gap: number;
}

export function getGridConfig(viewportWidth: number): GridConfig {
  if (viewportWidth < BREAKPOINTS.tablet) {
    return { numColumns: 1, gap: 16 };
  }
  if (viewportWidth < BREAKPOINTS.desktop) {
    return { numColumns: 2, gap: 24 };
  }
  if (viewportWidth < BREAKPOINTS.largeDesktop) {
    return { numColumns: 3, gap: 24 };
  }
  return { numColumns: 4, gap: 32 };
}
```

**`apps/mobile/lib/hooks/useGridColumns.ts`** — new file:

```ts
import { useWindowDimensions } from 'react-native';
import { getGridConfig } from '@/constants/breakpoints';
export type { GridConfig } from '@/constants/breakpoints';

export function useGridColumns() {
  const { width } = useWindowDimensions();
  return getGridConfig(width);
}
```

**`apps/mobile/lib/hooks/index.ts`** — add export (append after existing exports):

```ts
export { useGridColumns } from './useGridColumns';
export type { GridConfig } from './useGridColumns';
```

`useGridColumns.ts` re-exports `GridConfig` from `breakpoints.ts`, so consumers import both from `@/lib/hooks`. Correct import path for the hook: `import { useGridColumns } from '@/lib/hooks'` — same pattern as `useOnlineStatus`.

**`apps/mobile/components/primitives/screen-container.tsx`** — add `wide` prop:

```tsx
export interface ScreenContainerProps extends ScrollViewProps {
  className?: string;
  wide?: boolean;    // ← add
  children: React.ReactNode;
}

// In the component body, update inner Box className:
<Box
  className={`px-6 pb-16 w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} ${className ?? ''}`}
  style={{ paddingTop: Math.max(insets.top, 64) }}
>
```

**`apps/mobile/components/organisms/history-grid.tsx`** — add `gap` prop:

```tsx
export interface HistoryGridProps {
  items: HistoryGridItem[];
  onItemPress?: (item: HistoryGridItem) => void;
  numColumns?: number;
  gap?: number;       // ← add; default 16 preserves existing behavior
}

export function HistoryGrid({ items, onItemPress, numColumns = 2, gap = 16 }: HistoryGridProps) {
  // columnWidth formula is unchanged
  const columnWidth = ...
```

**`apps/mobile/components/molecules/history-grid-skeleton.tsx`** — same pattern:

```tsx
export interface HistoryGridSkeletonProps {
  count?: number;
  numColumns?: number;
  gap?: number;       // ← add; default 16
}

export function HistoryGridSkeleton({ count = 6, numColumns = 2, gap = 16 }: HistoryGridSkeletonProps) {
```

**`apps/mobile/app/(tabs)/history.tsx`** — update imports and usage:

```tsx
// Add to imports:
import { useGridColumns } from '@/lib/hooks';

// Replace the five-line numColumns block:
const { numColumns, gap } = useGridColumns();

// Remove `width` from useWindowDimensions() — it is NOT used elsewhere in this component.
// If useWindowDimensions had no other uses, remove it entirely:
//   BEFORE: const { width } = useWindowDimensions();
//   AFTER:  (line removed)

// Update ScreenContainer:
<ScreenContainer wide>

// Update HistoryGrid and HistoryGridSkeleton:
<HistoryGrid items={...} numColumns={numColumns} gap={gap} onItemPress={...} />
<HistoryGridSkeleton count={6} numColumns={numColumns} gap={gap} />
```

### Grid config reference table

| Viewport | Threshold | numColumns | gap | Space token |
|----------|-----------|------------|-----|-------------|
| Mobile | < 600px | 1 | 16px | `space-4` |
| Tablet | 600–1023px | 2 | 24px | `space-6` |
| Desktop | 1024–1439px | 3 | 24px | `space-6` |
| Wide | ≥ 1440px | 4 | 32px | `space-8` |

### `calc()` column width values — confirm the math is correct

The `columnWidth` formula in `HistoryGrid` is:
```
calc(100/numColumns % − (gap × (numColumns−1) / numColumns) px)
```

| Breakpoint | numColumns | gap | Result per card |
|------------|------------|-----|-----------------|
| Mobile | 1 | 16 | `100%` (full width) |
| Tablet | 2 | 24 | `calc(50% - 12px)` |
| Desktop | 3 | 24 | `calc(33.333...% - 16px)` |
| Wide | 4 | 32 | `calc(25% - 24px)` |

These values are correct — the formula already accounts for gap distribution. No change to the formula itself.

### `ScreenContainer` backward compat — existing callers are safe

Every existing call in the codebase (camera, settings, appraisal screens) passes no `wide` prop. The `wide ? 'max-w-5xl' : 'max-w-2xl'` expression falls back to `max-w-2xl` when `wide` is undefined/falsy. No existing screen regresses. Only `history.tsx` receives `wide` in this story.

### Why `calc()` in HistoryGrid is correct

The `calc()` string (e.g., `calc(50% - 8px)`) is assigned to the `width` style prop with an `as any` cast. This is a known workaround for React Native's `DimensionValue` type, which does not include `calc()` strings in TypeScript. On Expo Web, the value is passed directly to the CSS engine where `calc()` is valid. Do not replace with numeric pixel values — those cannot adapt to the container width.

### `max-w-5xl` availability and explicit scope choice

`max-w-5xl` is a default Tailwind utility (64rem = 1024px at the default 16px base). The project's `tailwind.config.js` uses `presets: [require("nativewind/preset")]`, which inherits default Tailwind breakpoints and max-width scale. No new token is needed in the config.

This is an intentional Story 6.2 scope choice: widen the history grid from 640px to a materially larger desktop container without introducing broader container sizing logic in this story. Future stories can evolve this further if design requires a wider cap.

### Breakpoint mismatch: code uses 600px, UX spec table uses 640px

The UX design specification table shows the tablet breakpoint as 640px. The codebase has `BREAKPOINTS.tablet = 600`. This discrepancy predates Epic 6. Story 6-2 follows the code (`600px`) — do not change `BREAKPOINTS.tablet` in this story. The alignment with `sm: 640px` Tailwind prefix is a known divergence and is acceptable for the current PWA target.

### Gutter conflict: epics.md says 32px desktop, UX spec says 24px desktop

`epics.md` line ~1499 lists: `"gutters are 16px mobile, 24px tablet, 32px desktop"` — using "desktop" loosely to mean all non-tablet widths. The UX design specification grid table (the authoritative design document) explicitly splits this into two rows: Desktop (1024–1440px) → 24px and Wide (≥1440px) → 32px. The story follows the UX spec table because it is the detailed design authority. The epics.md entry predates the UX spec table and conflated desktop + wide into one tier. **Do not use 32px at desktop widths (1024–1440px)** — the 24px value is correct per UX spec. The `getGridConfig` function reflects this: `numColumns: 3, gap: 24` for desktop.

### Scope boundary

- This story owns the shared grid primitives (`getGridConfig`, `useGridColumns`, `ScreenContainer wide` prop) and applies them to `HistoryGrid`/`HistoryGridSkeleton`/`history.tsx`.
- **Marketing landing page (6-5)** and **desktop UX patterns (6-10)** will consume `useGridColumns` and `wide` ScreenContainer — do not pre-implement those layouts here.
- **Do not** update `SwissSidebar`, `_layout.tsx`, camera screen, or settings screen — they are out of scope.
- **Do not** add grid tokens to `tailwind.config.js` — the Swiss spacing scale already provides the exact gap values (`space-4`, `space-6`, `space-8`).
- **Do not over-engineer `ScreenContainer`'s `wide` prop.** `wide: boolean` → `max-w-5xl` is intentionally minimal. Do not add enum-based variants, a `maxWidth?: number` prop, or a `size` prop in this story. Future stories (6-5, 6-10) extend the container API if needed.

### Project Structure

- `getGridConfig` → `apps/mobile/constants/breakpoints.ts` (pure math, beside `computeRailWidth`)
- `useGridColumns` → `apps/mobile/lib/hooks/useGridColumns.ts` (React hook, beside `useOnlineStatus`)
- `GridConfig` type — export from `breakpoints.ts`; re-export via `lib/hooks/index.ts`
- Tests → `apps/mobile/__tests__/grid-layout.test.ts` (pure unit test, no React renderer needed)
- File naming follows project convention: kebab-case, no `.spec.`

### References

- [Source: docs/ux-design-specification.md#Grid System] — column/gap/container spec table (UX authority)
- [Source: docs/sprint-artifacts/epic-6-plan.md#Story 6-2] — scope and AC origin
- [Source: apps/mobile/constants/breakpoints.ts] — BREAKPOINTS constants and computeRailWidth pattern
- [Source: apps/mobile/components/organisms/history-grid.tsx] — existing column/calc() pattern
- [Source: apps/mobile/components/primitives/screen-container.tsx] — max-w-2xl problem
- [Source: apps/mobile/lib/hooks/index.ts] — hooks barrel pattern
- [Source: docs/sprint-artifacts/6-1-implement-tab-navigation.md] — computeRailWidth pattern precedent

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `npx jest --testPathPattern="grid-layout.test.ts" --runInBand --no-coverage` — RED→GREEN for `getGridConfig` (8 tests)
- `npx jest --testPathPattern="grid-layout.test.ts|history-migration.test.tsx" --runInBand --no-coverage` — both suites green (16 tests)
- `npx jest --testPathPattern="history-grid-layout.test.tsx|history-screen-grid-wiring.test.tsx" --runInBand --no-coverage` — grid prop application + screen wiring (5 tests)
- `npm run lint` — pass (0 warnings)
- `npm run test:ci` — pass (35 suites, 337 tests, 1 snapshot)

### Completion Notes List

- Added `GridConfig` interface and `getGridConfig(viewportWidth)` pure function to `apps/mobile/constants/breakpoints.ts`. Returns `{numColumns, gap}` for mobile (1/16), tablet (2/24), desktop (3/24), wide (4/32) using only `BREAKPOINTS` constants — no inline literals.
- Created `apps/mobile/lib/hooks/useGridColumns.ts` — reactive wrapper calling `getGridConfig(width)` via `useWindowDimensions()`. Re-exports `GridConfig` type from breakpoints. Exported from `lib/hooks/index.ts` barrel.
- Added `wide?: boolean` prop to `ScreenContainer` with JSDoc noting it is intentionally minimal. `wide=true` → `max-w-5xl` (1024px); default → `max-w-2xl` (640px). Existing callers omit the prop and are unaffected.
- Added `gap?: number` prop (default 16) to `HistoryGrid` and `HistoryGridSkeleton`, removing the hardcoded `const gap = 16` from both function bodies. `gap` flows through to both `style={{ gap }}` and the `columnWidth = calc(...)` formula.
- Refactored `history.tsx`: removed `useWindowDimensions` + `BREAKPOINTS` imports and inline `numColumns` block; replaced with `const { numColumns, gap } = useGridColumns()`. Changed `<ScreenContainer>` to `<ScreenContainer wide>`. Passes `gap={gap}` to `HistoryGrid` and `HistoryGridSkeleton`.
- Updated `apps/mobile/__tests__/history-migration.test.tsx` mock to include `useGridColumns: jest.fn(() => ({ numColumns: 1, gap: 16 }))` — prevents `TypeError` crash from the factory-style `@/lib/hooks` mock after the refactor.
- Added 8-case `getGridConfig` boundary test suite in `apps/mobile/__tests__/grid-layout.test.ts` covering all 6 specified thresholds plus mid-tablet and very-wide guards.
- Added `history-grid-layout.test.tsx` to assert `HistoryGrid` and `HistoryGridSkeleton` apply the incoming `gap` prop and expected `calc(...)` width formulas.
- Added `history-screen-grid-wiring.test.tsx` to assert `history.tsx` forwards `useGridColumns()` values to both `HistoryGridSkeleton` (loading state) and `HistoryGrid` (loaded state), closing the AC8 test gap.
- Updated `ScreenContainer` component docs to reflect default vs `wide` behavior and remove stale "always 640px" language.

### File List

- apps/mobile/constants/breakpoints.ts
- apps/mobile/lib/hooks/useGridColumns.ts
- apps/mobile/lib/hooks/index.ts
- apps/mobile/components/primitives/screen-container.tsx
- apps/mobile/components/organisms/history-grid.tsx
- apps/mobile/components/molecules/history-grid-skeleton.tsx
- apps/mobile/app/(tabs)/history.tsx
- apps/mobile/__tests__/grid-layout.test.ts
- apps/mobile/__tests__/history-grid-layout.test.tsx
- apps/mobile/__tests__/history-screen-grid-wiring.test.tsx
- apps/mobile/__tests__/history-migration.test.tsx
- docs/sprint-artifacts/6-2-implement-responsive-grid-system.md
- docs/sprint-artifacts/sprint-status.yaml

## Senior Developer Review (AI)

**Reviewer:** GPT-5.5  
**Date:** 2026-05-24  
**Outcome:** Approved

### Findings Addressed

1. **MEDIUM — AC8 test coverage gap**  
   Added explicit layout + wiring tests so regression in prop forwarding or grid formula application is caught.

2. **MEDIUM — Explicit container-width decision needed**  
   Story now states the 1024 `wide` cap is an intentional Story 6.2 scope decision (widen from 640 without introducing broader sizing variants in this story).

3. **LOW — ScreenContainer docs stale**  
   Updated component comments to describe default and `wide` behavior accurately.

4. **LOW — Story note overclaimed caller count**  
   Updated wording to avoid incorrect "30+" claim.

## Change Log

- 2026-05-24: Implemented Story 6.2 responsive grid system and moved status to review.
- 2026-05-24: Code review follow-up: added grid layout/wiring regression tests, corrected ScreenContainer docs, clarified width-scope decision, and approved story as done.
