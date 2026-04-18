# Story 5.7: Include Original Photo in Listing

Status: done

## Story

As a user,
I want the original item photo displayed in the listing form,
so that I can visually confirm I'm listing the correct item before copying to eBay.

## Business Context

### Why This Story Matters

Stories 5-2 through 5-6 pre-filled all five text fields (title, description, price, category,
condition). The listing form now shows a complete AI-generated draft — but the Photos section is
still a static placeholder box with "Photo will appear here". This is the only visible gap between
the listing form and the valuation the user already reviewed.

Story 5-7 closes that gap by displaying the original valuation photo in the Photos section. It is
a pure presentational change: the photo is already stored on-device in `Valuation.imageUri`; this
story pipes it through to the listing form.

### Photo Storage Architecture (VERIFIED — do not re-investigate)

The investigation called for in `docs/sprint-artifacts/epic-5-plan.md` Risk 2 has been completed.
Here are confirmed facts:

**`Valuation.imageUri?: string`** exists in `apps/mobile/types/valuation.ts` (line 90). It holds a
device-local file URI (from `photo.uri` in `app/(tabs)/index.tsx`).

**Written at capture time:** `app/(tabs)/index.tsx` calls `saveToLocalHistory({ ..., imageUri: photo.uri })` immediately after the API call resolves. Every valuation in local history has `imageUri`.

**Already rendered in the rest of the app:** `app/appraisal.tsx` reads `{ imageUri }` from the
loaded valuation and passes it to `<ValuationCard imageUri={imageUri} />`. `ValuationCard` uses
React Native `<Image source={{ uri: imageUri }} />` with Museum Mat framing.

**Available in `listing/[id].tsx`:** the screen's `useState<Valuation>` already loads the full
`Valuation` object including `imageUri`. The field just isn't passed to `ListingForm` yet.

### What This Story Delivers

Three targeted changes:

1. **`apps/mobile/components/organisms/listing-form.tsx`** — ADD `photoUri?: string` prop; REPLACE
   static placeholder with `<Image>` when `photoUri` is truthy, keep placeholder when falsy.
2. **`apps/mobile/app/listing/[id].tsx`** — PASS `photoUri={valuation?.imageUri ?? undefined}` to
   `ListingForm`.
3. Tests — EXTEND listing-form tests (photo visible, placeholder fallback); EXTEND listing-screen
   tests (photo prop passed, verified end-to-end).

No new routes, no backend changes, no type-chain changes.

### Epic 5 Story Graph

```
5-1  Build Listing Form Component              ✅ done
5-2  Pre-Fill Title from AI Identification     ✅ done
5-3  Pre-Fill Description from AI             ✅ done
5-4  Pre-Fill Price from Valuation             ✅ done
5-5  Pre-Fill Category from AI Classification  ✅ done
5-6  Pre-Fill Condition from AI Assessment     ✅ done
5-7  Include Original Photo in Listing         ◄── you are here
5-8  Enable Field Editing
5-9  Implement Copy to Clipboard
5-10 Display Pre-Filled vs Manual Distinction
5-11 Image Hosting Thumbnails
```

---

## Acceptance Criteria

### AC1: Photo Displayed When Valuation Has imageUri

**Given** the user navigates to `/listing/<valuationId>` where the stored `Valuation` has a
truthy `imageUri`
**When** the listing form renders
**Then** the original photo is visible in the Photos section
**And** the photo occupies the full width of its container
**And** the photo has `testID="listing-photo-image"`
**And** the static placeholder box (`testID="listing-photo-placeholder"`) is NOT rendered

### AC2: Placeholder Shown When imageUri Is Absent

**Given** the user navigates to `/listing/<valuationId>` where the stored `Valuation` has no
`imageUri` (field absent, `null`, or `undefined`)
**When** the listing form renders
**Then** the existing placeholder box (`testID="listing-photo-placeholder"`) is still visible
**And** no `<Image>` is rendered in its place
**And** no crash or error occurs

### AC3: Photo Uses Established Rendering Style

**Given** a photo is displayed (AC1)
**When** the user views the listing form
**Then** the photo uses the Museum Mat framing pattern established in `ValuationCard`:
- Outer `<Box className="border border-divider p-1 bg-paper">` wrapper
- Inner `<Image source={{ uri: photoUri }} className="aspect-square w-full" resizeMode="cover" />`
- `accessibilityLabel` is set to describe the photo

### AC4: No Regression on Pre-Fill Fields

**Given** a valuation with AI data AND a photo
**When** the listing form renders
**Then** all five AI pre-fill fields (title, description, price, category, condition) continue to
show their pre-filled values and AI badges
**And** all existing tests continue to pass

---

## Tasks / Subtasks

- [x] Task 1: Add `photoUri` prop to `ListingForm` and replace the placeholder (AC: 1, 2, 3)
  - [x] 1.1: In `apps/mobile/components/organisms/listing-form.tsx`, add `photoUri?: string` to the
    `ListingFormProps` interface:
    ```typescript
    export interface ListingFormProps {
      valuationId: string;
      onSubmit?: (values: ListingFormValues) => void;
      initialValues?: Partial<ListingFormValues>;
      priceRange?: { min: number; max: number };
      photoUri?: string;
    }
    ```
  - [x] 1.2: Add `photoUri` to the destructured props in the `ListingForm` function signature:
    ```typescript
    export function ListingForm({
      valuationId,
      onSubmit,
      initialValues,
      priceRange,
      photoUri,
    }: ListingFormProps) {
    ```
  - [x] 1.3: Add the `Image` import from `react-native` at the top of the file (alongside the
    existing RN imports). Check whether `react-native` is already imported — if so, add `Image` to
    the existing import. If not, add a new import line:
    ```typescript
    import { Image } from 'react-native';
    ```
  - [x] 1.4: Locate the Photos section (the `<Stack gap={2}>` block with `testID="listing-photo-placeholder"`). Replace it entirely with:
    ```tsx
    <Stack gap={2}>
      <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
        Photos
      </Text>
      <Text variant="caption" className="text-ink-muted">
        (from valuation)
      </Text>
      {photoUri ? (
        <Box className="border border-divider p-1 bg-paper overflow-hidden">
          <Image
            source={{ uri: photoUri }}
            className="aspect-square w-full"
            resizeMode="cover"
            accessibilityLabel="Valuation photo"
            testID="listing-photo-image"
          />
        </Box>
      ) : (
        <Box
          testID="listing-photo-placeholder"
          className="w-full h-24 border border-divider items-center justify-center"
        >
          <Text variant="caption" className="text-ink-muted">
            Photo will appear here
          </Text>
        </Box>
      )}
    </Stack>
    ```
    The Museum Mat framing (`border border-divider p-1 bg-paper`) matches the existing pattern in
    `apps/mobile/components/molecules/valuation-card.tsx` (line ~141). The 1px border + 1px padding
    gives the museum mat effect without colour.

- [x] Task 2: Pass `photoUri` from `listing/[id].tsx` to `<ListingForm>` (AC: 1, 2, 4)
  - [x] 2.1: In `apps/mobile/app/listing/[id].tsx`, add `photoUri` to the `<ListingForm>` props:
    ```tsx
    <ListingForm
      valuationId={valuationId}
      initialValues={...}        {/* unchanged */}
      priceRange={valuation?.response?.marketData?.priceRange}
      photoUri={valuation?.imageUri ?? undefined}
    />
    ```
    Use `valuation?.imageUri ?? undefined` — the `??` operator converts `null` to `undefined` (the
    `imageUri` field is typed as `string | undefined`, but a persisted null would be fine to guard
    against defensively). The `?.` chaining on `valuation` handles the `null` state (valuation not
    found) cleanly.

  > ⚠️ `valuation?.imageUri` alone is sufficient since the type is `string | undefined`, not
  > `string | null | undefined`. The `?? undefined` is a defensive extra but costs nothing.

- [x] Task 3: Extend `listing-form.test.tsx` with photo tests (AC: 1, 2, 3)
  - [x] 3.1: Add the following tests to the `describe('ListingForm', ...)` block in
    `apps/mobile/__tests__/listing-form.test.tsx`:
    ```typescript
    it('renders the photo image when photoUri is provided', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(
          <ListingForm
            valuationId="valuation-1"
            photoUri="file:///path/to/photo.jpg"
          />,
        );
      });

      expect(findByTestId(renderer!, 'listing-photo-image')).toBeTruthy();
      expect(findByTestId(renderer!, 'listing-photo-image').props.source).toEqual({
        uri: 'file:///path/to/photo.jpg',
      });
      expect(() => findByTestId(renderer!, 'listing-photo-placeholder')).toThrow();
    });

    it('renders the placeholder when photoUri is not provided', async () => {
      let renderer: ReactTestRenderer;

      await act(async () => {
        renderer = create(<ListingForm valuationId="valuation-1" />);
      });

      expect(findByTestId(renderer!, 'listing-photo-placeholder')).toBeTruthy();
      expect(() => findByTestId(renderer!, 'listing-photo-image')).toThrow();
    });
    ```

  > **Note (E1):** The existing `'renders all listing fields and the CTA'` test (line ~26 of
  > `listing-form.test.tsx`) already exercises the no-`photoUri` path, but it does **not** assert
  > that `listing-photo-image` is absent. Keep the dedicated fallback test above: it covers the
  > AC2 negative case explicitly and protects against accidentally rendering both nodes at once.

- [x] Task 4: Extend `listing-screen.test.tsx` with photo integration tests (AC: 1, 2, 4)
  - [x] 4.1: Add the following tests to `apps/mobile/__tests__/listing-screen.test.tsx`. Import
    `createMockValuation` and `createMockValuationResponse` are already imported. These tests need
    `createMockValuation` to include `imageUri` at the top level of the `Valuation` object (not
    inside `response` — see type):
    ```typescript
    it('passes imageUri to ListingForm when the valuation has one', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: 'file:///path/to/photo.jpg',
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);

      const renderer = await renderScreen();

      expect(findByTestId(renderer, 'listing-photo-image')).toBeTruthy();
      expect(findByTestId(renderer, 'listing-photo-image').props.source).toEqual({
        uri: 'file:///path/to/photo.jpg',
      });
      expect(() => findByTestId(renderer, 'listing-photo-placeholder')).toThrow();
    });

    it('shows the photo placeholder when the valuation has no imageUri', async () => {
      mockUseAuth.mockReturnValue(authenticatedAuth());
      mockGetLocalHistory.mockResolvedValue([
        createMockValuation({
          id: 'valuation-1',
          imageUri: undefined,
          response: createMockValuationResponse({ valuationId: 'valuation-1' }),
        }),
      ]);

      const renderer = await renderScreen();

      expect(findByTestId(renderer, 'listing-photo-placeholder')).toBeTruthy();
      expect(() => findByTestId(renderer, 'listing-photo-image')).toThrow();
    });
    ```

---

## Dev Notes

### Key Code Locations

```
apps/mobile/
├── app/
│   └── listing/[id].tsx                — MODIFY: add photoUri prop to <ListingForm>
├── components/
│   ├── molecules/
│   │   └── valuation-card.tsx          — REFERENCE ONLY: Museum Mat pattern (do not modify)
│   └── organisms/
│       └── listing-form.tsx            — MODIFY: add photoUri prop + replace placeholder
└── __tests__/
    ├── listing-form.test.tsx           — EXTEND: 2 new photo tests
    └── listing-screen.test.tsx         — EXTEND: 2 new photo integration tests
```

### Photo Storage: Why `imageUri` Is Always a Device-Local File URI

`app/(tabs)/index.tsx` calls `saveToLocalHistory({ ..., imageUri: photo.uri })` using the raw
`photo.uri` from the camera capture result. On iOS/Android this is typically:

```
file:///var/mobile/.../tmp/camera_xxx.jpg      (iOS)
content://com.google.android.apps.photos/...   (Android, file picker)
```

These URIs are valid for `<Image source={{ uri: ... }} />` on the same device but are **not**
uploadable to cloud storage or shareable as public URLs. Story 5-11 (Image Hosting / Thumbnails)
handles cloud upload; Story 5-7 is pure local display.

**Do not attempt to upload or transform the URI in this story.** Use it directly as the `source`
prop.

### Pattern Reference: Museum Mat Framing from `ValuationCard`

See [valuation-card.tsx](../../apps/mobile/components/molecules/valuation-card.tsx#L140-L152) for
the source pattern. Story 5-7 uses the same `border border-divider p-1 bg-paper` framing with
these differences:
- **No `m-3` margin** — the listing form's `<Stack gap={6}>` handles spacing
- **No `max-h-[50vh]`** — the listing form is keyboard-avoidable; monitor during testing if long
  images push the CTA too low
- **`testID="listing-photo-image"`** added for test assertions
- **`accessibilityLabel="Valuation photo"`** — generic (no item title available at this point)

The Task 1.4 code block above is the complete replacement implementation — use that directly.

### `listing/[id].tsx` — Complete `<ListingForm>` Props After This Story

```tsx
<ListingForm
  valuationId={valuationId}
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
  priceRange={valuation?.response?.marketData?.priceRange}
  photoUri={valuation?.imageUri ?? undefined}
/>
```

### `ListingFormProps` Interface After This Story

```typescript
export interface ListingFormProps {
  valuationId: string;
  onSubmit?: (values: ListingFormValues) => void;
  initialValues?: Partial<ListingFormValues>;
  priceRange?: { min: number; max: number };
  photoUri?: string;
}
```

### `createMockValuation` Reminder

`imageUri` is a top-level field on the `Valuation` interface — **not** inside `response` or
`request`. To create a mock with an image:

```typescript
createMockValuation({
  id: 'valuation-1',
  imageUri: 'file:///path/to/photo.jpg',  // ← top-level field
  response: createMockValuationResponse({ valuationId: 'valuation-1' }),
})
```

By default `createMockValuation()` does NOT set `imageUri` (the mock factory does not include it
in defaults) — which means all existing screen-level tests implicitly test the `imageUri: undefined`
path and should still render the placeholder. This is the correct regression baseline.

### Test Pattern Reference

All test patterns follow the established form in `apps/mobile/__tests__/listing-form.test.tsx`:
- `findByTestId(renderer!, 'testID')` helper is already defined at the top of the file.
- `to.Throw()` is used to assert absence of a node (same as other badge/placeholder tests).
- No new imports needed in the test files beyond what is already there.

### Tests to Run After Implementation

```bash
cd apps/mobile
npx jest __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand --no-coverage
```

All existing tests in those files must still pass (no regressions).

### Reminder: No New `useEffect`

The listing screen already loads the full `Valuation` object (`imageUri` included) in its existing
`useEffect`. Do NOT add a second `getLocalHistory()` call or a second state variable. Derive
`photoUri` directly from the already-loaded `valuation`:

```typescript
photoUri={valuation?.imageUri ?? undefined}
```

### References

- `Valuation.imageUri` type definition: [apps/mobile/types/valuation.ts](../../apps/mobile/types/valuation.ts#L90)
- `imageUri` saved to localHistory: [apps/mobile/app/(tabs)/index.tsx](../../apps/mobile/app/(tabs)/index.tsx#L131-L138)
- Museum Mat pattern reference: [apps/mobile/components/molecules/valuation-card.tsx](../../apps/mobile/components/molecules/valuation-card.tsx#L140-L152)
- Current Photos placeholder (to replace): [apps/mobile/components/organisms/listing-form.tsx](../../apps/mobile/components/organisms/listing-form.tsx#L224-L240)
- Story 5-11 (photo hosting/cloud upload): docs/sprint-artifacts/epic-5-plan.md#story-5-11
- Epic 5 execution plan: [docs/sprint-artifacts/epic-5-plan.md](docs/sprint-artifacts/epic-5-plan.md)

---

## Dev Agent Record

### Agent Model Used

GPT-5.4 (GitHub Copilot)

### Debug Log References

- Focused red/green verification: `cd apps/mobile && npx jest __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand --no-coverage`
- Full regression verification: `cd apps/mobile && npx jest --runInBand --no-coverage`

### Completion Notes List

- Added `photoUri?: string` and conditional photo rendering to `apps/mobile/components/organisms/listing-form.tsx`, preserving the existing placeholder fallback when no image is available.
- Passed `photoUri={valuation?.imageUri ?? undefined}` from `apps/mobile/app/listing/[id].tsx` without adding new fetch/state logic.
- Added focused photo assertions to `apps/mobile/__tests__/listing-form.test.tsx` and `apps/mobile/__tests__/listing-screen.test.tsx`, including explicit absence checks for the non-photo path.
- Preserved the established Museum Mat thumbnail treatment; portrait-image crop remains an accepted limitation for this story, and stale local-URI recovery stays deferred to Story 5-11.
- Focused Jest verification passed with 48/48 tests green, then the full mobile Jest suite passed with 215/215 tests green.

### File List

- `apps/mobile/components/organisms/listing-form.tsx`
- `apps/mobile/app/listing/[id].tsx`
- `apps/mobile/__tests__/listing-form.test.tsx`
- `apps/mobile/__tests__/listing-screen.test.tsx`
- `docs/sprint-artifacts/5-7-include-original-photo-in-listing.md`
- `docs/sprint-artifacts/sprint-status.yaml`

### Senior Developer Review (AI)

- Reviewer: GitHub Copilot (GPT-5.4)
- Date: 2026-04-08
- Outcome: Approved after fixes
- Fixed: photo assertions now verify `accessibilityLabel="Valuation photo"` in `apps/mobile/__tests__/listing-form.test.tsx` and `apps/mobile/__tests__/listing-screen.test.tsx`
- Added coverage: the base listing form render test now asserts the photo node is absent when the placeholder is shown
- Added coverage: `photoUri=""` now explicitly exercises the placeholder fallback path in `apps/mobile/__tests__/listing-form.test.tsx`
- Validation: `cd apps/mobile && npx jest __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx --runInBand --no-coverage`

### Change Log

- 2026-04-08: Implemented original-photo rendering in the listing form, passed `photoUri` through the listing screen, and expanded listing form/screen coverage.
- 2026-04-08: Applied code review fixes for Story 5.7, strengthening accessibility and placeholder fallback assertions.
