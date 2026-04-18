# Story 5.1: Build Listing Form Component

Status: done

## Story

As a user,
I want a form to create an eBay listing from my valuation,
so that I can list my item quickly.

## Business Context

### Why This Story Matters

Every completed valuation in `appraisal.tsx` has a "List on eBay" CTA that currently shows an `Alert.alert('Coming soon', ...)` in `handleEbay()`. Epic 5 is the listing-creation epic. Story 5-1 is the entry point: it creates the listing route, the form shell, and the types layer. Pre-fill (Stories 5-2 through 5-6), photo inclusion (5-7), field editing (5-8), clipboard (5-9), and source distinction (5-10) all build on top of this scaffold.

### Current State

```
✅ apps/mobile/app/appraisal.tsx           — has "List on eBay" button, shows "Coming soon" Alert stub
✅ apps/mobile/components/atoms/form-input.tsx  — FormInput: bottom-border Swiss TextInput, forwarded ref
✅ apps/mobile/components/molecules/form-field-skeleton.tsx — FormFieldSkeleton for loading states
✅ apps/mobile/contexts/AuthContext.tsx     — useAuth() provides { isGuest, session }
✅ react-hook-form 7.72.0                  — installed
✅ zod 4.3.6                               — installed  
✅ @hookform/resolvers 5.2.2              — installed (zodResolver)
✅ apps/mobile/types/                      — valuation.ts, item.ts, market.ts, api.ts, transformers.ts all exist
❌ apps/mobile/app/listing/[id].tsx        — does not exist (architecture target route)
❌ apps/mobile/components/organisms/listing-form.tsx — does not exist
❌ apps/mobile/types/listing.ts            — does not exist
❌ handleEbay() in appraisal.tsx routes nowhere (just shows Alert)
```

### What This Story Delivers

Four file changes:
1. **`apps/mobile/types/listing.ts`** — `ListingCondition` enum, `ListingFormValues` interface (form data shape), `ListingDraft` for persistence
2. **`apps/mobile/components/organisms/listing-form.tsx`** — `ListingForm` organism: six-field Swiss Minimalist form using React Hook Form + Zod, `FormInput` atoms, required-field asterisks
3. **`apps/mobile/app/listing/[id].tsx`** — Expo Router screen: loads valuation context by ID, mounts `ListingForm`, guest guard, back navigation
4. **`apps/mobile/app/appraisal.tsx`** — `handleEbay()` updated to route to `/listing/<valuationId>` instead of showing the Alert stub

### Epic 5 Story Graph

```
5-1 Build Listing Form Component  ◄── you are here (scaffold)
├─► 5-2 Pre-Fill Title from AI Identification
├─► 5-3 Pre-Fill Description from AI
├─► 5-4 Pre-Fill Price from Valuation
├─► 5-5 Pre-Fill Category from AI Classification
├─► 5-6 Pre-Fill Condition from AI Assessment
├─► 5-7 Include Original Photo in Listing
├─► 5-8 Enable Field Editing
├─► 5-9 Implement Copy to Clipboard
├─► 5-10 Display Pre-Filled vs Manual Field Distinction
└─► 5-11 Image Hosting / Thumbnails (deferred; Origin: Epic 3 retro)
```

---

## Acceptance Criteria

### AC1: Routing — "List on eBay" Navigates to Listing Form

**Given** the user taps "List on eBay" on the appraisal screen  
**When** the user is authenticated (not a guest)  
**Then** the app navigates to `/listing/<valuationId>` where `<valuationId>` is the `valuationId` from the current valuation  
**And** the listing form screen loads without errors

### AC2: Guest Guard

**Given** the user is in guest mode  
**When** they tap "List on eBay"  
**Then** they are navigated to `/auth/register` (existing behavior — preserve unchanged)  
**And** no listing route is opened

### AC3: Form Fields Rendered

**Given** the user arrives at the listing form screen  
**When** the form loads  
**Then** six fields are visible: Title, Category, Condition, Price, Description, Photos  
**And** the form follows Swiss form patterns: labels above inputs, flush-left alignment  
**And** required fields (Title, Category, Condition, Price) are marked with an asterisk in their label

### AC4: Form Validation

**Given** the user taps the submit button without filling required fields  
**When** validation runs  
**Then** each empty required field shows an inline error message below the input  
**And** the form does not submit  
**And** error messages use the `text-signal` color class (Signal Red — existing `FormInput` error prop behavior)  
**And** Title enforces max 80 characters (eBay title limit) with a character count shown

### AC5: Swiss Minimalist Form Design

**Given** the listing form is displayed  
**When** rendered on any platform  
**Then** the form uses `FormInput` atoms (bottom-border only — no box borders)  
**And** no rounded corners, shadows, or decorative borders appear  
**And** text alignment is flush-left throughout  
**And** spacing uses the project spacing scale (xs/sm/md/lg/xl from Tailwind tokens)  
**And** the submit button ("Copy to Clipboard" stub) uses Signal Red (`bg-signal`) — CTA only

### AC6: Photos Section

**Given** the listing form is displayed  
**When** the Photos section renders  
**Then** a Photos field label is shown with "(from valuation)" as a sub-caption  
**And** a placeholder box is rendered where the valuation photo will appear (Story 5-7 wires this)  
**And** the placeholder is clearly labelled "Photo will appear here" so the field location is established

### AC7: Back Navigation

**Given** the listing form is open  
**When** the user taps the back button  
**Then** the app navigates back to the appraisal screen  
**And** no data is lost from the current valuation

---

## Tasks / Subtasks

- [x] Task 1: Create `apps/mobile/types/listing.ts` (AC: 3, 4)
  - [x] 1.1: Define `ListingCondition` as a union type: `'new' | 'like_new' | 'very_good' | 'good' | 'acceptable'`
  - [x] 1.2: Define `listingFormSchema` Zod schema in `types/listing.ts` and derive `ListingFormValues` via `export type ListingFormValues = z.infer<typeof listingFormSchema>` — do **NOT** define a separate manual interface (single source of truth prevents type drift)
  - [x] 1.3: Define `ListingDraft` interface for future persistence: `{ valuationId: string; formValues: ListingFormValues; }`
  - [x] 1.4: Export from `apps/mobile/types/index.ts`

- [x] Task 2: Create `apps/mobile/components/organisms/listing-form.tsx` (AC: 3, 4, 5, 6)
  - [x] 2.1: Define `ListingFormProps` interface: `{ valuationId: string; onSubmit?: (values: ListingFormValues) => void; }`
  - [x] 2.2: Set up `useForm<ListingFormValues>` with `zodResolver` and Zod schema (_see Dev Notes for schema_)
  - [x] 2.3: Render `FormInput` for: Title (required, max 80), Category (required), Price (required, numeric), Description (optional — pass `multiline`, `numberOfLines={4}`, `textAlignVertical="top"` to `FormInput` for a usable multi-row area)
  - [x] 2.4: Render Condition field as `TextInput` via `FormInput` (required) — Story 5-6 will convert to picker
  - [x] 2.5: Render Photos section with placeholder box labelled "Photo will appear here" (AC: 6)
  - [x] 2.6: Show character count for Title (`{titleLength}/80`)
  - [x] 2.7: Add submit button ("Copy to Clipboard" — stub, `onPress={() => {}}`) styled `bg-signal`, `accessibilityLabel="Copy listing to clipboard"` (AC: 5)
  - [x] 2.8: Export from `apps/mobile/components/organisms/index.ts`
  
- [x] Task 3: Create `apps/mobile/app/listing/[id].tsx` (AC: 1, 2, 3, 7)
  - [x] 3.1: Extract `{ id }` from `useLocalSearchParams()` as `valuationId`
  - [x] 3.2: Guest guard: check `isGuest` from `useAuth()` — if guest, call `router.replace('/auth/register')` in `useEffect`
  - [x] 3.3: Render `<ScreenContainer>` with back button, "Create Listing" heading, and `<ListingForm valuationId={valuationId} />`
  - [x] 3.4: Wrap `<ListingForm>` in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>` containing a `<ScrollView>` — follow the keyboard handling pattern in `apps/mobile/app/auth/register.tsx` (imports: `KeyboardAvoidingView`, `Platform` from `react-native`)

- [x] Task 4: Update `apps/mobile/app/appraisal.tsx` — wire CTA (AC: 1, 2)
  - [x] 4.1: In `handleEbay()`, replace `Alert.alert('Coming soon', ...)` with `router.push('/listing/' + valuationId)`
  - [x] 4.2: Source `valuationId` from `response?.valuationId` (already in scope from the loaded valuation)
  - [x] 4.3: Verify the guest-redirect path (`router.push('/auth/register')` for `isGuest`) is preserved unchanged

---

## Dev Notes

### Architecture Compliance

File locations are prescribed by `docs/architecture.md`:
```
apps/mobile/
├── app/
│   └── listing/
│       └── [id].tsx              # Dynamic listing route — Story 5.1
├── components/
│   └── organisms/
│       └── listing-form.tsx      # ListingForm organism — Story 5.1
└── types/
    └── listing.ts                # Listing types — Story 5.1
```
[Source: docs/architecture.md#Project Structure]

Do NOT create a `lib/hooks/use-create-listing.ts` or `lib/api/listings.ts` in this story — those are infrastructure for Story 5-9 (clipboard submit) and future eBay API integration. This story is the form shell only.

### Zod Schema (v4 syntax — already installed)

```typescript
// Zod 4 import — same as v3 for core usage
import { z } from 'zod';

export const listingFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(80, 'Title must be 80 characters or less'),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'like_new', 'very_good', 'good', 'acceptable'], {
    error: 'Condition is required',   // Zod v4 uses 'error' not 'invalid_type_error'
  }),
  price: z
    .string()
    .min(1, 'Price is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Price must be a positive number',
    }),
  description: z.string().optional().default(''),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;
```

⚠️ **Zod v4 note:** Version 4.3.x uses `error:` (not `errorMap`) for custom enum messages — verify the installed @hookform/resolvers 5.2.2 is compatible with Zod 4 (it is, from resolvers v3.10+).

### React Hook Form Setup

> **Canonical reference: `apps/mobile/app/auth/register.tsx`** already implements the complete pattern this story needs: `useForm` + `zodResolver` + `Controller` + `FormInput` + `KeyboardAvoidingView` in Swiss layout. Use it as the reference implementation — do not assemble the pattern from scratch.

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const {
  control,
  handleSubmit,
  watch,
  formState: { errors },
} = useForm<ListingFormValues>({
  resolver: zodResolver(listingFormSchema),
  defaultValues: {
    title: '',
    category: '',
    condition: 'good',
    price: '',
    description: '',
  },
});

// Character count for title
const titleValue = watch('title');
const titleLength = titleValue?.length ?? 0;
```

Use `<Controller>` with `FormInput`'s `forwardRef` pattern (already supported by `FormInput`).

### FormInput Usage Pattern

`FormInput` (already at `components/atoms/form-input.tsx`) accepts `label`, `error`, and all `TextInputProps`. Use `Controller`:

```typescript
<Controller
  control={control}
  name="title"
  render={({ field: { onChange, onBlur, value, ref } }) => (
    <FormInput
      ref={ref}
      label="Title *"
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      error={errors.title?.message}
      returnKeyType="next"
      maxLength={85}  // Allow up to 85 chars in TextInput; Zod enforces 80 limit
    />
  )}
/>
```

### Listing Route — Expo Router Dynamic Segment

The file `app/listing/[id].tsx` creates the route `/listing/<valuationId>` automatically via Expo Router's file-based routing.

```typescript
// app/listing/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isGuest } = useAuth();

  useEffect(() => {
    if (isGuest) {
      router.replace('/auth/register');
    }
  }, [isGuest, router]);
  // ...
}
```

[Source: docs/architecture.md#Frontend Structure] [Source: /memories/repo/expo-router-types.md]

### appraisal.tsx — handleEbay Update

Current stub (line ~125–129):
```typescript
function handleEbay() {
  if (isGuest) {
    router.push('/auth/register');
    return;
  }
  Alert.alert('Coming soon', 'eBay listing will be available in a future update.');
}
```

Replacement — source the `valuationId` that is already available in scope:
```typescript
function handleEbay() {
  if (isGuest) {
    router.push('/auth/register');
    return;
  }
  const vId = detailValuation?.response?.valuationId ?? detailValuation?.id;
  if (vId) {
    router.push(`/listing/${vId}`);
  } else {
    // Fallback: no valuationId available — show minimal diagnostic
    Alert.alert('Unable to list', 'No valuation ID found. Please try re-appraising.');
  }
}
```

⚠️ `appraisal.tsx` has two render branches. **Only the `detailValuation` branch requires changes** — it contains `handleEbay()` and the "List on eBay" `SwissPressable` (~lines 116–245). The params-based branch (~lines 260–372) has **no** `handleEbay` function and **no** "List on eBay" CTA — do not touch it.

### Swiss Minimalist Form Layout

```
SECTION HEADING              ← h3, bold, flush-left
──────────────────────────── ← thin horizontal rule (border-b border-divider)
TITLE *                      ← CAPS label (FormInput label prop), asterisk in label text
[input field]                ← bottom-border only (FormInput's built-in style)
[error message]              ← caption, Signal Red (FormInput error prop)
                             ← md (16px) gap between fields
CATEGORY *
[input field]
...
```

**Required field convention:** Add asterisk to the `label` prop string directly: `label="Title *"`. Do not use color to indicate required state.

**No rounded corners.** No `rounded-*` class anywhere in this component.

### Photos Section Placeholder

```tsx
<Stack gap={2}>
  <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
    Photos (from valuation)
  </Text>
  <Box className="w-full h-24 border border-divider items-center justify-center">
    <Text variant="caption" className="text-ink-muted">
      Photo will appear here
    </Text>
  </Box>
</Stack>
```

This placeholder is replaced by the actual valuation image in Story 5-7.

### Testing Requirements

- Unit test: `listing-form.test.tsx` under `apps/mobile/components/organisms/__tests__/` (or `__tests__/` adjacent to organisms)
  - AC3: All 6 fields render
  - AC4: Required-field validation fires on submit with empty form
  - AC4: Title max-80 validation fires when title > 80 chars
  - AC5: Signal button renders

- Unit test: `listing-screen.test.tsx` under `apps/mobile/__tests__/` or `apps/mobile/app/__tests__/`
  - AC2: Guest users trigger `router.replace('/auth/register')`
  - AC7: Back navigation available

**Existing test patterns:**
- Tests are in `apps/mobile/__tests__/` for screen-level tests — use existing test setup
- `useFocusEffect` / navigation mock patterns are documented in user memory
- Mock `useAuth` with `jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isGuest: true }) }))` pattern

### Frontend Review Checklist Pre-Checks

Per `docs/frontend-review-checklist.md`:
- [x] No duplicate `useEffect` / `useFocusEffect` for same side effect
- [x] `useCallback` dependency arrays are complete
- [x] No conditional hook calls around auth/loading branches (place `useEffect` at top — do not conditionally call `useAuth`)
- [x] Every interactive element has `accessibilityLabel` where text alone is insufficient
- [x] Non-interactive containers do not use `Pressable`/`TouchableOpacity`
- [x] New constants (e.g., title max length) use named constants, not magic numbers:
  ```typescript
  // In constants/ or top of file:
  export const LISTING_TITLE_MAX_LENGTH = 80;
  ```
- [x] No `EXPO_PUBLIC_*` variable exposes a backend service key

### Project Structure Notes

- **Alignment:** Route file at `app/listing/[id].tsx` (not `app/(tabs)/listing/[id].tsx`) — listing is NOT a tab, it's a stack route on top of tab navigation, consistent with `app/appraisal.tsx` pattern
- **Detected pattern:** `app/appraisal.tsx` (not inside `(tabs)/`) is the precedent for secondary screens launched from tabs — follow the same structure
- **Organisms index:** Add `ListingForm` export to `apps/mobile/components/organisms/index.ts`
- **Types index:** Add `ListingCondition`, `ListingFormValues`, `ListingDraft` exports to `apps/mobile/types/index.ts`

### References

- [Source: docs/architecture.md#Listing (FR19-28)] — file paths for listing organism, route, and types
- [Source: docs/architecture.md#State Management] — React Hook Form for form state
- [Source: docs/epics.md#Story 5.1: Build Listing Form Component] — AC requirements
- [Source: docs/project_context.md#Design System: Swiss Minimalist] — form styling rules
- [Source: docs/project_context.md#TypeScript — naming conventions] — kebab-case files, PascalCase components
- [Source: apps/mobile/components/atoms/form-input.tsx] — FormInput atom with forwarded ref
- [Source: apps/mobile/app/appraisal.tsx#handleEbay()] — CTA to be wired (line ~120–130)
- [Source: docs/frontend-review-checklist.md] — pre-review checklist

---

## Change Log

- 2026-04-03: Implemented the listing form shell, added the dynamic listing route, wired the appraisal CTA to `/listing/:id`, and added focused form/screen tests plus full Jest regression coverage.
- 2026-04-03: Code review follow-up added happy-path and missing-ID coverage, verified the frontend checklist, and marked the story done.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Focused red phase: `cd apps/mobile && npx jest __tests__/listing-form.test.tsx __tests__/listing-screen.test.tsx __tests__/appraisal-guest-gate.test.tsx --runInBand`
- Full regression: `cd apps/mobile && npm test -- --runInBand`

### Completion Notes List

- Added `apps/mobile/types/listing.ts` with the listing schema, typed form values, title-length constant, and condition union for the Epic 5 listing flow.
- Built `ListingForm` as a Swiss Minimalist organism using `react-hook-form`, `zodResolver`, existing `FormInput` atoms, inline validation, title character count, and the Photos placeholder.
- Added `app/listing/[id].tsx` with Expo Router dynamic param handling, guest redirect, keyboard-safe layout, and back navigation.
- Replaced the authenticated appraisal CTA alert with routing to the new listing screen while preserving the guest register gate.
- Added new listing form and listing screen tests and updated the existing appraisal CTA test to the new route behavior.
- Added code review follow-up coverage for valid form submission and the missing valuation-ID screen state.
- Full mobile Jest regression suite passed: 24/24 suites, 163/163 tests.

### File List

- apps/mobile/types/listing.ts
- apps/mobile/types/index.ts
- apps/mobile/components/organisms/listing-form.tsx
- apps/mobile/components/organisms/index.ts
- apps/mobile/app/listing/[id].tsx
- apps/mobile/app/appraisal.tsx
- apps/mobile/__tests__/listing-form.test.tsx
- apps/mobile/__tests__/listing-screen.test.tsx
- apps/mobile/__tests__/appraisal-guest-gate.test.tsx
- docs/sprint-artifacts/5-1-build-listing-form-component.md
- docs/sprint-artifacts/sprint-status.yaml
