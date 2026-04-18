# Story 5.2: Pre-Fill Title from AI Identification

Status: done

## Story

As a user,
I want the listing title pre-filled from the AI item identification,
so that I don't have to type it manually.

## Business Context

### Why This Story Matters

Story 5-1 built the `ListingForm` shell with all six fields empty. Epic 5's goal is "6/8 fields
pre-filled." Story 5-2 is the first pre-fill: the listing **Title** field. Title is the most
important listing field for search visibility and the one users are least likely to craft well
on their own. Pre-filling it from the AI identification delivers the core promise of the listing
feature and proves the pattern that Stories 5-3 through 5-6 will repeat.

### Current State

```
✅ apps/mobile/app/listing/[id].tsx           — screen exists; passes valuationId to ListingForm only
✅ apps/mobile/components/organisms/listing-form.tsx — ListingForm exists; all fields default to ''
✅ apps/mobile/types/listing.ts               — ListingFormValues, listingFormSchema, LISTING_TITLE_MAX_LENGTH = 80
✅ apps/mobile/lib/localHistory.ts            — getLocalHistory() returns Valuation[]
✅ apps/mobile/app/appraisal.tsx              — export function findValuationById(history, id) — exact dual-key lookup
✅ apps/mobile/lib/utils/index.ts             — utility barrel; buildEbaySearchUrl and image-validation already exported
✅ apps/mobile/__tests__/listing-form.test.tsx  — unit tests for form shell (Story 5-1)
✅ apps/mobile/__tests__/listing-screen.test.tsx — screen tests for guest guard / back nav (Story 5-1)
❌ buildAiListingTitle()                       — does not exist; no title-building utility
❌ ListingForm.initialValues prop             — does not exist; form has no pre-fill extension point
❌ listing/[id].tsx valuation loading         — screen does not load valuation data from history
❌ AI-generated indicator on title field      — does not exist
```

### What This Story Delivers

Four targeted changes:

1. **`apps/mobile/lib/utils/listing-title.ts`** — NEW: `buildAiListingTitle(itemDetails)` pure utility that composes `brand + model + itemType`, filters `'unknown'` tokens, and truncates at a word boundary to ≤80 chars.
2. **`apps/mobile/lib/utils/index.ts`** — export `buildAiListingTitle` from the utils barrel.
3. **`apps/mobile/components/organisms/listing-form.tsx`** — add optional `initialValues?: Partial<ListingFormValues>` prop; feed into RHF `defaultValues`; render an "AI-generated" caption below the Title field when `initialValues.title` is non-empty.
4. **`apps/mobile/app/listing/[id].tsx`** — add valuation loading from `getLocalHistory` (same pattern as `appraisal.tsx`); derive AI title with `buildAiListingTitle`; pass `initialValues` to `ListingForm`; add loading and not-found states.

No new routes, no new types required, no backend changes.

### Epic 5 Story Graph

```
5-1 Build Listing Form Component             ✅ done (scaffold)
5-2 Pre-Fill Title from AI Identification    ◄── you are here
5-3 Pre-Fill Description from AI
5-4 Pre-Fill Price from Valuation            (uses same initialValues pattern as this story)
5-5 Pre-Fill Category from AI Classification (uses same initialValues pattern as this story)
5-6 Pre-Fill Condition from AI Assessment    (uses same initialValues pattern as this story)
5-7 Include Original Photo in Listing
5-8 Enable Field Editing                     (will make AI indicator dynamic — tracks mutations)
5-9 Implement Copy to Clipboard
5-10 Display Pre-Filled vs Manual Distinction
```

---

## Acceptance Criteria

### AC1: Title Field Pre-Filled from AI on Form Load

**Given** the user navigates to `/listing/<valuationId>` where `valuationId` matches a local history entry with a successful `response.itemDetails`  
**When** the listing form renders  
**Then** the Title field value is pre-populated with an AI-generated title string  
**And** the title string is composed from `brand + model + itemType` (any `'unknown'` tokens omitted)  
**And** the title length is ≤80 characters  
**And** a caption "AI-generated" is visible below the Title input

### AC2: Title Follows eBay Best Practices

**Given** the AI identification returned a brand, model, and itemType  
**When** the title is built  
**Then** the format is `[brand] [model] [itemType]` omitting any part equal to `'unknown'` (case-insensitive)  
**And** leading/trailing whitespace is trimmed  
**And** if the composed string exceeds 80 characters it is truncated at the last word boundary before the limit  
**And** title can still be edited freely by the user (Stories 5-8 will track the mutation)

### AC3: Graceful Degradation When Valuation Not Found

**Given** the valuation ID in the route does not match any local history entry  
**When** the listing screen has finished loading  
**Then** the Title field is empty (no pre-fill, same as Story 5-1 behaviour)  
**And** no crash occurs  
**And** the "AI-generated" caption is NOT shown

### AC4: Loading State While Fetching Valuation

**Given** the listing screen mounts with a valid `valuationId`  
**When** the async `getLocalHistory()` call is in flight  
**Then** a loading indicator or skeleton is shown instead of the form  
**And** the form renders once the data has resolved

### AC5: No Regression on AC2–AC7 from Story 5-1

**Given** the listing form  
**When** rendered with or without `initialValues`  
**Then** all six fields still render  
**And** required-field validation, max-80 title validation, and the CTA button all work as before  
**And** the guest guard redirect continues to fire

---

## Tasks / Subtasks

- [x] Task 1: Create `apps/mobile/lib/utils/listing-title.ts` (AC: 1, 2, 3)
  - [x] 1.1: Import `ItemDetails` from `@/types` and `LISTING_TITLE_MAX_LENGTH` from `@/types/listing`
  - [x] 1.2: Implement `buildAiListingTitle(itemDetails: ItemDetails): string`:
    - Collect `[itemDetails.brand, itemDetails.model, itemDetails.itemType]`
    - Filter out any token where `token.toLowerCase() === 'unknown'` or `token.trim() === ''`
    - Join with a single space
    - If length ≤80, return as-is
    - Otherwise find the last space index within `str.slice(0, 80)` and slice there; if no space found, hard-truncate at 80
  - [x] 1.3: Export the function as a named export

- [x] Task 2: Export from utils barrel (AC: N/A — housekeeping)
  - [x] 2.1: Add `export { buildAiListingTitle } from './listing-title';` to `apps/mobile/lib/utils/index.ts`

- [x] Task 3: Extend `ListingForm` with `initialValues` prop and AI indicator (AC: 1, 2, 3, 5)
  - [x] 3.1: Add `initialValues?: Partial<ListingFormValues>` to `ListingFormProps` interface
  - [x] 3.2: Spread `initialValues` into RHF `defaultValues` — keep all existing field defaults, let `initialValues` override: `defaultValues: { title: '', category: '', condition: '' as ListingCondition, price: '', description: '', ...initialValues }`
  - [x] 3.3: Add `initialValues` to the destructured props: `{ valuationId, onSubmit, initialValues }`. In the Title `<Controller>` render block (below the character count `<Text>`), add conditionally rendered caption: `{initialValues?.title ? <Text variant="caption" className="text-ink-muted" testID="listing-title-ai-badge">AI-generated</Text> : null}` — show only when a non-empty initial title was provided (Story 5-8 will convert this to track mutations). Note: use the destructured `initialValues`, NOT `props.initialValues` — the component uses destructured parameters.
  - [x] 3.4: No other field changes in this story — Stories 5-3 through 5-6 will add their own indicators

- [x] Task 4: Update `apps/mobile/app/listing/[id].tsx` — load valuation and derive title (AC: 1, 2, 3, 4, 5)
  - [x] 4.1: **Depends on Task 2 being complete** (Task 4 imports `buildAiListingTitle` from `@/lib/utils` which won't exist until Task 2 adds the barrel export). Add `useState` to the existing React import (line 1 already has `import React, { useEffect } from 'react'` — change to `import React, { useEffect, useState } from 'react'`). Add new imports: `getLocalHistory` from `@/lib/localHistory`; `findValuationById` from `@/app/appraisal`; `buildAiListingTitle` from `@/lib/utils`; `type Valuation` from `@/types/valuation`
  - [x] 4.2: Add state: `const [valuation, setValuation] = useState<Valuation | null | undefined>(undefined)` — `undefined` = not yet loaded, `null` = loaded/not found, `Valuation` = found
  - [x] 4.3: Add `useEffect` — only fires when `valuationId` is defined:
    ```typescript
    useEffect(() => {
      if (!valuationId) return;
      getLocalHistory().then((history) => {
        const found = findValuationById(history, valuationId);
        setValuation(found ?? null);
      });
    }, [valuationId]);
    ```
  - [x] 4.4: Derive AI title: `const aiTitle = valuation?.response?.itemDetails ? buildAiListingTitle(valuation.response.itemDetails) : undefined;`
  - [x] 4.5: Wrap the existing `{valuationId ? <ListingForm ... /> : <error box>}` with a loading guard — when `valuationId` is set but `valuation === undefined`, render a loading state (e.g., `<Text variant="body" className="text-ink-muted mt-12">Loading…</Text>`). ⚠️ The existing `if (isGuest) return null;` early-return at line ~27 of `[id].tsx` must remain in place and above all new loading/rendering logic — do not move or remove it
  - [x] 4.6: Pass `initialValues` to `ListingForm`: `<ListingForm valuationId={valuationId} initialValues={aiTitle ? { title: aiTitle } : undefined} />`

- [x] Task 5: Add tests for `buildAiListingTitle` (AC: 2)
  - [x] 5.1: Create `apps/mobile/lib/utils/__tests__/listing-title.test.ts` (note: `__tests__/` directory does not exist yet — create it)
  - [x] 5.2: Test happy path: brand + model + itemType → correct concatenation
  - [x] 5.3: Test 'unknown' filtering: any token equal to 'unknown' (case-insensitive) is omitted
  - [x] 5.4: Test truncation at word boundary when composed string > 80 chars
  - [x] 5.5: Test hard truncation fallback when a single word exceeds 80 chars (no space found)
  - [x] 5.6: Test all three tokens unknown → returns empty string

- [x] Task 6: Extend `listing-form.test.tsx` for pre-fill and AI indicator (AC: 1, 3, 5)
  - [x] 6.1: Add test: `renders pre-filled title from initialValues` — pass `initialValues={{ title: 'Canon AE-1 35mm Film Camera' }}` and assert `listing-title-input.props.value === 'Canon AE-1 35mm Film Camera'`
  - [x] 6.2: Add test: `shows AI-generated badge when initialValues.title is non-empty` — render with `initialValues={{ title: 'Canon AE-1' }}` and assert `findByTestId(renderer, 'listing-title-ai-badge')` exists
  - [x] 6.3: Add test: `does not show AI-generated badge without initialValues` — render without `initialValues` and assert `listing-title-ai-badge` is NOT present using: `expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();` — `react-test-renderer`'s `.find()` throws when no node matches, so wrapping in `expect(() => ...).toThrow()` is the correct absence assertion (NOT `.toBeNull()` — that would itself throw uncaught)
  - [x] 6.4: Verify existing 5-1 tests still pass unchanged (no regression)

- [x] Task 7: Extend `listing-screen.test.tsx` for valuation loading (AC: 1, 3, 4)
  - [x] 7.1: **REQUIRED — do this first, before any new tests.** Add `jest.mock('@/lib/localHistory', () => ({ getLocalHistory: jest.fn() }))` at the top of the test file (alongside existing `jest.mock` declarations). Without this, ALL existing tests will break once `listing/[id].tsx` imports and calls `getLocalHistory` in its new `useEffect`. Add `mockGetLocalHistory.mockResolvedValue([])` to `beforeEach`. Keep `findValuationById` unmocked — it's a pure function from `@/app/appraisal` and works correctly with controlled mock data
  - [x] 7.2: Add test: `pre-fills title when valuation has itemDetails` — mock `getLocalHistory` to resolve with a valuation containing `response.itemDetails = { brand: 'Canon', model: 'AE-1', itemType: '35mm Film Camera', ... }`; after render + flush, assert the `listing-title-input` value is `'Canon AE-1 35mm Film Camera'`
  - [x] 7.3: Add test: `renders form with empty title when valuation not found` — mock `getLocalHistory` to resolve with `[]`; assert `listing-title-input` value is `''`
  - [x] 7.4: Add test: `does not show AI badge when all item tokens are unknown` — mock `getLocalHistory` with a valuation where `itemDetails = createMockItemDetails({ brand: 'unknown', model: 'unknown', itemType: 'unknown' })`; after render + flush, assert `expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow()`. This catches the specific wiring bug where `initialValues={{ title: aiTitle }}` is passed without the falsy guard, which would incorrectly render a badge for an empty title
  - [x] 7.5: Verify existing guest-guard and back-nav tests still pass (the `getLocalHistory` mock from Task 7.1 is already in place — no additional setup needed per test)

---

## Dev Notes

### Architecture Compliance

File locations prescribed by `docs/architecture.md`:

```
apps/mobile/
├── app/
│   └── listing/
│       └── [id].tsx              ← MODIFY: add valuation loading
├── components/
│   └── organisms/
│       └── listing-form.tsx      ← MODIFY: add initialValues prop + AI badge
└── lib/
    └── utils/
        ├── listing-title.ts      ← NEW: buildAiListingTitle utility
        ├── __tests__/
        │   └── listing-title.test.ts  ← NEW
        └── index.ts              ← MODIFY: add export
```

[Source: docs/architecture.md#Frontend Structure]

No new route files. No new type files. Do **not** create `lib/hooks/use-listing-data.ts` in this story — a hook is premature; the plain `useEffect + getLocalHistory` pattern used in `appraisal.tsx` is sufficient and consistent.

### Title Building Logic

```typescript
// apps/mobile/lib/utils/listing-title.ts
import type { ItemDetails } from '@/types';
import { LISTING_TITLE_MAX_LENGTH } from '@/types/listing';

export function buildAiListingTitle(itemDetails: ItemDetails): string {
  const parts = [itemDetails.brand, itemDetails.model, itemDetails.itemType]
    .filter((p) => p.trim() !== '' && p.toLowerCase() !== 'unknown');

  const full = parts.join(' ');
  if (full.length <= LISTING_TITLE_MAX_LENGTH) return full;

  // Truncate at word boundary
  const candidate = full.slice(0, LISTING_TITLE_MAX_LENGTH);
  const lastSpace = candidate.lastIndexOf(' ');
  return lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;
}
```

⚠️ **Do NOT** invent a more complex title-building strategy here. Stories 5-3–5-6 do not need title logic. If the eBay Sold Listings spike (Story 4.5-5 notes) surfaces better title guidance, that's a future iteration.

### ListingForm Extension Pattern

**Extend `ListingFormProps`, not `defaultValues` override:**

```typescript
// NEW prop
export interface ListingFormProps {
  valuationId: string;
  onSubmit?: (values: ListingFormValues) => void;
  initialValues?: Partial<ListingFormValues>;       // ← ADD
}

// Updated useForm call
const { control, handleSubmit, watch, formState: { errors } } = useForm<ListingFormValues>({
  resolver: zodResolver(listingFormSchema),
  defaultValues: {
    title: '',
    category: '',
    condition: '' as ListingCondition,
    price: '',
    description: '',
    ...initialValues,                                // ← spread LAST to override
  },
});
```

⚠️ **RHF `defaultValues` are captured once at mount.** They do not re-evaluate if `initialValues` changes after mount. This is intentional for this story — `listing/[id].tsx` will only pass `initialValues` once valuation loading is complete (the form won't mount until valuation is resolved, due to the loading guard in Task 4.5).

**AI badge placement** — goes inside the Title `<Controller>` render, below the character count:

```tsx
<Stack gap={1}>
  <Text variant="caption" className="text-ink-muted self-end">
    {titleLength}/{LISTING_TITLE_MAX_LENGTH}
  </Text>
  {initialValues?.title ? (
    <Text
      variant="caption"
      className="text-ink-muted"
      testID="listing-title-ai-badge"
    >
      AI-generated
    </Text>
  ) : null}
</Stack>
```

Swiss Minimalist rule: text-only indicator, no color, no icon, no background badge. [Source: docs/SWISS-MINIMALIST.md]

### listing/[id].tsx Loading Pattern

Mirrors `appraisal.tsx` exactly — follow that screen as the canonical reference:

```typescript
// Import changes — useEffect is ALREADY imported on line 1; just add useState:
import React, { useEffect, useState } from 'react';   // was: import React, { useEffect } from 'react';
import { getLocalHistory } from '@/lib/localHistory';  // same as appraisal.tsx
import { findValuationById } from '@/app/appraisal';   // exported named function
import { buildAiListingTitle } from '@/lib/utils';
import type { Valuation } from '@/types/valuation';

// State — matches appraisal.tsx tri-state pattern
const [valuation, setValuation] = useState<Valuation | null | undefined>(undefined);
// undefined = loading | null = not found | Valuation = found

useEffect(() => {
  if (!valuationId) return;           // guard: no ID → no load
  getLocalHistory().then((history) => {
    const found = findValuationById(history, valuationId);
    setValuation(found ?? null);
  });
}, [valuationId]);

const aiTitle = valuation?.response?.itemDetails
  ? buildAiListingTitle(valuation.response.itemDetails)
  : undefined;
```

**Render logic adjustment** (within the existing `{valuationId ? ... : ...}` block):

```tsx
{valuationId ? (
  valuation === undefined ? (
    // Loading: history fetch in flight
    <Text variant="body" className="text-ink-muted mt-12">
      Loading…
    </Text>
  ) : (
    <ListingForm
      valuationId={valuationId}
      initialValues={aiTitle ? { title: aiTitle } : undefined}
    />
  )
) : (
  // Existing error box for missing valuationId — do not change
  <Box className="mt-12">
    <Text variant="body" className="text-signal">
      Listing could not be opened because the valuation ID is missing.
    </Text>
  </Box>
)}
```

⚠️ The loading text is deliberately minimal — a skeleton will be added if needed in a polish story. Do not add `ValuationCardSkeleton` or `FormFieldSkeleton` here without a specific story requirement.

### Test Mock Strategy for listing-screen.test.tsx

The screen now calls `getLocalHistory` in a `useEffect`. The jest configuration maps AsyncStorage to the official mock (see `package.json#jest.moduleNameMapper`), but the simplest test approach is to mock `getLocalHistory` directly — the same pattern used in `camera-guest-mode.test.tsx`:

```typescript
jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn(),
}));

import { getLocalHistory } from '@/lib/localHistory';
const mockGetLocalHistory = getLocalHistory as jest.Mock;

// In beforeEach or per test:
mockGetLocalHistory.mockResolvedValue([]);   // default: empty history
```

Then for the pre-fill test:

```typescript
import { createMockItemDetails } from '@/types/mocks';

// Use createMockValuation from types/mocks.ts — handles all required fields with sensible defaults
import { createMockValuation, createMockValuationResponse, createMockItemDetails } from '@/types/mocks';

const mockValuation = createMockValuation({
  id: 'valuation-1',
  response: createMockValuationResponse({
    itemDetails: createMockItemDetails({ brand: 'Canon', model: 'AE-1', itemType: '35mm Film Camera' }),
    valuationId: 'valuation-1',
  }),
});

mockGetLocalHistory.mockResolvedValue([mockValuation]);
```

`findValuationById` is a pure function — do NOT mock it; import the real one from `@/app/appraisal`. It matches on `v.id === id`, so the `mockValuation.id === 'valuation-1'` will match the route param.

`createMockItemDetails` and `createMockMarketData` are already in `apps/mobile/types/mocks.ts` — use them.

### Frontend Review Checklist Pre-Checks

Per `docs/frontend-review-checklist.md`:
- [x] `useEffect` for valuation load has correct dependency array `[valuationId]`  
- [x] `initialValues` cannot change after mount (loading guard prevents form rendering until resolved) — no stale-closure risk  
- [x] No conditional hook calls introduced — all hooks remain at component top level  
- [x] The AI indicator is a non-interactive `Text` — no `accessibilityLabel` needed (screen readers read caption text)  
- [x] `buildAiListingTitle` is a pure function with no side effects — no `useCallback` needed  
- [x] No `EXPO_PUBLIC_*` variables involved  
- [x] Swiss form layout preserved: indicator text is caption size, flush-left, `text-ink-muted`

### Testing Requirements Summary

| Test file | New cases |
|---|---|
| `lib/utils/__tests__/listing-title.test.ts` | NEW: 6 unit tests for `buildAiListingTitle` |
| `__tests__/listing-form.test.tsx` | +3 cases: pre-fill renders, AI badge shown/hidden |
| `__tests__/listing-screen.test.tsx` | +3 cases: pre-fill from history, empty title fallback, all-unknown badge absent; +mock for `getLocalHistory` on all existing tests |

All existing Story 5-1 tests must continue to pass unchanged.

### References

- [Source: docs/epics.md#Story 5.2: Pre-Fill Title from AI Identification] — AC requirements
- [Source: docs/architecture.md#Frontend Structure] — file placement rules
- [Source: apps/mobile/app/appraisal.tsx#findValuationById] — exact lookup function to reuse
- [Source: apps/mobile/app/appraisal.tsx#useEffect + getLocalHistory] — loading pattern to mirror
- [Source: apps/mobile/lib/localHistory.ts] — async history utility, AsyncStorage-backed
- [Source: apps/mobile/components/organisms/listing-form.tsx] — form shell to extend
- [Source: apps/mobile/types/listing.ts#LISTING_TITLE_MAX_LENGTH] — constant already defined as 80
- [Source: apps/mobile/lib/utils/index.ts] — utils barrel to update
- [Source: apps/mobile/types/mocks.ts] — createMockItemDetails, createMockMarketData for tests
- [Source: docs/SWISS-MINIMALIST.md] — typography-only distinction, no colour indicators
- [Source: docs/frontend-review-checklist.md] — pre-review rules

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Focused Jest validation: `npm test -- --runTestsByPath lib/utils/__tests__/listing-title.test.ts __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand`

### Completion Notes List

- Added `buildAiListingTitle` utility with trimming, `unknown` filtering, and word-boundary truncation to the existing 80-character listing title limit.
- Extended `ListingForm` to accept one-time `initialValues` and show a text-only `AI-generated` caption only when a non-empty title is provided.
- Updated the listing screen to load the valuation from local history, preserve the guest early return, render a loading state while the async lookup resolves, and pass the derived title into the form only when present.
- Added focused utility, form, and screen tests covering prefill, graceful empty fallback, and the empty-title/no-badge regression case.

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 — 2026-04-06
**Outcome:** Approved with fixes applied

**Findings (3 Medium, 1 Low — all fixed):**

1. **[M1] No `.catch()` on `getLocalHistory()` promise** — `[id].tsx` had no error handler; a rejected promise would leave the user stuck on "Loading…" forever. Added `.catch(() => setValuation(null))` to fall through to the empty-title form.
2. **[M2] AC4 loading state had zero test coverage** — `renderScreen()` resolved the mock instantly so the loading UI was never observed. Added a deferred-promise test that asserts the "Loading…" text before resolution and the form after.
3. **[M3] ASCII `...` vs Unicode `…`** — Loading text used three ASCII periods while the codebase convention (e.g. `appraisal.tsx`) uses U+2026. Aligned to `Loading…`.
4. **[L1] Dev Agent Record model name** — Field read "GPT-5.4"; corrected to "Claude Sonnet 4.6".

### File List

- `apps/mobile/lib/utils/listing-title.ts`
- `apps/mobile/lib/utils/index.ts`
- `apps/mobile/components/organisms/listing-form.tsx`
- `apps/mobile/app/listing/[id].tsx`
- `apps/mobile/lib/utils/__tests__/listing-title.test.ts`
- `apps/mobile/__tests__/listing-form.test.tsx`
- `apps/mobile/__tests__/listing-screen.test.tsx`
