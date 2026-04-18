# Story 4.2: Implement User Registration

**Status:** done

---

## Story

**As a** new user,
**I want** to create an account with my email and password,
**So that** I can save my valuations and sync them across devices.

---

## Business Context

### Why This Story Now

Story 4.6 (AuthContext + Session Persistence) is complete. `contexts/AuthContext.tsx` is live, wrapping the entire app via `<AuthProvider>` in `app/_layout.tsx`. Any component can now call `useAuth()` and receive `{ session, user, isGuest, isLoading, signOut }`.

This story builds the first real auth flow: email/password registration. It exercises the complete Supabase signUp path and confirms that `onAuthStateChange(SIGNED_IN)` automatically updates the AuthContext — which means the registration screen does not need to manually update any auth state.

**Current state (post 4.6):**
- `contexts/AuthContext.tsx` exports `AuthProvider`, `useAuth()`, `mapSupabaseUser`
- `app/_layout.tsx`: `ThemeProvider → ErrorBoundary → AuthProvider → Stack`
- `lib/supabase.ts`: singleton Supabase client with AsyncStorage, `detectSessionInUrl: false`
- `lib/env.ts`: `env.useMock` — `true` by default in dev
- `types/user.ts`: `User`, `GuestUser`, `AuthState`; `isUser()`, `isGuestUser()` type guards
- `components/primitives/`: `Box`, `Stack`, `Text`, `SwissPressable`, `ScreenContainer`
- `app/(tabs)/settings.tsx`: hardcodes "Not signed in" — this story adds the entry point tap

### What This Story Delivers

- `app/auth/_layout.tsx` — Stack layout for the auth screen group
- `app/auth/register.tsx` — Registration screen with Zod-validated form
- `components/atoms/form-input.tsx` — Reusable Swiss-styled TextInput atom
- `components/atoms/index.ts` — Atoms barrel export
- Install `react-hook-form`, `zod`, `@hookform/resolvers`
- Minimal `app/(tabs)/settings.tsx` update: "Not signed in" row navigates to `/auth/register`
- Unit tests in `__tests__/auth-register.test.tsx`

### The Auth Flow After Registration

```
User submits form
  └─► supabase.auth.signUp({ email, password })
        ├─► Session active (no email confirm) → onAuthStateChange(SIGNED_IN) fires
        │     → AuthContext: { session, user: AppUser, isGuest: false }
        │     → router.replace('/(tabs)') ← navigate to Camera
        │
        └─► Session null (email confirm required)
              → Show "Check your inbox" state
              → User confirms email → session activates → onAuthStateChange fires on next launch
```

### Epic Context

Phase A of Epic 4: Auth Foundation. Story execution order:
1. ✅ 4.6 — AuthContext (done)
2. **4.2 — Registration (this story)**
3. 🔜 4.3 — Sign-In (next, mirrors this story's form pattern)

---

## Acceptance Criteria

### AC1: Registration Screen Accessible at `/auth/register`

**Given** the app is running  
**When** the user navigates to `/auth/register` (e.g., tapped from Settings "Not signed in" row)  
**Then** the registration screen renders with:
- A caption label "Account" (uppercase, muted)
- An h1 heading "Create account"
- Email input field with label "Email"
- Password input field with label "Password"
- Confirm password input field with label "Confirm password"
- A signal-red (bg-signal) CTA button labeled "Create account"
- A "Sign in" text link at the bottom (navigates to `/auth/sign-in`, which does not exist until Story 4.3 — route may 404 which is acceptable)  

**And** the screen uses `ScreenContainer` (white background, max-width 640px, horizontal padding 24px)  
**And** no header icons or decorative elements are shown  
**And** TypeScript compiles with zero errors

---

### AC2: Client-Side Zod Validation

**Given** the registration form is rendered  
**When** the user taps "Create account" without filling fields  
**Then** inline error messages appear below the relevant fields:
- Empty email → `"Please enter a valid email address"`
- Invalid email format (e.g., `notanemail`) → `"Please enter a valid email address"`
- Password fewer than 8 characters → `"Password must be at least 8 characters"`
- Passwords do not match → `"Passwords do not match"` (shown below confirmPassword field)

**And** errors appear in `text-signal` (red #E53935)  
**And** the Supabase API is NOT called when client validation fails  
**And** after correcting input, the error for that field clears on the next validation pass

---

### AC3: Loading State During Submission

**Given** the form has valid values and the user taps "Create account"  
**When** the Supabase API call is in flight  
**Then** the CTA button text changes to "Creating account…"  
**And** the button is disabled (prevents double-submit)  
**And** input fields remain visible (user can see what was submitted)

---

### AC4: Successful Registration — Session Active (No Email Confirmation)

**Given** the user submits a valid email + password (≥8 chars, matching confirmation) for a new account  
**When** `supabase.auth.signUp()` returns `{ data: { session: Session, user: SupabaseUser }, error: null }`  
**Then** `supabase.auth.onAuthStateChange` fires `SIGNED_IN` automatically  
**And** `AuthContext` updates to `{ session, user: AppUser, isGuest: false, isLoading: false }`  
**And** `router.replace('/(tabs)')` navigates to the Camera tab (replace prevents back-navigation to register)  
**And** the settings screen "Email" row now shows the registered email address on next render (Story 4.8 will polish this)

---

### AC5: Email Confirmation Required State

**Given** the Supabase project has email confirmation enabled  
**When** `supabase.auth.signUp()` returns `{ data: { session: null, user: SupabaseUser }, error: null }`  
**Then** the form is replaced with a confirmation state showing:
- h1: "Check your inbox"
- body text: "We sent a confirmation link to your email. Click the link to activate your account."
- A "Back to app" link that navigates to `/(tabs)` via `router.replace`  

**And** no error is shown (this is expected success behaviour)  
**And** the user is NOT navigated to the tabs automatically (session is not yet active)

---

### AC6: Duplicate Email Error

**Given** the user submits an email address that already has a Supabase account  
**When** `supabase.auth.signUp()` returns an error containing "already registered" or "already exists"  
**Then** a friendly server error message appears below the form:  
`"An account with this email already exists. Try signing in instead."`  
**And** the form remains editable so the user can correct the email  
**And** the CTA button returns to "Create account" (not stuck in loading)

---

### AC7: Network Error Handling

**Given** the device has no internet connection or Supabase is unreachable  
**When** `supabase.auth.signUp()` throws a network error  
**Then** the server error message shows: `"Connection error. Please check your internet and try again."`  
**And** no unhandled exception propagates to the ErrorBoundary  
**And** the form remains editable for retry

---

### AC8: Swiss Minimalist Design Compliance

**Given** the registration screen is rendered  
**When** inspecting visual design  
**Then**:
- Background: `bg-paper` (white `#FFFFFF`)
- Text: `text-ink` (black `#000000`)
- Muted labels: `text-ink-muted` (gray `#999999`)
- CTA button: `bg-signal` (red `#E53935`), full-width, text `text-paper` (white)
- Error text: `text-signal` (red)
- Form inputs: bottom-border only (`border-b border-ink`), no box border
- No icons (text-only navigation)
- No rounded corners (tailwind config restricts to `borderRadius: none`)
- No box shadows
- Touch targets ≥ 44px (WCAG NFR-A2)
- Focus states: 2px solid black border (inherited from `SwissPressable` — NFR-A3)

---

### AC9: Mock Mode Bypass

**Given** `EXPO_PUBLIC_USE_MOCK=true` (default in development)  
**When** the user submits the registration form with any values  
**Then** the Supabase API is NOT called  
**And** an alert shows: `"Mock Mode — Registration bypassed in mock mode."`  
**And** confirming the alert navigates to `/(tabs)`  
**And** no mock session is injected into AuthContext (AuthContext remains in guest state — mock testing of post-registration state is out of scope)

---

### AC10: Settings Entry Point

**Given** the user has NOT signed in (isGuest = true)  
**When** the user is on the Settings tab and taps the "Email" row showing "Not signed in"  
**Then** navigation goes to `/auth/register`

**Given** the user IS signed in (isGuest = false, user is set)  
**When** the "Email" row is rendered  
**Then** the row shows the user's actual email address  
**And** tapping the row does nothing (no navigation — Story 4.8 will add account management)

---

### AC11: TypeScript — Zero Errors

**Given** the complete implementation  
**When** running `npx tsc --noEmit` from `apps/mobile/`  
**Then** zero TypeScript errors are reported  
**And** all imports resolve correctly  
**And** all props are properly typed (no `any` casts)

---

### AC12: Unit Tests Pass

**Given** the test file at `apps/mobile/__tests__/auth-register.test.tsx`  
**When** running `npm test` from `apps/mobile/`  
**Then** all tests pass:
- Registration form renders without crashing
- "Create account" button is present
- Email validation error appears for invalid email on submit
- Password length error appears for short password on submit
- Password mismatch error appears when passwords differ
- Mock mode: alert is shown instead of API call

---

## Out of Scope

The following are explicitly NOT implemented in this story:

| Feature | Handled By |
|---------|-----------|
| Sign-in screen (`/auth/sign-in`) | Story 4.3 |
| Google OAuth button | Story 4.4 |
| "Forgot password?" flow | Story 4.3 |
| Sign-out button in Settings | Story 4.5 |
| Guest mode gating (5-valuation cap, upgrade banners) | Story 4.7 |
| Settings screen rebuilt with real account info (plan, email display, delete) | Story 4.8 |
| Account deletion | Stories 4.9–4.10 |
| Guest data migration on registration | Story 4.11 |
| Prominent registration CTA in Camera or History tabs | Story 4.7 (upgrade prompts) |
| Supabase Dashboard email confirmation toggle | Story 4.1 (already done) |
| NFR-S10 concurrent session limits | Deferred — documented in Story 4.6 |

---

## Tasks / Subtasks

- [x] **Task 1: Install form validation dependencies** (AC2)
  - [x] From `apps/mobile/`: `npm install react-hook-form zod @hookform/resolvers`
  - [x] Verify `package.json` shows `react-hook-form`, `zod`, `@hookform/resolvers`
  - [x] Confirm TypeScript types are included (both packages include types natively)

- [x] **Task 2: Create `components/atoms/form-input.tsx`** (AC2, AC7, AC8)
  - [x] Create `apps/mobile/components/atoms/form-input.tsx` (see Technical Notes for full implementation)
  - [x] `FormInput` accepts: `label: string`, `error?: string`, all `TextInputProps`
  - [x] Uses `forwardRef` for react-hook-form `Controller` ref forwarding
  - [x] Bottom-border only style (`border-b`), not a box input (Swiss Minimalist)
  - [x] Error text: `text-signal` caption below the input
  - [x] Active/error border: `border-signal` when `error` is set, `border-ink` otherwise
  - [x] Create `apps/mobile/components/atoms/index.ts` exporting `FormInput`

- [x] **Task 3: Create `app/auth/_layout.tsx`** (AC1)
  - [x] Create `apps/mobile/app/auth/_layout.tsx` with a `Stack` layout
  - [x] `headerStyle: { backgroundColor: '#FFFFFF' }`, `headerTintColor: '#000000'`
  - [x] `headerShadowVisible: false` (Swiss — no decoration)  
  - [x] `headerBackTitle: 'Back'` for iOS back button label
  - [x] Update `apps/mobile/app/_layout.tsx`: add `<Stack.Screen name="auth" options={{ headerShown: false }} />` so the auth group's own `_layout.tsx` controls headers exclusively

- [x] **Task 4: Create `app/auth/register.tsx`** (AC1–AC9, AC11)
  - [x] Create `apps/mobile/app/auth/register.tsx`
  - [x] Import `useForm`, `Controller` from `react-hook-form`; `zodResolver` from `@hookform/resolvers/zod`; `z` from `zod`
  - [x] Define `registerSchema` with Zod (see Technical Notes)
  - [x] Implement `mapSupabaseError()` for user-friendly error messages (see Technical Notes)
  - [x] `SubmitState` type: `'idle' | 'loading' | 'confirm-email'`
  - [x] `useForm` with `zodResolver(registerSchema)`, `mode: 'onBlur'`
  - [x] Three `Controller`-wrapped `FormInput` fields: email, password, confirmPassword
  - [x] Mock mode check: `if (env.useMock) { Alert + router.replace('/(tabs)'); return; }`
  - [x] `supabase.auth.signUp()` call wrapped in try/catch
  - [x] Handle `data.session` truthy → `router.replace('/(tabs)')`
  - [x] Handle `data.session` null → `setSubmitState('confirm-email')`
  - [x] "Check your inbox" view (conditional render when `submitState === 'confirm-email'`)
  - [x] `KeyboardAvoidingView` wrapping `ScreenContainer` for iOS keyboard handling
  - [x] `ScreenContainer` receives `keyboardShouldPersistTaps="handled"`
  - [x] Server error displayed in `View` with `accessibilityLiveRegion="polite"` (screen reader)
  - [x] Sign-in link: `router.push('/auth/sign-in')` (will 404 until Story 4.3 — acceptable)
  - [x] Zero `any` types — all typed explicitly

- [x] **Task 5: Update `app/(tabs)/settings.tsx`** (AC10)
  - [x] Import `useAuth` from `@/contexts/AuthContext`
  - [x] Import `router` from `expo-router`
  - [x] Destructure `{ isGuest, user }` from `useAuth()`
  - [x] Update "Email" `SettingsRow`:
    - `value`: `isGuest ? 'Not signed in' : (user?.email ?? '')`
    - `onPress`: `isGuest ? () => router.push('/auth/register') : undefined`
    - `accessibilityLabel`: `isGuest ? 'Sign in or create account' : 'Account email address'`

- [x] **Task 6: Write unit tests `__tests__/auth-register.test.tsx`** (AC12)
  - [x] Use the existing `react-test-renderer` Jest pattern from `apps/mobile/__tests__/AuthContext.test.tsx` instead of introducing a new test library
  - [x] Test: component renders without crashing
  - [x] Test: "Create account" button is rendered
  - [x] Test: email validation error shown for invalid email on submit
  - [x] Test: password too short error shown on submit
  - [x] Test: password mismatch error shown on submit
  - [x] Test: mock mode — Alert is called instead of `supabase.auth.signUp`
  - [x] Mock `expo-router` (`router.replace`, `router.push`)
  - [x] Mock `@/lib/env` to control `useMock`
  - [x] Mock `@/lib/supabase` to control `signUp` return value
  - [x] Do not add `@testing-library/react-native` unless `package.json` is updated intentionally

- [x] **Task 7: TypeScript verification** (AC11)
  - [x] Run `cd apps/mobile && npx tsc --noEmit`
  - [x] Fix all errors before marking story complete
  - [x] Confirm no `@ts-ignore` or `as any` added

---

## Dev Notes

### Project Structure Notes

| File | Status | Notes |
|------|--------|-------|
| `app/auth/register.tsx` | 🆕 Create | New route: `/auth/register` |
| `app/auth/_layout.tsx` | 🆕 Create | Auth Stack layout — controls headers for all auth screens (4.2–4.4) |
| `components/atoms/form-input.tsx` | 🆕 Create | Reusable across 4.2 (register), 4.3 (sign-in) |
| `components/atoms/index.ts` | 🆕 Create | Barrel export for atoms |
| `app/_layout.tsx` | ✏️ Modify | Add `<Stack.Screen name="auth" options={{ headerShown: false }} />` |
| `app/(tabs)/settings.tsx` | ✏️ Modify | Add `useAuth` + routing for guest "Email" row |
| `__tests__/auth-register.test.tsx` | 🆕 Create | Unit tests |

**Expo Router routing:** `app/auth/register.tsx` automatically creates the `/auth/register` route. `app/auth/_layout.tsx` creates a nested Stack that wraps all `app/auth/*` screens. This is standard Expo Router v6 file-based routing — no manual route registration required beyond the `Stack.Screen name="auth"` entry in `app/_layout.tsx`.

**Atoms directory:** `apps/mobile/components/atoms/` is empty. This story creates the first atom (`FormInput`) and the `index.ts` barrel file. Project structure from `docs/project_context.md` maps atoms to: `button, input, icon, badge`. `FormInput` is the `input` atom.

**react-hook-form is NOT yet installed** — Task 1 installs it. This is the first story that uses forms.

### AuthContext Integration

Registration does NOT touch AuthContext directly. The flow is:

```
register.tsx calls supabase.auth.signUp()
  → Supabase creates user + issues session JWT
  → supabase.auth.onAuthStateChange('SIGNED_IN', session) fires
  → AuthContext.tsx listener (already subscribed since app start) receives event
  → setSession(session), setUser(mapSupabaseUser(session.user))
  → All screens reading useAuth() re-render automatically
register.tsx calls router.replace('/(tabs)')
  → Camera tab mounts with isGuest = false, user = AppUser
```

**The registration screen MUST NOT import `useAuth()`** — it doesn't need to read auth state, only submit credentials. This avoids circular concerns.

### Swiss Minimalist Design for Auth Screens

Auth screens are content screens, not tab screens. Design pattern:

```
ScreenContainer (white bg, px-6, pt-16)
  ├── Text variant="caption" className="text-ink-muted uppercase tracking-wide"
  │     "Account"
  ├── Text variant="h1" className="text-ink mt-2"
  │     "Create account"
  ├── Stack gap={6} className="mt-12"     ← Form fields
  │     FormInput (label, input, error)
  │     FormInput (label, input, error)
  │     FormInput (label, input, error)
  │     Box (server error)
  │     SwissPressable bg-signal (CTA)
  │     Box (sign-in link)
```

**No decorative elements.** No logo. No illustration. Typography drives the UX.

### Technical Notes — Full Implementation

#### `components/atoms/form-input.tsx`

```tsx
import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from '@/components/primitives';

export interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * FormInput — Swiss Minimalist text input with label and inline error.
 *
 * Bottom-border only (no box) — authentic Swiss typographic form.
 * Error border uses signal color. Forwards ref for react-hook-form Controller.
 *
 * @see Story 4.2: Implement User Registration
 */
export const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <View accessibilityRole="none">
        <Text
          variant="caption"
          className="text-ink-muted uppercase tracking-wide mb-2"
        >
          {label}
        </Text>
        <TextInput
          ref={ref}
          className={[
            'border-b py-3 text-body',
            'text-ink bg-paper',
            error ? 'border-signal' : 'border-ink',
            className ?? '',
          ].join(' ')}
          placeholderTextColor="#9E9E9E"
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {error ? (
          <Text variant="caption" className="text-signal mt-1">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

FormInput.displayName = 'FormInput';
```

#### `components/atoms/index.ts`

```ts
export { FormInput } from './form-input';
export type { FormInputProps } from './form-input';
```

#### `app/auth/_layout.tsx`

```tsx
import { Stack } from 'expo-router';

/**
 * Auth Layout — Stack navigator for all auth screens (register, sign-in, OAuth).
 *
 * Outer Stack in app/_layout.tsx has `headerShown: false` for "auth" group,
 * so this inner Stack fully controls header appearance.
 *
 * Swiss header: white background, black text, no shadow.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#000000',
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    />
  );
}
```

#### `app/_layout.tsx` addition (inside the `<Stack>`)

Add after the existing `Stack.Screen` entries:

```tsx
<Stack.Screen name="auth" options={{ headerShown: false }} />
```

#### Error mapping function in `app/auth/register.tsx`

```typescript
function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('invalid') && lower.includes('email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }
  // Fallback — safe generic message (do NOT expose raw Supabase message to user)
  return 'Registration failed. Please try again.';
}
```

#### Zod schema in `app/auth/register.tsx`

```typescript
import { z } from 'zod';

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Please enter a valid email address')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;
```

#### Full `app/auth/register.tsx`

```tsx
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Box,
  Stack,
  Text,
  SwissPressable,
  ScreenContainer,
} from '@/components/primitives';
import { FormInput } from '@/components/atoms';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';

// ─── Validation Schema ────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Please enter a valid email address')
      .email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Error Mapping ────────────────────────────────────────────────────────────

function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('invalid') && lower.includes('email')) {
    return 'Please enter a valid email address.';
  }
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch')
  ) {
    return 'Connection error. Please check your internet and try again.';
  }
  return 'Registration failed. Please try again.';
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmitState = 'idle' | 'loading' | 'confirm-email';

// ─── Screen ───────────────────────────────────────────────────────────────────

/**
 * RegisterScreen — Email/password account creation.
 *
 * On success: AuthContext auto-updates via onAuthStateChange(SIGNED_IN).
 * Navigation is driven by router.replace, not by watching AuthContext.
 *
 * @see Story 4.2: Implement User Registration
 * @see contexts/AuthContext.tsx — provider that receives the SIGNED_IN event
 */
export default function RegisterScreen() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setSubmitState('loading');

    // Mock mode: bypass Supabase, navigate to app for development testing
    if (env.useMock) {
      setSubmitState('idle');
      Alert.alert(
        'Mock Mode',
        'Registration bypassed in mock mode. Navigating to app.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setServerError(mapSupabaseError(error.message));
        setSubmitState('idle');
        return;
      }

      if (data.session) {
        // Session active: onAuthStateChange(SIGNED_IN) has already fired.
        // AuthContext is now updated. Navigate to app.
        router.replace('/(tabs)');
      } else {
        // Email confirmation required: session is null until user confirms.
        setSubmitState('confirm-email');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      setServerError(mapSupabaseError(message));
      setSubmitState('idle');
    }
  };

  // ── Email confirmation view ──────────────────────────────────────────────────

  if (submitState === 'confirm-email') {
    return (
      <ScreenContainer>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Check your inbox
        </Text>
        <Text variant="body" className="text-ink-muted mt-6">
          We sent a confirmation link to your email. Click the link to activate
          your account, then return to the app.
        </Text>
        <SwissPressable
          accessibilityLabel="Back to app"
          className="mt-12"
          onPress={() => router.replace('/(tabs)')}
        >
          <Text variant="body" className="text-ink underline">
            Back to app
          </Text>
        </SwissPressable>
      </ScreenContainer>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Create account
        </Text>

        {/* Form */}
        <Stack gap={6} className="mt-12">
          {/* Email */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormInput
                ref={ref}
                label="Email"
                placeholder="you@example.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                textContentType="emailAddress"
                testID="register-email-input"
              />
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormInput
                ref={ref}
                label="Password"
                placeholder="Minimum 8 characters"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                textContentType="newPassword"
                testID="register-password-input"
              />
            )}
          />

          {/* Confirm Password */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <FormInput
                ref={ref}
                label="Confirm password"
                placeholder="Repeat password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                textContentType="newPassword"
                onSubmitEditing={handleSubmit(onSubmit)}
                testID="register-confirm-password-input"
              />
            )}
          />

          {/* Server error */}
          {serverError ? (
            <View accessibilityLiveRegion="polite">
              <Text variant="body-sm" className="text-signal">
                {serverError}
              </Text>
            </View>
          ) : null}

          {/* CTA */}
          <SwissPressable
            accessibilityLabel={
              submitState === 'loading' ? 'Creating account' : 'Create account'
            }
            disabled={submitState === 'loading'}
            onPress={handleSubmit(onSubmit)}
            className="bg-signal py-4 mt-2"
            testID="register-submit-button"
          >
            <Text variant="body" className="text-paper text-center font-semibold">
              {submitState === 'loading' ? 'Creating account…' : 'Create account'}
            </Text>
          </SwissPressable>

          {/* Sign-in link (Story 4.3 creates the target screen) */}
          <Box className="flex-row justify-center items-center mt-4 gap-1">
            <Text variant="body-sm" className="text-ink-muted">
              Already have an account?
            </Text>
            <SwissPressable
              accessibilityLabel="Sign in to existing account"
              onPress={() => router.push('/auth/sign-in')}
            >
              <Text variant="body-sm" className="text-ink underline">
                Sign in
              </Text>
            </SwissPressable>
          </Box>
        </Stack>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
```

#### `app/(tabs)/settings.tsx` modifications

At the top add imports:
```tsx
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
```

Inside `SettingsScreen()`, add before the return:
```tsx
const { isGuest, user } = useAuth();
```

Update the "Email" `SettingsRow`:
```tsx
<SettingsRow
  label="Email"
  value={isGuest ? 'Not signed in' : (user?.email ?? '')}
  onPress={isGuest ? () => router.push('/auth/register') : undefined}
  accessibilityLabel={
    isGuest ? 'Sign in or create account' : 'Account email address'
  }
/>
```

#### Test file `__tests__/auth-register.test.tsx`

Use the same Jest pattern already established in `apps/mobile/__tests__/AuthContext.test.tsx`.
That means `react-test-renderer`, hoisted `jest.mock(...)` factories, and direct prop invocation via `testID`.

```tsx
import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

import RegisterScreen from '../app/auth/register';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const mockSignUp = supabase.auth.signUp as jest.Mock;

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    expect(renderer!.root.findByProps({ children: 'Create account' })).toBeTruthy();
  });

  it('shows email validation error for invalid email on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const emailInput = findByTestId(renderer!, 'register-email-input');
    const submitButton = findByTestId(renderer!, 'register-submit-button');

    await act(async () => {
      emailInput.props.onChangeText('notanemail');
      submitButton.props.onPress();
    });

    expect(renderer!.root.findByProps({ children: 'Please enter a valid email address' })).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('bypasses Supabase and calls Alert in mock mode', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'register-email-input').props.onChangeText('test@example.com');
      findByTestId(renderer!, 'register-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-confirm-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'register-submit-button').props.onPress();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();

    (env as { useMock: boolean }).useMock = false;
  });
});
```

Add the remaining password-length and password-mismatch tests using the same `findByTestId(...)` pattern.

### Security Notes (OWASP Compliance)

- **Input validation (A03 Injection):** Zod validates email and password format client-side before any API call. Input is not interpolated into any query or template.
- **Authentication (A07):** Password handling is entirely delegated to Supabase Auth — no password hashing in the frontend. JWT tokens are stored in AsyncStorage via Supabase's built-in persistence.
- **Error messages (A01):** `mapSupabaseError()` maps all Supabase errors to generic user-friendly messages. Raw Supabase error messages (which could expose implementation details) are NEVER shown to the user.
- **Rate limiting:** Supabase Auth has built-in rate limiting on `/auth/v1/signup`. The frontend does not need to implement additional client-side rate limiting.
- **NFR-S1 (TLS):** The Supabase client communicates exclusively over HTTPS. This is enforced by the Supabase JS library.

### Key Constraints

- **`react-hook-form` + `zod` MUST be installed before any coding** — the file will not compile without them.
- **Use the existing `react-test-renderer` Jest pattern** — do not assume `@testing-library/react-native` is available as a direct dependency.
- **`env.useMock` check MUST happen BEFORE `supabase.auth.signUp()`** — otherwise the app will crash in dev mode because Supabase URL is undefined.
- **`router.replace('/(tabs)')` not `router.push`** — using `push` would allow back-navigation to the registration screen after creating an account, which is a UX anti-pattern.
- **No `useAuth()` import in `register.tsx`** — the screen doesn't read auth state, it only writes via Supabase. Importing `useAuth()` would create unnecessary coupling and would fail if the user somehow reached the screen outside `<AuthProvider>`.
- **`forwardRef` in FormInput is mandatory** — `react-hook-form Controller` passes a `ref` prop that must be forwarded to the native `TextInput` for programmatic focus management.

### References

- [Source: contexts/AuthContext.tsx] — `AuthProvider`, `useAuth()`, `onAuthStateChange` subscription
- [Source: lib/supabase.ts] — `supabase.auth.signUp()`, `detectSessionInUrl: false`
- [Source: lib/env.ts] — `env.useMock` boolean
- [Source: types/user.ts] — `User`, `UserTier`
- [Source: app/_layout.tsx] — Root Stack navigator, `<AuthProvider>` wrap position
- [Source: app/(tabs)/settings.tsx] — "Not signed in" Email row (entry point)
- [Source: components/primitives/] — `Box`, `Stack`, `Text`, `SwissPressable`, `ScreenContainer`
- [Source: docs/project_context.md#Design System Swiss Minimalist] — Color palette, typography scale
- [Source: docs/project_context.md#Technology Stack Frontend] — React Hook Form + Zod per project mandate
- [Source: docs/epics.md#Story 4.2] — FR35 (account creation) requirements
- [Source: docs/sprint-artifacts/epic-4-plan.md#Story 4.2] — Route: `app/auth/register.tsx`, signUp flow, estimated 3–4h
- [Source: docs/sprint-artifacts/4-6-implement-session-persistence.md] — AuthContext shape, AC4 (onAuthStateChange), already implemented

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

_None_

### Completion Notes List

- Installed react-hook-form@^7.72.0, zod@^4.3.6, @hookform/resolvers@^5.2.2
- Created RegisterScreen with Zod validation, mock mode bypass, email confirmation state, and server error mapping
- Created FormInput atom with forwardRef for react-hook-form Controller compatibility
- Updated Expo Router typed routes in `.expo/types/router.d.ts` to include `/auth/register` and `/auth/sign-in` (auto-generated by dev server; manually updated to satisfy `npx tsc --noEmit`)
- Used `View` with `accessibilityLiveRegion` for server error (spec said `Box` but `View` is the correct RN primitive for the attribute)
- **[Code Review Fix — M1]** Added `accessibilityLabel={label}` to `FormInput` TextInput so VoiceOver/TalkBack can identify fields when placeholder is gone
- **[Code Review Fix — H1]** Added happy-path test: `signUp` returns session → `router.replace('/(tabs)')` asserted
- **[Code Review Fix — H2]** Added server error tests: duplicate email and network error (thrown) both render correct mapped messages
- **[Code Review Fix — M2]** Added email confirmation state test: `signUp` returns `session: null` → "Check your inbox" heading renders
- 10 unit tests pass; 55/55 total test suite

### File List

- `apps/mobile/app/auth/_layout.tsx` (new)
- `apps/mobile/app/auth/register.tsx` (new)
- `apps/mobile/app/_layout.tsx` (modified — add auth Stack.Screen)
- `apps/mobile/components/atoms/form-input.tsx` (new)
- `apps/mobile/components/atoms/index.ts` (new)
- `apps/mobile/app/(tabs)/settings.tsx` (modified — add useAuth + entry point)
- `apps/mobile/__tests__/auth-register.test.tsx` (new)
- `apps/mobile/package.json` (modified — react-hook-form, zod, @hookform/resolvers)
- `apps/mobile/.expo/types/router.d.ts` (modified — add /auth/register and /auth/sign-in to typed routes)
