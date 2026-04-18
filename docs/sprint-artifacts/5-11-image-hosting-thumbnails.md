# Story 5.11: Image Hosting / Thumbnails

Status: done

## Story

As a user,
I want the listing I copy to include a hosted photo URL,
so that buyers on eBay can see the item without me having to upload the photo separately.

## Business Context

### Why This Story Matters

After Stories 5-1 through 5-10, the listing form is fully featured: all fields pre-filled
from AI data, AI/manual badges, and a working Copy to Clipboard flow. The photo is displayed
in the listing form from the local device URI stored in `Valuation.imageUri`.

But the clipboard text does not include a photo URL — because a `file:///` URI is
device-local and meaningless to eBay or any buyer. The listing a user pastes into eBay
has no photo reference at all.

Story 5-11 closes this gap: when the listing screen opens, the valuation photo is uploaded
to Supabase Storage in the background. Once the upload completes, the public URL is included
in the clipboard text as `Photo: {url}`. Upload is non-blocking — the Copy button remains
usable at all times; the URL is included if the upload completed before Copy was pressed.

Origin: Epic 3 retro + Story 3.4 notes — "listings need associated photos for hosting."

[Source: docs/epics.md#Story 5.11] [Source: docs/epic-5-plan.md#Story-5-11]

### Current State After Story 5-10

```
✅ apps/mobile/components/organisms/listing-form.tsx
     — All 5 fields pre-filled, AI/manual badges, Copy to Clipboard
     — photoUri prop: displays local file URI in Photos section
     — No hosted photo URL; clipboard text never includes a photo line

✅ apps/mobile/app/listing/[id].tsx
     — Loads valuation from local history; derives all AI values
     — Passes photoUri={valuation?.imageUri ?? undefined} to ListingForm
     — No upload logic

❌ No Supabase Storage bucket for listing photos
❌ No upload utility
❌ Clipboard text contains no photo URL
```

### What This Story Delivers

1. **Infrastructure** — `listing-photos` Supabase Storage bucket (public read, authenticated write).
2. **`apps/mobile/lib/storage.ts`** — NEW: `uploadListingPhoto(localUri, userId, valuationId)` → `Promise<string>`. Reads file as base64 with `expo-file-system`, decodes with `base64-arraybuffer`, uploads via Supabase Storage client, returns public URL.
3. **`apps/mobile/app/listing/[id].tsx`** — MODIFIED: new upload `useEffect` that fires when `valuation` loads and `imageUri` is present; manages `hostedPhotoUrl`, `photoUploadState`, and a retry key; ignores stale upload completions after unmount; passes hosted URL, state, and retry action to `ListingForm`.
4. **`apps/mobile/components/organisms/listing-form.tsx`** — MODIFIED: new props `hostedPhotoUrl?: string`, `photoUploadState?: 'uploading' | 'done' | 'error'`, and `onRetryPhotoUpload?: () => void`; `Photo: {url}` appended to clipboard text when URL is available; upload status caption plus retry action in the Photos section when upload fails.
5. **Tests** — `storage.test.ts` (new), `listing-form.test.tsx` (extended), `listing-screen.test.tsx` (extended).

---

## Acceptance Criteria

**Given** the listing screen opens for a valuation that has an `imageUri`
**When** the screen mounts
**Then** the photo is uploaded to Supabase Storage in the background

> `uploadListingPhoto` is called with the local URI, authenticated user ID, and valuationId.
> The Photos section shows "Hosting photo for sharing..." while upload is in progress.

**And** once the upload completes, the Copy to Clipboard output includes a `Photo:` line

> The hosted public URL is appended as `Photo: {url}` after the description (if any).

**And** if the upload fails, the Copy to Clipboard still works without the photo URL

> Upload failure is non-blocking. The error caption shows in the Photos section.
> The Copy button remains active and produces clipboard text without the `Photo:` line.

**And** if the valuation has no `imageUri`, no upload is attempted

> The screen behaves exactly as before this story for valuations without a photo.

---

## Design Decisions

### D1: Upload Triggered on Listing Screen Mount, Not on Copy

Uploading when the listing screen mounts (not when Copy is pressed) gives the upload
time to complete while the user reviews and fills in fields. If the user presses Copy
before the upload finishes, the URL is simply omitted — no blocking, no error.

Uploading on Copy would mean the user waits for the upload every time — poor UX for a
quick copy flow. Mount-time upload balances responsiveness with URL availability.

### D2: Upload is Non-Blocking — Copy Always Works

The Copy button is never disabled due to upload state. The `hostedPhotoUrl` prop to
`ListingForm` is `undefined` while uploading (or on error), so the `Photo:` line is
omitted. The listing is still valid and useful without a photo URL.

### D3: Supabase Storage — Frontend-Only Upload

The upload uses the Supabase JS client directly from the mobile app, not via the backend.
The backend has no involvement in photo hosting. This is consistent with the Supabase
client singleton already used for auth (`apps/mobile/lib/supabase.ts`). The anon key
is sufficient with RLS restricting writes to the authenticated user's folder.

### D4: Storage Path Convention

Path: `{userId}/{valuationId}_{Date.now()}.jpg`

`userId` creates a folder per user (supporting RLS: users can only write to their own
folder). `valuationId` makes the listing identifiable. `Date.now()` ensures uniqueness
if the same valuation is listed multiple times. Extension is always `.jpg` — the
valuation photo is always a JPEG from expo-camera or expo-image-picker.

### D5: `base64-arraybuffer` Dependency

Supabase Storage uploads from React Native require sending binary data, not a string.
`expo-file-system` reads the file as base64; `base64-arraybuffer`'s `decode()` converts
to ArrayBuffer, which Supabase Storage accepts. This is the documented Supabase approach
for React Native. `atob` (available in RN 0.71+) is an alternative, but `base64-arraybuffer`
is well-tested and the recommended pattern.

Run before implementation:
```bash
cd apps/mobile && npx expo install base64-arraybuffer
```

### D6: `photoUploadState` Prop for Status UI

`ListingForm` gains `photoUploadState?: 'uploading' | 'done' | 'error'`. The Photos
section renders a caption based on this state:
- `uploading` → "Hosting photo for sharing..." (`testID="listing-photo-upload-status"`)
- `error` → "Photo upload failed — listing will copy without a photo URL" (same testID)
- `'done'` or `undefined` → no caption

The caption uses the same `<Text variant="caption" className="text-ink-muted">` style
as all other metadata captions in the form. Swiss Minimalist: no colors, no icons.

### D7: Clipboard `Photo:` Line Placement

The `Photo:` line is the last line in the clipboard text (after `Description:` if present):
```
Title: {title}
Category: {category}
Condition: {condition}
Price: ${price}
Description: {description}   ← only if non-empty
Photo: {url}                  ← only if hostedPhotoUrl is set
```

This matches the ascending specificity order and keeps the URL out of the way for users
who paste into eBay's structured form (Title/Category/etc.) — they can easily strip it.

### D8: TestID Convention

`listing-photo-upload-status` — in the Photos section, below the photo image / placeholder.
Mirrors the naming convention of other metadata testIDs in the form.

---

## Infrastructure Setup

### Step 1 — Create `listing-photos` Supabase Storage Bucket

In the Supabase dashboard → **Storage** → **New bucket**:

| Setting | Value |
|---|---|
| Bucket name | `listing-photos` |
| Public bucket | ✅ Yes (public URLs are required for clipboard sharing) |
| File size limit | 10 MB (expo-camera output is typically 2–8 MB) |
| Allowed MIME types | `image/jpeg`, `image/png` |

### Step 2 — Add Row Level Security Policy

In the Supabase dashboard → **Storage** → `listing-photos` → **Policies**:

```sql
-- Allow authenticated users to upload to their own folder only
CREATE POLICY "Users can upload their own listing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read (photos are shared via clipboard)
CREATE POLICY "Public read access for listing photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-photos');
```

### Step 3 — Install `base64-arraybuffer`

```bash
cd apps/mobile && npx expo install base64-arraybuffer
```

Verify it appears in `apps/mobile/package.json` dependencies.

---

## Tasks

- [x] Task 1 — Create `apps/mobile/lib/storage.ts`
- [x] Task 2 — Modify `apps/mobile/app/listing/[id].tsx`
- [x] Task 3 — Modify `apps/mobile/components/organisms/listing-form.tsx`
- [x] Task 4 — Add tests in `apps/mobile/__tests__/storage.test.ts`
- [x] Task 5 — Extend `apps/mobile/__tests__/listing-form.test.tsx`
- [x] Task 6 — Extend `apps/mobile/__tests__/listing-screen.test.tsx`

### Task 1 — Create `apps/mobile/lib/storage.ts`

**File:** NEW `apps/mobile/lib/storage.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

const LISTING_PHOTOS_BUCKET = 'listing-photos';

export async function uploadListingPhoto(
  localUri: string,
  userId: string,
  valuationId: string,
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = decode(base64);
  const filePath = `${userId}/${valuationId}_${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
```

---

### Task 2 — Modify `apps/mobile/app/listing/[id].tsx`

**File:** `apps/mobile/app/listing/[id].tsx`

**Change 1** — Import `uploadListingPhoto` and `useState`:

Add `uploadListingPhoto` import from `@/lib/storage`. `useState` is already imported.

**Change 2** — Destructure `user` from `useAuth()`:

**Current code:**
```typescript
const { isGuest } = useAuth();
```

**Replacement:**
```typescript
const { isGuest, user } = useAuth();
```

**Change 3** — Add upload state after existing `useState`:

**Current code:**
```typescript
const [valuation, setValuation] = useState<Valuation | null | undefined>(undefined);
```

**Replacement:**
```typescript
const [valuation, setValuation] = useState<Valuation | null | undefined>(undefined);
const [hostedPhotoUrl, setHostedPhotoUrl] = useState<string | undefined>(undefined);
const [photoUploadState, setPhotoUploadState] = useState<
  'uploading' | 'done' | 'error' | undefined
>(undefined);
```

**Change 4** — Add `useRef` import and upload `useEffect` after the existing history-loading `useEffect`:

Add retry state:
```typescript
const [photoUploadRetryKey, setPhotoUploadRetryKey] = useState(0);
```

Then add the upload effect:
```typescript
useEffect(() => {
  const imageUri = valuation?.imageUri;
  const userId = user?.id;

  if (!imageUri || !userId || !valuationId) {
    setHostedPhotoUrl(undefined);
    setPhotoUploadState(undefined);
    return;
  }

  let cancelled = false;

  setHostedPhotoUrl(undefined);
  setPhotoUploadState('uploading');

  uploadListingPhoto(imageUri, userId, valuationId)
    .then((url) => {
      if (cancelled) {
        return;
      }

      setHostedPhotoUrl(url);
      setPhotoUploadState('done');
    })
    .catch((error) => {
      if (cancelled) {
        return;
      }

      console.warn('Photo upload failed:', error);
      setPhotoUploadState('error');
    });

  return () => {
    cancelled = true;
  };
}, [photoUploadRetryKey, user?.id, valuation?.imageUri, valuationId]);
```

Add a retry handler:
```typescript
function handleRetryPhotoUpload() {
  setPhotoUploadState('uploading');
  setPhotoUploadRetryKey((current) => current + 1);
}
```

> Note: The dependency array uses primitive values (`user?.id`, `valuation?.imageUri`,
> `valuationId`) plus an explicit retry key. That avoids duplicate uploads from auth-object
> identity churn while still allowing a deliberate retry after a failed attempt.

**Change 5** — Pass new props to `ListingForm`:

**Current code:**
```tsx
<ListingForm
  valuationId={valuationId}
  initialValues={...}
  priceRange={valuation?.response?.marketData?.priceRange}
  photoUri={valuation?.imageUri ?? undefined}
/>
```

**Replacement:**
```tsx
<ListingForm
  valuationId={valuationId}
  initialValues={...}
  priceRange={valuation?.response?.marketData?.priceRange}
  photoUri={valuation?.imageUri ?? undefined}
  hostedPhotoUrl={hostedPhotoUrl}
  photoUploadState={photoUploadState}
  onRetryPhotoUpload={handleRetryPhotoUpload}
/>
```

---

### Task 3 — Modify `apps/mobile/components/organisms/listing-form.tsx`

**File:** `apps/mobile/components/organisms/listing-form.tsx`

**Change 1** — Add new props to `ListingFormProps`:

**Current code:**
```typescript
export interface ListingFormProps {
  valuationId: string;
  onSubmit?: (values: ListingFormValues) => void;
  initialValues?: Partial<ListingFormValues>;
  priceRange?: { min: number; max: number };
  photoUri?: string;
}
```

**Replacement:**
```typescript
export interface ListingFormProps {
  valuationId: string;
  onSubmit?: (values: ListingFormValues) => void;
  initialValues?: Partial<ListingFormValues>;
  priceRange?: { min: number; max: number };
  photoUri?: string;
  hostedPhotoUrl?: string;
  photoUploadState?: 'uploading' | 'done' | 'error';
  onRetryPhotoUpload?: () => void;
}
```

**Change 2** — Destructure new props in the component:

**Current code:**
```typescript
export function ListingForm({
  valuationId,
  onSubmit,
  initialValues,
  priceRange,
  photoUri,
}: ListingFormProps) {
```

**Replacement:**
```typescript
export function ListingForm({
  valuationId,
  onSubmit,
  initialValues,
  priceRange,
  photoUri,
  hostedPhotoUrl,
  photoUploadState,
  onRetryPhotoUpload,
}: ListingFormProps) {
```

**Change 3** — Add `Photo:` line to clipboard format in `handleValidSubmit`:

**Current code:**
```typescript
    if (values.description.trim()) {
      lines.push(`Description: ${values.description}`);
    }

    try {
      await Clipboard.setStringAsync(lines.join('\n'));
```

**Replacement:**
```typescript
    if (values.description.trim()) {
      lines.push(`Description: ${values.description}`);
    }

    if (hostedPhotoUrl) {
      lines.push(`Photo: ${hostedPhotoUrl}`);
    }

    try {
      await Clipboard.setStringAsync(lines.join('\n'));
```

**Change 4** — Add upload status caption and retry action to Photos section:

In the Photos section `<Stack gap={2}>`, after the photo image / placeholder, add the
upload status caption:

**Current code:**
```tsx
      <Stack gap={2}>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Photos
        </Text>
        <Text variant="caption" className="text-ink-muted">
          (from valuation)
        </Text>
        {photoUri ? (
```

**Replacement:**
```tsx
      <Stack gap={2}>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Photos
        </Text>
        <Text variant="caption" className="text-ink-muted">
          (from valuation)
        </Text>
        {photoUri ? (
```

> Note: The status caption goes **after** the photo image/placeholder block, immediately
> before the closing `</Stack>` of the Photos section:

Find this block (after the `{photoUri ? (...) : (...)}` expression):
```tsx
        )}
      </Stack>

      <SwissPressable
```

Insert before `</Stack>`:
```tsx
        )}
        {photoUploadState === 'uploading' ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-photo-upload-status"
          >
            Hosting photo for sharing...
          </Text>
        ) : photoUploadState === 'error' ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-photo-upload-status"
          >
            Photo upload failed — listing will copy without a photo URL
          </Text>
        ) : null}
        {photoUploadState === 'error' && onRetryPhotoUpload ? (
          <SwissPressable
            accessibilityLabel="Retry photo upload"
            accessibilityRole="button"
            onPress={onRetryPhotoUpload}
            testID="listing-photo-upload-retry-button"
            className="self-start py-2 pr-4 min-h-[44px] justify-center"
          >
            <Text variant="caption" className="text-ink underline">
              Try again
            </Text>
          </SwissPressable>
        ) : null}
      </Stack>

      <SwissPressable
```

---

### Task 4 — Add Tests in `apps/mobile/__tests__/storage.test.ts` (new file)

**File:** NEW `apps/mobile/__tests__/storage.test.ts`

Mock setup required:
```typescript
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn((b64: string) => new ArrayBuffer(b64.length)),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));
```

Pattern for chaining the Supabase storage mock:
```typescript
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockFrom = jest.fn(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
}));
(supabase.storage.from as jest.Mock) = mockFrom;
```

See Test Coverage section for the individual test cases.

---

### Task 5 — Extend `apps/mobile/__tests__/listing-form.test.tsx`

**File:** `apps/mobile/__tests__/listing-form.test.tsx`

Add a `describe('photo hosting', () => { ... })` block after the `describe('manual entry badges', ...)` block (around line 757, just before the first top-level `it('shows the condition validation error...'`).

See Test Coverage section for the individual test cases.

---

### Task 6 — Extend `apps/mobile/__tests__/listing-screen.test.tsx`

**File:** `apps/mobile/__tests__/listing-screen.test.tsx`

Add near the top of the file, after existing mocks:
```typescript
jest.mock('@/lib/storage', () => ({
  uploadListingPhoto: jest.fn(),
}));
```

Add import:
```typescript
import { uploadListingPhoto } from '@/lib/storage';
const mockUploadListingPhoto = uploadListingPhoto as jest.Mock;
```

In `beforeEach`, add default mock resolution:
```typescript
mockUploadListingPhoto.mockResolvedValue('https://example.supabase.co/listing-photos/user-1/valuation-1_123.jpg');
```

Add the new `describe('photo upload', () => { ... })` block at the end of the `describe('ListingScreen', ...)` block. See Test Coverage section.

---

## Test Coverage

### Storage Unit Tests (new `storage.test.ts`)

#### S.1 — Reads file as base64 with correct encoding

```typescript
it('reads the local file as base64 using FileSystem.readAsStringAsync', async () => {
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64data');
  mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
  mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

  await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

  expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///photo.jpg', {
    encoding: FileSystem.EncodingType.Base64,
  });
});
```

#### S.2 — Decodes base64 before uploading

```typescript
it('decodes base64 string before uploading', async () => {
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64data');
  mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
  mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

  await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

  expect(decode).toHaveBeenCalledWith('base64data');
});
```

#### S.3 — Uploads to the `listing-photos` bucket

```typescript
it('uploads to the listing-photos bucket', async () => {
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64data');
  mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
  mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

  await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

  expect(mockFrom).toHaveBeenCalledWith('listing-photos');
});
```

#### S.4 — Uses `{userId}/{valuationId}_` path prefix

```typescript
it('uploads with a path that starts with {userId}/{valuationId}_', async () => {
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64data');
  mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1_1234.jpg' }, error: null });
  mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/photo.jpg' } });

  await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

  const uploadCall = mockUpload.mock.calls[0];
  expect(uploadCall[0]).toMatch(/^user-1\/val-1_\d+\.jpg$/);
  expect(uploadCall[2]).toMatchObject({ contentType: 'image/jpeg' });
});
```

#### S.5 — Returns the public URL on success

```typescript
it('returns the public URL on a successful upload', async () => {
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64data');
  mockUpload.mockResolvedValueOnce({ data: { path: 'user-1/val-1.jpg' }, error: null });
  mockGetPublicUrl.mockReturnValueOnce({
    data: { publicUrl: 'https://example.supabase.co/listing-photos/user-1/val-1.jpg' },
  });

  const url = await uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1');

  expect(url).toBe('https://example.supabase.co/listing-photos/user-1/val-1.jpg');
});
```

#### S.6 — Throws on Supabase upload error

```typescript
it('throws when supabase storage returns an error', async () => {
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64data');
  mockUpload.mockResolvedValueOnce({
    data: null,
    error: { message: 'Row level security violation' },
  });

  await expect(
    uploadListingPhoto('file:///photo.jpg', 'user-1', 'val-1'),
  ).rejects.toThrow('Photo upload failed: Row level security violation');
});
```

---

### Form Tests (new `describe('photo hosting', ...)` in `listing-form.test.tsx`)

#### P.1 — Clipboard includes `Photo: {url}` when `hostedPhotoUrl` is provided

```typescript
it('appends Photo: {url} to the clipboard text when hostedPhotoUrl is provided', async () => {
  const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm
        valuationId="valuation-1"
        hostedPhotoUrl="https://example.supabase.co/listing-photos/user-1/val-1.jpg"
      />,
    );
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1');
    findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
    findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
    findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
    findByTestId(renderer!, 'listing-submit-button').props.onPress();
  });

  await act(async () => {});

  expect(setStringSpy).toHaveBeenCalledWith(
    'Title: Canon AE-1\nCategory: Cameras\nCondition: good\nPrice: $249.99\nPhoto: https://example.supabase.co/listing-photos/user-1/val-1.jpg',
  );
});
```

#### P.2 — Clipboard omits `Photo:` when `hostedPhotoUrl` is not provided

```typescript
it('does not include a Photo line in the clipboard text when hostedPhotoUrl is absent', async () => {
  const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1');
    findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
    findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
    findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
    findByTestId(renderer!, 'listing-submit-button').props.onPress();
  });

  await act(async () => {});

  expect(setStringSpy).toHaveBeenLastCalledWith(
    'Title: Canon AE-1\nCategory: Cameras\nCondition: good\nPrice: $249.99',
  );
});
```

#### P.3 — `Photo:` line is after `Description:` when description is non-empty

```typescript
it('places the Photo line after the Description line when description is present', async () => {
  const setStringSpy = jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValueOnce(undefined);
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm
        valuationId="valuation-1"
        hostedPhotoUrl="https://example.supabase.co/photo.jpg"
      />,
    );
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-title-input').props.onChangeText('Canon AE-1');
    findByTestId(renderer!, 'listing-category-input').props.onChangeText('Cameras');
    findByTestId(renderer!, 'listing-condition-option-good').props.onPress();
    findByTestId(renderer!, 'listing-price-input').props.onChangeText('249.99');
    findByTestId(renderer!, 'listing-description-input').props.onChangeText('Film-tested.');
    findByTestId(renderer!, 'listing-submit-button').props.onPress();
  });

  await act(async () => {});

  expect(setStringSpy).toHaveBeenCalledWith(
    'Title: Canon AE-1\nCategory: Cameras\nCondition: good\nPrice: $249.99\nDescription: Film-tested.\nPhoto: https://example.supabase.co/photo.jpg',
  );
});
```

#### P.4 — Shows "Hosting photo for sharing..." when `photoUploadState='uploading'`

```typescript
it('shows the upload status caption when photoUploadState is uploading', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm
        valuationId="valuation-1"
        photoUri="file:///photo.jpg"
        photoUploadState="uploading"
      />,
    );
  });

  expect(
    getTextContent(findByTestId(renderer!, 'listing-photo-upload-status').props.children),
  ).toBe('Hosting photo for sharing...');
});
```

#### P.5 — Shows error caption when `photoUploadState='error'`

```typescript
it('shows the upload error caption when photoUploadState is error', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm
        valuationId="valuation-1"
        photoUri="file:///photo.jpg"
        photoUploadState="error"
      />,
    );
  });

  expect(
    getTextContent(findByTestId(renderer!, 'listing-photo-upload-status').props.children),
  ).toBe('Photo upload failed — listing will copy without a photo URL');
});
```

#### P.6 — No upload caption when `photoUploadState='done'`

```typescript
it('shows no upload caption when photoUploadState is done', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm
        valuationId="valuation-1"
        photoUri="file:///photo.jpg"
        photoUploadState="done"
      />,
    );
  });

  expect(() => findByTestId(renderer!, 'listing-photo-upload-status')).toThrow();
});
```

#### P.7 — No upload caption when `photoUploadState` is not provided

```typescript
it('shows no upload caption when photoUploadState is not provided', async () => {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<ListingForm valuationId="valuation-1" />);
  });

  expect(() => findByTestId(renderer!, 'listing-photo-upload-status')).toThrow();
});
```

#### P.8 — Retry action is shown on upload failure and calls `onRetryPhotoUpload`

```typescript
it('shows a retry control when photoUploadState is error and calls onRetryPhotoUpload', async () => {
  const handleRetryPhotoUpload = jest.fn();
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(
      <ListingForm
        valuationId="valuation-1"
        photoUri="file:///photo.jpg"
        photoUploadState="error"
        onRetryPhotoUpload={handleRetryPhotoUpload}
      />,
    );
  });

  await act(async () => {
    findByTestId(renderer!, 'listing-photo-upload-retry-button').props.onPress();
  });

  expect(handleRetryPhotoUpload).toHaveBeenCalledTimes(1);
});
```

---

### Screen Tests (new `describe('photo upload', ...)` in `listing-screen.test.tsx`)

#### L.1 — Calls `uploadListingPhoto` when valuation has `imageUri`

```typescript
it('calls uploadListingPhoto with imageUri, userId, and valuationId when imageUri is present', async () => {
  mockUseAuth.mockReturnValue(authenticatedAuth());
  mockGetLocalHistory.mockResolvedValue([
    createMockValuation({
      id: 'valuation-1',
      imageUri: 'file:///path/to/photo.jpg',
      response: createMockValuationResponse({ valuationId: 'valuation-1' }),
    }),
  ]);

  await renderScreen();

  expect(mockUploadListingPhoto).toHaveBeenCalledWith(
    'file:///path/to/photo.jpg',
    'user-1',
    'valuation-1',
  );
});
```

#### L.2 — Shows upload status caption while upload is in progress

```typescript
it('shows the upload status caption while upload is in progress', async () => {
  mockUseAuth.mockReturnValue(authenticatedAuth());
  mockGetLocalHistory.mockResolvedValue([
    createMockValuation({
      id: 'valuation-1',
      imageUri: 'file:///photo.jpg',
      response: createMockValuationResponse({ valuationId: 'valuation-1' }),
    }),
  ]);
  mockUploadListingPhoto.mockReturnValue(new Promise(() => {})); // never resolves

  const renderer = await renderScreen();

  expect(findByTestId(renderer, 'listing-photo-upload-status')).toBeTruthy();
});
```

#### L.3 — Hides upload status caption when upload completes

```typescript
it('hides the upload status caption after upload resolves', async () => {
  mockUseAuth.mockReturnValue(authenticatedAuth());
  mockGetLocalHistory.mockResolvedValue([
    createMockValuation({
      id: 'valuation-1',
      imageUri: 'file:///photo.jpg',
      response: createMockValuationResponse({ valuationId: 'valuation-1' }),
    }),
  ]);
  mockUploadListingPhoto.mockResolvedValue('https://example.com/photo.jpg');

  const renderer = await renderScreen();

  expect(() => findByTestId(renderer, 'listing-photo-upload-status')).toThrow();
});
```

#### L.4 — Shows error caption when upload fails

```typescript
it('shows the error caption when uploadListingPhoto rejects', async () => {
  mockUseAuth.mockReturnValue(authenticatedAuth());
  mockGetLocalHistory.mockResolvedValue([
    createMockValuation({
      id: 'valuation-1',
      imageUri: 'file:///photo.jpg',
      response: createMockValuationResponse({ valuationId: 'valuation-1' }),
    }),
  ]);
  mockUploadListingPhoto.mockRejectedValue(new Error('Network error'));

  const renderer = await renderScreen();

  expect(findByTestId(renderer, 'listing-photo-upload-status')).toBeTruthy();
});
```

#### L.5 — Does not call `uploadListingPhoto` when `imageUri` is absent

```typescript
it('does not call uploadListingPhoto when the valuation has no imageUri', async () => {
  mockUseAuth.mockReturnValue(authenticatedAuth());
  mockGetLocalHistory.mockResolvedValue([
    createMockValuation({
      id: 'valuation-1',
      imageUri: undefined,
      response: createMockValuationResponse({ valuationId: 'valuation-1' }),
    }),
  ]);

  await renderScreen();

  expect(mockUploadListingPhoto).not.toHaveBeenCalled();
});
```

#### L.6 — Primitive effect dependencies prevent duplicate uploads on re-render

```typescript
it('calls uploadListingPhoto exactly once even if the component re-renders', async () => {
  mockUseAuth.mockReturnValue(authenticatedAuth());
  mockGetLocalHistory.mockResolvedValue([
    createMockValuation({
      id: 'valuation-1',
      imageUri: 'file:///photo.jpg',
      response: createMockValuationResponse({ valuationId: 'valuation-1' }),
    }),
  ]);

  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = await renderScreen();
  });

  // Trigger a re-render with a fresh auth object but the same primitive deps.
  await act(async () => {
    renderer!.update(<ListingScreen />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(mockUploadListingPhoto).toHaveBeenCalledTimes(1);
});
```

#### L.7 — Failed uploads can be retried from the form

```typescript
it('retries the upload when the retry control is pressed after a failure', async () => {
  mockUseAuth.mockReturnValue(authenticatedAuth());
  mockGetLocalHistory.mockResolvedValue([
    createMockValuation({
      id: 'valuation-1',
      imageUri: 'file:///photo.jpg',
      response: createMockValuationResponse({ valuationId: 'valuation-1' }),
    }),
  ]);
  mockUploadListingPhoto
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce('https://example.com/photo.jpg');

  const renderer = await renderScreen();

  expect(mockUploadListingPhoto).toHaveBeenCalledTimes(1);

  await act(async () => {
    findByTestId(renderer, 'listing-photo-upload-retry-button').props.onPress();
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(mockUploadListingPhoto).toHaveBeenCalledTimes(2);
  expect(() => findByTestId(renderer, 'listing-photo-upload-status')).toThrow();
});
```

---

## Known Pitfalls

### P1: `useEffect` Dependencies, Cleanup, and Retry

The upload `useEffect` dependency array uses primitive values (`user?.id`,
`valuation?.imageUri`, `valuationId`) plus an explicit `photoUploadRetryKey`. That keeps
uploads stable across auth-object identity churn while still allowing a deliberate retry.

The effect also returns a cleanup function that marks the in-flight upload as cancelled.
Without that guard, a late promise resolution could try to update state after the screen
unmounts.

### P2: `upsert: false` Is Correct

The path includes `Date.now()` to guarantee uniqueness. `upsert: false` (the Supabase default) is correct — it will fail if somehow the same millisecond path exists, but that is extremely unlikely. Do **not** change to `upsert: true` without also removing the timestamp suffix; otherwise retries could accumulate.

### P3: `getPublicUrl` Never Throws

`supabase.storage.getPublicUrl()` returns `{ data: { publicUrl } }` synchronously and never throws. Do not add a `try/catch` around it specifically — only the `upload()` call can error.

### P4: Test File for `storage.ts` Needs `module.exports` Style for `base64-arraybuffer`

`base64-arraybuffer` is a CommonJS module. The Jest mock uses:
```typescript
jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn((b64: string) => new ArrayBuffer(b64.length)),
}));
import { decode } from 'base64-arraybuffer';
const mockDecode = decode as jest.Mock;
```

### P5: Existing Listing-Screen Tests Need the Upload Mock in `beforeEach`

After adding `jest.mock('@/lib/storage', ...)`, every existing test in `listing-screen.test.tsx` will trigger the upload `useEffect` for valuations that have an `imageUri`. The default `mockResolvedValue` in `beforeEach` ensures these tests continue to pass without changes to their assertions.

### P6: `user` Is `null` Before Auth Resolves

The upload `useEffect` guard `if (!valuation?.imageUri || !user?.id || !valuationId) return;` correctly handles the case where `user` is still `null` during initial render. The effect will re-run when `user` becomes available (if `user` is added to the dependency array). Since `user` is set at mount from the `AuthContext` (no async load), this is not a real timing issue in practice, but the guard is correct defensively.

---

## File List

- `apps/mobile/lib/storage.ts` (new)
- `apps/mobile/app/listing/[id].tsx`
- `apps/mobile/components/organisms/listing-form.tsx`
- `apps/mobile/__tests__/storage.test.ts` (new)
- `apps/mobile/__tests__/listing-form.test.tsx`
- `apps/mobile/__tests__/listing-screen.test.tsx`
- `docs/sprint-artifacts/5-11-image-hosting-thumbnails.md`
- `docs/sprint-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-15: Implemented hosted photo upload flow, added storage unit coverage, extended form/screen tests including the duplicate-upload guard case, and advanced the story to review.
- 2026-04-15: Senior review fixes applied: added cancellable upload cleanup, added retry flow for failed uploads, synced story examples with implemented tests, and approved the story as done.

## Dev Agent Record

- **Status:** done
- **Agent:** GitHub Copilot
- **Completed:** Implemented Story 5.11 photo hosting flow, then resolved senior review findings.
- **Completion Notes:** Added `uploadListingPhoto()` with Supabase Storage upload + public URL retrieval; passed hosted photo URL and upload state through the listing screen into `ListingForm`; appended `Photo:` to clipboard output when upload succeeds; rendered upload/error captions in the Photos section; added retry support for failed uploads; hardened the listing screen effect with cancellation cleanup and primitive dependency tracking; added storage, form, and screen tests covering retry behavior and duplicate-upload regression cases; passed targeted Story 5.11 tests (`104/104`) and the full mobile regression suite (`271/271`) after review fixes.
- **Debug Log:** Initial Story 5.11 Jest batch passed (`102/102`); post-review Story 5.11 Jest batch passed (`104/104`); post-review full mobile Jest suite passed (`27/27` suites, `271/271` tests).

## Senior Developer Review (AI)

- Reviewer: GitHub Copilot
- Date: 2026-04-15
- Outcome: Approved
- Findings resolved:
  - Added cleanup to ignore stale upload completions after unmount.
  - Added a retry path for failed photo uploads from the listing form.
  - Synced story test examples and implementation notes with the actual code and tests.
- Residual low-risk notes:
  - `uploadListingPhoto()` still assumes JPEG metadata unless upstream capture/import handling is broadened.
