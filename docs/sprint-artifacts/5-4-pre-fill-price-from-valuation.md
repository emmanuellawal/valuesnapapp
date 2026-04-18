# Story 5.4: Pre-Fill Price from Valuation

Status: done

## Story

As a user,
I want the item price pre-filled from the AI valuation,
so that I start with a data-backed price without manual research.

## Business Context

### Why This Story Matters

Stories 5-2 and 5-3 established and proven the `initialValues` merge pattern. Story 5-4 is the
simplest pre-fill: the fair market value already exists in `MarketData.fairMarketValue` (a
`number | undefined`), and the `price` schema field is a validated `string`. No type-chain gap
exists. No new utility function is needed. The only work is: derive `aiPrice`, add it to the
`initialValues` merge, add the "AI-generated" badge to the price field, render the price range
caption below the badge, and test.

### Current State After Story 5-3

```
✅ apps/mobile/app/listing/[id].tsx           — loads valuation, derives aiTitle + aiDescription, passes initialValues
✅ apps/mobile/components/organisms/listing-form.tsx — accepts initialValues, has AI badges on title + description
✅ apps/mobile/types/market.ts                — MarketData.fairMarketValue: number | undefined ← no gap
✅ apps/mobile/types/mocks.ts                 — createMockMarketData() default: fairMarketValue: 150, priceRange: { min: 100, max: 200 }
✅ apps/mobile/types/listing.ts               — price: z.string().trim().min(1).refine(> 0) ← already present
❌ aiPrice derivation in listing screen       — not implemented
❌ price AI badge in listing form             — not implemented
❌ price range caption in listing form        — not implemented
```

### What This Story Delivers

Four targeted changes across 3 files:

1. **`apps/mobile/app/listing/[id].tsx`** — Derive `aiPrice` from `valuation.response.marketData.fairMarketValue`; merge into `initialValues`.
2. **`apps/mobile/components/organisms/listing-form.tsx`** — Wrap price `FormInput` in `<Stack gap={1}>`, add "AI-generated" badge, add price range caption.
3. **`apps/mobile/__tests__/listing-form.test.tsx`** — New tests for price prefill, badge, range caption.
4. **`apps/mobile/__tests__/listing-screen.test.tsx`** — Extend existing tests to assert price prefill.

No new routes, no new utility files, no backend changes, no type-chain changes.

### Epic 5 Story Graph

```
5-1  Build Listing Form Component              ✅ done
5-2  Pre-Fill Title from AI Identification     ✅ done
5-3  Pre-Fill Description from AI             ✅ done
5-4  Pre-Fill Price from Valuation             ◄── you are here
5-5  Pre-Fill Category from AI Classification  (uses same initialValues pattern)
5-6  Pre-Fill Condition from AI Assessment     (uses same initialValues pattern; needs mapping util)
5-7  Include Original Photo in Listing
5-8  Enable Field Editing                      (will make AI indicators dynamic — tracks mutations)
5-9  Implement Copy to Clipboard
5-10 Display Pre-Filled vs Manual Distinction
5-11 Image Hosting Thumbnails
```

---

## Acceptance Criteria

### AC1: Price Field Pre-Filled from AI on Form Load

**Given** the user navigates to `/listing/<valuationId>` where `valuationId` matches a local history entry with a non-null, non-zero `response.marketData.fairMarketValue`  
**When** the listing form renders  
**Then** the Price field value is pre-populated with the fair market value formatted as a string (e.g., `"249"` for `249`)  
**And** a caption "AI-generated" is visible below the Price input  
**And** a read-only price range caption is visible (e.g., "Estimated: $100–200") when `priceRange` is present

### AC2: Graceful Degradation When Price Is Zero, Null, or Missing

**Given** the backend returned `fairMarketValue: 0` or the field is absent (market data status `no_data` or `no_prices`)  
**When** the listing form renders  
**Then** the Price field is empty (no pre-fill)  
**And** no crash occurs  
**And** the "AI-generated" caption is NOT shown  
**And** no price range caption is shown when `priceRange` is also absent

### AC3: Price Range Caption Is Read-Only

**Given** the listing form renders with a pre-filled price  
**When** a `priceRange` is available in the market data  
**Then** the caption "Estimated: $<min>–<max>" is shown below the AI badge  
**And** the caption is non-interactive (not a form input, not tappable)  
**And** the caption follows Swiss Minimalist style: `Text variant="caption" className="text-ink-muted"`  
**And** when `priceRange` is absent (no_data or no_prices status), the caption is not rendered

> **Scope note:** The range caption is intentionally scoped as a *supplement* to price pre-fill in this story (caption only when both `initialValues.price` and `priceRange` are present). Showing the range caption as standalone market context for users without a pre-filled price is a valid UX improvement but is deferred to Story 5-10 (Display Pre-Filled vs Manual Distinction).

### AC4: No Regression on Previous Pre-Fills

**Given** a valuation with all of title, description, and price populated  
**When** the listing form renders  
**Then** the Title, Description, and Price fields all show their AI-generated values  
**And** all three "AI-generated" badges are visible  
**And** all validation, back nav, and guest guard remain intact

---

## Tasks / Subtasks

- [x] Task 1: Derive `aiPrice` in listing screen and merge into `initialValues` (AC: 1, 2, 4)
  - [x] 1.1: In `apps/mobile/app/listing/[id].tsx`, after the existing `const aiDescription = ...` line, add:
    ```typescript
    const fmv = valuation?.response?.marketData?.fairMarketValue;
    const aiPrice = fmv != null && fmv > 0
      ? fmv.toString()
      : undefined;
    ```
    Use `!= null && fmv > 0` — the `!= null` double-equals guard catches both `null` and `undefined`; the explicit `> 0` check rejects `0` since a $0 fair market value is not a valid listing price (a bare `!= null` guard would pass `0` through as `'0'`).
  - [x] 1.2: Update the `initialValues` prop passed to `<ListingForm>` to merge all three values:
    ```tsx
    initialValues={
      aiTitle || aiDescription || aiPrice
        ? {
            ...(aiTitle       ? { title: aiTitle }             : {}),
            ...(aiDescription ? { description: aiDescription } : {}),
            ...(aiPrice       ? { price: aiPrice }             : {}),
          }
        : undefined
    }
    ```
    ⚠️ Do NOT use `{ ...(aiPrice !== undefined ? { price: aiPrice } : {}) }` — the `!= null` check in subtask 1.1 already ensures `aiPrice` is either a non-empty string or `undefined`, so a simple truthy check is sufficient and consistent with the existing title/description pattern.
  - [x] 1.3: No new `useEffect`, no new import, no new state needed. The `valuation` state object already contains `response.marketData.fairMarketValue`.

- [x] Task 2: Add AI badge and price range caption to price field in `ListingForm` (AC: 1, 2, 3, 4)
  - [x] 2.1: In `apps/mobile/components/organisms/listing-form.tsx`, locate the `price` `<Controller>` render block. Currently it renders `<FormInput ... />` directly inside the `render` prop. Wrap it in `<Stack gap={1}>` (same pattern as description):
    ```tsx
    render={({ field: { onChange, onBlur, value, ref } }) => (
      <Stack gap={1}>
        <FormInput
          ref={ref}
          label="Price *"
          placeholder="0.00"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.price?.message}
          returnKeyType="next"
          keyboardType="decimal-pad"
          testID="listing-price-input"
        />
        {initialValues?.price?.trim() ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-price-ai-badge"
          >
            AI-generated
          </Text>
        ) : null}
        {initialValues?.price?.trim() && priceRange ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-price-range-caption"
          >
            Estimated: ${priceRange.min}–${priceRange.max}
          </Text>
        ) : null}
      </Stack>
    )}
    ```
  - [x] 2.2: `ListingForm` currently receives `initialValues?: Partial<ListingFormValues>`. It does NOT currently receive `priceRange`. Add `priceRange?: { min: number; max: number }` to `ListingFormProps`:
    ```typescript
    export interface ListingFormProps {
      valuationId: string;
      onSubmit?: (values: ListingFormValues) => void;
      initialValues?: Partial<ListingFormValues>;
      priceRange?: { min: number; max: number };
    }
    ```
    Destructure it in the function signature:
    ```typescript
    export function ListingForm({ valuationId, onSubmit, initialValues, priceRange }: ListingFormProps) {
    ```
  - [x] 2.3: In `apps/mobile/app/listing/[id].tsx`, pass the new prop:
    ```tsx
    <ListingForm
      valuationId={valuationId}
      initialValues={...}
      priceRange={valuation?.response?.marketData?.priceRange}
    />
    ```
    The `priceRange` field from `MarketData` is typed `PriceRange | undefined` (never `null`) — no null coercion needed.
  - [x] 2.4: No new imports needed in `listing-form.tsx` — `Stack` and `Text` are already imported. No new imports needed in `listing/[id].tsx`.

- [x] Task 3: Extend `listing-form.test.tsx` for price prefill, badge, and range caption (AC: 1, 2, 3, 4)
  - [x] 3.1: Add test `'renders a pre-filled price from initialValues'`: pass `initialValues={{ price: '249' }}` and assert `findByTestId(renderer!, 'listing-price-input').props.value` equals `'249'`.
  - [x] 3.2: Add test `'shows the AI-generated badge on price when initialValues.price is non-empty'`: render with `initialValues={{ price: '249' }}` and assert `findByTestId(renderer!, 'listing-price-ai-badge')` exists.
  - [x] 3.3: Add test `'does not show the price AI badge without initialValues.price'`: render with `initialValues={{ title: 'Canon AE-1' }}` only and assert `expect(() => findByTestId(renderer!, 'listing-price-ai-badge')).toThrow()`.
  - [x] 3.4: Add test `'does not show the price AI badge when price is empty string'`: render with `initialValues={{ price: '' }}` and assert the badge throws.
  - [x] 3.5: Add test `'shows price range caption when price is pre-filled and priceRange is provided'`: render with both `initialValues={{ price: '249' }}` and `priceRange={{ min: 100, max: 200 }}` and assert `findByTestId(renderer!, 'listing-price-range-caption')` exists with text containing `'100'` and `'200'`. (The range caption requires both conditions per AC3.)
  - [x] 3.6: Add test `'does not show the price range caption when priceRange is absent'`: render without `priceRange` and assert `expect(() => findByTestId(renderer!, 'listing-price-range-caption')).toThrow()`.
  - [x] 3.7: Add test `'does not show the price range caption when priceRange is provided but price is not pre-filled'`: render with `priceRange={{ min: 100, max: 200 }}` but no `initialValues.price` (e.g. `initialValues={{ title: 'Canon AE-1' }}`), and assert `expect(() => findByTestId(renderer!, 'listing-price-range-caption')).toThrow()`. This validates the `initialValues?.price?.trim() &&` half of the L2 compound guard — without this test a dev could remove it and 3.6 would still pass.

- [x] Task 4: Extend `listing-screen.test.tsx` for price prefill (AC: 1, 2, 4)
  - [x] 4.1: In the existing `'pre-fills the title when valuation item details are available'` test (which already asserts title and description), also assert price:
    ```typescript
    expect(findByTestId(renderer, 'listing-price-input').props.value).toBe('150');
    expect(findByTestId(renderer, 'listing-price-ai-badge')).toBeTruthy();
    ```
    The default `createMockMarketData()` sets `fairMarketValue: 150`, so `'150'` is the expected string.
  - [x] 4.2: Add test `'does not pre-fill price when fairMarketValue is absent'`: mock `getLocalHistory` with a valuation where `createMockValuationResponse` overrides `marketData` with `createMockMarketData({ status: 'no_data', fairMarketValue: undefined })`. After render, assert `findByTestId(renderer, 'listing-price-input').props.value` equals `''` and badge throws.
  - [x] 4.3: Add test `'does not pre-fill price when fairMarketValue is zero'`: mock `getLocalHistory` with a valuation where `createMockValuationResponse` overrides `marketData` with `createMockMarketData({ fairMarketValue: 0 })`. After render, assert `findByTestId(renderer, 'listing-price-input').props.value` equals `''`, `expect(() => findByTestId(renderer, 'listing-price-ai-badge')).toThrow()`, and `expect(() => findByTestId(renderer, 'listing-price-range-caption')).toThrow()`. This validates the explicit `> 0` guard in `aiPrice` derivation.
    > **Implementation note:** `createMockMarketData({ fairMarketValue: 0 })` uses `?? 150` coalescing so `0` is preserved exactly (not replaced by the default). The mock still defaults `status` to `'success'`, so `priceRange: { min: 100, max: 200 }` will be present in the mock valuation. Because `aiPrice` is `undefined`, `initialValues.price` will be absent — the L2 guard (`initialValues?.price?.trim() && priceRange`) ensures the range caption is correctly hidden despite `priceRange` being populated. This test therefore validates both the `> 0` guard AND the L2 caption condition simultaneously.
  - [x] 4.4: Add test `'shows price range caption when priceRange is available and price is pre-filled'`: use the default mock valuation (which has `fairMarketValue: 150` and `priceRange: { min: 100, max: 200 }`), assert `findByTestId(renderer, 'listing-price-range-caption')` exists.

---

## Dev Notes

### No Type-Chain Gap This Story

Unlike Story 5-3, which required adding `description` to 4 type-chain files, Story 5-4 has zero type-chain work. `MarketData.fairMarketValue` is already `number | undefined` in `apps/mobile/types/market.ts`. No changes to `item.ts`, `transformers.ts`, or `mocks.ts` are needed.

### Price Source

```typescript
// In apps/mobile/app/listing/[id].tsx — after aiDescription derivation:
const fmv = valuation?.response?.marketData?.fairMarketValue;
const aiPrice = fmv != null && fmv > 0
  ? fmv.toString()
  : undefined;
```

The compound guard catches both null/undefined and the zero case:
- `fairMarketValue: undefined` → `aiPrice = undefined` (market data missing, no pre-fill)
- `fairMarketValue: null` → `aiPrice = undefined` (nulled market data, no pre-fill)
- `fairMarketValue: 0` → `aiPrice = undefined` (explicitly rejected by `> 0` — bare `!= null` would pass `0` through as `'0'`)
- `fairMarketValue: 249` → `aiPrice = '249'` (normal pre-fill)
- `fairMarketValue: 24.5` → `aiPrice = '24.5'` (decimal preserved; Zod refine allows decimals > 0)

**Why not `|| undefined`?** The `||` operator used for strings (title, description) treats `''` and `0` as falsy. For a numeric source, the `!= null && fmv > 0` compound guard makes the $0 rejection explicit and distinct from the null/undefined check.

### `initialValues` Merge — Full Pattern After This Story

After Task 1.2 lands, the `initialValues` merge in `listing/[id].tsx` will be:

```typescript
const aiTitle = valuation?.response?.itemDetails
  ? buildAiListingTitle(valuation.response.itemDetails)
  : undefined;
const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;
const fmv = valuation?.response?.marketData?.fairMarketValue;
const aiPrice = fmv != null && fmv > 0
  ? fmv.toString()
  : undefined;

// In JSX:
initialValues={
  aiTitle || aiDescription || aiPrice
    ? {
        ...(aiTitle       ? { title: aiTitle }             : {}),
        ...(aiDescription ? { description: aiDescription } : {}),
        ...(aiPrice       ? { price: aiPrice }             : {}),
      }
    : undefined
}
```

Stories 5-5 and 5-6 will add `aiCategory` and `aiCondition` to this same pattern. Never shorten this to `{ title: aiTitle, description: aiDescription, price: aiPrice }` — passing `{ key: undefined }` prevents RHF from using the schema default for that field.

### Price Range Caption — New Prop on `ListingFormProps`

The `priceRange` cannot be derived from `initialValues` (which only contains `ListingFormValues` — form fields). The price range is market data context, not a form field. It requires a separate prop:

```typescript
export interface ListingFormProps {
  valuationId: string;
  onSubmit?: (values: ListingFormValues) => void;
  initialValues?: Partial<ListingFormValues>;
  priceRange?: { min: number; max: number };  // ← new in Story 5-4
}
```

Pass it from the screen:
```tsx
<ListingForm
  valuationId={valuationId}
  initialValues={...}
  priceRange={valuation?.response?.marketData?.priceRange}
/>
```

The `priceRange` type from `MarketData` is `PriceRange | undefined` (never `null`) — no null coercion needed.

### Badge Pattern — Consistent with Title and Description

The price badge follows the exact same pattern as description:

```tsx
// listing-form.tsx price Controller render:
render={({ field: { onChange, onBlur, value, ref } }) => (
  <Stack gap={1}>
    <FormInput
      ref={ref}
      label="Price *"
      placeholder="0.00"
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      error={errors.price?.message}
      returnKeyType="next"
      keyboardType="decimal-pad"
      testID="listing-price-input"
    />
    {initialValues?.price?.trim() ? (
      <Text
        variant="caption"
        className="text-ink-muted"
        testID="listing-price-ai-badge"
      >
        AI-generated
      </Text>
    ) : null}
    {initialValues?.price?.trim() && priceRange ? (
      <Text
        variant="caption"
        className="text-ink-muted"
        testID="listing-price-range-caption"
      >
        Estimated: ${priceRange.min}–${priceRange.max}
      </Text>
    ) : null}
  </Stack>
)}
```

**Swiss Minimalist rule:** text-only caption, `text-ink-muted`, no colour. No icon. Non-interactive. [Source: docs/SWISS-MINIMALIST.md]

The price badge guard uses `.trim()` (consistent with the description badge after the code-review fix). Since `aiPrice` is always a `number.toString()` result (no whitespace), trimming is a no-op at runtime but enforces defensive coding that the code-review checklist requires and a test (Task 3.4) validates.

### `createMockMarketData()` — Default Values Used in Tests

```typescript
// apps/mobile/types/mocks.ts (no changes needed here)
createMockMarketData()  // defaults:
  // status: 'success'
  // fairMarketValue: 150
  // priceRange: { min: 100, max: 200 }
  // confidence: 'HIGH'
```

For the "price absent" test (Task 4.2):
```typescript
createMockMarketData({ status: 'no_data', fairMarketValue: undefined })
// Now fairMarketValue is undefined → aiPrice = undefined → no prefill
// Note: createMockMarketData with status 'no_data' does not inject fairMarketValue by default
// (the factory's status branch for 'no_data' produces minimal fields)
// So just passing { status: 'no_data' } is sufficient — fairMarketValue will be absent.
```

### Architecture Compliance

```
apps/mobile/
├── app/
│   └── listing/
│       └── [id].tsx               ← MODIFY: add aiPrice derivation + merge into initialValues + pass priceRange prop
├── components/
│   └── organisms/
│       └── listing-form.tsx       ← MODIFY: add priceRange prop to ListingFormProps + AI badge + range caption
└── types/
    └── (no changes needed)
```

No new files. No new utility functions. No new routes. No new imports. No backend changes.

[Source: docs/architecture.md]

### Testing Requirements Summary

| Test file | What changes |
|---|---|
| `apps/mobile/__tests__/listing-form.test.tsx` | +7 cases: price prefill, badge shown, badge absent (no price/empty/whitespace), range caption shown, range caption absent (no priceRange), range caption absent (priceRange present but no price pre-fill) |
| `apps/mobile/__tests__/listing-screen.test.tsx` | Extend existing prefill test to assert price; +1 absent-price test; +1 $0 edge case test; +1 range caption test |

All existing Stories 5-1, 5-2, and 5-3 tests must continue to pass unchanged.

### Frontend Review Checklist Pre-Checks

Per `docs/frontend-review-checklist.md`:
- [ ] No new `useEffect` introduced — aiPrice derives from existing `valuation` state, no subscription
- [ ] `?.trim()` guard on price badge prevents whitespace-string false positives (defensive coding matching description pattern post code-review)
- [x] `priceRange` remains `PriceRange | undefined` end-to-end, so no extra null coercion is needed
- [ ] AI badge is non-interactive `Text` — no accessibility label needed
- [ ] `priceRange` is passed as a separate prop (not a form value) — does not interfere with Zod schema
- [ ] No `EXPO_PUBLIC_*` variables involved
- [ ] No conditional hook calls — hooks remain at top level

### References

- [Source: docs/sprint-artifacts/epic-5-plan.md#Story 5-4] — Story derivation, data shape, AC notes
- [Source: apps/mobile/types/market.ts#MarketData] — `fairMarketValue?: number`, `priceRange?: PriceRange`
- [Source: apps/mobile/types/listing.ts#listingFormSchema] — `price: z.string().min(1).refine(> 0)`
- [Source: apps/mobile/app/listing/[id].tsx] — Screen to modify (already loads valuation + derives aiTitle/aiDescription)
- [Source: apps/mobile/components/organisms/listing-form.tsx] — Form to modify (already has initialValues prop and description badge)
- [Source: apps/mobile/types/mocks.ts#createMockMarketData] — defaults: fairMarketValue: 150, priceRange: { min: 100, max: 200 }
- [Source: apps/mobile/__tests__/listing-form.test.tsx] — Tests to extend
- [Source: apps/mobile/__tests__/listing-screen.test.tsx] — Tests to extend
- [Source: docs/sprint-artifacts/5-3-pre-fill-description-from-ai.md] — Pattern reference (description pre-fill)
- [Source: docs/SWISS-MINIMALIST.md] — typography-only distinction, no colour indicators

---

## Dev Agent Record

### Agent Model Used

GitHub Copilot (GPT-5.4)

### Debug Log References

- Focused validation: `cd apps/mobile && npm test -- --runTestsByPath __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx`
- Full regression suite: `cd apps/mobile && npm test`

### Completion Notes List

- Implemented `aiPrice` derivation in `apps/mobile/app/listing/[id].tsx` using `fmv != null && fmv > 0` and merged it into `initialValues`.
- Passed `priceRange` from the listing screen into `ListingForm` without extra coercion because the frontend type is already `PriceRange | undefined`.
- Wrapped the price input in `apps/mobile/components/organisms/listing-form.tsx` with the AI badge and read-only estimated range caption using the validated dual guard.
- Added focused form-level coverage for price prefill, badge visibility, and both range-caption hide paths.
- Extended screen-level coverage for price prefill, missing FMV, zero FMV, and range caption rendering.
- Full mobile Jest suite passed: 25 suites, 194 tests.

### File List

- apps/mobile/app/listing/[id].tsx
- apps/mobile/components/organisms/listing-form.tsx
- apps/mobile/__tests__/listing-form.test.tsx
- apps/mobile/__tests__/listing-screen.test.tsx
- docs/sprint-artifacts/5-4-pre-fill-price-from-valuation.md
- docs/sprint-artifacts/sprint-status.yaml

### Senior Developer Review (AI)

- Reviewer: GitHub Copilot (GPT-5.4)
- Date: 2026-04-08
- Outcome: Approved after fixes
- Fixed: title AI badge now suppresses whitespace-only values in `apps/mobile/components/organisms/listing-form.tsx`
- Fixed: price range caption now matches the story-approved `Estimated: $min–max` format in `apps/mobile/components/organisms/listing-form.tsx`
- Fixed: badge assertions now validate the rendered `AI-generated` label in `apps/mobile/__tests__/listing-form.test.tsx`
- Fixed: price range caption assertion now validates the full rendered format in `apps/mobile/__tests__/listing-form.test.tsx`
- Added coverage: whitespace-only title initial value does not render the title AI badge
- Validation: `cd apps/mobile && npm test -- --runTestsByPath __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx` and `cd apps/mobile && npm test`

### Change Log

- 2026-04-08: Implemented price pre-fill from valuation, added price badge/range caption UI, and expanded listing form/screen coverage.
- 2026-04-08: Applied code review fixes for Story 5.4, including a whitespace-safe title badge guard and stronger badge/caption assertions.
