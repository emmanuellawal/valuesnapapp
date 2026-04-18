# Story 5.3: Pre-Fill Description from AI

Status: done

## Story

As a user,
I want the item description pre-filled from AI,
so that I have a professional description without writing it myself.

## Business Context

### Why This Story Matters

Story 5.2 established the `initialValues` pattern that all pre-fill stories share. Story 5.3 is
the second pre-fill and follows that same pattern exactly — but with a critical difference:
the **`description` field does not yet exist in the frontend type chain**. The backend has been
generating descriptions since Story 2.2 (`backend/models.py:ItemIdentity.description`), but the
transformer, frontend type, and mock factory never surfaced the field to the mobile app. This
story closes that gap, then wires the pre-fill exactly as Story 5.2 did for the title.

### Current State

```
✅ apps/mobile/app/listing/[id].tsx           — screen loads valuation, passes initialValues to ListingForm
✅ apps/mobile/components/organisms/listing-form.tsx — ListingForm accepts initialValues, description field exists
✅ apps/mobile/types/listing.ts               — description: z.string().optional().default('')  (schema already optional)
✅ apps/mobile/lib/localHistory.ts            — getLocalHistory() returns Valuation[]
✅ apps/mobile/app/appraisal.tsx              — findValuationById(history, id) — already imported in listing screen
✅ apps/mobile/types/transformers.ts          — transformItemDetails() exists but description NOT mapped
✅ apps/mobile/__tests__/transformers.test.ts — baseIdentity and full-shape test exist but missing description

❌ description field in ItemDetails (frontend type)  — apps/mobile/types/item.ts has NO description field
❌ description mapped in transformItemDetails()       — transformer silently drops it
❌ description in createMockItemDetails()             — mock factory has no default
❌ description in RawItemIdentity interface           — raw schema missing the field
❌ AI description pre-fill in listing screen         — no aiDescription derived or passed
❌ AI-generated badge on description field           — not implemented
```

### What This Story Delivers

Six targeted changes across 6 files:

1. **`apps/mobile/types/item.ts`** — Add `description: string` to `ItemDetails` interface.
2. **`apps/mobile/types/transformers.ts`** — Add `description: string` to `RawItemIdentity`; map `description: raw.description ?? ''` in `transformItemDetails()`.
3. **`apps/mobile/types/mocks.ts`** — Add `description: 'Mock item description for eBay listing.'` to `createMockItemDetails()` defaults.
4. **`apps/mobile/app/listing/[id].tsx`** — Derive `aiDescription` from `valuation.response.itemDetails.description?.trim()` (guard empty string); merge with `aiTitle` into `initialValues`.
5. **`apps/mobile/components/organisms/listing-form.tsx`** — Add "AI-generated" badge below the description `<FormInput>`, shown only when `initialValues?.description` is non-empty (same pattern as title badge).
6. **Tests** — Update transformer test for `description`; add form and screen tests.

No new routes, no new utility files, no backend changes.

### Epic 5 Story Graph

```
5-1  Build Listing Form Component              ✅ done (scaffold)
5-2  Pre-Fill Title from AI Identification     ✅ done
5-3  Pre-Fill Description from AI             ◄── you are here
5-4  Pre-Fill Price from Valuation             (uses same initialValues pattern)
5-5  Pre-Fill Category from AI Classification  (uses same initialValues pattern)
5-6  Pre-Fill Condition from AI Assessment     (uses same initialValues pattern)
5-7  Include Original Photo in Listing
5-8  Enable Field Editing                      (will make AI indicators dynamic — tracks mutations)
5-9  Implement Copy to Clipboard
5-10 Display Pre-Filled vs Manual Distinction
5-11 Image Hosting Thumbnails
```

---

## Acceptance Criteria

### AC1: Description Field Pre-Filled from AI on Form Load

**Given** the user navigates to `/listing/<valuationId>` where `valuationId` matches a local history entry with a non-empty `response.itemDetails.description`  
**When** the listing form renders  
**Then** the Description field value is pre-populated with the AI-generated description text  
**And** a caption "AI-generated" is visible below the Description input

### AC2: Description Content Quality (FR17, NFR-AI3)

**Given** the AI identification returned a description  
**When** the description is rendered  
**Then** the text is displayed exactly as returned by the AI (no client-side truncation or modification)  
**And** the description is grammatically correct and factual (AI quality guarantee from backend — no client validation needed here)  
**And** the description can still be edited freely by the user (Stories 5-8 will track the mutation)

### AC3: Graceful Degradation When Description Is Empty or Missing

**Given** the backend returned an empty description (`""`) or the valuation is not found  
**When** the listing form renders  
**Then** the Description field is empty (no pre-fill — same as Story 5-1 behaviour)  
**And** no crash occurs  
**And** the "AI-generated" caption is NOT shown

> **Why `|| undefined` (not `??`):** React Hook Form distinguishes `undefined` (field untouched — uses Zod schema `default('')`) from `''` (field explicitly set to empty). Passing `description: ''` from the backend's default would prevent RHF from applying the schema default and would flag the field as pre-filled even with no content. The `|| undefined` guard converts `''`, `'   '`, and `undefined` all to `undefined`, keeping the field in a pristine state when the AI produced no description.

### AC4: No Regression on Previous Pre-Fills

**Given** the listing form  
**When** rendered with `initialValues` containing both title and description  
**Then** the Title field is still pre-filled (from Story 5.2) and still shows its AI badge  
**And** all five other fields (category, condition, price, photos CTA) continue to function as before  
**And** the guest guard redirect still fires

### AC5: Transformer Contract — `description` Field Round-Trips

**Given** the backend returns an `ItemIdentity` response with a non-empty `description`  
**When** `transformItemDetails(rawResponse)` is called  
**Then** the resulting `ItemDetails.description` matches the original value  
**And** when the backend omits the field (legacy response), `description` defaults to `''`

---

## Tasks / Subtasks

- [x] Task 1: Add `description` to the frontend type chain (AC: 5)
  - [x] 1.1: In `apps/mobile/types/item.ts`, add `/** eBay listing description (1–3 sentences). Empty string when AI did not provide one. */ description: string;` to the `ItemDetails` interface — place it after `searchKeywords` and before `identifiers`.
  - [x] 1.2: In `apps/mobile/types/transformers.ts`, add `description: string;` to the `RawItemIdentity` interface (it already has `search_keywords: string[]` — add after that line).
  - [x] 1.3: In `apps/mobile/types/transformers.ts`, add `description: raw.description ?? '',` to the object returned by `transformItemDetails()` (place after `searchKeywords: raw.search_keywords`).
  - [x] 1.4: In `apps/mobile/types/mocks.ts`, add `description: 'Mock item description for eBay listing.',` to the default object inside `createMockItemDetails()` — place after `searchKeywords: ['test', 'item']` and before `identifiers`.

- [x] Task 2: Update transformer test for `description` field (AC: 5)
  - [x] 2.1: In `apps/mobile/__tests__/transformers.test.ts`, add `description: 'Solid film SLR in good working order.'` to the `baseIdentity` object (after `search_keywords`). Without this, the `transformItemDetails(baseIdentity)` call will pass `undefined` for `description`, which the transformer coerces to `''`, causing the full-shape `.toEqual()` assertion to fail.
  - [x] 2.2: Add `description: 'Solid film SLR in good working order.',` to the expected `toEqual(...)` object inside the `'maps the full item identity shape to camelCase keys'` test.
  - [x] 2.3: Add a new test `'maps description field and defaults to empty string when missing'`:
    ```typescript
    it('maps description field and defaults to empty string when missing', () => {
      const withDescription = transformItemDetails({
        ...baseIdentity,
        description: 'A 1976 Canon AE-1 SLR.',
      });
      expect(withDescription.description).toBe('A 1976 Canon AE-1 SLR.');

      // Simulate legacy backend response with no description field
      const { description: _, ...withoutDescription } = baseIdentity;
      expect(
        transformItemDetails(withoutDescription as typeof baseIdentity).description
      ).toBe('');
    });
    ```

- [x] Task 3: Derive `aiDescription` in listing screen and merge into `initialValues` (AC: 1, 3, 4)
  - [x] 3.1: **No new `useEffect` or new import needed** — the screen already imports `valuation`, `getLocalHistory`, and `findValuationById` from Story 5.2. Only the `aiDescription` derivation and the `initialValues` object require code changes.
  - [x] 3.2: After the existing `const aiTitle = ...` line in `apps/mobile/app/listing/[id].tsx`, add:
    ```typescript
    const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;
    ```
    The `trim() || undefined` pattern converts empty strings and whitespace-only strings to `undefined`, preventing the badge from appearing for empty AI descriptions.
  - [x] 3.3: Update the `initialValues` prop passed to `<ListingForm>` to merge both values:
    ```tsx
    initialValues={
      aiTitle || aiDescription
        ? {
            ...(aiTitle ? { title: aiTitle } : {}),
            ...(aiDescription ? { description: aiDescription } : {}),
          }
        : undefined
    }
    ```
    ⚠️ Do NOT replace the guard with a simpler `{ title: aiTitle, description: aiDescription }` — passing `title: undefined` into `initialValues` would prevent RHF from using the empty string default for the title field when no valuation is found.

- [x] Task 4: Add AI-generated badge below description field in `ListingForm` (AC: 1, 3, 4)
  - [x] 4.1: In `apps/mobile/components/organisms/listing-form.tsx`, locate the `description` `<Controller>` render block. Currently it renders `<FormInput ... />` directly. Wrap it in `<Stack gap={1}>` (same pattern used for the title field):
    ```tsx
    render={({ field: { onChange, onBlur, value, ref } }) => (
      <Stack gap={1}>
        <FormInput
          ref={ref}
          label="Description"
          placeholder="Describe the item for buyers"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.description?.message}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoCapitalize="sentences"
          testID="listing-description-input"
        />
        {initialValues?.description ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-description-ai-badge"
          >
            AI-generated
          </Text>
        ) : null}
      </Stack>
    )}
    ```
  - [x] 4.2: No new imports needed — `Stack` and `Text` are already imported.

- [x] Task 5: Extend `listing-form.test.tsx` for description pre-fill and badge (AC: 1, 3, 4)
  - [x] 5.1: Add test `'renders a pre-filled description from initialValues'`: pass `initialValues={{ description: 'A Canon AE-1 SLR in good working condition.' }}` and assert `findByTestId(renderer!, 'listing-description-input').props.value` equals the description text.
  - [x] 5.2: Add test `'shows the AI-generated badge on description when initialValues.description is non-empty'`: render with `initialValues={{ description: 'A Canon AE-1 SLR.' }}` and assert `findByTestId(renderer!, 'listing-description-ai-badge')` exists.
  - [x] 5.3: Add test `'does not show the description AI badge without initialValues'`: render with `initialValues={{ title: 'Canon AE-1' }}` only (no description) and assert `expect(() => findByTestId(renderer!, 'listing-description-ai-badge')).toThrow()`.
  - [x] 5.4: Add test `'does not show the description AI badge when description is empty string'`: render with `initialValues={{ description: '' }}` and assert `expect(() => findByTestId(renderer!, 'listing-description-ai-badge')).toThrow()`. This covers the explicit falsy branch at the component level — distinct from Task 6.2 which tests it end-to-end through the screen with a mock valuation.
  - [x] 5.5: Verify that existing title badge tests still pass — the title and description badges are independent.

- [x] Task 6: Extend `listing-screen.test.tsx` for description pre-fill (AC: 1, 3, 4)
  - [x] 6.1: In the existing `'pre-fills the title when valuation item details are available'` test, also assert `findByTestId(renderer, 'listing-description-input').props.value` equals the `createMockItemDetails` default description (`'Mock item description for eBay listing.'`). This validates both fields wire through together.
  - [x] 6.2: Add test `'does not show the description AI badge when description is empty'`: mock `getLocalHistory` with a valuation where `createMockItemDetails` is overridden with `{ description: '' }`; after render, assert `expect(() => findByTestId(renderer, 'listing-description-ai-badge')).toThrow()`.
  - [x] 6.3: Verify existing screen tests still pass (the `mockGetLocalHistory.mockResolvedValue([])` default in `beforeEach` remains correct).

---

## Dev Notes

### Critical: `description` Is Missing from the Frontend Type Chain

The backend (`backend/models.py:ItemIdentity.description`) has produced descriptions since Story 2.2, but the field was never added to the frontend types. The transformer silently discards it. This story must add it in 4 places before any UI work:

```
apps/mobile/types/item.ts           → ItemDetails interface
apps/mobile/types/transformers.ts   → RawItemIdentity interface + transformItemDetails() return
apps/mobile/types/mocks.ts          → createMockItemDetails() default
```

Adding `description` to `ItemDetails` will immediately surface a TypeScript type error in `transformers.test.ts` (the `'maps the full item identity shape to camelCase keys'` assertion's `toEqual` now requires `description`). This is a **good compiler catch** — fix it as Task 2.

Do NOT add `description` to `listingFormSchema` or `ListingFormValues` — it is already there as `z.string().optional().default('')`.

### Description Source in Valuation Response

The AI description lives at:
```
valuation.response.itemDetails.description   (after Task 1 adds the field)
```

The backend prompt instructs GPT to generate "1–3 sentence descriptions suitable for an eBay listing, factual, not promotional." Typical output length is 80–300 characters. No client-side truncation is needed — there is no eBay character limit enforced here.

Backend field contract (from `backend/models.py`):
```python
description: str = Field(
    default="",
    description="1-3 sentence description suitable for eBay listing. Factual, not promotional."
)
```

Frontend transformer after this story:
```typescript
// RawItemIdentity (transformers.ts)
description: string;               // ← new

// transformItemDetails() return
description: raw.description ?? '',  // ← new; ?? '' guards legacy responses
```

### Empty-String Guard Pattern

The backend defaults `description` to `""` for items where the AI didn't produce one. The guard:
```typescript
const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;
```
converts `""`, `"   "` (whitespace) and `undefined` all to `undefined`, which prevents the badge from rendering. Use `||` not `??` here — `??` only guards `null`/`undefined`, not empty strings.

### `initialValues` Already Exists — Do NOT Re-Add the Prop

`ListingFormProps.initialValues?: Partial<ListingFormValues>` was added in Story 5.2. Do not re-declare it. The `description` field is already part of `ListingFormValues` (it's in the Zod schema), so passing `{ description: aiDescription }` into the existing prop works without any type changes to the form.

### Screen Changes Are Additive — No New `useEffect`

The screen already calls `getLocalHistory()`, derives `aiTitle`, and passes `initialValues`. Only these two lines change:
```typescript
// AFTER the existing aiTitle derivation:
const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;

// REPLACE the existing initialValues prop:
initialValues={
  aiTitle || aiDescription
    ? {
        ...(aiTitle ? { title: aiTitle } : {}),
        ...(aiDescription ? { description: aiDescription } : {}),
      }
    : undefined
}
```

The guard with `aiTitle || aiDescription` keeps the prop `undefined` when both are absent, which avoids RHF ignoring `defaultValues` for a no-op empty object.

### Badge Pattern — Mirror Title Exactly

| Field | Wrapper | Badge testID |
|---|---|---|
| Title | `<Stack gap={2}>` outer, `<Stack gap={1}>` for count + badge | `listing-title-ai-badge` |
| Description | Wrap FormInput in `<Stack gap={1}>`, badge below | `listing-description-ai-badge` |

Swiss Minimalist rule: text-only caption, `text-ink-muted`, no color, no icon. [Source: docs/SWISS-MINIMALIST.md]

### Transformer Test Update Is Required Before Other Tests

The test `'maps the full item identity shape to camelCase keys'` uses a `toEqual()` that currently passes because `description` is not in the expected object. After adding `description` to `transformItemDetails()`, the test will fail unless `baseIdentity` and the `toEqual(...)` are both updated (Task 2). Run `transformers.test.ts` in isolation first:

```bash
cd apps/mobile && npm test -- --runTestsByPath __tests__/transformers.test.ts
```

### Architecture Compliance

```
apps/mobile/
├── app/
│   └── listing/
│       └── [id].tsx               ← MODIFY: add aiDescription derivation + merge into initialValues
├── components/
│   └── organisms/
│       └── listing-form.tsx       ← MODIFY: add AI badge below description field
└── types/
    ├── item.ts                    ← MODIFY: add description to ItemDetails
    ├── transformers.ts            ← MODIFY: add to RawItemIdentity + transformItemDetails()
    └── mocks.ts                   ← MODIFY: add description default to createMockItemDetails()
```

[Source: docs/architecture.md#Frontend Structure]

No new files, no new utility functions, no new routes, no backend changes.

### Testing Requirements Summary

| Test file | What changes |
|---|---|
| `apps/mobile/__tests__/transformers.test.ts` | Update `baseIdentity`, update `toEqual`, add `description` mapping test |
| `apps/mobile/__tests__/listing-form.test.tsx` | +3 cases: description prefill, badge shown, badge absent |
| `apps/mobile/__tests__/listing-screen.test.tsx` | Update prefill test to assert description; +1 empty-description badge-absence test |

All existing Story 5-1 and 5-2 tests must continue to pass unchanged.

### Frontend Review Checklist Pre-Checks

Per `docs/frontend-review-checklist.md`:
- [x] No new `useEffect` introduced — no new subscription
- [x] `|| undefined` guard prevents empty-string initialValues from rendering the badge
- [x] No conditional hook calls — hooks remain at top level
- [x] AI badge is non-interactive `Text` — no accessibility label needed
- [x] `description` default in schema is `z.string().optional().default('')` — passes validation without a value
- [x] No `EXPO_PUBLIC_*` variables involved
- [x] Transformer test updated to prevent silent contract break

### References

- [Source: docs/epics.md#Story 5.3] — AC requirements (FR21, NFR-AI3)
- [Source: docs/architecture.md#Frontend Structure] — file placement rules
- [Source: backend/models.py#ItemIdentity.description] — description field contract
- [Source: backend/services/ai.py#IDENTIFICATION_PROMPT] — "1–3 sentence factual eBay listing description"
- [Source: apps/mobile/types/item.ts#ItemDetails] — type to extend (currently missing description)
- [Source: apps/mobile/types/transformers.ts#transformItemDetails] — transformer to extend
- [Source: apps/mobile/types/transformers.ts#RawItemIdentity] — raw schema to extend
- [Source: apps/mobile/types/mocks.ts#createMockItemDetails] — mock factory to extend
- [Source: apps/mobile/app/listing/[id].tsx] — listing screen to update (already loads valuation)
- [Source: apps/mobile/components/organisms/listing-form.tsx] — form to update (already has initialValues)
- [Source: apps/mobile/__tests__/transformers.test.ts] — test requiring baseIdentity + toEqual update
- [Source: apps/mobile/__tests__/listing-form.test.tsx] — form tests to extend
- [Source: apps/mobile/__tests__/listing-screen.test.tsx] — screen tests to extend
- [Source: docs/sprint-artifacts/5-2-pre-fill-title-from-ai-identification.md] — pattern reference
- [Source: docs/SWISS-MINIMALIST.md] — typography-only distinction, no colour indicators
- [Source: docs/frontend-review-checklist.md] — pre-review rules

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Focused Jest validation: `cd apps/mobile && npm test -- --runTestsByPath __tests__/transformers.test.ts __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand`
- Frontend checklist pass: verified hooks/accessibility/API-boundary/test isolation requirements from `docs/frontend-review-checklist.md`

### Completion Notes List

- Added `description` to the frontend item type chain and preserved legacy backend compatibility with `raw.description ?? ''`.
- Derived `aiDescription` from the already-loaded valuation in `apps/mobile/app/listing/[id].tsx` without adding a second fetch or `useEffect`.
- Mirrored the existing title badge pattern for the description field using a non-interactive `Text` caption and `Stack` wrapper.
- Expanded transformer, form, and screen tests to cover prefill, badge visibility, empty-string suppression, and real backend response mapping.
- Addressed code review follow-ups by syncing the `ItemDetails` JSDoc example with the required `description` field and hardening the description badge guard against whitespace-only initial values.

### File List

- apps/mobile/types/item.ts
- apps/mobile/types/transformers.ts
- apps/mobile/types/mocks.ts
- apps/mobile/app/listing/[id].tsx
- apps/mobile/components/organisms/listing-form.tsx
- apps/mobile/__tests__/transformers.test.ts
- apps/mobile/__tests__/listing-form.test.tsx
- apps/mobile/__tests__/listing-screen.test.tsx
- docs/sprint-artifacts/5-3-pre-fill-description-from-ai.md
- docs/sprint-artifacts/sprint-status.yaml

### Senior Developer Review (AI)

- Reviewer: GitHub Copilot (GPT-5.4)
- Date: 2026-04-08
- Outcome: Approved after fixes
- Fixed: stale `ItemDetails` JSDoc/example in `apps/mobile/types/item.ts`
- Fixed: description AI badge now suppresses whitespace-only values in `apps/mobile/components/organisms/listing-form.tsx`
- Added coverage: component test for whitespace-only description initial values in `apps/mobile/__tests__/listing-form.test.tsx`
- Validation: `cd apps/mobile && npm test`

### Change Log

- 2026-04-08: Implemented Story 5.3 description prefill end-to-end, including frontend type-chain support, listing screen `initialValues` merge, description AI badge, and focused Jest coverage.
- 2026-04-08: Applied code review fixes for Story 5.3, including JSDoc synchronization and a whitespace-safe description AI badge guard.
