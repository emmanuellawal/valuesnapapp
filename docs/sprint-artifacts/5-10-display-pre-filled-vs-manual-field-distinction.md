# Story 5.10: Display Pre-Filled vs Manual Field Distinction

Status: done

## Story

As a user,
I want to clearly see which listing fields are AI-generated vs require manual entry,
so that I know exactly what to review and what to fill in myself.

## Business Context

### Why This Story Matters

After Stories 5-1 through 5-9, the listing form is fully functional: all five text fields
pre-filled from AI data, conditional "AI-generated" badges that disappear on edit (Story 5-8),
and a working clipboard copy flow (Story 5-9).

But there is a gap: when AI data is absent or incomplete for a field — for example, when the
AI returned `'damaged'` condition (which has no valid eBay mapping) — the field is empty and
shows *nothing*. The user cannot tell: is this empty because AI skipped it, or because they
haven't filled it in yet?

Story 5-10 closes this gap by adding an "Enter manually" caption for fields that have no AI
pre-fill and are still empty. This completes the two-state visual distinction the UX spec calls
for (FR28):

| Field state | Visual indicator |
|---|---|
| AI pre-filled, not yet edited | `AI-generated` caption (implemented in 5-8) |
| AI pre-filled, then edited by user | no caption (silent — user has it under control) |
| No AI pre-fill, field still empty | `Enter manually` caption (this story) |
| No AI pre-fill, user has entered something | no caption (silent — user has it under control) |

The two captions are mutually exclusive per field — the conditions are structured so both can
never show simultaneously.

[Source: docs/epics.md#Story 5.10] [Source: docs/epic-5-plan.md#Story-5-10]

### Current State After Story 5-9

```
✅ apps/mobile/components/organisms/listing-form.tsx
     — All 5 fields pre-filled via initialValues / RHF defaultValues
     — dirtyFields tracking via useForm formState (Story 5-8)
     — AI badge on each field: shows when initialValues?.{field} && !dirtyFields.{field}
     — Copy to clipboard fully working (Story 5-9)
     — 862 tests (listing-form.test.tsx) all passing
❌ No visual indicator when a field has NO AI pre-fill and is still empty
❌ Fields requiring manual input are indistinguishable from "just not yet loaded" state
```

### What This Story Delivers

1. **`apps/mobile/components/organisms/listing-form.tsx`** — four fields (title, category,
   price, condition) each gain a companion "Enter manually" caption, shown only when:
   - The field has no AI pre-fill (`!initialValues?.{field}`), AND
   - The field is still at its empty default (not yet edited by the user)
2. **`apps/mobile/__tests__/listing-form.test.tsx`** — new tests: manual badge shown when no
   AI pre-fill, manual badge hidden once user fills the field, no manual badge when AI data
   is present, mutual exclusivity of AI and manual badges

---

## Acceptance Criteria

**Given** the listing form has mixed field sources (FR28)
**When** the form is displayed
**Then** AI-generated fields show a subtle indicator badge

> **Implemented in Story 5-8.** The `listing-{field}-ai-badge` nodes show
> `initialValues?.{field} && !dirtyFields.{field}`.

**And** user-edited fields lose the AI indicator

> **Implemented in Story 5-8.** Badge hides when `dirtyFields.{field}` becomes `true`.

**And** fields requiring manual input are highlighted

> **This story.** Fields with no AI pre-fill show a "Enter manually" caption
> while still empty; caption hides once the user starts editing.

**And** the distinction uses Swiss Minimalist styling (no colors, typography-based)

> Caption uses `<Text variant="caption" className="text-ink-muted">` — same typography
> tier as the AI-generated badge, no color changes.

---

## Design Decisions

### D1: Four Fields, Not Five

Description is an **optional** field (no asterisk, not required by Zod schema). Adding "Enter
manually" to an optional field would be misleading — it is perfectly valid to leave it empty.
Only required fields (title, category, price, condition) get the manual badge.

### D2: `dirtyFields` as "User Has Entered Something" Proxy

For category, price, and condition, `!dirtyFields.{field}` accurately represents "the user has
not yet changed this field from its empty default". When the user types anything, the field
becomes dirty and the badge hides. If the user clears the field back to empty, `dirtyFields`
returns `false` (RHF resets dirty state when value equals `defaultValues`), so the badge
reappears — which is correct UX (the field is empty again).

For title, the existing `watch('title')` provides `titleValue`. Use `!titleValue?.trim()`
rather than `!dirtyFields.title` to catch the whitespace-only edge case (a user typing
`'   '` should still show the manual badge — the field has no meaningful content).

### D3: Mutual Exclusivity Guaranteed by Conditions

| Field | AI badge condition | Manual badge condition |
|---|---|---|
| title | `initialValues?.title?.trim() && !dirtyFields.title` | `!initialValues?.title?.trim() && !titleValue?.trim()` |
| category | `initialValues?.category?.trim() && !dirtyFields.category` | `!initialValues?.category?.trim() && !dirtyFields.category` |
| price | `initialValues?.price?.trim() && !dirtyFields.price` | `!initialValues?.price?.trim() && !dirtyFields.price` |
| condition | `initialValues?.condition && !dirtyFields.condition` | `!initialValues?.condition && !dirtyFields.condition` |

If the AI pre-fill check is truthy, the manual check is necessarily falsy (and vice versa)
because both check the same `initialValues?.{field}` guard with opposite truthiness.

### D4: Caption Text is "Enter manually"

Short, lowercase, non-alarming. Consistent with the existing "AI-generated" sibling. No
exclamation, no "required" repeat (the asterisk on the label already communicates that).
Swiss Minimalist voice.

### D5: TestID Convention

`listing-{field}-manual-badge` — mirrors the `listing-{field}-ai-badge` pattern established
in Stories 5-2 through 5-7.

---

## Tasks

### Task 1 — Add Manual Badge to Title Field

**File:** `apps/mobile/components/organisms/listing-form.tsx`

In the title `<Stack gap={1}>` that currently contains the character counter and the AI badge,
add the manual badge as a third optional child:

**Current code:**
```tsx
<Stack gap={1}>
  <Text variant="caption" className="text-ink-muted self-end">
    {titleLength}/{LISTING_TITLE_MAX_LENGTH}
  </Text>
  {initialValues?.title?.trim() && !dirtyFields.title ? (
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

**Replacement:**
```tsx
<Stack gap={1}>
  <Text variant="caption" className="text-ink-muted self-end">
    {titleLength}/{LISTING_TITLE_MAX_LENGTH}
  </Text>
  {initialValues?.title?.trim() && !dirtyFields.title ? (
    <Text
      variant="caption"
      className="text-ink-muted"
      testID="listing-title-ai-badge"
    >
      AI-generated
    </Text>
  ) : null}
  {!initialValues?.title?.trim() && !titleValue?.trim() ? (
    <Text
      variant="caption"
      className="text-ink-muted"
      testID="listing-title-manual-badge"
    >
      Enter manually
    </Text>
  ) : null}
</Stack>
```

---

### Task 2 — Add Manual Badge to Category Field

**File:** `apps/mobile/components/organisms/listing-form.tsx`

In the category `<Stack gap={1}>`, after the AI badge:

**Current code:**
```tsx
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
  {initialValues?.category?.trim() && !dirtyFields.category ? (
    <Text
      variant="caption"
      className="text-ink-muted"
      testID="listing-category-ai-badge"
    >
      AI-generated
    </Text>
  ) : null}
</Stack>
```

**Replacement:**
```tsx
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
  {initialValues?.category?.trim() && !dirtyFields.category ? (
    <Text
      variant="caption"
      className="text-ink-muted"
      testID="listing-category-ai-badge"
    >
      AI-generated
    </Text>
  ) : null}
  {!initialValues?.category?.trim() && !dirtyFields.category ? (
    <Text
      variant="caption"
      className="text-ink-muted"
      testID="listing-category-manual-badge"
    >
      Enter manually
    </Text>
  ) : null}
</Stack>
```

---

### Task 3 — Add Manual Badge to Condition Field

**File:** `apps/mobile/components/organisms/listing-form.tsx`

In the condition `<Stack gap={1}>`, after the AI badge (and after the error message):

**Current code:**
```tsx
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
```

**Replacement:**
```tsx
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
{!initialValues?.condition && !dirtyFields.condition ? (
  <Text
    variant="caption"
    className="text-ink-muted"
    testID="listing-condition-manual-badge"
  >
    Enter manually
  </Text>
) : null}
```

---

### Task 4 — Add Manual Badge to Price Field

**File:** `apps/mobile/components/organisms/listing-form.tsx`

In the price `<Stack gap={1}>`, after the AI badge and price-range caption:

**Current code:**
```tsx
{initialValues?.price?.trim() && !dirtyFields.price ? (
  <Text
    variant="caption"
    className="text-ink-muted"
    testID="listing-price-ai-badge"
  >
    AI-generated
  </Text>
) : null}
{initialValues?.price?.trim() && !dirtyFields.price && priceRange ? (
  <Text
    variant="caption"
    className="text-ink-muted"
    testID="listing-price-range-caption"
  >
    {`Estimated: $${priceRange.min}–${priceRange.max}`}
  </Text>
) : null}
```

**Replacement:**
```tsx
{initialValues?.price?.trim() && !dirtyFields.price ? (
  <Text
    variant="caption"
    className="text-ink-muted"
    testID="listing-price-ai-badge"
  >
    AI-generated
  </Text>
) : null}
{initialValues?.price?.trim() && !dirtyFields.price && priceRange ? (
  <Text
    variant="caption"
    className="text-ink-muted"
    testID="listing-price-range-caption"
  >
    {`Estimated: $${priceRange.min}–${priceRange.max}`}
  </Text>
) : null}
{!initialValues?.price?.trim() && !dirtyFields.price ? (
  <Text
    variant="caption"
    className="text-ink-muted"
    testID="listing-price-manual-badge"
  >
    Enter manually
  </Text>
) : null}
```

---

### Task 5 — Add Tests for Manual Badges

**File:** `apps/mobile/__tests__/listing-form.test.tsx`

Add a new `describe` block after the existing AI badge tests. The new block should contain
the tests listed in the **Test Coverage** section below. Follow the exact test file patterns:
- `afterEach(jest.restoreAllMocks)` is on the outer `describe` — no inner `afterEach` needed
- `act(async () => {...})` wraps mount, interactions, and async flush
- Use `findByTestId` helper already defined in the file
- Use `getTextContent` from `@/test-utils/get-text-content` for text assertions

---

## Test Coverage

Add a `describe('manual entry badges', () => { ... })` block in `listing-form.test.tsx`.

### 5.1 — Title manual badge: shows when no AI pre-fill and field is empty

```tsx
it('shows the title manual badge when there is no AI pre-fill and the field is empty', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  expect(
    getTextContent(findByTestId(renderer!, 'listing-title-manual-badge').props.children),
  ).toBe('Enter manually');
});
```

### 5.2 — Title manual badge: hides when user types something

```tsx
it('hides the title manual badge when the user types a value', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-title-input').props.onChangeText('Vintage Camera');
  });

  expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();
});
```

### 5.3 — Title manual badge: restores when user clears field back to empty

```tsx
it('restores the title manual badge when the user clears the field back to empty', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  // Type something — badge hides
  await act(async () => {
    findByTestId(renderer!, 'listing-title-input').props.onChangeText('Vintage Camera');
  });

  expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();

  // Clear back to empty — badge reappears
  await act(async () => {
    findByTestId(renderer!, 'listing-title-input').props.onChangeText('');
  });

  expect(findByTestId(renderer!, 'listing-title-manual-badge')).toBeTruthy();
});
```

### 5.4 — Title manual badge: stays visible when input is whitespace-only

```tsx
it('keeps the title manual badge when the user types only whitespace', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-title-input').props.onChangeText('   ');
  });

  expect(findByTestId(renderer!, 'listing-title-manual-badge')).toBeTruthy();
});
```

### 5.5 — Title: no manual badge when AI pre-fill is present

```tsx
it('does not show the title manual badge when initialValues provides a title', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
    );
  });

  expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();
});
```

### 5.6 — Category manual badge: shows when no AI pre-fill

```tsx
it('shows the category manual badge when there is no AI pre-fill', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  expect(
    getTextContent(findByTestId(renderer!, 'listing-category-manual-badge').props.children),
  ).toBe('Enter manually');
});
```

### 5.7 — Category manual badge: hides when user types something

```tsx
it('hides the category manual badge when the user types a value', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-category-input').props.onChangeText('Film Cameras');
  });

  expect(() => findByTestId(renderer!, 'listing-category-manual-badge')).toThrow();
});
```

### 5.8 — Category: no manual badge when AI pre-fill is present

```tsx
it('does not show the category manual badge when initialValues provides a category', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm valuationId="valuation-1" initialValues={{ category: 'Film Cameras' }} />,
    );
  });

  expect(() => findByTestId(renderer!, 'listing-category-manual-badge')).toThrow();
});
```

### 5.9 — Price manual badge: shows when no AI pre-fill

```tsx
it('shows the price manual badge when there is no AI pre-fill', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  expect(
    getTextContent(findByTestId(renderer!, 'listing-price-manual-badge').props.children),
  ).toBe('Enter manually');
});
```

### 5.10 — Price manual badge: hides when user types a price

```tsx
it('hides the price manual badge when the user enters a price', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-price-input').props.onChangeText('49.99');
  });

  expect(() => findByTestId(renderer!, 'listing-price-manual-badge')).toThrow();
});
```

### 5.11 — Price: no manual badge when AI pre-fill is present

```tsx
it('does not show the price manual badge when initialValues provides a price', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm valuationId="valuation-1" initialValues={{ price: '85' }} />,
    );
  });

  expect(() => findByTestId(renderer!, 'listing-price-manual-badge')).toThrow();
});
```

### 5.12 — Condition manual badge: shows when no AI pre-fill

```tsx
it('shows the condition manual badge when there is no AI pre-fill', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  expect(
    getTextContent(findByTestId(renderer!, 'listing-condition-manual-badge').props.children),
  ).toBe('Enter manually');
});
```

### 5.13 — Condition manual badge: hides when user selects a condition

```tsx
it('hides the condition manual badge when the user selects a condition', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
  });

  expect(() => findByTestId(renderer!, 'listing-condition-manual-badge')).toThrow();
});
```

### 5.14 — Condition: no manual badge when AI pre-fill is present

```tsx
it('does not show the condition manual badge when initialValues provides a condition', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm valuationId="valuation-1" initialValues={{ condition: 'good' }} />,
    );
  });

  expect(() => findByTestId(renderer!, 'listing-condition-manual-badge')).toThrow();
});
```

### 5.15 — Full form with all fields pre-filled: no manual badges anywhere

```tsx
it('shows no manual badges when all fields are AI pre-filled', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm
        valuationId="valuation-1"
        initialValues={{
          title: 'Canon AE-1 35mm Film Camera',
          category: 'Film Cameras',
          condition: 'good',
          price: '85',
          description: 'A Canon AE-1 in good working condition.',
        }}
      />,
    );
  });

  expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();
  expect(() => findByTestId(renderer!, 'listing-category-manual-badge')).toThrow();
  expect(() => findByTestId(renderer!, 'listing-condition-manual-badge')).toThrow();
  expect(() => findByTestId(renderer!, 'listing-price-manual-badge')).toThrow();
});
```

### 5.16 — Mutual exclusivity: AI badge and manual badge never both visible for same field

```tsx
it('never shows both AI and manual badges simultaneously for the title field', async () => {
  let renderer: ReactTestRenderer;

  // Case A: AI pre-fill present — AI badge shows, manual badge absent
  await act(async () => {
    renderer = create(
      <ListingForm valuationId="valuation-1" initialValues={{ title: 'Canon AE-1' }} />,
    );
  });

  expect(findByTestId(renderer!, 'listing-title-ai-badge')).toBeTruthy();
  expect(() => findByTestId(renderer!, 'listing-title-manual-badge')).toThrow();

  // Case B: No AI pre-fill — manual badge shows, AI badge absent
  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  expect(findByTestId(renderer!, 'listing-title-manual-badge')).toBeTruthy();
  expect(() => findByTestId(renderer!, 'listing-title-ai-badge')).toThrow();
});
```

---

## Dev Notes

### File-Level Implementation Guide

#### `apps/mobile/components/organisms/listing-form.tsx` (314 lines currently)

No new imports needed — `Text`, `Stack` already imported from `@/components/primitives`.
No new state, no new hooks, no new props.

The only change is adding four `{condition ? <Text .../> : null}` snippets inside the
existing `<Stack gap={1}>` wrappers for title, category, price, and condition fields.

**Where each badge goes (by field):**

| Field | Location in JSX | Nearby anchor for the replace |
|---|---|---|
| `title` | Inside the inner `<Stack gap={1}>`, AFTER the AI badge | `testID="listing-title-ai-badge"` |
| `category` | Inside the `<Stack gap={1}>`, AFTER the AI badge | `testID="listing-category-ai-badge"` |
| `condition` | Inside the `<Stack gap={1}>`, AFTER the AI badge | `testID="listing-condition-ai-badge"` |
| `price` | Inside the `<Stack gap={1}>`, AFTER the price-range caption | `testID="listing-price-range-caption"` |

**Title specifics:** title already `watch('title')` for `titleLength`. The manual badge uses
`!titleValue?.trim()` (the watched value) — not `!dirtyFields.title` — to correctly hide on
non-empty input including when the user types then navigates back to a non-empty value.

**Condition specifics:** the condition `<Stack gap={1}>` already contains the error message
and the AI badge. Add the manual badge as the last child (after the AI badge). The segmented
picker deselects/hides the manual badge as soon as any option is pressed.

#### `apps/mobile/__tests__/listing-form.test.tsx` (862 lines currently)

Add a new `describe('manual entry badges', () => { ... })` block after the existing
`describe` block that covers AI badge and dirtyFields behavior (around line 150–410).

The 16 new tests are fully self-contained — **no new mocks, no new imports, no new fixtures**
beyond what already exists in the file. Unlike Story 5-9's clipboard tests (which spy on
`Clipboard.setStringAsync` and `Alert.alert`), these are pure rendering tests. Do not add
any `jest.spyOn` or mock setup — just `create()`, interactions, and `findByTestId` assertions.

**Test count after this story:** 862 lines → approximately 960 lines; 50 tests today + 16 new = 66 total tests in listing-form.test.tsx. (Exact prior test count may differ — run `npx jest --testPathPattern="listing-form" --verbose` to confirm.)

---

### Known Pitfalls

**P1: Description has no manual badge — intentional**
Description is `optional()` in the Zod schema. Adding "Enter manually" to an optional field
would be misleading. Do not add `listing-description-manual-badge`.

**P2: Title uses `!titleValue?.trim()`, not `!dirtyFields.title`**
This is intentional — see Design Decision D2. The whitespace edge case matters for title
since users sometimes paste whitespace by accident.

**P3: Both title badges inside the inner `<Stack gap={1}>`**
The title field has an outer `<Stack gap={2}>` and an inner `<Stack gap={1}>` (for counter
+ badges). Both the AI badge and the new manual badge must be inside the **inner**
`<Stack gap={1}>` — not the outer one. This keeps the character counter and both captions
visually grouped, with consistent 4px spacing between them.

**P4: Run full test suite before committing**
The existing 50 tests already cover AI badge visibility extensively. Verify they all still
pass — the new conditional logic does not change any existing condition, it only adds new
branches.

---

## Checklist

- [x] listing-form.tsx: `listing-title-manual-badge` renders when no initialValues.title and field empty
- [x] listing-form.tsx: `listing-category-manual-badge` renders when no initialValues.category and field clean
- [x] listing-form.tsx: `listing-price-manual-badge` renders when no initialValues.price and field clean
- [x] listing-form.tsx: `listing-condition-manual-badge` renders when no initialValues.condition and picker unselected
- [x] listing-form.tsx: manual badges do NOT render when AI pre-fill is present
- [x] listing-form.tsx: manual badges disappear once user edits the field
- [x] listing-form.tsx: title manual badge stays when user types whitespace-only
- [x] listing-form.tsx: AI badge and manual badge never appear simultaneously for same field
- [x] listing-form.test.tsx: all 16 new manual badge tests pass
- [x] listing-form.test.tsx: all pre-existing tests still pass (no regressions)
- [x] npx jest --testPathPattern="listing-form" — clean run, zero failures

---

## Dev Agent Record

### Agent Model Used
GPT-5.4

### Completion Notes
- Added manual entry badges for the required fields only: title, category, condition, and price.
- Kept description unchanged because it remains optional in the schema and should not prompt manual entry.
- Implemented the title manual badge using `!titleValue?.trim()` so whitespace-only input still shows the manual prompt.
- Added 16 manual-badge tests covering initial render, hide-on-edit, restore-on-clear, AI-prefill exclusion, and AI/manual mutual exclusivity.

### Debug Log
- Updated `apps/mobile/components/organisms/listing-form.tsx` with `listing-{field}-manual-badge` conditionals for title, category, condition, and price.
- Extended `apps/mobile/__tests__/listing-form.test.tsx` with the Story 5-10 manual badge coverage block.
- Validation: `npm test -- --runInBand listing-form.test.tsx` from `apps/mobile` → PASS (66/66).
- Validation: `npx jest --runInBand --testPathPattern="listing-form"` from `apps/mobile` → PASS (66/66).
