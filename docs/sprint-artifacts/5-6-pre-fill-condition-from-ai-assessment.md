# Story 5.6: Pre-Fill Condition from AI Assessment

Status: done

## Story

As a user,
I want the item condition pre-filled from the AI's visual assessment,
so that I don't have to manually select the correct eBay condition from the AI's description.

## Business Context

### Why This Story Matters

Stories 5-2 through 5-5 have pre-filled title, description, price, and category. Story 5-6 is the
last field in Phase A (Complete Pre-Fill Sprint). After this story, all five text fields will be
AI-populated and annotated with "AI-generated" captions when valuation data exists.

Condition is the trickiest pre-fill: the AI returns a `VisualCondition` enum (`'new'`,
`'used_excellent'`, `'used_good'`, `'used_fair'`, `'damaged'`) which must be mapped to eBay's
`ListingCondition` enum (`'new'`, `'like_new'`, `'very_good'`, `'good'`, `'acceptable'`). A
dedicated mapping utility is required — this is the only structural difference versus Stories 5-4 and
5-5.

### Current State After Story 5-5

```
✅ apps/mobile/app/listing/[id].tsx           — derives aiTitle + aiDescription + aiPrice + aiCategory; passes initialValues + priceRange
✅ apps/mobile/components/organisms/listing-form.tsx — AI badges on title, description, price, category; priceRange caption
✅ apps/mobile/types/item.ts                  — ItemDetails.visualCondition: VisualCondition ← no gap
✅ apps/mobile/types/listing.ts               — LISTING_CONDITION_VALUES, ListingCondition, listingFormSchema ← already present
✅ apps/mobile/types/mocks.ts                 — createMockItemDetails() default: visualCondition: 'used_good'
❌ apps/mobile/lib/utils/listing-condition.ts — does not exist yet
❌ aiCondition derivation in listing screen   — not implemented
❌ condition AI badge in listing form         — not implemented
```

### What This Story Delivers

Five targeted changes across 5–7 files:

1. **`apps/mobile/lib/utils/listing-condition.ts`** — NEW: `mapVisualConditionToListingCondition(visual)` mapping utility.
2. **`apps/mobile/lib/utils/index.ts`** — ADD barrel export for `mapVisualConditionToListingCondition`.
3. **`apps/mobile/app/listing/[id].tsx`** — Derive `aiCondition` from `valuation.response.itemDetails.visualCondition` via the mapping utility; merge into `initialValues`.
4. **`apps/mobile/components/organisms/listing-form.tsx`** — Wrap condition `FormInput` in `<Stack gap={1}>`, add "AI-generated" badge.
5. **`apps/mobile/lib/utils/__tests__/listing-condition.test.ts`** — NEW: unit tests for `mapVisualConditionToListingCondition` (all 5 inputs).
6. **`apps/mobile/__tests__/listing-form.test.tsx`** — EXTENDED: condition prefill and badge tests.
7. **`apps/mobile/__tests__/listing-screen.test.tsx`** — EXTENDED: condition prefill integration test, `'damaged'`→empty-field test.

No new routes, no backend changes, no type-chain changes.

### Epic 5 Story Graph

```
5-1  Build Listing Form Component              ✅ done
5-2  Pre-Fill Title from AI Identification     ✅ done
5-3  Pre-Fill Description from AI             ✅ done
5-4  Pre-Fill Price from Valuation             ✅ done
5-5  Pre-Fill Category from AI Classification  ✅ done
5-6  Pre-Fill Condition from AI Assessment     ◄── you are here
5-7  Include Original Photo in Listing
5-8  Enable Field Editing                      (converts condition to picker; adds dirtyFields badge guard)
5-9  Implement Copy to Clipboard
5-10 Display Pre-Filled vs Manual Distinction
5-11 Image Hosting Thumbnails
```

---

## Acceptance Criteria

### AC1: Condition Field Pre-Filled from AI on Form Load

**Given** the user navigates to `/listing/<valuationId>` where `valuationId` matches a local history
entry with a `response.itemDetails.visualCondition` that maps to a valid `ListingCondition`
(i.e., anything except `'damaged'`)
**When** the listing form renders
**Then** the Condition field value is pre-populated with the mapped `ListingCondition` string

### AC2: AI-Generated Badge Visible When Condition Is Pre-Filled

**Given** the condition field is pre-filled via AC1
**When** the listing form renders
**Then** a caption "AI-generated" is visible below the Condition input
**And** the badge has `testID="listing-condition-ai-badge"`

### AC3: Graceful Degradation for Unmappable or Absent Condition

**Given** `visualCondition` is `'damaged'` or the valuation is not found
**When** the listing form renders
**Then** the Condition field is empty (no pre-fill)
**And** no crash occurs
**And** the "AI-generated" caption is NOT shown

### AC4: Mapping Utility Correctness

| `VisualCondition` (AI output) | Maps to `ListingCondition` |
|---|---|
| `'new'`            | `'new'`        |
| `'used_excellent'` | `'like_new'`   |
| `'used_good'`      | `'good'`       |
| `'used_fair'`      | `'acceptable'` |
| `'damaged'`        | `undefined`    |

**Given** `mapVisualConditionToListingCondition` is called with each valid `VisualCondition`
**Then** it returns the `ListingCondition` value from the table above (or `undefined` for `'damaged'`)

### AC5: No Regression on Previous Pre-Fills

**Given** a valuation with all of title, description, price, category, and a mappable condition
**When** the listing form renders
**Then** Title, Description, Price, Category, and Condition fields show their AI-generated values
**And** all five "AI-generated" badges are visible
**And** all validation, back nav, and guest guard remain intact

---

## Design Decision: Condition Picker

**Decision for Story 5-6:** Leave the condition field as a plain `<FormInput>` text input.

**Rationale:** Story 5-8 (Enable Field Editing) is explicitly planned to convert the condition input
to a proper enum picker/segmented control as part of adding `dirtyFields` tracking. Splitting that
work between Story 5-6 and 5-8 adds complexity with no functional benefit — Story 5-6 is about
pre-population, not the editing UX.

**Impact:** In Story 5-6, the Condition field will be pre-filled with the mapped string value (e.g.
`'good'`). The user can edit it as free text but Zod enum validation will reject non-standard values
on submit. This is acceptable until Story 5-8 provides the picker. Document in Story 5-8 that the
picker replaces this text input.

**Epics.md AC note:** `docs/epics.md` Story 5.6 AC says "the condition dropdown is pre-filled." This
story intentionally keeps the field as a `<FormInput>` — the picker/dropdown is the Story 5-8
deliverable. This is a known, scoped deferral, not an oversight.

---

## Tasks / Subtasks

- [x] Task 1: Create `mapVisualConditionToListingCondition` utility (AC: 4)
  - [x] 1.1: Create `apps/mobile/lib/utils/listing-condition.ts` with the following exact content:
    ```typescript
    import type { VisualCondition } from '@/types/item';
    import type { ListingCondition } from '@/types/listing';

    const CONDITION_MAP: Partial<Record<VisualCondition, ListingCondition>> = {
      new: 'new',
      used_excellent: 'like_new',
      used_good: 'good',
      used_fair: 'acceptable',
      // 'damaged' intentionally absent — no safe eBay equivalent
    };

    export function mapVisualConditionToListingCondition(
      visual: VisualCondition
    ): ListingCondition | undefined {
      return CONDITION_MAP[visual];
    }
    ```
  - [x] 1.2: In `apps/mobile/lib/utils/index.ts`, add a barrel export below the `buildAiListingTitle` export block:
    ```typescript
    export {
      mapVisualConditionToListingCondition,
    } from './listing-condition';
    ```

- [x] Task 2: Derive `aiCondition` in listing screen and merge into `initialValues` (AC: 1, 2, 3, 5)
  - [x] 2.1: In `apps/mobile/app/listing/[id].tsx`, add the import for `mapVisualConditionToListingCondition` to the existing `@/lib/utils` import:
    ```typescript
    import { buildAiListingTitle, mapVisualConditionToListingCondition } from '@/lib/utils';
    ```
  - [x] 2.2: After the `const aiCategory = ...` line, add:
    ```typescript
    const aiCondition = valuation?.response?.itemDetails?.visualCondition
      ? mapVisualConditionToListingCondition(valuation.response.itemDetails.visualCondition)
      : undefined;
    ```
    Use the `? :` guard (not `||`) because `visualCondition` is a string enum — there is no empty-string
    zero-value to guard against. The mapping function handles `'damaged'` → `undefined` implicitly.
  - [x] 2.3: Update the `initialValues` prop to include `aiCondition`. The complete updated block is:
    ```tsx
    initialValues={
      aiTitle || aiDescription || aiPrice || aiCategory || aiCondition
        ? {
            ...(aiTitle       ? { title: aiTitle }             : {}),
            ...(aiDescription ? { description: aiDescription } : {}),
            ...(aiPrice       ? { price: aiPrice }             : {}),
            ...(aiCategory    ? { category: aiCategory }       : {}),
            ...(aiCondition   ? { condition: aiCondition }     : {}),
          }
        : undefined
    }
    ```
    ⚠️ Do NOT pass `{ condition: undefined }` — use the conditional spread. RHF's `defaultValues`
    must not receive `undefined` for `condition` or it will override the schema default `'' as ListingCondition`.

- [x] Task 3: Add AI badge to condition field in `ListingForm` (AC: 2, 3, 5)
  - [x] 3.1: In `apps/mobile/components/organisms/listing-form.tsx`, locate the `condition` `<Controller>` render block. Currently it renders `<FormInput .../>` directly inside the `render` prop. Wrap it in `<Stack gap={1}>` and add the badge (same pattern as category from Story 5-5):
    ```tsx
    render={({ field: { onChange, onBlur, value, ref } }) => (
      <Stack gap={1}>
        {/* TODO Story 5-8: convert condition input to a picker/segmented control */}
        <FormInput
          ref={ref}
          label="Condition *"
          placeholder="Enter one of: new, like_new, very_good, good, acceptable"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.condition?.message}
          returnKeyType="next"
          autoCapitalize="none"
          testID="listing-condition-input"
        />
        {initialValues?.condition ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-condition-ai-badge"
          >
            AI-generated
          </Text>
        ) : null}
      </Stack>
    )}
    ```
    **Badge condition:** `initialValues?.condition` (not `.trim()`) — `ListingCondition` is a string
    enum; a valid value is always non-empty. Unlike `string` fields (description, title), there is no
    whitespace-only edge case to guard against.
    **Schema note:** Do not modify `listingFormSchema` in this story. This task is presentation-only:
    the existing enum validation remains the source of truth until Story 5-8 introduces a picker.

- [x] Task 4: Write unit tests for the mapping utility (AC: 4)
  - [x] 4.1: Create `apps/mobile/lib/utils/__tests__/listing-condition.test.ts`:
    ```typescript
    import { mapVisualConditionToListingCondition } from '../listing-condition';

    describe('mapVisualConditionToListingCondition', () => {
      it('maps "new" to "new"', () => {
        expect(mapVisualConditionToListingCondition('new')).toBe('new');
      });

      it('maps "used_excellent" to "like_new"', () => {
        expect(mapVisualConditionToListingCondition('used_excellent')).toBe('like_new');
      });

      it('maps "used_good" to "good"', () => {
        expect(mapVisualConditionToListingCondition('used_good')).toBe('good');
      });

      it('maps "used_fair" to "acceptable"', () => {
        expect(mapVisualConditionToListingCondition('used_fair')).toBe('acceptable');
      });

      it('returns undefined for "damaged"', () => {
        expect(mapVisualConditionToListingCondition('damaged')).toBeUndefined();
      });
    });
    ```

- [x] Task 5: Extend `listing-form.test.tsx` with condition badge tests (AC: 2, 3)
  - [x] 5.1: Add the following tests to the existing `describe('ListingForm', ...)` block in
    `apps/mobile/__tests__/listing-form.test.tsx`:
    ```typescript
    it('renders a pre-filled condition from initialValues', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ condition: 'good' }} />,
        );
      });

      expect(findByTestId(renderer!, 'listing-condition-input').props.value).toBe('good');
    });

    it('shows the AI-generated badge on condition when initialValues.condition is set', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ condition: 'like_new' }} />,
        );
      });

      expect(
        getTextContent(findByTestId(renderer!, 'listing-condition-ai-badge').props.children),
      ).toBe('AI-generated');
    });

    it('does not show the condition AI badge without initialValues.condition', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
        );
      });

      expect(() => findByTestId(renderer!, 'listing-condition-ai-badge')).toThrow();
    });
    ```

- [x] Task 6: Extend `listing-screen.test.tsx` with condition integration tests (AC: 1, 3, 5)
  - [x] 6.1: Add tests after the existing `'does not pre-fill category when categoryHint is empty'` test in `apps/mobile/__tests__/listing-screen.test.tsx`:
    ```typescript
    it('pre-fills the condition when visualCondition maps to a valid ListingCondition', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          response: createMockValuationResponse({
            itemDetails: createMockItemDetails({
              visualCondition: 'used_excellent',
            }),
            valuationId: 'valuation-1',
          }),
        }),
      ]);

      const renderer = await renderScreen();

      expect(findByTestId(renderer, 'listing-condition-input').props.value).toBe('like_new');
      expect(
        getTextContent(findByTestId(renderer, 'listing-condition-ai-badge').props.children),
      ).toBe('AI-generated');
    });

    it('does not pre-fill condition when visualCondition is "damaged"', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          response: createMockValuationResponse({
            itemDetails: createMockItemDetails({
              visualCondition: 'damaged',
            }),
            valuationId: 'valuation-1',
          }),
        }),
      ]);

      const renderer = await renderScreen();

      expect(findByTestId(renderer, 'listing-condition-input').props.value).toBe('');
      expect(() => findByTestId(renderer, 'listing-condition-ai-badge')).toThrow();
    });
    ```
  - [x] 6.2: Also update the existing `'pre-fills the title when valuation item details are available'`
    test to assert the condition badge is now visible (since `createMockItemDetails` defaults to
    `visualCondition: 'used_good'` which maps to `'good'`). Add these two assertions after the
    `listing-category-ai-badge` assertion:
    ```typescript
    expect(findByTestId(renderer, 'listing-condition-input').props.value).toBe('good');
    expect(
      getTextContent(findByTestId(renderer, 'listing-condition-ai-badge').props.children),
    ).toBe('AI-generated');
    ```

---

## Dev Notes

### Pattern Reference: What has already been established (do not reinvent)

All four previous pre-fill stories follow the same pattern. Story 5-6 must follow it exactly.

| Story | Source | Guard | New util? |
|---|---|---|---|
| 5-2 | `itemDetails.brand/model/itemType` | `? buildAiListingTitle(...) : undefined` | `listing-title.ts` |
| 5-3 | `itemDetails.description` | `?.trim() \|\| undefined` | none |
| 5-4 | `marketData.fairMarketValue` | `!= null && > 0 ? fmv.toString() : undefined` | none |
| 5-5 | `itemDetails.categoryHint` | `?.trim() \|\| undefined` | none |
| **5-6** | `itemDetails.visualCondition` | `? mapVisualConditionToListingCondition(...) : undefined` | **`listing-condition.ts`** |

### Key Code Locations

```
apps/mobile/
├── app/
│   └── listing/[id].tsx            — MODIFY: add import + aiCondition derivation + initialValues merge
├── components/
│   └── organisms/
│       └── listing-form.tsx        — MODIFY: wrap condition Controller in <Stack gap={1}>, add badge
├── lib/
│   └── utils/
│       ├── index.ts                — MODIFY: add barrel export for mapVisualConditionToListingCondition
│       ├── listing-condition.ts    — CREATE: mapVisualConditionToListingCondition()
│       └── __tests__/
│           └── listing-condition.test.ts  — CREATE: 5 mapping unit tests
└── __tests__/
    ├── listing-form.test.tsx       — EXTEND: 3 new condition badge tests
    └── listing-screen.test.tsx     — EXTEND: 2 new condition integration tests + 2 assertions in existing test
```

### `listing/[id].tsx` — Complete `initialValues` Block After This Story

```tsx
const aiTitle = valuation?.response?.itemDetails
  ? buildAiListingTitle(valuation.response.itemDetails)
  : undefined;
const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;
const fmv = valuation?.response?.marketData?.fairMarketValue;
const aiPrice = fmv != null && fmv > 0 ? fmv.toString() : undefined;
const aiCategory = valuation?.response?.itemDetails?.categoryHint?.trim() || undefined;
const aiCondition = valuation?.response?.itemDetails?.visualCondition
  ? mapVisualConditionToListingCondition(valuation.response.itemDetails.visualCondition)
  : undefined;
```

```tsx
initialValues={
  aiTitle || aiDescription || aiPrice || aiCategory || aiCondition
    ? {
        ...(aiTitle       ? { title: aiTitle }             : {}),
        ...(aiDescription ? { description: aiDescription } : {}),
        ...(aiPrice       ? { price: aiPrice }             : {}),
        ...(aiCategory    ? { category: aiCategory }       : {}),
        ...(aiCondition   ? { condition: aiCondition }     : {}),
      }
    : undefined
}
```

### Why `? :` Guard (Not `||`) for visualCondition

`visualCondition` is typed as `VisualCondition` (a string union of five known values). It is never
an empty string — backend guarantees one of the five values. Therefore the `||` empty-string guard
used in Stories 5-3 and 5-5 does not apply here.

The correct guard is: `valuation?.response?.itemDetails?.visualCondition ? mapVisualConditionToListingCondition(...) : undefined`

The mapping function itself returns `undefined` for `'damaged'`, so the `aiCondition` variable
will be `undefined` when the AI judges the item as damaged.

### Mapping Type Choice: `Partial<Record<...>>`

`CONDITION_MAP` is intentionally typed as `Partial<Record<VisualCondition, ListingCondition>>`
because `'damaged'` must remain unmapped. This is correct for Story 5-6, but it is not future-proof
for newly added `VisualCondition` values. If the `VisualCondition` union changes later, revisit both
the map and the unit tests to decide whether the new value should map to a listing condition or stay
unmapped.

### `'very_good'` Is Intentionally Unmapped

`LISTING_CONDITION_VALUES` includes `'very_good'` and it appears in the condition field placeholder
text (`new | like_new | very_good | good | acceptable`). This may look like a gap in the mapping
table, but it is intentional: no `VisualCondition` value produces `'very_good'` because the AI
assessment granularity does not distinguish between `'like_new'` and `'very_good'`. The value remains
available for users to select manually once Story 5-8 converts the field to a picker.

**Do not add `'very_good'` to `CONDITION_MAP`.** The table in AC4 is complete as written.

### Badge Condition Check

For other string fields, the badge check is `initialValues?.description?.trim()` (guarding empty
strings). For condition, use `initialValues?.condition` (no `.trim()`) — a valid `ListingCondition`
is always a non-whitespace enum value. Example:

```tsx
{initialValues?.condition ? (
  <Text variant="caption" className="text-ink-muted" testID="listing-condition-ai-badge">
    AI-generated
  </Text>
) : null}
```

### Condition Field Stays as FormInput (Picker Deferred to Story 5-8)

The condition field in `listing-form.tsx` is currently `<FormInput ... testID="listing-condition-input" />`.
This story wraps it in `<Stack gap={1}>` and adds a badge — the input itself is unchanged. Use a
clear text-entry placeholder (`Enter one of: ...`) rather than language that implies a real dropdown
already exists.

**Story 5-8 will convert it to a picker/segmented control.** Test assertions in Tasks 5 and 6 use
`.props.value` (appropriate for a text input). When Story 5-8 converts to a picker, those assertions
will need updating. Note this in the Story 5-8 file.

### `createMockItemDetails` Default After Story 5-5

```typescript
// apps/mobile/types/mocks.ts
export function createMockItemDetails(overrides?: Partial<ItemDetails>): ItemDetails {
  return {
    // ...
    visualCondition: 'used_good',  // maps to 'good' via mapVisualConditionToListingCondition
    // ...
  };
}
```

This means the existing screen-level test `'pre-fills the title when valuation item details are available'`
will expose the condition as `'good'` once Task 2 is implemented. Task 6.2 adds the two missing
assertions to that test so it verifies condition prefill as well.

### Tests to Run After Implementation

```bash
cd apps/mobile
npx jest --testPathPattern="listing-condition|listing-form|listing-screen" --no-coverage
```

All existing tests in those files must still pass (no regressions).

### Project Structure Notes

- New utility `listing-condition.ts` lives in `apps/mobile/lib/utils/` alongside `listing-title.ts` — consistent with the established pattern for field-specific utilities.
- Export via `apps/mobile/lib/utils/index.ts` (barrel) — consistent with how `buildAiListingTitle` is exported and imported in `listing/[id].tsx`.
- TypeScript import paths use `@/` alias, which resolves to `apps/mobile/` (configured in `tsconfig.json`). Import `VisualCondition` from `@/types/item` and `ListingCondition` from `@/types/listing`.

### References

- Mapping spec: [docs/sprint-artifacts/epic-5-plan.md](../sprint-artifacts/epic-5-plan.md#story-5-6-pre-fill-condition-from-ai-assessment)
- `VisualCondition` type definition: [apps/mobile/types/item.ts](../../apps/mobile/types/item.ts)
- `ListingCondition` enum + `LISTING_CONDITION_VALUES`: [apps/mobile/types/listing.ts](../../apps/mobile/types/listing.ts)
- `createMockItemDetails` default `visualCondition`: [apps/mobile/types/mocks.ts](../../apps/mobile/types/mocks.ts)
- Current `listing/[id].tsx` (post 5-5): [apps/mobile/app/listing/[id].tsx](../../apps/mobile/app/listing/[id].tsx)
- Current `listing-form.tsx` (post 5-5): [apps/mobile/components/organisms/listing-form.tsx](../../apps/mobile/components/organisms/listing-form.tsx)
- Listing title utility (pattern reference): [apps/mobile/lib/utils/listing-title.ts](../../apps/mobile/lib/utils/listing-title.ts)
- Listing title unit tests (pattern reference): [apps/mobile/lib/utils/__tests__/listing-title.test.ts](../../apps/mobile/lib/utils/__tests__/listing-title.test.ts)

---

## Dev Agent Record

### Agent Model Used

GPT-5.4 (GitHub Copilot)

### Debug Log References

- Focused verification: `cd apps/mobile && npx jest lib/utils/__tests__/listing-condition.test.ts __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand --no-coverage`
- Full regression verification: `cd apps/mobile && npx jest --runInBand --no-coverage`

### Completion Notes List

- Added `mapVisualConditionToListingCondition()` in `apps/mobile/lib/utils/listing-condition.ts` and exported it through the utils barrel.
- Derived `aiCondition` in `apps/mobile/app/listing/[id].tsx` and merged it into the shared `initialValues` pattern without passing `undefined`.
- Wrapped the condition input in `apps/mobile/components/organisms/listing-form.tsx` with the AI badge treatment and the clarified manual-entry placeholder.
- Added mapping utility unit tests plus form- and screen-level condition prefill coverage; focused Jest verification passed with 48/48 tests green.
- Code review follow-up: added the empty-string condition badge regression test, documented the enum-based badge guard inline, and reran the full mobile Jest suite with 211/211 tests passing.

### File List

- `apps/mobile/lib/utils/listing-condition.ts`
- `apps/mobile/lib/utils/index.ts`
- `apps/mobile/app/listing/[id].tsx`
- `apps/mobile/components/organisms/listing-form.tsx`
- `apps/mobile/lib/utils/__tests__/listing-condition.test.ts`
- `apps/mobile/__tests__/listing-form.test.tsx`
- `apps/mobile/__tests__/listing-screen.test.tsx`
