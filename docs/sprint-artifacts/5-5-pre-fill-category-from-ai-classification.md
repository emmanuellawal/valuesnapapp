# Story 5.5: Pre-Fill Category from AI Classification

Status: done

## Story

As a user,
I want the item category pre-filled from AI classification,
so that I don't have to manually identify the correct eBay search category.

## Business Context

### Why This Story Matters

Stories 5-2 through 5-4 established and exercised the `initialValues` merge pattern. Story 5-5 is
the simplest remaining pre-fill: `ItemDetails.categoryHint` is already a `string` field in the
frontend type chain (no gap to close), and the `category` schema field is `z.string().trim().min(1)`.
The AI prompt produces an eBay-vocabulary-aligned string like `"Film Cameras"` or `"Wristwatches"`
that is directly suitable as a search-level category without ID resolution.

No new utility function, no type-chain update, no new imports. The only work is: derive `aiCategory`,
add it to the `initialValues` merge, add the "AI-generated" badge to the category field, and test.

### Current State After Story 5-4

```
✅ apps/mobile/app/listing/[id].tsx           — loads valuation, derives aiTitle + aiDescription + aiPrice, passes initialValues + priceRange
✅ apps/mobile/components/organisms/listing-form.tsx — accepts initialValues; AI badges on title, description, price; priceRange caption
✅ apps/mobile/types/item.ts                  — ItemDetails.categoryHint: string ← no gap
✅ apps/mobile/types/mocks.ts                 — createMockItemDetails() default: categoryHint: 'Test Category'
✅ apps/mobile/types/listing.ts               — category: z.string().trim().min(1) ← already present
❌ aiCategory derivation in listing screen    — not implemented
❌ category AI badge in listing form          — not implemented
```

### What This Story Delivers

Four targeted changes across 4 files:

1. **`apps/mobile/app/listing/[id].tsx`** — Derive `aiCategory` from `valuation.response.itemDetails.categoryHint`; merge into `initialValues`.
2. **`apps/mobile/components/organisms/listing-form.tsx`** — Wrap category `FormInput` in `<Stack gap={1}>`, add "AI-generated" badge.
3. **`apps/mobile/__tests__/listing-form.test.tsx`** — New tests for category prefill and badge (form-level).
4. **`apps/mobile/__tests__/listing-screen.test.tsx`** — Extend existing prefill test + add absent-category test (screen-level).

No new routes, no new utility files, no backend changes, no type-chain changes.

### Epic 5 Story Graph

```
5-1  Build Listing Form Component              ✅ done
5-2  Pre-Fill Title from AI Identification     ✅ done
5-3  Pre-Fill Description from AI             ✅ done
5-4  Pre-Fill Price from Valuation             ✅ done
5-5  Pre-Fill Category from AI Classification  ◄── you are here
5-6  Pre-Fill Condition from AI Assessment     (uses same initialValues pattern; needs mapping util)
5-7  Include Original Photo in Listing
5-8  Enable Field Editing                      (will make AI indicators dynamic — tracks mutations)
5-9  Implement Copy to Clipboard
5-10 Display Pre-Filled vs Manual Distinction
5-11 Image Hosting Thumbnails
```

---

## Acceptance Criteria

### AC1: Category Field Pre-Filled from AI on Form Load

**Given** the user navigates to `/listing/<valuationId>` where `valuationId` matches a local history
entry with a non-empty `response.itemDetails.categoryHint`  
**When** the listing form renders  
**Then** the Category field value is pre-populated with the AI-suggested category string (e.g., `"Film Cameras"`)  
**And** a caption "AI-generated" is visible below the Category input

### AC2: Graceful Degradation When Category Hint Is Empty or Missing

**Given** the backend returned an empty `categoryHint` (e.g., `""`) or the valuation is not found  
**When** the listing form renders  
**Then** the Category field is empty (no pre-fill)  
**And** no crash occurs  
**And** the "AI-generated" caption is NOT shown

> **Why `|| undefined` (not `??`):** `categoryHint` is typed `string` — its zero-value is `""`, not
> `null`/`undefined`. The `||` guard converts both `""` and whitespace-only values to `undefined`,
> preventing the badge from appearing for empty strings. This is identical to the `aiDescription`
> guard pattern from Story 5-3.

### AC3: No eBay Category ID Resolution

**Given** the category hint is a raw string like `"Film Cameras"`  
**When** the listing form pre-fills the Category field  
**Then** the raw string is used directly without any eBay category ID lookup  
**And** no network call or API request is made for category resolution

> **Scope note:** The epic plan (Story 5-5 detail) explicitly defers numeric category ID resolution
> to a future story. The MVP clipboard flow (FR27 — copy to clipboard, no direct eBay API posting)
> does not require category IDs. The `categoryHint` string is eBay-vocabulary-aligned from the AI
> prompt and suitable for manual eBay search.

### AC4: No Regression on Previous Pre-Fills

**Given** a valuation with all of title, description, price, and category populated  
**When** the listing form renders  
**Then** Title, Description, Price, and Category fields all show their AI-generated values  
**And** all four "AI-generated" badges are visible  
**And** all validation, back nav, and guest guard remain intact

---

## Tasks / Subtasks

- [x] Task 1: Derive `aiCategory` in listing screen and merge into `initialValues` (AC: 1, 2, 4)
  - [x] 1.1: In `apps/mobile/app/listing/[id].tsx`, after the existing `const aiPrice = ...` line, add:
    ```typescript
    const aiCategory = valuation?.response?.itemDetails?.categoryHint?.trim() || undefined;
    ```
    Use `|| undefined` — `categoryHint` is `string` (not `number`), so the empty-string guard must
    use `||` (falsy) rather than `!= null`. This matches the `aiDescription` derivation pattern from
    Story 5-3 exactly.
  - [x] 1.2: Update the `initialValues` prop passed to `<ListingForm>` to merge all four values:
    ```tsx
    initialValues={
      aiTitle || aiDescription || aiPrice || aiCategory
        ? {
            ...(aiTitle       ? { title: aiTitle }             : {}),
            ...(aiDescription ? { description: aiDescription } : {}),
            ...(aiPrice       ? { price: aiPrice }             : {}),
            ...(aiCategory    ? { category: aiCategory }       : {}),
          }
        : undefined
    }
    ```
    ⚠️ Do NOT pass `{ category: aiCategory }` when `aiCategory` is `undefined` — use the conditional
    spread pattern. Never pass `{ key: undefined }` to `initialValues` — RHF would override the
    schema default with `undefined` rather than keeping the field in its pristine empty state.
  - [x] 1.3: No new `useEffect`, no new import, no new state needed. `categoryHint` is already
    in the `ItemDetails` type loaded from `valuation.response.itemDetails`.

- [x] Task 2: Add AI badge to category field in `ListingForm` (AC: 1, 2, 4)
  - [x] 2.1: In `apps/mobile/components/organisms/listing-form.tsx`, locate the `category` `<Controller>`
    render block. Currently it renders `<FormInput .../>` directly inside the `render` prop. Wrap it
    in `<Stack gap={1}>` (same pattern as description and price):
    ```tsx
    render={({ field: { onChange, onBlur, value, ref } }) => (
      <Stack gap={1}>
        <FormInput
          ref={ref}
          label="Category *"
          placeholder="Category"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.category?.message}
          returnKeyType="next"
          autoCapitalize="words"
          testID="listing-category-input"
        />
        {initialValues?.category?.trim() ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-category-ai-badge"
          >
            AI-generated
          </Text>
        ) : null}
      </Stack>
    )}
    ```
    Use `initialValues?.category?.trim()` — consistent with the `.trim()` guard used on all other
    AI badge conditions (title, description, price) after Story 5-4's code review.
  - [x] 2.2: No new imports needed — `Stack` and `Text` are already imported. No new props needed
    on `ListingFormProps` — category pre-fill goes through `initialValues` (unlike `priceRange`
    which cannot be derived from form values).

- [x] Task 3: Extend `listing-form.test.tsx` for category prefill and badge (AC: 1, 2, 4)
  - [x] 3.1: Add test `'renders a pre-filled category from initialValues'`: pass
    `initialValues={{ category: 'Film Cameras' }}` and assert
    `findByTestId(renderer!, 'listing-category-input').props.value` equals `'Film Cameras'`.
  - [x] 3.2: Add test `'shows the AI-generated badge on category when initialValues.category is non-empty'`:
    render with `initialValues={{ category: 'Film Cameras' }}` and assert
    `getTextContent(findByTestId(renderer!, 'listing-category-ai-badge').props.children)` equals
    `'AI-generated'`.
  - [x] 3.3: Add test `'does not show the category AI badge without initialValues.category'`:
    render with `initialValues={{ title: 'Canon AE-1' }}` only and assert
    `expect(() => findByTestId(renderer!, 'listing-category-ai-badge')).toThrow()`.
  - [x] 3.4: Add test `'does not show the category AI badge when category is empty string'`:
    render with `initialValues={{ category: '' }}` and assert the badge throws.
  - [x] 3.5: Add test `'does not show the category AI badge when category is whitespace only'`:
    render with `initialValues={{ category: '   ' }}` and assert the badge throws. This validates
    the `.trim()` half of the guard.

- [x] Task 4: Extend `listing-screen.test.tsx` for category prefill (AC: 1, 2, 4)
  - [x] 4.1: In the existing `'pre-fills the title when valuation item details are available'` test
    (which already asserts title, description, price), also assert:
    ```typescript
    expect(findByTestId(renderer, 'listing-category-input').props.value).toBe('Test Category');
    expect(getTextContent(findByTestId(renderer, 'listing-category-ai-badge').props.children)).toBe('AI-generated');
    ```
    The default `createMockItemDetails()` sets `categoryHint: 'Test Category'`, so `'Test Category'`
    is the expected pre-filled value.

    ⚠️ **`getTextContent` is NOT yet defined in `listing-screen.test.tsx`** — it only exists in
    `listing-form.test.tsx`. Add the helper at the top of `listing-screen.test.tsx`, after the
    existing `findByTestId` helper:
    ```typescript
    function getTextContent(children: React.ReactNode): string {
      return Array.isArray(children)
        ? children.map((child) => String(child)).join('')
        : String(children);
    }
    ```
    This must be added before Task 4.1's assertion will compile. The `React` import is already
    present in the file via the existing `import React from 'react'` line.
  - [x] 4.2: Add test `'does not pre-fill category when categoryHint is empty'`: mock `getLocalHistory`
    with a valuation where `createMockItemDetails` is overridden with `{ categoryHint: '' }`. After
    render, assert `findByTestId(renderer, 'listing-category-input').props.value` equals `''` and
    `expect(() => findByTestId(renderer, 'listing-category-ai-badge')).toThrow()`.

---

## Dev Notes

### No Type-Chain Gap This Story

`ItemDetails.categoryHint` is already typed `string` in `apps/mobile/types/item.ts`. No changes
required to `item.ts`, `transformers.ts`, or `mocks.ts`. The transformer already maps `category_hint`
→ `categoryHint` in `transformItemDetails()`.

### Category Source

```typescript
// In apps/mobile/app/listing/[id].tsx — after aiPrice derivation:
const aiCategory = valuation?.response?.itemDetails?.categoryHint?.trim() || undefined;
```

The `||` guard covers:
- `categoryHint: "Film Cameras"` → `aiCategory = "Film Cameras"` (normal pre-fill)
- `categoryHint: ""` → `aiCategory = undefined` (empty string, no pre-fill)
- `categoryHint: "   "` → `aiCategory = undefined` (whitespace-only, no pre-fill)
- `categoryHint: undefined` (defensive) → `aiCategory = undefined`

### `initialValues` Merge — Full Pattern After This Story

After Task 1.2 lands, the `initialValues` merge in `listing/[id].tsx` will be:

```typescript
const aiTitle    = valuation?.response?.itemDetails
  ? buildAiListingTitle(valuation.response.itemDetails)
  : undefined;
const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;
const fmv       = valuation?.response?.marketData?.fairMarketValue;
const aiPrice   = fmv != null && fmv > 0 ? fmv.toString() : undefined;
const aiCategory = valuation?.response?.itemDetails?.categoryHint?.trim() || undefined;

// In JSX:
initialValues={
  aiTitle || aiDescription || aiPrice || aiCategory
    ? {
        ...(aiTitle       ? { title: aiTitle }             : {}),
        ...(aiDescription ? { description: aiDescription } : {}),
        ...(aiPrice       ? { price: aiPrice }             : {}),
        ...(aiCategory    ? { category: aiCategory }       : {}),
      }
    : undefined
}
```

Story 5-6 will add `aiCondition` to this same pattern.

### Badge Pattern — Consistent with All Previous Fields

| Field   | Badge guard                             | testID                        |
|---------|----------------------------------------|-------------------------------|
| title   | `initialValues?.title?.trim()`         | `listing-title-ai-badge`      |
| description | `initialValues?.description?.trim()` | `listing-description-ai-badge` |
| price   | `initialValues?.price?.trim()`         | `listing-price-ai-badge`      |
| category | `initialValues?.category?.trim()`     | `listing-category-ai-badge`   |

All four use `?.trim()` (enforced since Story 5-4 code review hardened the title badge).

### Architecture Compliance

```
apps/mobile/
├── app/
│   └── listing/
│       └── [id].tsx             ← MODIFY: add aiCategory derivation + merge into initialValues
├── components/
│   └── organisms/
│       └── listing-form.tsx     ← MODIFY: wrap category Controller in Stack, add AI badge
└── types/
    └── (no changes needed)
```

No new files. No new utility functions. No new routes. No new imports. No backend changes.

[Source: docs/architecture.md]

### `category` Schema Has No Max Length — By Design

The `category` Zod schema is `z.string().trim().min(1)` — there is no `max()` constraint. The
`categoryHint` strings the AI returns are short eBay-vocabulary-aligned labels (e.g., `"Film Cameras"`,
`"Wristwatches"`) and are safe for this MVP. No client-side truncation is needed. If a future story
adds direct eBay API posting, eBay category resolution would replace this free string anyway.

### Isolated Category Pre-fill Edge Case (Pre-Existing Pattern Gap)

The screen-level tests (Task 4.1/4.2) use the full default mock, which carries all AI fields
(`aiTitle`, `aiDescription`, `aiPrice`, and `aiCategory`). There is no screen-level test for the
isolated case where **only** `categoryHint` is present and the other three fields are absent.
This gap is identical across Stories 5-3 and 5-4 — it is a pre-existing pattern gap, not
specific to 5-5. The form-level tests (Tasks 3.1–3.5) cover the isolated category-only case
fully. No action required for this story; the gap can be addressed holistically in a future
test-hygiene story if needed.

### Mock Default for Test Assertions

`createMockItemDetails()` defaults `categoryHint: 'Test Category'`. All screen-level tests that use
the default mock should assert `'Test Category'` as the pre-filled value (Task 4.1).

### Testing Requirements Summary

| Test file | What changes |
|---|---|
| `apps/mobile/__tests__/listing-form.test.tsx` | +5 cases: category prefill, badge shown, badge absent (no category/empty string/whitespace) |
| `apps/mobile/__tests__/listing-screen.test.tsx` | Add `getTextContent` helper; extend existing prefill test to assert category + badge text; +1 absent/empty-category test |

All existing Stories 5-1 through 5-4 tests must continue to pass unchanged.

### Frontend Review Checklist Pre-Checks

Per `docs/frontend-review-checklist.md`:
- [ ] No new `useEffect` introduced — `aiCategory` derives from existing `valuation` state, no subscription
- [ ] `?.trim()` guard on category badge prevents whitespace-string false positives
- [ ] AI badge is non-interactive `Text` — no accessibility label needed
- [ ] `aiCategory` goes through `initialValues` (unlike `priceRange`) — does not need a new prop
- [ ] No `EXPO_PUBLIC_*` variables involved
- [ ] No conditional hook calls — hooks remain at top level

### References

- [Source: docs/sprint-artifacts/epic-5-plan.md#Story 5-5] — Story derivation, data shape, AC notes
- [Source: apps/mobile/types/item.ts#ItemDetails] — `categoryHint: string`
- [Source: apps/mobile/types/listing.ts#listingFormSchema] — `category: z.string().trim().min(1)`
- [Source: apps/mobile/types/mocks.ts#createMockItemDetails] — defaults: `categoryHint: 'Test Category'`
- [Source: apps/mobile/app/listing/[id].tsx] — Screen to modify (already loads valuation + derives aiTitle/aiDescription/aiPrice)
- [Source: apps/mobile/components/organisms/listing-form.tsx] — Form to modify (already has initialValues prop and AI badges on title/description/price)
- [Source: apps/mobile/__tests__/listing-form.test.tsx] — Tests to extend
- [Source: apps/mobile/__tests__/listing-screen.test.tsx] — Tests to extend
- [Source: docs/sprint-artifacts/5-4-pre-fill-price-from-valuation.md] — Pattern reference (price pre-fill, code review findings)
- [Source: docs/SWISS-MINIMALIST.md] — typography-only distinction, no colour indicators

## Dev Agent Record

### Agent Model Used

GitHub Copilot (GPT-5.4)

### Debug Log References

- Focused validation: `cd apps/mobile && npm test -- --runTestsByPath __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx`
- Full regression suite: `cd apps/mobile && npm test`

### Completion Notes List

- Implemented `aiCategory` derivation in `apps/mobile/app/listing/[id].tsx` using `categoryHint?.trim() || undefined` and merged it into `initialValues` alongside title, description, and price.
- Wrapped the category input in `apps/mobile/components/organisms/listing-form.tsx` with an `AI-generated` badge gated by `initialValues?.category?.trim()`.
- Added form-level coverage for category prefill plus badge visibility/hide paths for missing, empty, and whitespace-only category values.
- Added screen-level coverage for category prefill, badge text rendering, and empty `categoryHint` fallback behavior, including the new `getTextContent` helper.
- Focused listing tests passed: 2 suites, 38 tests.
- Full mobile Jest suite passed: 25 suites, 200 tests.
- No mobile lint script is configured in `apps/mobile/package.json`, so lint validation was not run.

### File List

- apps/mobile/app/listing/[id].tsx
- apps/mobile/components/organisms/listing-form.tsx
- apps/mobile/__tests__/listing-form.test.tsx
- apps/mobile/__tests__/listing-screen.test.tsx
- apps/mobile/test-utils/get-text-content.ts
- docs/sprint-artifacts/5-5-pre-fill-category-from-ai-classification.md
- docs/sprint-artifacts/sprint-status.yaml

### Senior Developer Review (AI)

- Reviewer: GitHub Copilot (GPT-5.4)
- Date: 2026-04-08
- Outcome: Approved after fixes
- Fixed: extracted shared `getTextContent` helper into `apps/mobile/test-utils/get-text-content.ts` to remove duplicated test-only logic
- Fixed: description badge assertion in `apps/mobile/__tests__/listing-form.test.tsx` now validates the rendered `AI-generated` label, matching the title, price, and category badge tests
- Fixed: screen-level badge assertions in `apps/mobile/__tests__/listing-screen.test.tsx` now validate the rendered `AI-generated` label for title, description, price, and category consistently
- Validation: `cd apps/mobile && npm test -- --runTestsByPath __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx` and `cd apps/mobile && npm test`

### Change Log

- 2026-04-08: Implemented category pre-fill from AI classification, added the category AI badge UI, and expanded listing form/screen coverage.
- 2026-04-08: Applied code review fixes for Story 5.5, centralizing shared badge text extraction and strengthening badge assertions.
