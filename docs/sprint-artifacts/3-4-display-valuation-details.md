# Story 3.4: Display Valuation Details

**Status:** done

---

## Story

**As a** user,
**I want** to view the full details of a past valuation,
**So that** I can see all the information for listing or reference.

---

## Business Context

### Why This Story Matters

Story 3.3 wires the History tab to real `getLocalHistory()` data and sets up `onItemPress` with a placeholder route to `/appraisal?id=<item.id>`. The placeholder already exists, but it navigates to the existing `appraisal.tsx` screen, which only knows how to render params-based mock data — it has no concept of loading a saved record by ID. Story 3.4 gives every saved valuation a dedicated detail screen that loads from local history by ID and presents the full record in the Swiss Minimalist style.

**Current State:**
- ✅ `apps/mobile/app/appraisal.tsx` exists — Swiss-layout full-width valuation report screen that accepts URL params
- ✅ `apps/mobile/lib/localHistory.ts` has `getLocalHistory()` returning validated `Valuation[]` from AsyncStorage
- ✅ `apps/mobile/types/valuation.ts` has `Valuation` with `id?`, `createdAt`, `imageUri?`, `response?.itemDetails`, `response?.marketData`, `response?.confidence`, `response?.valuationId`
- ✅ `apps/mobile/components/molecules/valuation-card.tsx` — `ValuationCard` supports `itemDetails`, `marketData`, `imageUri`
- ✅ `apps/mobile/components/molecules/confidence-warning.tsx` — `ConfidenceWarning` renders LOW-confidence messaging
- ✅ `apps/mobile/components/primitives` — `ScreenContainer`, `Box`, `Stack`, `Text`, `SwissPressable` fully available
- ✅ History tab navigates with `router.push('/appraisal?id=' + item.id)` — route already registered (Expo Router picks up `appraisal.tsx` automatically)
- ⚠️ Current saved `Valuation` records do not include a generated listing description field; the detail view must render only fields that actually exist in `ValuationResponse` / `ItemDetails` / `MarketData`
- ❌ `appraisal.tsx` does not accept an `id` param and does not load from local history
- ❌ No timestamp display for saved valuations
- ❌ No "Delete" action on the detail screen
- ❌ No "List on eBay" action on the detail screen (stub acceptable for MVP — full listing is Epic 5)
- ❌ No loading/not-found state for when a detail record is looked up by ID

**What This Story Delivers:**
- `appraisal.tsx` extended to support an `id` URL param that loads the full `Valuation` from local history
- Detail screen renders `ValuationCard`, confidence info, full data table including timestamp, and action buttons
- Delete action removes the record from local history and navigates back
- "List on eBay" button is rendered as a stub CTA and shows a "Coming soon" alert (Epic 5 scope)
- Not-found state rendered if the ID does not match any saved record

### Value Delivery

- **Completes the history UX loop:** users can now tap any saved card and review the full data
- **Enables reference use case:** resellers can access their earlier valuations without re-appraising
- **Epic unlock prerequisite:** Epic 4 (Auth) will extend this screen with cloud-sync details; the ID-based loading pattern is ready for server-side lookups

### Epic Context

This is Story 4 of 5 in Epic 3 (History & Persistence). It depends on:

```
3.1 DB Schema
   └─► 3.2 Save Valuation Flow
          └─► 3.3 History List View (onItemPress placeholder → /appraisal?id=...)
                 └─► 3.4 Valuation Details (this story) ◄── you are here
                        └─► 3.5 Offline Viewing
```

---

## Acceptance Criteria

### AC1: Detail View Loads Valuation by ID

**Given** the user taps a valuation card in the History tab  
**When** the detail screen opens with `?id=<valuation_id>`  
**Then** the full `Valuation` record is fetched from `getLocalHistory()` by matching `id` or, as fallback, `createdAt`  
**And** the screen renders without errors  
**And** the full item image is displayed prominently (if `imageUri` is present)  
**And** all saved valuation data is shown: item name, price range, confidence, sample size, condition details, category hint, search keywords, and identifiers when present  
**And** the timestamp shows when the valuation was created (FR33), formatted as human-readable date/time (e.g., "March 19, 2026 at 3:45 PM")

---

### AC2: Not-Found State for Missing or Deleted Records

**Given** the user navigates to `/appraisal?id=<unknown_id>` (e.g., after deleting a record, or with a stale link)  
**When** `getLocalHistory()` returns no matching `Valuation`  
**Then** the screen shows a clear "Valuation not found" empty state  
**And** a "Back to History" button navigates to the History tab  
**And** no crash, uncaught error, or blank screen occurs

---

### AC3: Loading State While Fetching from AsyncStorage

**Given** the detail screen has just been navigated to  
**When** `getLocalHistory()` is in progress  
**Then** a skeleton or loading indicator is shown  
**And** it transitions to the real content once the lookup resolves  
**And** the transition does not cause layout shift on the primary content area

---

### AC4: Delete Action Removes Record

**Given** the detail screen is displaying a saved valuation  
**When** the user taps "Delete"  
**Then** a confirmation step is presented (platform-appropriate — e.g., `Alert.alert` on native, `window.confirm` on web, or an inline destructive button treatment in Swiss Minimalist style)  
**And** on confirmation, the valuation is removed from local history via `deleteFromLocalHistory(id)`  
**And** the screen navigates to the History tab  
**And** the deleted record is no longer shown once the History screen refresh logic from Story 3.3 runs

---

### AC5: "List on eBay" Action Is Present but Stubbed

**Given** the detail screen is displaying a saved valuation  
**When** the user taps "List on eBay"  
**Then** the button is rendered with clear label  
**And** in MVP it shows a toast/alert "Coming soon — eBay listing will be available in a future update"  
**And** the button is styled with Signal red (`text-signal` or `bg-signal`) to indicate primary action, consistent with the Swiss Minimalist CTA convention  
**And** no navigation away from the app or crash occurs

---

### AC6: Back Navigation Works Correctly

**Given** the detail screen is open  
**When** the user taps the back button (rendered as "← Back" per Swiss convention)  
**And** when the system back button / gesture is used  
**Then** the user returns to the History tab (or wherever they navigated from)  
**And** Expo Router stack navigation handles this correctly (no double-push, no loop)

---

### AC7: Unit Test Covers ID Lookup Logic

**Given** a `findValuationById(history: Valuation[], id: string): Valuation | undefined` pure function is extracted  
**When** the unit test suite runs  
**Then** the test covers:  
  - Exact match on `valuation.id`  
  - Fallback match on `valuation.createdAt` (when `id` is absent)  
  - Returns `undefined` when no match found  
**And** `npx jest` exits with all tests passing (including pre-existing tests)

---

## Tasks / Subtasks

- [x] Add `deleteFromLocalHistory` to `lib/localHistory.ts` (AC4)
  - [x] Implement `deleteFromLocalHistory(id: string): Promise<void>` — reads current array, filters out the entry whose `id === id` OR `createdAt === id`, writes back
  - [x] Export the function from `localHistory.ts`

- [x] Extract `findValuationById` as a pure exported function (AC1, AC7)
  - [x] Create pure function `findValuationById(history: Valuation[], id: string): Valuation | undefined`
  - [x] Lookup strategy: first try `v.id === id`, then `v.createdAt === id` (fallback for entries saved without a backend UUID)
  - [x] Place in the detail screen file (or a co-located util) and export for testing
  - [x] Write unit test: `apps/mobile/__tests__/valuationDetail.test.ts`
    - [x] Test: finds by `id` field
    - [x] Test: finds by `createdAt` fallback
    - [x] Test: returns `undefined` when no match

- [x] Extend `appraisal.tsx` to handle `id`-based history lookup (AC1, AC2, AC3)
  - [x] Add `id` to the `useLocalSearchParams` type: `id?: string`
  - [x] Add local state: `detailValuation: Valuation | undefined | null` (`null` = not found, `undefined` = loading)
  - [x] Add local state: `isLoadingDetail: boolean`
  - [x] In a `useEffect` on `params.id`: call `getLocalHistory()`, run `findValuationById()`, set state
  - [x] If the matching valuation has no `response`, treat it as corrupted history and render the not-found state rather than crashing on property access
  - [x] Branch rendering:
    - `isLoadingDetail === true` → show skeleton/loading indicator (reuse `ValuationCardSkeleton` or a Box with loading text)
    - `detailValuation === null` → show not-found state with "Back to History" button
    - `detailValuation` is set → render full detail as described below
  - [x] Keep existing params-based rendering for the inline camera flow result (no `id` param path) — **do not break the existing camera → appraisal flow**

- [x] Render full detail content (AC1)
  - [x] Display `ValuationCard` with `itemDetails={detailValuation.response.itemDetails}`, `marketData={detailValuation.response.marketData}`, `imageUri={detailValuation.imageUri}`
  - [x] Display `ConfidenceWarning` below the card (already imported in appraisal.tsx)
  - [x] Display data table rows: Range, Analyzed (pricesAnalyzed), Confidence
  - [x] Display supporting detail rows using existing saved fields only: Condition, Category, Search Keywords, and identifiers when present
  - [x] Display timestamp row: label "Saved" with formatted `detailValuation.createdAt` value

- [x] Format timestamp for display (AC1)
  - [x] Implement inline helper `formatDetailTimestamp(iso: string): string` using `Intl.DateTimeFormat` (no new date library):
    ```typescript
    new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso))
    ```
  - [x] Gracefully fallback to raw ISO string if `new Date(iso)` is invalid

- [x] Render action buttons (AC4, AC5)
  - [x] "Delete" button: standard destructive treatment — `SwissPressable` with `text-signal` or `Text variant="body"` in Signal red
  - [x] "List on eBay" button: primary CTA — `SwissPressable` with full-width Signal red background styling
  - [x] Delete: call `Alert.alert` (React Native) for confirmation, then `deleteFromLocalHistory`, then navigate deterministically to `/history` using `router.replace('/history')`
  - [x] List on eBay: call `Alert.alert` with "Coming soon" message, no navigation

- [x] Back navigation (AC6)
  - [x] "← Back" `SwissPressable` with `router.replace('/history')` in detail mode — consistent with story requirement for deterministic navigation

---

## Dev Notes

### Architecture Decision: Extend `appraisal.tsx` vs. New File

**Decision: Extend `appraisal.tsx`.**

Rationale:
- The existing `appraisal.tsx` is already registered as a Stack screen and accepts URL params — extending it avoids creating a parallel route
- The camera inline-result flow already navigates here; splitting into two files would require route changes in multiple places
- The Swiss Minimalist layout shell (back button, display-size heading, divider, `ScreenContainer`) is identical for both uses
- `if (params.id) { /* detail mode */ } else { /* camera result mode */ }` is clean and explicit

Do NOT create a new route file for this story.

### Primary Files to Change

| File | Change |
|------|--------|
| `apps/mobile/app/appraisal.tsx` | Primary: ID-param branch, detail rendering, delete/stub actions |
| `apps/mobile/lib/localHistory.ts` | Add `deleteFromLocalHistory` export |

**New test file:**
- `apps/mobile/__tests__/valuationDetail.test.ts`

**No backend changes. No new npm packages. No new route files.**

### Existing `appraisal.tsx` Preservation

The existing camera-flow path must remain fully intact. The branching strategy is:

```typescript
const params = useLocalSearchParams<{
  id?: string;             // ← NEW: history detail mode
  imageUri?: string;       // ← existing camera mode
  brand?: string;
  // ... rest of existing params unchanged
}>();

if (params.id) {
  // HISTORY DETAIL MODE — new in 3.4
  // ... render from local history
} else {
  // CAMERA RESULT MODE — existing behavior unchanged
  // ... existing mock/params-based render
}
```

The `_demo` loading branch at the top of the component must remain untouched (used by screenshot tests).

### `deleteFromLocalHistory` Implementation Pattern

```typescript
export async function deleteFromLocalHistory(id: string): Promise<void> {
  try {
    const current = await getLocalHistory();
    const updated = current.filter(
      (v) => v.id !== id && v.createdAt !== id
    );
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Best-effort: if delete fails, history remains unchanged
  }
}
```

This mirrors the filter logic in `findValuationById` for consistency.

### `findValuationById` Implementation Pattern

```typescript
export function findValuationById(
  history: Valuation[],
  id: string
): Valuation | undefined {
  return (
    history.find((v) => v.id === id) ??
    history.find((v) => v.createdAt === id)
  );
}
```

Exported from the detail screen or a separate co-located module. Must be a pure function (no async, no React) for unit testability.

### Loading / Not-Found States

```typescript
// Loading
if (isLoadingDetail) {
  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />
      <SwissPressable onPress={() => router.back()} ...>
        <Text variant="body" className="text-ink-muted">← Back</Text>
      </SwissPressable>
      <ValuationCardSkeleton />
    </ScreenContainer>
  );
}

// Not found
if (detailValuation === null) {
  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />
      <SwissPressable onPress={() => router.replace('/history')} ...>
        <Text variant="body" className="text-ink-muted">← Back to History</Text>
      </SwissPressable>
      <Text variant="display">Not{'\n'}found</Text>
      <Text variant="body" className="text-ink-light mt-3">
        This valuation may have been deleted or is no longer available.
      </Text>
    </ScreenContainer>
  );
}
```

### Timestamp Formatting

`Intl.DateTimeFormat` is available in Hermes (React Native 0.70+) and all modern browsers. No date library needed.

```typescript
function formatDetailTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
```

Example output: `"March 19, 2026 at 3:45 PM"`

### Delete Confirmation Pattern

Use React Native's `Alert.alert` — this is the correct cross-platform primitive for this app (not `window.confirm`):

```typescript
import { Alert } from 'react-native';

const handleDelete = () => {
  Alert.alert(
    'Delete Valuation',
    'This will permanently remove this valuation from your history.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFromLocalHistory(params.id!);
          router.replace('/history');
        },
      },
    ]
  );
};
```

On web, `Alert.alert` from React Native Web renders a browser dialog — acceptable for MVP. No custom modal needed.

### "List on eBay" Stub Pattern

```typescript
const handleListOnEbay = () => {
  Alert.alert(
    'Coming Soon',
    'eBay listing will be available in a future update.',
    [{ text: 'OK' }]
  );
};
```

Render the button at full width, Signal red background, white text — matching the Swiss primary CTA convention. This makes the intent visible for user testing even though the action is stubbed.

### History Tab Re-fetch After Delete

Story 3.4 should only navigate back after deletion. The actual History-screen refresh behavior belongs to Story 3.3 implementation. If Story 3.3 has already been implemented as written, its focus-based re-fetch will pick up the deletion automatically.

### Data Table Layout Pattern

Reuse the existing summary table pattern already in `appraisal.tsx`:

```tsx
<SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
  <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Saved</Text>
  <Text variant="body" className="font-semibold">{formatDetailTimestamp(detailValuation.createdAt)}</Text>
</SwissStack>
```

Add the "Saved" row to the existing Range / Analyzed / Confidence rows.

### Valuation Data Access Pattern

The `Valuation` type has `response?: ValuationResponse`. In detail mode, `response` is guaranteed to be present (we only save `SUCCESS` valuations), but TypeScript doesn't know this. Use the non-null assertion `detailValuation.response!` after confirming the branch has a real record, or add a guard:

```typescript
if (!detailValuation.response) {
  // Corrupted record — treat as not-found
  // detailValuation = null;
}
```

Do not invent a description field. The current saved valuation model does not persist one. Render the available item metadata from `ItemDetails` instead.

This aligns with the `isValidValuation` guard in `localHistory.ts` and prevents property access crashes.

### No Backend Changes

All data reads/writes in this story operate on `AsyncStorage` via `lib/localHistory.ts`. The backend is not involved. No new API calls.

### No New npm Packages

All required utilities (`Alert`, `Intl.DateTimeFormat`, `AsyncStorage`, `expo-router`) are already present. Do not introduce new dependencies.

### Testing Notes

- **New unit test file:** `apps/mobile/__tests__/valuationDetail.test.ts`
  - Tests `findValuationById` pure function only — 3 cases (see AC7)
  - Do not test React components or hooks in this file
- **Do not** add Playwright screenshot tests in this story — leave for QA agent
- Run `npx jest --testPathPattern='__tests__'` to verify no regressions
- Expected test count after story: at least 20 passing (17 pre-existing + 3 new)

### Project Structure Notes

| Area | Path |
|------|------|
| Detail screen (primary file) | `apps/mobile/app/appraisal.tsx` |
| LocalHistory utility | `apps/mobile/lib/localHistory.ts` |
| Valuation types | `apps/mobile/types/valuation.ts` |
| ValuationCard component | `apps/mobile/components/molecules/valuation-card.tsx` |
| ValuationCardSkeleton | `apps/mobile/components/molecules/` |
| ConfidenceWarning | `apps/mobile/components/molecules/confidence-warning.tsx` |
| Primitives | `apps/mobile/components/primitives` |
| Unit test | `apps/mobile/__tests__/valuationDetail.test.ts` |

### References

- Epic 3, Story 3.4 requirements: [docs/epics.md](../epics.md) (Sec. "Story 3.4: Display Valuation Details")
- Previous story patterns: [docs/sprint-artifacts/3-3-build-history-list-view.md](3-3-build-history-list-view.md)
- LocalHistory utility: `apps/mobile/lib/localHistory.ts`
- Valuation types: `apps/mobile/types/valuation.ts`
- Swiss Minimalist design: [docs/SWISS-MINIMALIST.md](../SWISS-MINIMALIST.md)
- UX specification: [docs/ux-design-specification.md](../ux-design-specification.md)
- Architecture: [docs/architecture.md](../architecture.md)
- Project context: [docs/project_context.md](../project_context.md)

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (dev-story workflow — 2026-03-20)

### Debug Log References

N/A — no unexpected failures.

### Completion Notes List

- Story created 2026-03-19. No `appraisal.tsx` regression risk: `params.id` branch is additive only.
- `findValuationById` dual-lookup strategy (`id` then `createdAt` fallback) mirrors the same dual-key pattern used by `deleteFromLocalHistory` and `saveToLocalHistory` in localHistory.ts for consistency.
- Story 3.5 (offline) will extend the not-found state to distinguish "record deleted" from "offline + not cached".
- TDD: RED tests written first (`valuationDetail.test.ts` + 3 new tests in `localHistory.test.ts`), then GREEN implementation, then verified with full suite.
- 27/27 tests pass (21 pre-existing + 3 `deleteFromLocalHistory` + 3 `findValuationById`). Pre-existing 2 tsc errors (index.tsx EncodingType, demo-loading.tsx gap prop) are unrelated to this story.
- `_demo === 'loading'` branch kept intact and untouched for screenshot test compatibility.
- Used `router.replace('/history')` (not `router.back()`) for all back/post-delete navigation in detail mode per story validation fix.
- eBay CTA: `Alert.alert('Coming soon', ...)` only — no navigation.

### File List

| File | Change |
|------|--------|
| `apps/mobile/app/appraisal.tsx` | Extended: `findValuationById` export, `formatDetailTimestamp` helper, `id` param branch with loading/not-found/detail renders, delete + eBay stub action buttons |
| `apps/mobile/lib/localHistory.ts` | Added `deleteFromLocalHistory(id)` export |
| `apps/mobile/__tests__/valuationDetail.test.ts` | New: 3 unit tests for `findValuationById` |
| `apps/mobile/__tests__/localHistory.test.ts` | Extended: 3 unit tests for `deleteFromLocalHistory` |

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-19 | 0.1 | Story created (SM workflow) | claude-sonnet-4-5 |
| 2026-03-20 | 1.0 | Implementation complete (dev-story workflow) | claude-sonnet-4-6 |
