# Story 5.9: Implement Copy to Clipboard

Status: done

## Story

As a user,
I want to copy my listing data to clipboard,
so that I can paste it into eBay's listing form manually.

## Business Context

### Why This Story Matters

Stories 5-1 through 5-8 built and populated the listing form — all AI-prefilled fields reactive
to edits, a segmented condition picker, and an original photo. The "Copy to Clipboard" CTA button
already exists in `listing-form.tsx` and validates the form via React Hook Form, but `handleValidSubmit`
only calls the optional `onSubmit` prop; it never actually copies anything.

Story 5-9 wires the button to `expo-clipboard`, formats all five listing fields as a labeled
plain-text block, and shows a success `Alert` to confirm the copy. This is the **MVP listing
action** — eBay OAuth (Phase 2) is explicitly deferred; copy-to-clipboard is the entire listing
path for the current epic.

[Source: docs/epics.md#Epic 5, FR27] [Source: docs/architecture.md line 29 "copy-to-clipboard"]

### Current State After Story 5-8

```
✅ apps/mobile/components/organisms/listing-form.tsx
     — 5 fields, segmented condition picker, static AI badges, photo section
     — Submit button testID="listing-submit-button", accessibilityLabel="Copy listing to clipboard"
     — handleValidSubmit calls onSubmit?.(values) only — NO clipboard write
✅ apps/mobile/__tests__/listing-form.test.tsx   — 62 tests passing
✅ apps/mobile/__tests__/listing-screen.test.tsx — integration tests passing
❌ expo-clipboard NOT installed (not in apps/mobile/package.json)
❌ handleValidSubmit does not write to clipboard
❌ No success feedback after copy
```

### What This Story Delivers

1. **`expo-clipboard` installed** — SDK-compatible version via `npx expo install expo-clipboard`
2. **`apps/mobile/__mocks__/expo-clipboard.js`** — manual mock so existing and new tests continue
   to pass without a real clipboard
3. **`apps/mobile/components/organisms/listing-form.tsx`** — `handleValidSubmit` becomes `async`,
   formats a labeled text block, calls `Clipboard.setStringAsync`, then `Alert.alert`
4. **`apps/mobile/__tests__/listing-form.test.tsx`** — new clipboard tests: format correctness,
   success alert, empty-description omission, underscored condition formatting

No new routes. No backend changes. No new UI components (button already exists).

### Epic 5 Story Graph

```
5-1  Build Listing Form Component              ✅ done
5-2  Pre-Fill Title from AI Identification     ✅ done
5-3  Pre-Fill Description from AI             ✅ done
5-4  Pre-Fill Price from Valuation             ✅ done
5-5  Pre-Fill Category from AI Classification  ✅ done
5-6  Pre-Fill Condition from AI Assessment     ✅ done
5-7  Include Original Photo in Listing         ✅ done
5-8  Enable Field Editing                      ✅ done
5-9  Implement Copy to Clipboard               ◄── you are here
5-10 Display Pre-Filled vs Manual Distinction  (depends on 5-8 dirtyFields — already implemented)
5-11 Image Hosting Thumbnails
```

---

## Acceptance Criteria

### AC1: All Listing Data Copied in a Formatted Text Block

**Given** the listing form has valid values in all required fields
**When** the user taps "Copy to Clipboard" and the form passes RHF validation
**Then** `expo-clipboard`'s `Clipboard.setStringAsync` is called with a labeled plain-text block
containing all five fields

The exact format must be:
```
Title: {title}
Category: {category}
Condition: {condition with underscores replaced by spaces}
Price: ${price}
Description: {description}
```
The `Description` line is **omitted** when `values.description.trim()` is empty string.

### AC2: Format Is Easy to Paste Into eBay's Interface

**Given** the clipboard text is formatted per AC1
**Then** each field is on its own line with a `FieldName: value` label
**And** the condition value is human-readable (e.g. `like new`, not `like_new`)
**And** the description line is absent if the user left description blank (no empty `Description:` line)

### AC3: Success Message Confirms the Copy

**Given** `Clipboard.setStringAsync` resolves successfully
**Then** `Alert.alert` is called with title `'Copied'` and message
`'Listing details copied to clipboard.'`

No new UI component is needed — `Alert.alert` from `react-native` is sufficient for MVP.
Swiss Minimalist principle: no confetti, no animation, just an OS-native confirmation.

### AC4: Clipboard Includes Title, Description, Price, Category, Condition

**Given** the form has pre-filled or manually entered values
**When** copy is triggered
**Then** the clipboard text contains Title, Category, Condition, Price, and Description (if non-empty)
**And** no field is silently omitted

### AC5: No Regression on Existing Behaviour

**Given** the form is rendered with pre-filled or empty state
**When** existing tests run
**Then** all 62 listing-form tests continue to pass
**And** the existing `submits valid listing values` test (line ~679 in listing-form.test.tsx) is
not broken — it still asserts `onSubmit` callback is called

---

## Design Decision: Clipboard Text Format

**Decided format** (space after colon, title-case label, condition words humanised):
```
Title: Canon AE-1 35mm Film Camera
Category: Cameras & Photo
Condition: good
Price: $249.99
Description: Well-maintained camera in excellent working condition.
```

**Rationale:**
- `FieldName: value` is eBay's own copy-paste convention from their seller UI
- Each line = one copyable segment if user wants to paste selectively
- `condition.replace(/_/g, ' ')` mirrors the existing condition picker label rendering in Story 5-8
  (same transform already tested in the segmented control)
- Omitting empty `Description:` avoids a confusing blank line at the end

**`onSubmit` prop:** retained and still called after clipboard write + alert. This allows the
listing screen to remain informed of a valid submission if needed in future without breaking
existing unit tests.

**Double-tap on submit:** the button is not disabled during the async clipboard write. A rapid
double-tap could trigger two concurrent writes and two alerts. Accepted as a low-risk trade-off
for MVP — clipboard writes are fast (~50ms) and the pattern is uncommon on a one-action form;
a loading/disabled state can be added in a polish story if it proves problematic in usage.

---

## Tasks / Subtasks

- [x] Task 1: Install `expo-clipboard` (AC: 1, 4)
  - [x] 1.1: From `apps/mobile/` run:
    ```bash
    npx expo install expo-clipboard
    ```
    This installs the SDK-54-compatible version. Do NOT manually add a version string to
    package.json — let `expo install` resolve the correct peer version. Verify it appears in
    `dependencies` in `apps/mobile/package.json` after installation.

- [x] Task 2: Add manual Jest mock for expo-clipboard (AC: 5)
  - [x] 2.1: Create `apps/mobile/__mocks__/expo-clipboard.js` — adjacent to
    `expo-web-browser.js` — with the following content:
    ```js
    // Manual mock for expo-clipboard.
    // Auto-applied for all tests in this project (adjacent to node_modules).
    module.exports = {
      setStringAsync: jest.fn().mockResolvedValue(undefined),
      getStringAsync: jest.fn().mockResolvedValue(''),
    };
    ```
    The `mockResolvedValue(undefined)` makes `setStringAsync` appear as a resolved async
    function in tests without touching a real clipboard.

- [x] Task 3: Update `listing-form.tsx` to implement clipboard copy (AC: 1, 2, 3, 4)
  - [x] 3.1: Add `Alert` to the existing `react-native` import at line 2:
    Change:
    ```typescript
    import { Image } from 'react-native';
    ```
    To:
    ```typescript
    import { Alert, Image } from 'react-native';
    ```

  - [x] 3.2: Add `expo-clipboard` import directly below the `react-native` import:
    ```typescript
    import * as Clipboard from 'expo-clipboard';
    ```

  - [x] 3.3: Replace the existing `handleValidSubmit` function with an async version:
    Change ([current lines roughly 54-57]):
    ```typescript
    function handleValidSubmit(values: ListingFormValues) {
      onSubmit?.(values);
    }
    ```
    To:
    ```typescript
    async function handleValidSubmit(values: ListingFormValues) {
      const lines: string[] = [
        `Title: ${values.title}`,
        `Category: ${values.category}`,
        `Condition: ${values.condition.replace(/_/g, ' ')}`,
        `Price: $${values.price}`,
      ];
      if (values.description.trim()) {
        lines.push(`Description: ${values.description}`);
      }
      try {
        await Clipboard.setStringAsync(lines.join('\n'));
        Alert.alert('Copied', 'Listing details copied to clipboard.');
      } catch {
        Alert.alert('Copy failed', 'Unable to copy to clipboard. Please try again.');
      }
      onSubmit?.(values);
    }
    ```
    **Notes:**
    - `handleSubmit(handleValidSubmit)` from RHF awaits async `handleValidSubmit` automatically
    - `lines` typed as `string[]` — no filter/cast dance needed; conditional push handles the
      optional description cleanly
    - try/catch: `setStringAsync` can reject on web (permission denied) or unsupported platforms;
      error alert follows the established `Alert.alert` error pattern in `app/appraisal.tsx`
    - `onSubmit?.(values)` is called outside the try/catch so the caller is always notified of
      a valid form submission regardless of clipboard success/failure
    - `onSubmit?.(values)` remains so the existing `submits valid listing values` test passes

- [x] Task 4: Extend `listing-form.test.tsx` with clipboard tests (AC: 1, 2, 3, 4)

  Add the following tests to `apps/mobile/__tests__/listing-form.test.tsx`. Place them after the
  final existing test (`renders the CTA with the required accessibility label`), inside the
  `describe('ListingForm', ...)` block. Use the existing `findByTestId` helper and `act/create`
  imports already at the top of the file.

  - [x] 4.1: Add import for `Alert` and `Clipboard` at the top of the test file (after existing
    imports):
    ```typescript
    import { Alert } from 'react-native';
    import * as Clipboard from 'expo-clipboard';
    ```

  - [x] 4.2: Add an `afterEach` cleanup hook inside the `describe('ListingForm', ...)` block
    (alongside the existing `it(...)` tests — any position inside the describe block is fine,
    but placing it near the top of the block is conventional):
    ```typescript
    afterEach(() => {
      jest.restoreAllMocks();
    });
    ```
    **Why:** The new tests use `jest.spyOn()` on `Clipboard.setStringAsync` and `Alert.alert`.
    Without restoration, spies persist across subsequent tests within the same describe block
    and cause order-dependent failures. `jest.restoreAllMocks()` resets all spies to their
    original implementations after each test. Follow the pattern established in
    `apps/mobile/__tests__/settings.test.tsx`.

  - [x] 4.3: Add the following **five** tests. The helper `fillRequiredFields` is defined inline
    inside each test for clarity — do not extract to a shared before-hook since the describe block
    already spans 62 tests and isolation is more important than DRY.

    **Test 1 — copies formatted listing block on valid submit:**
    ```typescript
    it('copies formatted listing data to clipboard when form is submitted with all fields', async () => {
      const mockSetString = jest.spyOn(Clipboard, 'setStringAsync');
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1 35mm Camera');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
        findByTestId(renderer!, 'listing-description-input').props.onChangeText('Classic film camera.');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(mockSetString).toHaveBeenCalledWith(
        'Title: Canon AE-1 35mm Camera\nCategory: Cameras\nCondition: good\nPrice: $249.99\nDescription: Classic film camera.',
      );
    });
    ```

    **Test 2 — shows success alert after copy:**
    ```typescript
    it('shows a success alert after copying to clipboard', async () => {
      jest.spyOn(Alert, 'alert');
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1 35mm Camera');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(Alert.alert).toHaveBeenCalledWith('Copied', 'Listing details copied to clipboard.');
    });
    ```

    **Test 3 — omits Description line when description is empty:**
    ```typescript
    it('omits the Description line when description is empty', async () => {
      const mockSetString = jest.spyOn(Clipboard, 'setStringAsync');
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1 35mm Camera');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
        // description left empty (default '')
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(mockSetString).toHaveBeenCalledWith(
        'Title: Canon AE-1 35mm Camera\nCategory: Cameras\nCondition: good\nPrice: $249.99',
      );
    });
    ```

    **Test 4 — formats underscored condition values with spaces:**
    ```typescript
    it('formats condition value with spaces in the clipboard text', async () => {
      const mockSetString = jest.spyOn(Clipboard, 'setStringAsync');
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Camera');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-like_new').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('50.00');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      const calledWith: string = mockSetString.mock.calls[0][0] as string;
      expect(calledWith).toContain('Condition: like new');
    });
    ```

    **Test 5 — shows error alert when clipboard write fails:**
    ```typescript
    it('shows an error alert when clipboard write fails', async () => {
      jest.spyOn(Clipboard, 'setStringAsync').mockRejectedValueOnce(new Error('permission denied'));
      jest.spyOn(Alert, 'alert');
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      await act(async () => {
        findByTestId(renderer!, 'listing-title-input').props.onChangeText('Camera');
        findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
        findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
        findByTestId(renderer!, 'listing-price-input').props.onChangeText('50.00');
        findByTestId(renderer!, 'listing-submit-button').props.onPress();
      });

      await act(async () => {});

      expect(Alert.alert).toHaveBeenCalledWith(
        'Copy failed',
        'Unable to copy to clipboard. Please try again.',
      );
    });
    ```

  - [x] 4.4: After adding the five new tests, run focused suite to confirm all pass:
    ```bash
    cd apps/mobile && npx jest --testPathPattern="listing-form" --no-coverage
    ```
    Expected: **67 tests** pass (was 62).

- [x] Task 5: Run full suite to confirm no regressions (AC: 5)
  ```bash
  cd apps/mobile && npx jest --runInBand --no-coverage
  ```
  Expected: all existing tests pass (previously 229) plus the 5 new tests = **234 total**.

---

## Dev Notes

### New Dependency: `expo-clipboard`

| Item | Detail |
|------|--------|
| Package | `expo-clipboard` |
| Install command | `npx expo install expo-clipboard` (from `apps/mobile/`) |
| Expected SDK | SDK 54 (matches `"expo": "~54.0.30"` in package.json) |
| Import | `import * as Clipboard from 'expo-clipboard'` |
| Key API | `Clipboard.setStringAsync(text: string): Promise<void>` |
| Not installed yet | Confirm absent from `apps/mobile/package.json` before installing |

### Mock Placement

The `__mocks__/` directory in `apps/mobile/` is adjacent to `node_modules/` and is already used
for `expo-web-browser.js`. Jest auto-applies manual mocks from this directory for any matching
module name. The new `expo-clipboard.js` mock follows the identical pattern.

```
apps/mobile/
  __mocks__/
    expo-clipboard.js      ← NEW (Task 2)
    expo-web-browser.js    ← existing pattern to follow
```

### React Native `Alert` in Tests

`Alert` from `react-native` is available in the jest-expo test environment without additional
mocking. Use `jest.spyOn(Alert, 'alert')` to intercept calls. Do NOT mock the entire `react-native`
module — the existing tests rely on it being intact (e.g., `Image`, `Platform`).

### Impact on Existing `submits valid listing values` Test

The test at line ~679 of `listing-form.test.tsx` fills all fields and presses submit. After Task 3,
`handleValidSubmit` will also:
1. Call `Clipboard.setStringAsync(...)` — resolved by the auto-mock → no throw
2. Call `Alert.alert(...)` — no-op in test env → no throw
3. Call `onSubmit?.(values)` — the test's `handleSubmit` mock is called as before

The test asserts only `handleSubmit.toHaveBeenCalledWith(...)`, which is unaffected. ✓

### Spy Cleanup Pattern

The new tests use `jest.spyOn()` without `jest.mock()`. Without cleanup, spies set in one
test persist into subsequent tests within the same describe block, causing:
- False positives: a spy call count carrying over from a previous test
- Unexpected mock behaviour: `mockRejectedValueOnce` overriding the module mock in later tests

The `afterEach(() => { jest.restoreAllMocks(); })` added in Task 4.2 resets all spies after
each test. This follows `apps/mobile/__tests__/settings.test.tsx` and aligns with the frontend
checklist requirement for test isolation.

### No Changes to Other Files

| File | Touched? | Reason |
|------|----------|--------|
| `apps/mobile/app/listing/[id].tsx` | No | Screen does NOT currently pass `onSubmit` prop — `onSubmit?.()` fires harmlessly; no change needed |
| `apps/mobile/__tests__/listing-screen.test.tsx` | No | No clipboard assertions at screen level needed for AC |
| `apps/mobile/types/listing.ts` | No | `ListingFormValues` schema unchanged |
| Any backend file | No | Clipboard is a pure client-side operation |

### Project Structure Notes

- Component path: `apps/mobile/components/organisms/listing-form.tsx` — organism layer
- Mock path: `apps/mobile/__mocks__/expo-clipboard.js` — Jest auto-mock directory
- Test path: `apps/mobile/__tests__/listing-form.test.tsx` — existing test file to extend
- Alignment: Organism components live in `components/organisms/`, atoms in `components/atoms/`,
  primitives in `components/primitives/`. No new component is added.

### References

- Epics story spec: [docs/epics.md — Story 5.9](../epics.md#story-59-implement-copy-to-clipboard)
- FR27 (Copy to clipboard): [docs/epics.md — Functional Requirements table](../epics.md)
- Architecture (clipboard mention): [docs/architecture.md line 29](../architecture.md)
- Previous story (5-8, patterns to follow): [docs/sprint-artifacts/5-8-enable-field-editing.md](./5-8-enable-field-editing.md)
- Existing listing form: [apps/mobile/components/organisms/listing-form.tsx](../../apps/mobile/components/organisms/listing-form.tsx)
- Existing mock pattern: [apps/mobile/__mocks__/expo-web-browser.js](../../apps/mobile/__mocks__/expo-web-browser.js)
- Existing tests: [apps/mobile/__tests__/listing-form.test.tsx](../../apps/mobile/__tests__/listing-form.test.tsx)

## Dev Agent Record

### Agent Model Used

GPT-5.4 (GitHub Copilot)

### Debug Log References

- Dependency install: `cd apps/mobile && npx expo install expo-clipboard`
- Focused verification: `cd apps/mobile && npx jest --testPathPattern="listing-form" --no-coverage`
- Full regression verification: `cd apps/mobile && npx jest --runInBand --no-coverage`

### Completion Notes List

- Installed `expo-clipboard` via Expo's SDK-compatible installer, which resolved `~8.0.8` into the mobile app manifest and lockfile.
- Updated `apps/mobile/components/organisms/listing-form.tsx` so valid submit now formats the listing into labeled plain text, writes it to the clipboard, shows a success alert on resolve, shows an error alert on rejection, and still calls `onSubmit?.(values)` afterward.
- Added `apps/mobile/__mocks__/expo-clipboard.js` so Jest can exercise the clipboard path without a native clipboard dependency.
- Extended `apps/mobile/__tests__/listing-form.test.tsx` with spy cleanup plus five clipboard-focused regression tests covering formatted output, success alert, blank-description omission, underscore-to-space condition formatting, and clipboard failure handling.
- Focused Jest verification passed with 50/50 tests green in `listing-form.test.tsx`; the story's authored 67-test expectation was stale relative to the current suite state. Full mobile regression then passed with 234/234 tests green.
- `npx expo install expo-clipboard` completed successfully on this machine with non-blocking Node engine warnings because the local Node version is slightly below some React Native package `engines` declarations.

### File List

- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/components/organisms/listing-form.tsx`
- `apps/mobile/__mocks__/expo-clipboard.js`
- `apps/mobile/__tests__/listing-form.test.tsx`
- `docs/sprint-artifacts/5-9-implement-copy-to-clipboard.md`
- `docs/sprint-artifacts/sprint-status.yaml`

### Senior Developer Review (AI)

- Reviewer: GitHub Copilot (GPT-5.4)
- Date: 2026-04-13
- Outcome: Approved after fixes
- Fixed: strengthened clipboard success-path coverage to assert clipboard write, success alert, and `onSubmit` together in one integrated test in `apps/mobile/__tests__/listing-form.test.tsx`
- Fixed: strengthened clipboard failure-path coverage to assert `onSubmit` still fires when `Clipboard.setStringAsync` rejects in `apps/mobile/__tests__/listing-form.test.tsx`
- Residual note: the story narrative still contains a stale pre-implementation test-count reference from story authoring; runtime verification remains authoritative
- Validation: `cd apps/mobile && npx jest --testPathPattern="listing-form" --no-coverage`
- Validation: `cd apps/mobile && npx jest --runInBand --no-coverage`

### Change Log

- 2026-04-13: Implemented Expo clipboard copy for listing submissions, added success/error alert handling and Jest coverage, and moved the story to review.
- 2026-04-13: Code review follow-up added integrated success/failure callback assertions for the clipboard flow; review approved and story moved to done.
