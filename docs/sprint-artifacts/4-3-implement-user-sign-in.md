# Story 4.3: Implement User Sign-In

**Status:** done

---

## Story

**As a** returning user,
**I want** to sign in with my email and password,
**So that** I can access my saved valuations and sync across devices.

---

## Business Context

### Why This Story Now

Story 4.2 (User Registration) is complete. The registration screen at `/auth/register` includes a "Sign in" link at the bottom that calls `router.push('/auth/sign-in')`. This story creates that destination screen.

**Current state (post 4.2):**
- `contexts/AuthContext.tsx` exports `AuthProvider`, `useAuth()`, `{ session, user, isGuest, isLoading, signOut }` (Story 4.6 ✅)
- `lib/supabase.ts`: singleton Supabase client, AsyncStorage, `detectSessionInUrl: false` (Story 4.1 ✅)
- `app/auth/_layout.tsx`: Stack layout for the auth screen group, Swiss header (white bg, black tint, no shadow) — **already exists from Story 4.2, do NOT recreate**
- `app/auth/register.tsx`: Registration screen (Zod + react-hook-form, `mapSupabaseError()`, mock mode bypass, email confirmation state) — **already exists**
- `components/atoms/form-input.tsx`: `FormInput` atom with `forwardRef`, bottom-border-only Swiss input — **already exists**
- `components/atoms/index.ts`: barrel export — **already exists**
- `app/_layout.tsx`: already has `<Stack.Screen name="auth" options={{ headerShown: false }} />` — **do NOT modify**
- Libraries installed: `react-hook-form ^7.72.0`, `zod ^4.3.6`, `@hookform/resolvers ^5.2.2` — **do NOT reinstall**
- Test suite: 55/55 tests passing across 8 suites — must remain green after this story

### What This Story Delivers

**Only these files need to be created:**
- `app/auth/sign-in.tsx` — NEW: Sign-in screen (email + password, no confirm-password field)
- `__tests__/auth-sign-in.test.tsx` — NEW: 9 unit tests (react-test-renderer pattern)

**Nothing else** — no layout changes, no library installs, no settings screen changes.

### The Auth Flow After Sign-In

```
User submits form
  └─► supabase.auth.signInWithPassword({ email, password })
        ├─► Success → onAuthStateChange(SIGNED_IN) fires automatically
        │     → AuthContext: { session, user: AppUser, isGuest: false }
        │     → router.replace('/(tabs)') ← navigate to Camera tab
        │
        └─► Error → mapSignInError(error.message) → display friendly message
              → Form remains editable, submitState returns to 'idle'
```

---

## Acceptance Criteria

### AC1: Sign-In Screen Accessible at `/auth/sign-in`

**Given** the app is running  
**When** the user navigates to `/auth/sign-in` (e.g., tapped from the "Sign in" link at the bottom of the registration screen)  
**Then** the screen renders with:
- A caption label "Account" (uppercase, muted, `text-ink-muted`)
- An h1 heading "Sign in"
- Email input field with label "Email"
- Password input field with label "Password" (secureTextEntry)
- A signal-red (`bg-signal`) CTA button labeled "Sign in"
- A "Create account" text link at the bottom navigating to `/auth/register`

**And** the screen uses `ScreenContainer` (white `bg-paper` background, centered content)

---

### AC2: Client-Side Zod Validation

**Given** the sign-in form is rendered  
**When** the user taps "Sign in" with empty fields  
**Then:**
- Empty email → inline error: "Please enter your email"
- Invalid email format → inline error: "Please enter a valid email address"
- Empty password → inline error: "Please enter your password"

**And** `supabase.auth.signInWithPassword` is **NOT called** when validation fails

---

### AC3: Loading State During Submission

**Given** the form has valid email and password  
**When** the user taps "Sign in"  
**Then:**
- CTA button label changes to "Signing in…"
- CTA button is disabled (non-interactive) until the request resolves

---

### AC4: Successful Sign-In

**Given** valid credentials  
**When** `supabase.auth.signInWithPassword()` returns a session  
**Then:**
- `onAuthStateChange(SIGNED_IN)` fires → AuthContext auto-updates (`session`, `user`, `isGuest: false`)
- `router.replace('/(tabs)')` is called
- Settings screen "Email" row shows the signed-in user's email

---

### AC5: Invalid Credentials Error

**Given** the user submits with incorrect email or password  
**When** Supabase returns an error containing "Invalid login credentials" (or similar)  
**Then:**
- Friendly message displayed: "Incorrect email or password. Please try again."
- Form remains fully editable
- Submit state returns to `idle`
- No unhandled exception

---

### AC6: Network Error

**Given** the device has no network connectivity  
**When** `signInWithPassword` throws a network-related error  
**Then:**
- Friendly message: "Connection error. Please check your internet and try again."
- Form remains editable
- No unhandled exception or crash

---

### AC7: Mock Mode Bypass

**Given** `env.useMock` is `true`  
**When** the user submits the sign-in form  
**Then:**
- `supabase.auth.signInWithPassword` is **NOT called**
- `Alert.alert('Mock Mode', 'Sign in bypassed in mock mode.', ...)` is shown
- Tapping "OK" in the alert calls `router.replace('/(tabs)')`

---

### AC8: Swiss Design Compliance

**Given** the sign-in screen renders  
**Then:**
- Background: `bg-paper` (#FFFFFF)
- Heading and body text: `text-ink` (#000000)
- Muted caption: `text-ink-muted`
- CTA button: `bg-signal` (#E53935), full-width, `text-paper` label
- Error text: `text-signal`
- Inputs: bottom-border only (`border-b`), no rounded corners, no shadows, no icons

---

### AC9: "Create Account" Link Navigation

**Given** the sign-in screen is rendered  
**When** the user taps the "Create account" link  
**Then** `router.push('/auth/register')` is called

---

### AC10: TypeScript — Zero Errors

**Given** all files are in place  
**When** `cd apps/mobile && npx tsc --noEmit` runs  
**Then** zero TypeScript errors are reported

---

### AC11: Unit Tests — All 9 Pass

**Given** the test file `__tests__/auth-sign-in.test.tsx` exists  
**When** the test suite runs  
**Then** all 9 tests listed in Technical Notes pass, and the overall suite remains green

---

## Out of Scope

| Feature | Handled By |
|---------|-----------|
| Forgot password / password reset flow | Future story (not yet planned) |
| Google OAuth sign-in | Story 4.4 |
| Sign-out button | Story 4.5 |
| Settings screen rebuild | Story 4.8 |
| Guest mode gating | Story 4.7 |

---

## Tasks

### Task 1: Create `app/auth/sign-in.tsx` (AC1–AC10)

Create the sign-in screen following the Technical Notes implementation exactly. Key points:
- Zod schema: `email` + `password` only (no confirmPassword)
- `SubmitState`: `'idle' | 'loading'`
- `mapSignInError()` function (local to file)
- Mock mode bypass via `env.useMock`
- On success: `router.replace('/(tabs)')`
- testIDs: `sign-in-email-input`, `sign-in-password-input`, `sign-in-submit-button`

### Task 2: Write `__tests__/auth-sign-in.test.tsx` (AC11)

Write all 9 unit tests using `react-test-renderer` with `act(async () => { ... })` pattern. See Technical Notes for the full test file.

### Task 3: TypeScript Verification

```bash
cd apps/mobile && npx tsc --noEmit
```

Zero errors expected.

---

## Dev Notes

### What Already Exists from Story 4.2 — Do NOT recreate

| File | Status | Notes |
|------|--------|-------|
| `app/auth/_layout.tsx` | ✅ EXISTS | Stack layout, Swiss header — do NOT create or modify |
| `components/atoms/form-input.tsx` | ✅ EXISTS | `FormInput` atom with `forwardRef` and bottom-border Swiss style |
| `components/atoms/index.ts` | ✅ EXISTS | Barrel export for `FormInput` and `FormInputProps` |
| `app/_layout.tsx` | ✅ EXISTS (modified in 4.2) | Has `<Stack.Screen name="auth" options={{ headerShown: false }} />` |
| `react-hook-form`, `zod`, `@hookform/resolvers` | ✅ INSTALLED | Do NOT reinstall |

### Import Paths

```tsx
import { FormInput } from '@/components/atoms';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { ScreenContainer, Stack, Text, Box, SwissPressable } from '@/components/primitives';
```

### testID Lookup

| testID | Component |
|--------|-----------|
| `sign-in-email-input` | Email `FormInput` |
| `sign-in-password-input` | Password `FormInput` |
| `sign-in-submit-button` | CTA `SwissPressable` |

---

## Technical Notes

### Complete `app/auth/sign-in.tsx`

```tsx
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { ScreenContainer, Stack, Text, Box, SwissPressable } from '@/components/primitives';
import { FormInput } from '@/components/atoms';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';

// ─── Schema ──────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

// ─── Error mapping ────────────────────────────────────────────────────────────

function mapSignInError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('wrong password')
  ) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch')
  ) {
    return 'Connection error. Please check your internet and try again.';
  }
  return 'Sign in failed. Please try again.';
}

// ─── Submit state ─────────────────────────────────────────────────────────────

type SubmitState = 'idle' | 'loading';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SignInScreen() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInFormValues) => {
    setServerError(null);
    setSubmitState('loading');

    // Mock mode bypass
    if (env.useMock) {
      setSubmitState('idle');
      Alert.alert('Mock Mode', 'Sign in bypassed in mock mode.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setServerError(mapSignInError(error.message));
        setSubmitState('idle');
        return;
      }

      // Session activates → onAuthStateChange(SIGNED_IN) fires → AuthContext updates automatically
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'failed to fetch';
      setServerError(mapSignInError(message));
      setSubmitState('idle');
    }
  };

  const isLoading = submitState === 'loading';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Account
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Sign in
        </Text>

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
                onSubmitEditing={() => passwordRef.current?.focus()}
                testID="sign-in-email-input"
              />
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                ref={passwordRef}
                label="Password"
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="done"
                textContentType="password"
                onSubmitEditing={handleSubmit(onSubmit)}
                testID="sign-in-password-input"
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
            accessibilityLabel={isLoading ? 'Signing in' : 'Sign in'}
            className="bg-signal w-full py-4"
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            testID="sign-in-submit-button"
          >
            <Text variant="body" className="text-paper text-center font-semibold">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Text>
          </SwissPressable>

          {/* Create account link */}
          <Box className="flex-row justify-center items-center mt-4 gap-1">
            <Text variant="body-sm" className="text-ink-muted">
              Don't have an account?
            </Text>
            <SwissPressable
              accessibilityLabel="Create a new account"
              onPress={() => router.push('/auth/register')}
            >
              <Text variant="body-sm" className="text-ink underline">
                Create account
              </Text>
            </SwissPressable>
          </Box>
        </Stack>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
```

---

### Complete `__tests__/auth-sign-in.test.tsx`

```tsx
import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import SignInScreen from '../app/auth/sign-in';
import { router } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// ─── Typed mock accessors ─────────────────────────────────────────────────────

const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;
const mockRouterPush = router.push as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { useMock: boolean }).useMock = false;
  });

  it('renders without crashing', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('shows "Sign in" button', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const submitButton = findByTestId(renderer!, 'sign-in-submit-button');
    expect(submitButton).toBeTruthy();
  });

  it('shows email validation error when email is empty on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const submitButton = findByTestId(renderer!, 'sign-in-submit-button');

    await act(async () => {
      submitButton.props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Please enter your email' }),
    ).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('shows password required error when password is empty on submit', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const emailInput = findByTestId(renderer!, 'sign-in-email-input');
    const submitButton = findByTestId(renderer!, 'sign-in-submit-button');

    await act(async () => {
      emailInput.props.onChangeText('test@example.com');
      submitButton.props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Please enter your password' }),
    ).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('bypasses Supabase and shows Alert in mock mode', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('test@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('password123');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('calls router.replace("/(tabs)") on successful sign-in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token' }, user: {} },
      error: null,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('correctpassword');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'correctpassword',
    });
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows incorrect credentials error when Supabase returns invalid login error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('wrongpassword');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Incorrect email or password. Please try again.' }),
    ).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('shows connection error when signInWithPassword throws a network error', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('Failed to fetch'));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    await act(async () => {
      findByTestId(renderer!, 'sign-in-email-input').props.onChangeText('user@example.com');
      findByTestId(renderer!, 'sign-in-password-input').props.onChangeText('anypassword');
      findByTestId(renderer!, 'sign-in-submit-button').props.onPress();
    });

    await act(async () => {});

    expect(
      renderer!.root.findByProps({ children: 'Connection error. Please check your internet and try again.' }),
    ).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('calls router.push("/auth/register") when Create account is pressed', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const createAccountLink = renderer!.root.findByProps({
      accessibilityLabel: 'Create a new account',
    });

    await act(async () => {
      createAccountLink.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/auth/register');
  });
});
```

---

## Story Metadata

- **Epic:** 4 — User Authentication
- **Story number:** 4.3
- **Story points:** 2
- **Status:** done
- **Dependencies:** Story 4.2 ✅, Story 4.6 ✅

---

## Dev Agent Record

**Agent Model Used:** Claude Sonnet 4.6

**Debug Log References:** None required — implementation matched Technical Notes exactly.

**Completion Notes:**
- [x] `app/auth/sign-in.tsx` created
- [x] `__tests__/auth-sign-in.test.tsx` created with all 9 tests passing
- [x] `npx tsc --noEmit` exits with zero errors
- [x] Overall test suite: 64/64 tests passing across 9 suites
- [x] Post-review: Addressed 3 Low findings for consistency with register.tsx pattern
  - Import order aligned: `Box, Stack, Text, SwissPressable, ScreenContainer`
  - CTA className aligned: `bg-signal py-4 mt-2` (removed redundant `w-full`)
  - Catch fallback aligned: `'Unknown error'` (was `'failed to fetch'`)

**File List:**

| File | Change |
|------|--------|
| `apps/mobile/app/auth/sign-in.tsx` | Created |
| `apps/mobile/__tests__/auth-sign-in.test.tsx` | Created |
