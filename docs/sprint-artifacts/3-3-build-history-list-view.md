# Story 3.3: Build History List View

**Status:** done

---

## Story

**As a** user,
**I want** to see all my past valuations in a list,
**So that** I can review what I've valued before without re-appraising.

---

## Business Context

### Why This Story Matters

Story 3.2 wired automatic saving — every successful valuation now lands in local
storage (guest) and the Supabase backend. But users have no way to see those
saved valuations. The History tab has been shipping with hard-coded mock data
since Story 0.10; Story 3.3 replaces the mocks with real `getLocalHistory()`
data and gives the app its first end-to-end persistent user experience.

**Current State:**
- ✅ `apps/mobile/app/(tabs)/history.tsx` exists with full Swiss layout, `HistoryGrid`,
  and empty state — all wired to `MOCK_HISTORY` constants
- ✅ `apps/mobile/lib/localHistory.ts` has `getLocalHistory()` returning validated
  `Valuation[]` from AsyncStorage (item-level type guard added in code review)
- ✅ `apps/mobile/components/organisms/history-grid.tsx` — `HistoryGrid` + `HistoryGridItem`
  exists; `ValuationCard` supports optional `imageUri`, but `HistoryGrid` does not currently pass `imageUri` through to `ValuationCard`
- ✅ `apps/mobile/components/molecules` exports `HistoryGridSkeleton`
- ✅ `apps/mobile/types/valuation.ts` has `Valuation` with `id?`, `createdAt`, `status`,
  `response?.itemDetails`, `response?.marketData`, `imageUri?`
- ✅ `saveToLocalHistory()` stores valuations with: `id` (backend UUID or undefined),
  `createdAt` (ISO string), `status: ValuationStatus.SUCCESS`, `response` (full
  `ValuationResponse`), `imageUri` (local device URI)
- ❌ History tab is still driven by mock constants — no real data rendered
- ❌ No live re-fetch when the user switches back to the History tab after a new valuation
- ❌ `MOCK_HISTORY` import cannot be removed without wiring real data first

**What This Story Delivers:**
- History tab reads and renders real local guest history
- Tab re-fetches on focus so newly captured valuations appear immediately
- `Valuation[]` is mapped cleanly to `HistoryGridItem[]` (filter + transform)
- Skeleton shown during initial async load
- Empty state shown when no valuations saved yet
- Mock data and mock import constants removed from `history.tsx`

### Value Delivery

- **First visible persistence:** the user can close the app, reopen it, and see
  their past valuations — this is the moment the app feels real
- **Epic unlock:** Stories 3.4 (detail view) and 3.5 (offline) depend on a working,
  data-driven history list
- **No new dependencies:** everything needed already exists in the codebase

---

## Acceptance Criteria

### AC1: History List Displays Real Saved Valuations

**Given** the user has one or more valuations saved in local guest history  
**When** they navigate to the History tab  
**Then** a grid of `ValuationCard` components displays all saved valuations  
**And** cards are ordered newest first (already guaranteed by `saveToLocalHistory` prepend)  
**And** the grid follows the responsive layout requirement for 3.3: 1 column on mobile, 2 on tablet, and 3–4 on desktop  
**And** single-column on mobile is not a layout reduction — it is the correct Swiss Minimalist expression on small screens; cards are full-width with typography doing the heavy lifting  
**And** each card shows `itemDetails`, `marketData`, and `imageUri` if present  
**And** the hero stats (total value, item count) reflect real data, not mocks

---

### AC2: Skeleton Shows During Initial Load

**Given** the History tab has not yet finished loading from AsyncStorage  
**When** the tab first renders  
**Then** `HistoryGridSkeleton` is displayed  
**And** it is replaced by real content once `getLocalHistory()` resolves  
**And** the transition does not cause layout shift

---

### AC3: Empty State When No Valuations

**Given** the user has no valuations in local storage  
**When** the History tab loads  
**Then** the empty state is rendered with a message explaining how to get started  
**And** a "Start Valuing" button links to the Camera tab  
**And** the hero stat area shows $0 / 0 items

---

### AC4: Tab Refreshes When Focused

**Given** the user captures a new valuation on the Camera tab  
**When** they switch to the History tab  
**Then** the new valuation appears at the top of the list without a manual reload  
**And** hero stats update to include the new item

---

### AC5: Mock Data and Imports Removed

**Given** the history tab is wired to real data  
**When** the file is reviewed  
**Then** `MOCK_HISTORY`, `MOCK_CANON_CAMERA`, `MOCK_SONY_HEADPHONES`,
  `createMockItemDetails`, `createMockMarketData` are no longer imported or used  
**And** `history.tsx` has no static valuation constants  
**And** the app compiles with zero TypeScript errors

---

### AC6: Unit Test Covers Valuation Mapping Logic

**Given** the `mapValuationsToGridItems` pure function is extracted from `history.tsx`  
**When** the unit test suite runs  
**Then** the test covers:  
  - Successful valuations are mapped to `HistoryGridItem[]` with correct fields  
  - Valuations with `status !== SUCCESS` are filtered out  
  - Valuations with `response == null` are filtered out  
  - `id` falls back to `createdAt` when `valuation.id` is `undefined`  
**And** `npx jest` exits with all tests passing (including the 16 pre-existing tests)

---

## Tasks / Subtasks

- [x] Wire `getLocalHistory()` into `history.tsx` (AC1, AC2, AC3, AC4)
  - [x] Add local state: `history: Valuation[]` (initially `[]`) and `isLoading: boolean` (initially `true`)
  - [x] Import `getLocalHistory` from `@/lib/localHistory`
  - [x] Create fetch function: calls `getLocalHistory()`, sets state
  - [x] Mount with `useEffect` for initial load (sets `isLoading = false` after)
  - [x] Re-fetch on tab focus using `useFocusEffect` from `expo-router`
  - [x] Guard: wrap `useFocusEffect` callback in `useCallback` (required by the hook)
- [x] Extract `mapValuationsToGridItems` as a pure exported function (AC1, AC6)
  - [x] Move the filter+map out of the component body into `mapValuationsToGridItems(history: Valuation[]): HistoryGridItem[]`
  - [x] Filter condition: `status === ValuationStatus.SUCCESS && response != null`
  - [x] Map: `id` = `v.id ?? v.createdAt`, `itemDetails`, `marketData`, `imageUri` (pass through)
  - [x] Export the function so the unit test can import it directly
- [x] Write unit test for `mapValuationsToGridItems` (AC6)
  - [x] Create `apps/mobile/__tests__/historyMapping.test.ts`
  - [x] Test: success valuation maps all fields correctly
  - [x] Test: non-SUCCESS status valuation is filtered out
  - [x] Test: SUCCESS valuation with `response == null` is filtered out
  - [x] Test: missing `id` falls back to `createdAt`
- [x] Implement responsive history grid using `useWindowDimensions()` (AC1)
  - [x] Use `useWindowDimensions()` from `react-native` — zero new dependencies, deterministic, works on all platforms
  - [x] Apply responsive breakpoints: `width < 600` → 1 column, `600–1023` → 2 columns, `1024–1439` → 3 columns, `>= 1440` → 4 columns
  - [x] Update `apps/mobile/components/organisms/history-grid.tsx` to accept and use a `numColumns` prop driven by the dimension hook
  - [x] Pass `imageUri` through from `HistoryGridItem` to `ValuationCard` so saved thumbnails actually render
  - [x] Update `apps/mobile/components/molecules/history-grid-skeleton.tsx` to match the live grid column count
  - [x] Preserve the existing Swiss Minimalist spacing and card rhythm from Story 0.10
- [x] Compute hero stats from real data (AC1, AC3)
  - [x] `itemCount = historyItems.length`
  - [x] `totalValue = historyItems.reduce(...marketData.fairMarketValue...)`
- [x] Render skeleton while loading, real grid when ready (AC2)
  - [x] Show `HistoryGridSkeleton` when `isLoading === true`
  - [x] Show `HistoryGrid` or empty state when `isLoading === false`
  - [x] Add a tappable "Start Valuing" CTA that routes to the Camera tab when history is empty
- [x] Remove all mock imports and constants (AC5)
  - [x] Delete the `MOCK_HISTORY` array and mock import lines
  - [x] Run `get_errors` to verify zero TypeScript errors
- [x] Navigation from history item (foundation for AC: Story 3.4)
  - [x] Keep `onItemPress={(item) => router.push('/appraisal?id=' + item.id)}` as placeholder
  - [x] Note: Story 3.4 will flesh out the detail route — do not implement detail view here

---

## Dev Notes

### Primary File to Change

**Primary screen file:** `apps/mobile/app/(tabs)/history.tsx`

**Supporting files likely needed for AC-complete implementation:**
- `apps/mobile/components/organisms/history-grid.tsx`
- `apps/mobile/components/molecules/history-grid-skeleton.tsx`

No backend changes and no new runtime dependencies. A new unit test file is expected.

### Import Changes

**Remove:**
```typescript
import {
  MOCK_CANON_CAMERA,
  MOCK_SONY_HEADPHONES,
  createMockItemDetails,
  createMockMarketData,
} from '@/types/mocks';
```

**Add:**
```typescript
import { useEffect, useCallback } from 'react'; // (React already imported)
import { useFocusEffect } from 'expo-router';
import { getLocalHistory } from '@/lib/localHistory';
import { Valuation, ValuationStatus } from '@/types/valuation';
```

`useFocusEffect` is exported directly from `expo-router` (not `@react-navigation/native`).
Both work, but `expo-router` is the established pattern in this codebase.

### Data Mapping Pattern

```typescript
const historyItems: HistoryGridItem[] = history
  .filter((v) => v.status === ValuationStatus.SUCCESS && v.response != null)
  .map((v) => ({
    id: v.id ?? v.createdAt, // v.id is optional (backend UUID), v.createdAt always present
    itemDetails: v.response!.itemDetails,
    marketData: v.response!.marketData,
    imageUri: v.imageUri,
  }));
```

### Re-fetch on Tab Focus Pattern

`useFocusEffect` requires its callback to be wrapped in `useCallback`:

```typescript
useFocusEffect(
  useCallback(() => {
    fetchHistory();
  }, [])
);
```

The `useEffect` call on mount handles the initial load (`isLoading = true → false`).
The `useFocusEffect` handles subsequent tab returns — by that point `isLoading` is already
`false`, so there is no skeleton flash on re-focus; the grid updates in place.

### Loading State Sequence

```
mount
  → isLoading = true    → render HistoryGridSkeleton
  → getLocalHistory()   → (AsyncStorage read, ~10ms)
  → setHistory(result)  → isLoading = false → render HistoryGrid or empty state

user returns to tab via useFocusEffect
  → fetchHistory()      → isLoading is already false
  → setHistory(result)  → grid updates in place (no skeleton re-shown)
```

This avoids the skeleton flashing on every tab switch after the initial load. If you
want to show a skeleton on re-focus as well, set `isLoading = true` before each fetch.
For MVP, the silent re-fetch is the better UX (less jarring).

### `HistoryGridItem.id` Key Strategy

`Valuation.id` is optional — it is the backend UUID from Supabase, which is `undefined`
if the Supabase save failed (best-effort semantics from Story 3.2). Use
`v.id ?? v.createdAt` as the React `key` and `HistoryGridItem.id`. `createdAt` is
always present and is an ISO string, so it satisfies uniqueness within a user's
session (two valuations in the same millisecond is not a realistic concern).

### imageUri Persistence Caution

`imageUri` stored in local history is a local device file URI (e.g.,
`file:///data/user/0/...`). These URIs can become invalid after app data is cleared
or device restarts in some edge cases. `ValuationCard` handles `imageUri={undefined}`
gracefully with a placeholder (already implemented). No defensive code needed here
— the existing card component handles it.

### Hero Stats Calculation

This mirrors the existing mock-based calculation:

```typescript
const totalValue = historyItems.reduce(
  (sum, item) => sum + (item.marketData.fairMarketValue ?? 0),
  0
);
const itemCount = historyItems.length;
```

### Empty State CTA Requirement

The current mock screen only renders explanatory text. Story 3.3 must add a real
navigation CTA to satisfy the epic requirement:

```typescript
<SwissPressable onPress={() => router.push('/')}>
  <Text variant="body" className="font-semibold">Start Valuing</Text>
</SwissPressable>
```

Use `/` as the Camera-tab target in this app; route groups are internal structure.
It must be a
tappable control, not just body copy.

### Responsive Grid Requirement

Epic 3.3 requires responsive layout behavior, not a fixed two-column grid. The
current `HistoryGrid` and `HistoryGridSkeleton` are both hard-coded to a two-column
presentation, so the story must permit supporting edits in both files.

**Implementation:** Use `useWindowDimensions()` from `react-native` — zero new dependencies, deterministic, works on all platforms.

```typescript
const { width } = useWindowDimensions();

const numColumns =
  width < 600 ? 1 :
  width < 1024 ? 2 :
  width < 1440 ? 3 :
  4;
```

Minimum acceptable outcome for 3.3:
- `width < 600px` → 1 column, full-width cards (correct Swiss Minimalist expression on small screens — not a layout reduction)
- `600–1023px` → 2 columns
- `1024–1439px` → 3 columns
- `>= 1440px` → 4 columns

Match the existing Swiss Minimalist spacing and avoid introducing decorative card
styling, rounded corners, or shadow-based hierarchy.

### Navigation to Detail (Scope Boundary)

Story 3.4 implements the detail view. For 3.3, `onItemPress` can navigate to the
existing `/appraisal` route or remain as a no-op. Do NOT implement the detail screen
here — that is explicitly Story 3.4's scope. A minimal placeholder is acceptable:

```typescript
onItemPress={(item) => router.push(`/appraisal?id=${item.id}`)}
```

### Project Structure Notes

| Area | Path |
|------|------|
| History screen | `apps/mobile/app/(tabs)/history.tsx` |
| LocalHistory utility | `apps/mobile/lib/localHistory.ts` |
| Valuation types | `apps/mobile/types/valuation.ts` |
| HistoryGrid organism | `apps/mobile/components/organisms/history-grid.tsx` |
| ValuationCard molecule | `apps/mobile/components/molecules/valuation-card.tsx` |
| HistoryGridSkeleton | `apps/mobile/components/molecules/` |
| Mock factories (remove imports from here) | `apps/mobile/types/mocks.ts` |

### Testing Notes

- Unit tests: `getLocalHistory` is already tested in `__tests__/localHistory.test.ts`
- **AC6 requires a new unit test file:** `apps/mobile/__tests__/historyMapping.test.ts`
  - Extract `mapValuationsToGridItems` from the component into an exported pure function (no React, no hooks)
  - Four `it()` blocks minimum: correct field mapping, non-SUCCESS filtered, null-response filtered, `id` fallback to `createdAt`
  - No mocking of AsyncStorage or hooks needed — the function is pure
- **Do not** add new Playwright test files in this story — leave that for the QA agent
- Run `npx jest --testPathPattern='__tests__'` to verify no regressions

### References

- `Valuation` type: [types/valuation.ts](types/valuation.ts)
- `getLocalHistory` + `isValidValuation` guard: [lib/localHistory.ts](lib/localHistory.ts)
- `HistoryGrid` + `HistoryGridItem`: [components/organisms/history-grid.tsx](components/organisms/history-grid.tsx)
- `saveToLocalHistory` call (how valuations are structured when saved): [app/(tabs)/index.tsx](app/(tabs)/index.tsx#L125-L133)
- Story 3.2 save-valuation implementation: [docs/sprint-artifacts/3-2-implement-save-valuation-flow.md](docs/sprint-artifacts/3-2-implement-save-valuation-flow.md)

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Completion Notes List

- Replaced `MOCK_HISTORY` + all mock factory imports with `getLocalHistory()` from `@/lib/localHistory`.
- Extracted `mapValuationsToGridItems()` as a top-level exported pure function in `history.tsx` — filters to SUCCESS+non-null response, maps `id ?? createdAt`, passes `imageUri` through.
- Single `useFocusEffect` with `useRef` flag handles both initial load (`setIsLoading(false)`) and silent re-fetch on tab return — no duplicate fetch on mount.
- `useWindowDimensions()` drives `numColumns` (1/2/3/4 at <600/600-1023/1024-1439/≥1440).
- `HistoryGrid` updated: accepts `numColumns` prop, column width computed as `calc(N% - Xpx)`, passes `imageUri` to `ValuationCard`.
- `HistoryGridSkeleton` updated: accepts `numColumns` prop, uses same column width formula, inline `style` replaces hard-coded `basis-[48%]` Tailwind class.
- Empty state: shows "Start Valuing" `SwissPressable` (with required `accessibilityLabel`) routing to `/` (Camera tab).
- Hero stats computed from real `historyItems` (totalValue, itemCount).
- 5 new unit tests in `__tests__/historyMapping.test.ts` cover all 4 AC6 cases plus `imageUri` passthrough.
- **Test result:** 21 tests pass (5 new + 16 pre-existing). Zero TypeScript errors.

### File List

- `apps/mobile/app/(tabs)/history.tsx` — complete rewrite (mocks removed, real data wired)
- `apps/mobile/components/organisms/history-grid.tsx` — added `numColumns` prop, `imageUri` passthrough
- `apps/mobile/components/molecules/history-grid-skeleton.tsx` — added `numColumns` prop, dynamic column width
- `apps/mobile/__tests__/historyMapping.test.ts` — new file (AC6 unit tests)

### Change Log

- Story 3.3 implemented (Date: 2026-03-20)
- Code review fixes applied (Date: 2026-03-21): H1 accessibilityLabel added, M1 double-fetch consolidated to single useFocusEffect, M2 useCallback deps fixed
