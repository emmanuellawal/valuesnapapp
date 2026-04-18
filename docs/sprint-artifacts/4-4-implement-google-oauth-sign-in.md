# Story 4.4: Implement Google OAuth Sign-In

**Status:** ready-for-dev

---

## Story

**As a** new or returning user,
**I want** to sign in with my Google account,
**So that** I can get started without creating a password.

---

## Business Context

### Why This Story Now

Stories 4.2 (Register) and 4.3 (Sign-In) are complete. Users can create accounts and sign in with email/password. This story adds Google OAuth as an alternative sign-in method — a single "Continue with Google" button added to both existing auth screens.

**Current state (post 4.2, 4.3, 4.5):**
- `app/auth/register.tsx`: Registration screen — **EXISTS, will be modified** (add Google button below Create account CTA)
- `app/auth/sign-in.tsx`: Sign-in screen — **EXISTS, will be modified** (add Google button below Sign in CTA)
- `app/auth/_layout.tsx`: Stack layout for auth group — **EXISTS, do NOT modify**
- `contexts/AuthContext.tsx`: `useAuth()` with `{session, user, isGuest, isLoading, signOut}` — **EXISTS, do NOT modify**
- `__tests__/auth-register.test.tsx`: 10 tests — **EXISTS, do NOT modify** (suite must stay green)
- `__tests__/auth-sign-in.test.tsx`: 9 tests — **EXISTS, do NOT modify** (suite must stay green)
- Libraries already installed (no installs needed):
  - `expo-web-browser ~15.0.10`
  - `expo-linking ~8.0.11`
  - `@supabase/supabase-js ^2.100.1`
- `app.json`: `scheme: "mobile"` — the custom URL scheme for OAuth redirects in production
- `lib/supabase.ts`: singleton Supabase client with `detectSessionInUrl: false`
- Test suite baseline: 69/69 tests, 10 suites — must remain green

### What This Story Delivers

**Two files modified:**
- `app/auth/register.tsx` — Add "Continue with Google" button below the CTA
- `app/auth/sign-in.tsx` — Add "Continue with Google" button below the CTA

**Two new test files:**
- `__tests__/auth-google-oauth-register.test.tsx` — 6 unit tests covering the Google button on register screen
- `__tests__/auth-google-oauth-sign-in.test.tsx` — 6 unit tests covering the Google button on sign-in screen

No new routes, no new libraries, no shared auth module extraction.

### The Google OAuth Flow

```
User taps "Continue with Google"
  └─► googleSignIn() called
        ├─► Linking.createURL('/') resolves redirect URL:
        │     Expo Go dev:  exp://192.168.x.x:8081/
        │     Production:   mobile://
        │
        ├─► supabase.auth.signInWithOAuth({
        │     provider: 'google',
        │     options: { redirectTo: redirectUrl },
        │   })
        │
        ├─► If data.url returned:
        │     WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        │       ├─► User completes Google login in browser
        │       ├─► Browser redirects back to redirectUrl with auth tokens
        │       └─► WebBrowser detects the redirect and closes
        │
        ├─► If browser result.type === 'success':
        │     router.replace('/(tabs)')
        │
        ├─► If browser result.type is 'cancel' or 'dismiss':
        │     Stay on the current auth screen (user backed out intentionally)
        │
        └─► onAuthStateChange(SIGNED_IN) fires automatically
              → AuthContext: { session, user: AppUser, isGuest: false }
```

**Key Architectural Note:** `WebBrowser.openAuthSessionAsync` is a blocking call that waits for the OAuth redirect. Session establishment happens via `onAuthStateChange` in `AuthContext` — no manual session polling needed. However, **AuthContext does not navigate**. The auth screen must call `router.replace('/(tabs)')` after a successful browser result because neither `AuthContext` nor the current route tree will do that automatically.

**Prerequisite:** Google OAuth must be configured in Supabase Dashboard:
- Google Cloud Console OAuth credentials created
- Supabase Auth → Providers → Google → enabled with client ID + secret
- Redirect URL whitelisted: `https://<project>.supabase.co/auth/v1/callback`
- This is a **dashboard task** (not code) — assumed done or story is blocked.

### Error Scenarios

| Error | User-Facing Message |
|-------|---------------------|
| `data.url` is null (Supabase misconfigured) | "Google sign-in is not available. Please use email and password." |
| `WebBrowser.openAuthSessionAsync` dismissed by user | Silent — no error shown (user cancelled intentionally) |
| Network error during OAuth initiation | "Connection error. Please check your internet and try again." |
| Unknown error | "Google sign-in failed. Please try again." |

---

## Acceptance Criteria

### AC1: Google Button Appears on Both Auth Screens

**Given** the register or sign-in screen renders  
**When** the screen loads  
**Then:**
- A "Continue with Google" button appears below the primary CTA (Create account / Sign in)
- The button has: `accessibilityLabel="Continue with Google"`, `testID="google-oauth-button"`
- Button label text: "Continue with Google"
- Separator text: "or" appears between the primary CTA and the Google button (muted, centered)
- Swiss styling: white background (`bg-paper`), ink border (`border border-ink`), full-width, `py-4`
- Touch target ≥ 48px (py-4 ensures this)

---

### AC2: Tapping Google Button Initiates OAuth Flow

**Given** the register or sign-in screen is rendered with mocked `supabase` and `expo-web-browser`  
**When** the user taps "Continue with Google"  
**Then:**
- `supabase.auth.signInWithOAuth` is called with `{ provider: 'google', options: { redirectTo: expect.any(String) } }`
- If `data.url` is returned, `WebBrowser.openAuthSessionAsync(data.url, redirectUrl)` is called
- If the browser result is `success`, the screen calls `router.replace('/(tabs)')`
- If the browser result is `cancel` or `dismiss`, no error is shown and the user remains on the current auth screen
- Button shows loading state ("Signing in with Google…") while the browser is open

---

### AC3: OAuth Errors Display Friendly Messages

**Given** `supabase.auth.signInWithOAuth` returns an error or `data.url` is null  
**When** the user taps "Continue with Google"  
**Then:**
- An appropriate error message is shown inline (same error area as email/password errors)
- The button returns to its default state

---

### AC4: Mock Mode Bypass

**Given** `env.useMock` is `true`  
**When** the user taps "Continue with Google"  
**Then:**
- An `Alert` appears: "Mock Mode — Google OAuth bypassed in mock mode."
- On pressing OK, the app navigates to `/(tabs)` (mirroring the pattern from Stories 4.2/4.3)

---

### AC5: TypeScript — Zero Errors

**Given** all files are in place  
**When** `cd apps/mobile && npx tsc --noEmit` runs  
**Then** zero TypeScript errors are reported

---

### AC6: Unit Tests — All 12 Pass

**Given** both test files exist  
**When** the test suite runs  
**Then** all 12 new tests pass and the overall suite remains green (69 + 12 = 81 tests minimum)

---

## Out of Scope

| Feature | Handled By |
|---------|-----------|
| Apple Sign-In | Future story (requires Apple Developer account) |
| Google button on Camera tab (pre-auth) | Out of scope |
| Token refresh for OAuth sessions | Handled by AuthContext onAuthStateChange, already tested |
| Supabase Dashboard configuration (enabling Google provider) | Dashboard task — assumed done |
| Session persistence after OAuth | Handled by AuthContext (Story 4.6 ✅) |

---

## Tasks

### Task 1: Modify `app/auth/register.tsx` (AC1–AC4)

1. Add `import * as WebBrowser from 'expo-web-browser'` and `import * as Linking from 'expo-linking'`
2. Add `WebBrowser.maybeCompleteAuthSession()` at module level, immediately after imports
3. Add `oauthError` and `isOAuthLoading` state variables
4. Add inline `googleSignIn` handler function
5. Add separator `"or"` element + Google button below the CTA inside the form `<Stack>`
6. `testID="google-oauth-button"` on the `SwissPressable`
7. Navigate with `router.replace('/(tabs)')` only when `openAuthSessionAsync` resolves with `type === 'success'`

### Task 2: Modify `app/auth/sign-in.tsx` (AC1–AC4)

Same changes as Task 1 — applied to the sign-in screen.

### Task 3: Write `__tests__/auth-google-oauth-register.test.tsx` (AC6)

6 tests — see Technical Notes for full test file.

### Task 4: Write `__tests__/auth-google-oauth-sign-in.test.tsx` (AC6)

6 tests — see Technical Notes for full test file.

### Task 5: TypeScript Verification

```bash
cd apps/mobile && npx tsc --noEmit
```

Zero errors expected.

---

## Dev Notes

### What Already Exists — Do NOT Recreate

| File | Status | Notes |
|------|--------|-------|
| `app/auth/register.tsx` | ✅ EXISTS (modify) | Add Google button below the CTA |
| `app/auth/sign-in.tsx` | ✅ EXISTS (modify) | Add Google button below the CTA |
| `app/auth/_layout.tsx` | ✅ EXISTS | Do NOT modify |
| `contexts/AuthContext.tsx` | ✅ EXISTS | Do NOT modify |
| `__tests__/auth-register.test.tsx` | ✅ EXISTS | Do NOT modify |
| `__tests__/auth-sign-in.test.tsx` | ✅ EXISTS | Do NOT modify |

### testID Lookup

| testID | Component |
|--------|-----------|
| `google-oauth-button` | Google `SwissPressable` (on both screens) |

### Import Order Convention (established in 4.2/4.3)

```tsx
import React, { ... } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ... } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { FormInput } from '@/components/atoms';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
```

### `WebBrowser.maybeCompleteAuthSession()` Call

On some Expo configurations, you need to call `WebBrowser.maybeCompleteAuthSession()` at the module level (outside the component) to complete the OAuth redirect properly. Add it at the top of **both** modified screen files, immediately after imports:

```tsx
// Required for expo-web-browser OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();
```

This is a no-op on native (iOS/Android) but is required for web-based redirect flows. It's safe to call unconditionally.

### `Linking.createURL('/')` Resolution

In Expo Go: resolves to `exp://192.168.x.x:8081/--/` (dev server IP)  
In production: resolves to `mobile://` (from `app.json` `scheme: "mobile"`)  
This is called at handler invocation time (not module level) to always get the current URL.

### Error State Placement

The Google OAuth error should render in the **same `{serverError}` / `{oauthError}` display area** as email/password errors — below the form fields, above/below the CTA. Keep both error states separate (`serverError` for email form, `oauthError` for Google) so clearing one doesn't clear the other.

### Mock Pattern for Tests

For `expo-web-browser` and `expo-linking`, mock at the module level:

```tsx
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://localhost/'),
}));
```

For `@/lib/supabase`:

```tsx
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));
```

Note: the register screen test already mocks `supabase`. The new Google OAuth test file is **separate** from `__tests__/auth-register.test.tsx` — it starts fresh with its own mocks.

---

## Technical Notes

### `googleSignIn` handler (same logic on both screens)

```tsx
const [oauthError, setOauthError] = useState<string | null>(null);
const [isOAuthLoading, setIsOAuthLoading] = useState(false);

const googleSignIn = async () => {
  setOauthError(null);
  setIsOAuthLoading(true);

  // Mock mode bypass
  if (env.useMock) {
    setIsOAuthLoading(false);
    Alert.alert('Mock Mode', 'Google OAuth bypassed in mock mode.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)') },
    ]);
    return;
  }

  try {
    const redirectUrl = Linking.createURL('/');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });

    if (error) {
      setOauthError('Google sign-in failed. Please try again.');
      setIsOAuthLoading(false);
      return;
    }

    if (!data.url) {
      setOauthError('Google sign-in is not available. Please use email and password.');
      setIsOAuthLoading(false);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success') {
      router.replace('/(tabs)');
    }

    // onAuthStateChange(SIGNED_IN) fires if login succeeded → AuthContext handles session state
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      setOauthError('Connection error. Please check your internet and try again.');
    } else {
      setOauthError('Google sign-in failed. Please try again.');
    }
  } finally {
    setIsOAuthLoading(false);
  }
};
```

### Google Button + Separator UI (add inside the form `<Stack>`, after the CTA `SwissPressable`)

```tsx
{/* Separator */}
<Box className="flex-row items-center gap-3 my-2">
  <Box className="flex-1 h-px bg-divider" />
  <Text variant="body-sm" className="text-ink-muted">
    or
  </Text>
  <Box className="flex-1 h-px bg-divider" />
</Box>

{/* Google OAuth */}
{oauthError ? (
  <View accessibilityLiveRegion="polite">
    <Text variant="body-sm" className="text-signal">
      {oauthError}
    </Text>
  </View>
) : null}

<SwissPressable
  accessibilityLabel={isOAuthLoading ? 'Signing in with Google' : 'Continue with Google'}
  className="bg-paper border border-ink py-4"
  onPress={googleSignIn}
  disabled={isOAuthLoading}
  testID="google-oauth-button"
>
  <Text variant="body" className="text-ink text-center font-semibold">
    {isOAuthLoading ? 'Signing in with Google…' : 'Continue with Google'}
  </Text>
</SwissPressable>
```

---

### Complete `__tests__/auth-google-oauth-register.test.tsx`

```tsx
import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://localhost/'),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  })),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────────

import RegisterScreen from '../app/auth/register';
import { router } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';

// ─── Typed mock accessors ───────────────────────────────────────────────────────

const mockSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('RegisterScreen — Google OAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { useMock: boolean }).useMock = false;
  });

  it('renders the Google OAuth button and separator', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });
    expect(googleButton).toBeTruthy();
    expect(googleButton.props.accessibilityLabel).toBe('Continue with Google');
    expect(renderer!.root.findByProps({ children: 'or' })).toBeTruthy();
  });

  it('calls signInWithOAuth and opens the auth browser when button is tapped', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'success' });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.any(String) },
    });
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      'https://accounts.google.com/oauth',
      'exp://localhost/',
    );
  });

  it('navigates to /(tabs) when the OAuth browser returns success', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'success' });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows error message when signInWithOAuth returns error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth not configured' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.includes('Google sign-in failed'),
    );
    expect(errorNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows not-available message when data.url is null', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.includes('not available'),
    );
    expect(errorNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('bypasses OAuth and shows Alert in mock mode', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
```

---

### Complete `__tests__/auth-google-oauth-sign-in.test.tsx`

```tsx
import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://localhost/'),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  })),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────────

import SignInScreen from '../app/auth/sign-in';
import { router } from 'expo-router';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';

// ─── Typed mock accessors ───────────────────────────────────────────────────────

const mockSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('SignInScreen — Google OAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { useMock: boolean }).useMock = false;
  });

  it('renders the Google OAuth button and separator', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });
    expect(googleButton).toBeTruthy();
    expect(googleButton.props.accessibilityLabel).toBe('Continue with Google');
    expect(renderer!.root.findByProps({ children: 'or' })).toBeTruthy();
  });

  it('calls signInWithOAuth and opens the auth browser when button is tapped', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'success' });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.any(String) },
    });
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      'https://accounts.google.com/oauth',
      'exp://localhost/',
    );
  });

  it('navigates to /(tabs) when the OAuth browser returns success', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'success' });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows error message when signInWithOAuth returns error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth not configured' },
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.includes('Google sign-in failed'),
    );
    expect(errorNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows not-available message when data.url is null', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.includes('not available'),
    );
    expect(errorNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('bypasses OAuth and shows Alert in mock mode', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (env as { useMock: boolean }).useMock = true;

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SignInScreen />);
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
```

---

## Story Metadata

- **Epic:** 4 — User Authentication
- **Story number:** 4.4
- **Story points:** 2
- **Status:** ready-for-dev
- **Dependencies:** Story 4.2 ✅, Story 4.3 ✅, Supabase Dashboard Google provider configured

---

## Dev Agent Record

*(To be filled in by the dev agent upon completion)*

**Agent Model Used:** Claude Sonnet 4.6 (GitHub Copilot)

**Debug Log References:** N/A

**Completion Notes:**
- [x] `app/auth/register.tsx` modified with Google button and handler
- [x] `app/auth/sign-in.tsx` modified with Google button and handler
- [x] `__tests__/auth-google-oauth-register.test.tsx` created with 6 tests passing
- [x] `__tests__/auth-google-oauth-sign-in.test.tsx` created with 6 tests passing
- [x] `npx tsc --noEmit` exits with zero errors
- [x] Overall test suite green: 81/81 tests, 12 suites

**Post-Review Hotfix (2026-03-27):**
- F1 (CRITICAL): Added `exchangeCodeForSession(code)` for PKCE session establishment — spec gap in Technical Notes
- F4 (LOW): Removed redundant `setIsOAuthLoading(false)` calls (handled by `finally` block)
- F6 (LOW): Added cross-clear both error states at start of each handler
- Tests updated: success flow mocks now include `url` with `?code=` param and mock `exchangeCodeForSession`
- F2/F3 (MEDIUM): Test hardening deferred to Story 4.4.2

**File List:**

| File | Change |
|------|--------|
| `apps/mobile/app/auth/register.tsx` | Modified |
| `apps/mobile/app/auth/sign-in.tsx` | Modified |
| `apps/mobile/__tests__/auth-google-oauth-register.test.tsx` | Created |
| `apps/mobile/__tests__/auth-google-oauth-sign-in.test.tsx` | Created |
