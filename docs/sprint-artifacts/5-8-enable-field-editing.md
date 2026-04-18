# Story 5.8: Enable Field Editing

Status: done

## Story

As a user,
I want the "AI-generated" badge to disappear when I edit a pre-filled field,
so that I can tell at a glance which fields still hold the AI's suggestion and which I've
adjusted manually.

## Business Context

### Why This Story Matters

Stories 5-2 through 5-7 have filled all five listing fields (title, description, price, category,
condition) with AI-generated values, annotated each with a "AI-generated" badge via
`testID="listing-{field}-ai-badge"`. Those badges are currently static — they appear whenever
`initialValues.{field}` is truthy and never disappear, even if the user completely rewrites the
field.

Story 5-8 makes the badges reactive: an edit clears the badge; restoring the original AI text
brings it back. This closes the feedback loop between pre-fill (Phase A) and editing (Phase C) in
Epic 5.

Additionally, the condition field is currently a plain `<FormInput>` text input — a deliberate
deferral documented in Story 5-6. The field accepts only 5 exact string values; a free-text input
is a usability gap. Story 5-8 replaces it with an inline segmented control built from existing
primitives (`SwissPressable`, `Stack`, `Text`), matching the Swiss minimalist design without
adding new dependencies.

### Current State After Story 5-7

```
✅ apps/mobile/components/organisms/listing-form.tsx   — 5 fields + photo; static AI badges
✅ apps/mobile/app/listing/[id].tsx                    — passes all initialValues + priceRange + photoUri
✅ apps/mobile/__tests__/listing-form.test.tsx          — 49 tests passing
✅ apps/mobile/__tests__/listing-screen.test.tsx        — integration tests passing
❌ dirtyFields tracking                                 — not implemented
❌ Condition picker/segmented control                   — still a <FormInput> with TODO comment
```

### What This Story Delivers

> **Scope risk (T4):** This story combines two concerns — badge reactivity (dirtyFields) and
> condition picker conversion. They share the same `dirtyFields` mechanic so the split is
> intentional. However, if the picker conversion blocks (e.g., NativeWind styling issue),
> badge reactivity cannot ship independently. Acknowledge this risk before starting; if the
> picker proves problematic, escalate rather than shipping a half-finished picker.

Two focused concerns in one file:

1. **`apps/mobile/components/organisms/listing-form.tsx`** — MODIFY: add `dirtyFields` to the
   `useForm` destructure; update all 5 AI badge guards; replace the condition `<FormInput>` with
   an inline segmented control.
2. **`apps/mobile/__tests__/listing-form.test.tsx`** — EXTEND: add tests for badge
   disappearing-on-edit and reappearing-on-restore for all 5 fields; add segmented control
   interaction tests for the condition picker.
3. **`apps/mobile/__tests__/listing-screen.test.tsx`** — ADD: integration-level test that editing a
   pre-filled field hides the AI badge (1–2 representative field tests).

No new dependencies. No route changes. No backend changes.

### Epic 5 Story Graph

```
5-1  Build Listing Form Component              ✅ done
5-2  Pre-Fill Title from AI Identification     ✅ done
5-3  Pre-Fill Description from AI             ✅ done
5-4  Pre-Fill Price from Valuation             ✅ done
5-5  Pre-Fill Category from AI Classification  ✅ done
5-6  Pre-Fill Condition from AI Assessment     ✅ done
5-7  Include Original Photo in Listing         ✅ done
5-8  Enable Field Editing                      ◄── you are here
5-9  Implement Copy to Clipboard
5-10 Display Pre-Filled vs Manual Distinction  (depends on 5-8 dirtyFields)
5-11 Image Hosting Thumbnails
```

---

## Acceptance Criteria

### AC1: AI Badge Disappears When a Pre-Filled Text Field Is Edited

**Given** the listing form is rendered with `initialValues` containing a non-empty value for
title, category, price, or description
**When** the user changes the content of that field (i.e., the field becomes dirty per RHF)
**Then** the corresponding "AI-generated" badge (`testID="listing-{field}-ai-badge"`) is no longer
rendered

The guard expression for each text badge must be:
```
initialValues?.{field}?.trim() && !dirtyFields.{field}
```

### AC2: AI Badge Reappears When the Original Value Is Restored

**Given** the user has edited a pre-filled text field (badge hidden per AC1)
**When** the user restores the field value to the exact original AI-generated string
**Then** the AI badge reappears for that field

RHF `dirtyFields.{field}` becomes `false` when the field value matches `defaultValues.{field}`
— this behaviour is built-in to React Hook Form and requires no additional implementation.

### AC3: Condition Field Converted to Inline Segmented Control

**Given** the listing form renders
**Then** the condition field shows five labelled buttons — one for each value in
`LISTING_CONDITION_VALUES` (`'new'`, `'like_new'`, `'very_good'`, `'good'`, `'acceptable'`)
**And** the currently selected condition is visually distinguished (active state)
**And** the plain `<FormInput>` text input for condition is replaced (no longer rendered)
**And** tapping a button sets the condition field value and makes the field dirty

### AC4: Condition Picker Respects Pre-Fill and AI Badge

**Given** `initialValues.condition` is set (e.g., `'good'` from Story 5-6 pre-fill)
**When** the listing form renders
**Then** the `'good'` button appears in the active state
**And** the AI badge (`testID="listing-condition-ai-badge"`) is visible

**When** the user taps a different condition button (e.g., `'like_new'`)
**Then** the `'like_new'` button becomes active, `'good'` becomes inactive
**And** the AI badge disappears (condition field is now dirty)

### AC5: Condition Picker Shows Validation Error When Condition Is Unset

**Given** the listing form is submitted without selecting a condition
**Then** the validation error message is displayed below the condition picker
(same `errors.condition?.message` display pattern used by other fields)

### AC6: No Regression on Existing Behaviour

**Given** a valuation with all pre-fill data and a photo
**When** the listing form renders
**Then** all five pre-fill badges are visible (no regression)
**And** the photo is displayed (Story 5-7 not broken)
**And** all pre-fill field values are correctly defaulted
**And** form validation, submit, back nav, and guest guard all continue to work

---

## Design Decision: Condition Picker Implementation

**Decision:** Use an inline segmented control built from `SwissPressable`, `Stack`, and `Text`
primitives. No new npm dependency required.

**Rationale:** The app has no `@react-native-picker/picker` or equivalent installed. The condition
enum has exactly 5 short labels — a horizontal button group fits cleanly in the form column.
`SwissPressable` already handles opacity and focus states. This approach matches Swiss minimalist
aesthetics and avoids native picker modal UX.

**Active/Inactive visual treatment:**
- **Active** (selected): `bg-ink border-ink` container + `text-paper` label
- **Inactive** (not selected): `bg-paper border-divider` container + `text-ink` label

**Label display:** Replace underscores with spaces — `'like_new'` renders as `"like new"`.

> **Layout note (T2):** `flex-wrap` on the horizontal Stack allows the 5 option buttons to
> reflowed across multiple rows on narrow screens. If visual QA reveals an asymmetric last row
> (e.g., `'acceptable'` alone on a second line), apply `flex-1` or a fixed `w-1/3` width to
> each `SwissPressable` so buttons fill rows evenly. The `flex-wrap` approach is safe for now
> and is the Swiss minimalist default; adjust only if it looks broken at ≤375px.

**`ref` / `onBlur` handling:** Segmented controls have no focusable native input. Drop `ref` and
call `onBlur()` inside `onPress` to ensure RHF registers the interaction.

> **Intentional design (T1):** Calling `onBlur()` on every tap means Zod validation fires
> immediately on each condition selection, not only on form-submit. This is the correct behaviour
> for an enum picker — there is no partially-entered state to preserve. Do **not** remove or
> defer the `onBlur()` call; doing so would leave the condition field unvalidated until submit.

**`accessibilityLabel` requirement:** `SwissPressable` mandates `accessibilityLabel`. Use
`` `Condition: ${cond.replace(/_/g, ' ')}` `` (e.g., `"Condition: like new"`).

---

## Tasks / Subtasks

- [x] Task 1: Add `dirtyFields` to `useForm` and update all 5 text badge guards (AC: 1, 2)
  - [x] 1.1: In `apps/mobile/components/organisms/listing-form.tsx`, change line 36 from:
    ```typescript
    formState: { errors },
    ```
    to:
    ```typescript
    formState: { errors, dirtyFields },
    ```
  - [x] 1.2: Update the **title** badge guard (currently around line 81):
    Change:
    ```tsx
    {initialValues?.title?.trim() ? (
    ```
    To:
    ```tsx
    {initialValues?.title?.trim() && !dirtyFields.title ? (
    ```
  - [x] 1.3: Update the **category** badge guard:
    Change:
    ```tsx
    {initialValues?.category?.trim() ? (
    ```
    To:
    ```tsx
    {initialValues?.category?.trim() && !dirtyFields.category ? (
    ```
  - [x] 1.4: Update the **price** badge guard:
    Change:
    ```tsx
    {initialValues?.price?.trim() ? (
    ```
    To (both instances — the badge AND the price-range caption share the same guard pattern):
    ```tsx
    {initialValues?.price?.trim() && !dirtyFields.price ? (
    ```
    Both the `listing-price-ai-badge` node and the `listing-price-range-caption` node use this
    guard pattern. Update both.
  - [x] 1.5: Update the **description** badge guard:
    Change:
    ```tsx
    {initialValues?.description?.trim() ? (
    ```
    To:
    ```tsx
    {initialValues?.description?.trim() && !dirtyFields.description ? (
    ```

- [x] Task 2: Replace condition `<FormInput>` with inline segmented control (AC: 3, 4, 5)
  - [x] 2.1: Add `LISTING_CONDITION_VALUES` to the import from `@/types/listing` at the top of
    `apps/mobile/components/organisms/listing-form.tsx`. The current import is:
    ```typescript
    import {
      LISTING_TITLE_MAX_LENGTH,
      type ListingCondition,
      type ListingFormValues,
      listingFormSchema,
    } from '@/types/listing';
    ```
    Change to:
    ```typescript
    import {
      LISTING_CONDITION_VALUES,
      LISTING_TITLE_MAX_LENGTH,
      type ListingCondition,
      type ListingFormValues,
      listingFormSchema,
    } from '@/types/listing';
    ```
  - [x] 2.2: In the condition `Controller` render, replace the entire contents (the `<Stack gap={1}>`)
    with the following (remove the `// TODO Story 5-8` comment and the `<FormInput>` block):
    ```tsx
    <Stack gap={1}>
      <Text variant="caption" className="text-ink uppercase tracking-wide">
        Condition *
      </Text>
      <Stack direction="horizontal" gap={1} className="flex-wrap">
        {LISTING_CONDITION_VALUES.map((cond) => (
          <SwissPressable
            key={cond}
            accessibilityLabel={`Condition: ${cond.replace(/_/g, ' ')}`}
            onPress={() => { onChange(cond); onBlur(); }}
            testID={`listing-condition-option-${cond}`}
            className={`px-3 py-2 border ${value === cond ? 'bg-ink border-ink' : 'bg-paper border-divider'}`}
          >
            <Text
              variant="caption"
              className={value === cond ? 'text-paper' : 'text-ink'}
            >
              {cond.replace(/_/g, ' ')}
            </Text>
          </SwissPressable>
        ))}
      </Stack>
      {errors.condition?.message ? (
        <Text variant="caption" className="text-signal">
          {errors.condition.message}
        </Text>
      ) : null}
      {initialValues?.condition && !dirtyFields.condition ? (
        <Text
          variant="caption"
          className="text-ink-muted"
          testID="listing-condition-ai-badge"
        >
          AI-generated
        </Text>
      ) : null}
    </Stack>
    ```
    Note: the `Controller` render prop signature has `{ field: { onChange, onBlur, value } }` —
    drop `ref` since the segmented control has no native text-input ref.

  - [x] 2.3: Remove the `ref` from the condition Controller render, since `SwissPressable` does not
    accept a React ref in the same way as `<FormInput ref={ref} />`. The condition Controller
    render prop should destructure `{ field: { onChange, onBlur, value } }` only (no `ref`).

- [x] Task 3: Extend `listing-form.test.tsx` with dirty-badge tests (AC: 1, 2, 3, 4, 5)
  - [x] 3.1: Add the following tests to `apps/mobile/__tests__/listing-form.test.tsx`.
    All use the existing `findByTestId`, `act`, `create`, and `ReactTestRenderer` patterns.

    **Title badge dirty/clean cycle:**
    ```typescript
    it('hides the title AI badge when the title field is edited', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ title: 'Vintage Camera' }}
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-title-ai-badge')).toBeTruthy();

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('My Camera');
      });

      expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();
    });

    it('restores the title AI badge when the original AI value is re-entered', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ title: 'Vintage Camera' }}
          />,
        );
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('My Camera');
      });
      expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Vintage Camera');
      });
      expect(findByTestId(renderer!, 'listing-title-ai-badge')).toBeTruthy();
    });
    ```

    **Category badge dirty cycle (representative second field):**
    ```typescript
    it('hides the category AI badge when the category field is edited', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ category: 'Electronics' }}
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-category-ai-badge')).toBeTruthy();

      await act(async () => {
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
      });

      expect(() => findByTestId(renderer!, 'listing-category-ai-badge')).toThrow();
    });
    ```

    **Price badge dirty cycle (also guards the price-range caption):**
    ```typescript
    it('hides the price AI badge when the price field is edited', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ price: '49.99' }}
            priceRange={{ min: 40, max: 60 }}
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-price-ai-badge')).toBeTruthy();
      expect(findByTestId(renderer!, 'listing-price-range-caption')).toBeTruthy();

      await act(async () => {
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('55.00');
      });

      expect(() => findByTestId(renderer!, 'listing-price-ai-badge')).toThrow();
      expect(() => findByTestId(renderer!, 'listing-price-range-caption')).toThrow();
    });
    ```

    **Description badge dirty cycle:**
    ```typescript
    it('hides the description AI badge when the description field is edited', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ description: 'AI description' }}
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-description-ai-badge')).toBeTruthy();

      await act(async () => {
        findByTestId(renderer!, 'listing-description-input').props.onChangeText('My description');
      });

      expect(() => findByTestId(renderer!, 'listing-description-ai-badge')).toThrow();
    });
    ```

    **Condition picker renders all 5 options:**
    ```typescript
    it('renders all 5 condition picker options', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(findByTestId(renderer!, 'listing-condition-option-new')).toBeTruthy();
      expect(findByTestId(renderer!, 'listing-condition-option-like_new')).toBeTruthy();
      expect(findByTestId(renderer!, 'listing-condition-option-very_good')).toBeTruthy();
      expect(findByTestId(renderer!, 'listing-condition-option-good')).toBeTruthy();
      expect(findByTestId(renderer!, 'listing-condition-option-acceptable')).toBeTruthy();
    });
    ```

    **Condition picker pre-selects AI-prefilled condition:**
    ```typescript
    it('shows the condition AI badge when initialValues.condition is set', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ condition: 'good' }}
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-condition-ai-badge')).toBeTruthy();
    });
    ```

    **Condition picker hides AI badge after user selects different option:**
    ```typescript
    it('hides the condition AI badge when the user picks a different condition', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ condition: 'good' }}
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-condition-ai-badge')).toBeTruthy();

      await act(async () => {
        findByTestId(renderer!, 'listing-condition-option-like_new').props.onPress();
      });

      expect(() => findByTestId(renderer!, 'listing-condition-ai-badge')).toThrow();
    });
    ```

    **Old condition input testID is gone (no regression path for free-text):**
    ```typescript
    it('does not render the legacy condition text input', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(() => findByTestId(renderer!, 'listing-condition-input')).toThrow();
    });
    ```

    **Condition picker shows validation error when submitted without a condition (AC5):**
    ```typescript
    it('shows the condition validation error when submitting without a condition selected', async () => {
      let renderer: ReactTestRenderer;
      const handleSubmit = jest.fn();

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" onSubmit={handleSubmit} />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Test Title');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Electronics');
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('10.00');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(renderer!.root.findByProps({ children: 'Condition is required' })).toBeTruthy();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
    ```

    **Active-state visual styling on pre-selected condition (E1):**
    ```typescript
    it('visually highlights the pre-selected condition option', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ condition: 'good' }}
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-condition-option-good').props.className).toContain('bg-ink');
      expect(findByTestId(renderer!, 'listing-condition-option-new').props.className).toContain('bg-paper');
    });
    ```

    **Condition AI badge restores when original condition is re-selected (E2):**
    ```typescript
    it('restores the condition AI badge when the user picks the original condition back', async () => {
      let renderer: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            initialValues={{ condition: 'good' }}
          />,
        );
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-condition-option-like_new').props.onPress();
      });
      expect(() => findByTestId(renderer!, 'listing-condition-ai-badge')).toThrow();

      await act(async () => {
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
      });
      expect(findByTestId(renderer!, 'listing-condition-ai-badge')).toBeTruthy();
    });
    ```

  - [x] 3.2: Update the 3 existing tests in `listing-form.test.tsx` that reference
    `'listing-condition-input'` (all 3 will fail after the picker lands — fix them in place):

    **Test 1 — `'renders all listing fields and the CTA'`** (around line 23):
    Delete:
    ```typescript
    expect(findByTestId(renderer!, 'listing-condition-input')).toBeTruthy();
    ```
    Replace with:
    ```typescript
    expect(findByTestId(renderer!, 'listing-condition-option-new')).toBeTruthy();
    ```

    **Test 2 — `'renders a pre-filled condition from initialValues'`** (around line 139):
    Delete:
    ```typescript
    expect(findByTestId(renderer!, 'listing-condition-input').props.value).toBe('good');
    ```
    Replace with:
    ```typescript
    expect(findByTestId(renderer!, 'listing-condition-option-good').props.className).toContain('bg-ink');
    ```

    **Test 3 — `'submits valid listing values'`** (around line 458):
    Delete:
    ```typescript
    findByTestId(renderer!, 'listing-condition-input').props.onChangeText('good');
    ```
    Replace with:
    ```typescript
    findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
    ```
    (This test fires the picker's `onPress` to select `'good'` before submit.)

- [x] Task 4: Extend `listing-screen.test.tsx` with representative edit integration test (AC: 1, 6)
  - [x] 4.1: Add the following integration test to `apps/mobile/__tests__/listing-screen.test.tsx`.
    This verifies that at the screen level the badge infrastructure still works end-to-end:
    ```typescript
    it('hides the title AI badge in the form when the title field is edited', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);

      const renderer = await renderScreen();

      // Badge is visible before edit (AI title was pre-filled by listing screen)
      expect(findByTestId(renderer, 'listing-title-ai-badge')).toBeTruthy();

      // Simulate a user edit
      await act(async () => {
        findByTestId(renderer, 'listing-title-input').props.onChangeText('Custom Title');
      });

      // Badge disappears after edit
      expect(() => findByTestId(renderer, 'listing-title-ai-badge')).toThrow();
    });
    ```

    > **Note (verified):** `createMockValuationResponse()` defaults include `brand: 'Test Brand'`,
    > `model: 'Test Model'`, `itemType: 'test item'`. `buildAiListingTitle()` combines these into
    > `'Test Brand Test Model test item'` — truthy, so `aiTitle` is set and the badge renders.
    > No override needed.

---

## Dev Notes

### Key Code Locations

```
apps/mobile/
├── app/
│   └── listing/[id].tsx                — DO NOT MODIFY (no changes needed for 5-8)
├── components/
│   └── organisms/
│       └── listing-form.tsx            — MODIFY: dirtyFields + badge guards + condition picker
└── __tests__/
    ├── listing-form.test.tsx           — EXTEND: dirty-badge + condition picker tests
    └── listing-screen.test.tsx         — EXTEND: 1 integration edit test
```

### `useForm` Change — Before / After

**Before (Story 5-7 state):**
```typescript
const {
  control,
  handleSubmit,
  watch,
  formState: { errors },
} = useForm<ListingFormValues>({ ... });
```

**After (this story):**
```typescript
const {
  control,
  handleSubmit,
  watch,
  formState: { errors, dirtyFields },
} = useForm<ListingFormValues>({ ... });
```

### Badge Guard Patterns — Before / After

| Field | Before | After |
|---|---|---|
| title | `initialValues?.title?.trim()` | `initialValues?.title?.trim() && !dirtyFields.title` |
| category | `initialValues?.category?.trim()` | `initialValues?.category?.trim() && !dirtyFields.category` |
| condition | `initialValues?.condition` | `initialValues?.condition && !dirtyFields.condition` |
| price | `initialValues?.price?.trim()` | `initialValues?.price?.trim() && !dirtyFields.price` |
| description | `initialValues?.description?.trim()` | `initialValues?.description?.trim() && !dirtyFields.description` |

The price badge guard also applies to the `listing-price-range-caption` node — update both.

### RHF `dirtyFields` Semantics

- `dirtyFields.{field}` is `true` when the current value differs from `defaultValues.{field}`.
- `dirtyFields.{field}` is absent (falsy) when the field is pristine or restored to its default.
- `defaultValues.{field}` = `initialValues.{field}` (via the `...(initialValues ?? {})` spread
  in the existing `useForm` config) — so if the user types the exact AI value back in, the badge
  reappears automatically. No extra code needed.

### Condition Picker: Full Controller Replacement

The condition Controller currently uses `{ field: { onChange, onBlur, value, ref } }`.
After this story it becomes `{ field: { onChange, onBlur, value } }` (no `ref`).

> **NativeWind dynamic classname (T5):** The picker uses a template-literal `className` string:
> `` className={`px-3 py-2 border ${value === cond ? 'bg-ink border-ink' : 'bg-paper border-divider'}`} ``
> NativeWind v4 generates utility classes at build time. If the active/inactive styles fail to
> apply at runtime (buttons appear unstyled), add both class sets to the NativeWind safelist in
> `tailwind.config.js`:
> ```js
> safelist: ['bg-ink', 'border-ink', 'bg-paper', 'border-divider']
> ```
> Check whether these tokens are already safelisted (they are used elsewhere in the app) before
> adding duplicates.

The complete condition Controller block (replacing the existing one):
```tsx
<Controller
  control={control}
  name="condition"
  render={({ field: { onChange, onBlur, value } }) => (
    <Stack gap={1}>
      <Text variant="caption" className="text-ink uppercase tracking-wide">
        Condition *
      </Text>
      <Stack direction="horizontal" gap={1} className="flex-wrap">
        {LISTING_CONDITION_VALUES.map((cond) => (
          <SwissPressable
            key={cond}
            accessibilityLabel={`Condition: ${cond.replace(/_/g, ' ')}`}
            onPress={() => { onChange(cond); onBlur(); }}
            testID={`listing-condition-option-${cond}`}
            className={`px-3 py-2 border ${value === cond ? 'bg-ink border-ink' : 'bg-paper border-divider'}`}
          >
            <Text
              variant="caption"
              className={value === cond ? 'text-paper' : 'text-ink'}
            >
              {cond.replace(/_/g, ' ')}
            </Text>
          </SwissPressable>
        ))}
      </Stack>
      {errors.condition?.message ? (
        <Text variant="caption" className="text-signal">
          {errors.condition.message}
        </Text>
      ) : null}
      {initialValues?.condition && !dirtyFields.condition ? (
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
/>
```

### Test Pattern: Simulating a Picker Tap

The segmented control buttons (`SwissPressable`) are not text inputs — they use `onPress`, not
`onChangeText`. To simulate a tap in tests:
```typescript
findByTestId(renderer!, 'listing-condition-option-like_new').props.onPress();
```

Wrap in `await act(async () => { ... })` to flush state updates as with all other field interactions
in this test suite.

> **Edge case (T3):** Tapping the already-selected option (e.g., `'good'` when the default is
> `'good'`) calls `onChange('good')`. RHF compares the new value against `defaultValues.condition`
> — since they match, the field remains clean (`dirtyFields.condition === undefined`). The badge
> stays visible. This is correct RHF behaviour and requires no special handling, but it is not
> explicitly tested. The restore test (E2) verifies the clean path only *after* a dirty cycle;
> a dev who questions this edge case should know it is expected and correct.

### Old `listing-condition-input` testID

Story 5-8 deletes the plain `<FormInput>` on the condition field and its `testID="listing-condition-input"`. Any existing test that asserts the presence of `listing-condition-input` must be updated. Search `listing-form.test.tsx` for this string before running tests.

The condition field's new test surface is:
- `listing-condition-option-{cond}` — one per LISTING_CONDITION_VALUE (5 total)
- `listing-condition-ai-badge` — unchanged testID (same as before)

### Tests to Run After Implementation

```bash
cd apps/mobile && npx jest __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand --no-coverage
```

Then full regression:
```bash
cd apps/mobile && npx jest --runInBand --no-coverage
```

### References

- `LISTING_CONDITION_VALUES` type: [apps/mobile/types/listing.ts](../../apps/mobile/types/listing.ts#L5-L13)
- `listing-form.tsx` current state: [apps/mobile/components/organisms/listing-form.tsx](../../apps/mobile/components/organisms/listing-form.tsx)
- `Stack` primitive (`direction` prop): [apps/mobile/components/primitives/stack.tsx](../../apps/mobile/components/primitives/stack.tsx)
- `SwissPressable` primitive (`accessibilityLabel` required): [apps/mobile/components/primitives/swiss-pressable.tsx](../../apps/mobile/components/primitives/swiss-pressable.tsx)
- Story 5-6 condition deferral decision: [docs/sprint-artifacts/5-6-pre-fill-condition-from-ai-assessment.md](5-6-pre-fill-condition-from-ai-assessment.md#design-decision-condition-picker)
- Epic 5 execution plan: [docs/sprint-artifacts/epic-5-plan.md](epic-5-plan.md)
- Story 5-10 (depends on dirtyFields from this story): [docs/sprint-artifacts/epic-5-plan.md](epic-5-plan.md)

---

## Dev Agent Record

### Agent Model Used

GPT-5.4 (GitHub Copilot)

### Debug Log References

- Focused verification: `cd apps/mobile && npx jest __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand --no-coverage`
- Full regression verification: `cd apps/mobile && npx jest --runInBand --no-coverage`

### Completion Notes List

- Added React Hook Form `dirtyFields` gating to the title, category, price, description, and condition AI badges so badges disappear after user edits and reappear when the original AI value is restored.
- Updated the price-range caption to follow the same dirty-state visibility rule as the price AI badge.
- Replaced the legacy free-text condition input with a `SwissPressable` segmented control driven by `LISTING_CONDITION_VALUES`, including active-state styling, validation messaging, and `onBlur()` on selection.
- Migrated `apps/mobile/__tests__/listing-form.test.tsx` and `apps/mobile/__tests__/listing-screen.test.tsx` off `listing-condition-input` and added coverage for dirty badge behavior, condition validation, active-state styling, badge restore behavior, and listing-screen integration.
- Focused Jest verification passed with 62/62 tests green, followed by the full mobile Jest suite passing with 229/229 tests green.

### File List

- `apps/mobile/components/organisms/listing-form.tsx`
- `apps/mobile/__tests__/listing-form.test.tsx`
- `apps/mobile/__tests__/listing-screen.test.tsx`
- `docs/sprint-artifacts/5-8-enable-field-editing.md`
- `docs/sprint-artifacts/sprint-status.yaml`

### Senior Developer Review (AI)

- Reviewer: GitHub Copilot (GPT-5.4)
- Date: 2026-04-09
- Outcome: Approved after fixes
- Fixed: added restore-path coverage for the price AI badge and the price-range caption in `apps/mobile/__tests__/listing-form.test.tsx`
- Residual note: condition options currently pass `accessibilityState={{ selected }}` through `SwissPressable`, which overrides the primitive's internal `disabled` state when supplied; this is a low-severity primitive design concern, not a Story 5.8 regression
- Validation: `cd apps/mobile && npx jest __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand --no-coverage`
- Validation: `cd apps/mobile && npx jest --runInBand --no-coverage`

### Change Log

- 2026-04-09: Implemented dirty-state AI badge reactivity and replaced the condition text input with a segmented picker; expanded listing form and listing screen coverage; moved the story to review.
- 2026-04-09: Applied code review follow-up for Story 5.8 by adding price restore regression coverage; review approved and story moved to done.
