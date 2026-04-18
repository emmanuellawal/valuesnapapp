# Story 4.5: Implement Sign Out

**Status:** done

---

## Story

**As an** authenticated user,
**I want** a "Sign out" option in my settings,
**So that** I can securely end my session and return the app to guest mode.

---

## Business Context

### Why This Story Now

Stories 4.6 (AuthContext) and 4.3 (Sign-In) are done. Users can now create accounts and sign in — but they have no way to sign out. This is the final piece of the core auth lifecycle (register → sign in → **sign out**).

**What exists (post 4.3):**
- `contexts/AuthContext.tsx`: exports `useAuth()` with `{ session, user, isGuest, isLoading, signOut }` — **`signOut` is fully implemented and tested**
- `app/(tabs)/settings.tsx`: Shows "Email" row with user email when authenticated, "Not signed in" when guest — **needs Sign Out button added**
- `__tests__/AuthContext.test.tsx`: `signOut` calling `supabase.auth.signOut()` is already tested
- Test suite: 64/64 tests passing across 9 suites — must remain green

### The Sign Out Flow

```
User taps "Sign out" in Settings
  └─► signOut() from useAuth()
        └─► supabase.auth.signOut()
              └─► onAuthStateChange(SIGNED_OUT) fires automatically
                    → AuthContext: session=null, user=null, isGuest=true
                    → Settings screen auto-updates via React state:
                        Email row: "Not signed in" (with register link)
                        Sign out row: hidden (isGuest=true → not rendered)
```

No manual navigation needed — the settings screen reactively updates when `isGuest` becomes true.

### What This Story Delivers

**One file modified:**
- `app/(tabs)/settings.tsx` — Add conditional "Sign out" `SettingsRow` in Account section

**One new test file:**
- `__tests__/settings-signout.test.tsx` — 5 unit tests

Nothing else — no new screens, no layout changes, no library installs.

---

## Acceptance Criteria

### AC1: Sign Out Row — Authenticated State

**Given** the user is signed in (`isGuest: false`, `user.email` is set)  
**When** the Settings screen renders  
**Then:**
- A "Sign out" row appears in the Account section, below the Email row
- The row label "Sign out" is rendered in `text-signal` (red — signals destructive action)
- The row has `accessibilityLabel="Sign out of your account"`
- The row does **not** render a chevron or trailing value, since this is an action and not a navigation destination

---

### AC2: Sign Out Row — Guest State

**Given** the user is a guest (`isGuest: true`)  
**When** the Settings screen renders  
**Then:**
- The "Sign out" row is **not rendered** at all
- No other rows are affected

---

### AC3: Sign Out Executes Correctly

**Given** the authenticated Settings screen is rendered  
**When** the user taps the "Sign out" row  
**Then:**
- `signOut()` from `useAuth()` is called
- `supabase.auth.signOut()` runs (handled inside AuthContext — already tested)
- `onAuthStateChange(SIGNED_OUT)` fires → AuthContext clears session/user
- Settings screen responds correctly to auth state changes supplied by `useAuth()` (reactive AuthContext transition is already covered in `__tests__/AuthContext.test.tsx`)

---

### AC4: Swiss Design Compliance

**Given** the Sign out row renders  
**Then:**
- Row structure matches existing `SettingsRow` style: `py-4 bg-paper border-b border-divider`
- Label "Sign out" in `text-signal` (#E53935) — consistent with the error/destructive convention
- No trailing value text or chevron is rendered for the destructive action row
- Touch target ≥ 48px (py-4 provides this)

---

### AC5: TypeScript — Zero Errors

**Given** all files are in place  
**When** `cd apps/mobile && npx tsc --noEmit` runs  
**Then** zero TypeScript errors are reported

---

### AC6: Unit Tests — All 5 Pass

**Given** the test file `__tests__/settings-signout.test.tsx` exists  
**When** the test suite runs  
**Then** all 5 tests pass and the overall suite remains green

---

## Out of Scope

| Feature | Handled By |
|---------|-----------|
| Confirmation dialog before sign out | Not required — sign in is trivial to redo |
| Navigation to Camera tab after sign out | Out of scope — reactive UI update is sufficient |
| Sign out from all devices | Future security hardening story |
| Settings screen full rebuild | Story 4.8 |
| Account deletion | Stories 4.9–4.10 |

---

## Tasks

### Task 1: Modify `app/(tabs)/settings.tsx` (AC1–AC4)

1. Add `signOut` to the `useAuth()` destructure
2. Add `destructive?: boolean`, `showChevron?: boolean`, and `testID?: string` props to the local `SettingsRow` component
3. When `destructive=true`, render the label in `text-signal` instead of default `text-ink`
4. Thread `testID` through to the underlying `SwissPressable`
5. When `showChevron=false`, suppress both the trailing value text and the chevron affordance
6. Add the conditional sign-out row in the Account section (after Email row, only when `!isGuest`)

### Task 2: Write `__tests__/settings-signout.test.tsx` (AC6)

Write all 5 unit tests using `react-test-renderer` with `act(async () => { ... })` pattern. See Technical Notes for the full test file.

### Task 3: TypeScript Verification

```bash
cd apps/mobile && npx tsc --noEmit
```

Zero errors expected.

---

## Dev Notes

### What Already Exists — Do NOT recreate

| File | Status | Notes |
|------|--------|-------|
| `contexts/AuthContext.tsx` | ✅ EXISTS | `signOut` fully implemented — do NOT modify |
| `__tests__/AuthContext.test.tsx` | ✅ EXISTS | `signOut` already tested — do NOT modify |
| `app/(tabs)/settings.tsx` | ✅ EXISTS (modify) | Add sign-out row and SettingsRow props |

### testID Lookup

| testID | Component |
|--------|-----------|
| `settings-signout-button` | Sign out `SwissPressable` (inside `SettingsRow`) |

### Design Constraint

The existing `SettingsRow` shows a muted value and chevron on the right to imply navigation. That affordance is correct for rows like Email, Theme, or Terms of Service, but it is misleading for a destructive action like Sign out. The elegant fix is to keep `SettingsRow` as the shared primitive while adding a `showChevron` escape hatch so action rows can suppress the trailing UI without introducing a second component.

### Import Paths

No new imports needed. `settings.tsx` already imports everything required:
```tsx
import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { useAuth } from '@/contexts/AuthContext';
```

---

## Technical Notes

### Modified `app/(tabs)/settings.tsx`

```tsx
import React from 'react';
import { router } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { useAuth } from '@/contexts/AuthContext';

/**
 * SettingsRow - Swiss Minimalist Design
 *
 * Flush-left layout with value and chevron pushed right.
 * Touch target >= 48px per WCAG 2.1 AA.
 */
function SettingsRow({
  label,
  value,
  onPress,
  accessibilityLabel,
  destructive = false,
  showChevron = true,
  testID,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  accessibilityLabel: string;
  destructive?: boolean;
  showChevron?: boolean;
  testID?: string;
}) {
  return (
    <SwissPressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress ?? (() => {})}
      className="py-4 bg-paper border-b border-divider"
      testID={testID}
    >
      <Stack direction="horizontal" gap={4}>
        <Text variant="body" className={destructive ? 'text-signal' : 'text-ink'}>
          {label}
        </Text>
        {showChevron ? (
          <Stack direction="horizontal" gap={2} className="ml-auto items-center">
            <Text variant="body-sm" className="text-ink-muted">
              {value}
            </Text>
            <Text variant="body" className="text-ink-muted">
              ›
            </Text>
          </Stack>
        ) : null}
      </Stack>
    </SwissPressable>
  );
}

/**
 * Settings Screen — Swiss Minimalist Design
 */
export default function SettingsScreen() {
  const { isGuest, user, signOut } = useAuth();

  return (
    <ScreenContainer>
      {/* Header */}
      <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
        Settings
      </Text>
      <Text variant="display" className="text-ink mt-2">
        Your account
      </Text>

      {/* Account section */}
      <Box className="mt-12">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          Account
        </Text>
        <SettingsRow
          label="Plan"
          value="Free"
          accessibilityLabel="View plan details"
        />
        <SettingsRow
          label="Email"
          value={isGuest ? 'Not signed in' : (user?.email ?? '')}
          onPress={isGuest ? () => router.push('/auth/register') : undefined}
          accessibilityLabel={
            isGuest ? 'Sign in or create account' : 'Account email address'
          }
        />
        {!isGuest && (
          <SettingsRow
            label="Sign out"
            value=""
            onPress={signOut}
            accessibilityLabel="Sign out of your account"
            destructive
            showChevron={false}
            testID="settings-signout-button"
          />
        )}
      </Box>

      {/* Preferences section */}
      <Box className="mt-8">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          Preferences
        </Text>
        <SettingsRow
          label="Theme"
          value="System"
          accessibilityLabel="Change theme preference"
        />
        <SettingsRow
          label="Notifications"
          value="Off"
          accessibilityLabel="Change notifications preference"
        />
        <SettingsRow
          label="Currency"
          value="USD"
          accessibilityLabel="Change currency"
        />
      </Box>

      {/* About section */}
      <Box className="mt-8">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          About
        </Text>
        <SettingsRow
          label="Version"
          value="1.0.0"
          accessibilityLabel="App version"
        />
        <SettingsRow
          label="Privacy Policy"
          value=""
          accessibilityLabel="View privacy policy"
        />
        <SettingsRow
          label="Terms of Service"
          value=""
          accessibilityLabel="View terms of service"
        />
      </Box>
    </ScreenContainer>
  );
}
```

---

### Complete `__tests__/settings-signout.test.tsx`

```tsx
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import SettingsScreen from '../app/(tabs)/settings';
import { useAuth } from '@/contexts/AuthContext';

// ─── Typed mock accessors ─────────────────────────────────────────────────────

const mockUseAuth = useAuth as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authenticatedAuth(overrides = {}) {
  return {
    session: { access_token: 'token' },
    user: {
      id: '123',
      email: 'user@example.com',
      createdAt: '2026-03-26T00:00:00.000Z',
      tier: 'FREE' as const,
      preferences: {},
    },
    isGuest: false,
    isLoading: false,
    signOut: jest.fn(),
    ...overrides,
  };
}

function guestAuth() {
  return {
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsScreen — Sign Out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing when authenticated', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('shows Sign out row when authenticated', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButton = renderer!.root.findByProps({
      testID: 'settings-signout-button',
    });
    expect(signOutButton).toBeTruthy();
  });

  it('renders Sign out as a destructive action without trailing chevron', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButton = renderer!.root.findByProps({
      testID: 'settings-signout-button',
    });
    const signOutLabel = signOutButton.findByProps({ children: 'Sign out' });
    const chevrons = signOutButton.findAll((node) => node.props?.children === '›');

    expect(signOutLabel.props.className).toBe('text-signal');
    expect(chevrons).toHaveLength(0);
  });

  it('does not show Sign out row when guest', async () => {
    mockUseAuth.mockReturnValue(guestAuth());

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButtons = renderer!.root.findAll(
      (node) => node.props?.testID === 'settings-signout-button',
    );
    expect(signOutButtons).toHaveLength(0);
  });

  it('calls signOut when Sign out row is pressed', async () => {
    const mockSignOut = jest.fn();
    mockUseAuth.mockReturnValue(authenticatedAuth({ signOut: mockSignOut }));

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    const signOutButton = renderer!.root.findByProps({
      testID: 'settings-signout-button',
    });

    await act(async () => {
      signOutButton.props.onPress();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
```

---

## Story Metadata

- **Epic:** 4 — User Authentication
- **Story number:** 4.5
- **Story points:** 1
- **Status:** done
- **Dependencies:** Story 4.6 ✅, Story 4.3 ✅

---

## Dev Agent Record

*(To be filled in by the dev agent upon completion)*

**Agent Model Used:** Claude Sonnet 4.6

**Debug Log References:** n/a

**Completion Notes:**
- [x] `app/(tabs)/settings.tsx` modified with sign out row and SettingsRow prop changes
- [x] `__tests__/settings-signout.test.tsx` created with all 5 tests passing
- [x] `npx tsc --noEmit` exits with zero errors
- [x] Overall test suite: 69/69 tests, 10 suites — all green
- [x] Code review: PASS (2 Low findings addressed)

**Party-mode fix applied (dev):** `value` prop made optional (default `''`) per Winston's A1 flag. `className` assertion in Test 3 uses `findAll` + `includes` predicate per Quinn/Amelia's A2/A3 flag — resilient to `Text` primitive combining classNames.

**Code review findings:**
- **F1 (Low, FIXED):** Added `accessibilityLabel` assertion to Test 2 — verifies "Sign out of your account" text per AC1
- **F2 (Low, TRACKED):** Pre-existing: `SettingsRow` announces non-interactive rows as buttons — tracked in Story 4.8 for Phase D refactor

**File List:**

| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/settings.tsx` | Modified |
| `apps/mobile/__tests__/settings-signout.test.tsx` | Created |
