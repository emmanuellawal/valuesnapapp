# Story 4.8: Build Settings Screen

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 3  
**FR:** FR40, FR41  
**NFRs:** NFR-S8, NFR-A1 (accessibility)

---

## Story

**As a** user (authenticated or guest),  
**I want** a settings screen that shows my account information and provides clear actions,  
**So that** I can manage my account, get help, and understand my current auth state at a glance.

---

## Background

### What Already Exists

`app/(tabs)/settings.tsx` is NOT a blank placeholder — it already has **substantial implementation** from earlier stories. Do NOT reinvent what is there.

| Already built | Detail |
|---|---|
| `SettingsRow` component | Local helper wrapping `SwissPressable`; handles label/value/chevron/destructive styling |
| Account section | Shows Email row (with "Not signed in" for guests), Plan row, Sign Out row (auth only) |
| Preferences section | Theme / Notifications / Currency stubs (not in scope for this story) |
| About section | Version ("1.0.0" hardcoded), Privacy Policy, Terms of Service rows |
| `useAuth()` import | Already wired; exposes `{ isGuest, user, session, signOut }` |
| Sign out wired | `settings-signout-button` testID, `signOut` called on press |
| Test file | `__tests__/settings-signout.test.tsx` — 4+ tests covering sign-out flow; must not regress |

### What This Story Delivers

Four targeted additions/fixes:

1. **Sign-in method row** — show "Email" or "Google" for authenticated users (derived from `session.user.app_metadata.provider`)
2. **Delete Account row** — destructive row that navigates to `/account/delete-confirm` (Story 4.9 creates the screen)
3. **Help & Support row** — opens external link or mail in About section
4. **Accessibility fix (F2 from 4.5 review)** — `SettingsRow` must conditionally render as non-interactive `Box` for rows with no `onPress`. Currently every row uses `SwissPressable`, meaning version/email rows announce as "button" to screen readers — wrong.
5. **Guest view CTA** — Current guest state is just an Email row reading "Not signed in." Story requires a clear, explicit "Create account" + "Sign in" action area in the Account section for guests.
6. **Dynamic version** — Read from `expo-constants` instead of hardcoded `"1.0.0"`.

**No backend changes. No new dependencies** (expo-constants is already in the project).

---

## Acceptance Criteria

### AC1: Authenticated Account Section

**Given** a user is authenticated (`isGuest === false`)  
**When** the Settings screen renders  
**Then:**
- Email address is displayed in the Email row
- Sign-in method row shows `"Email"` or `"Google"` (derived from `session.user.app_metadata.provider`)
- Sign-in method row is **non-interactive** (no `onPress`, no button affordance, no chevron)
- "Sign Out" destructive row is visible with `testID="settings-signout-button"`
- "Delete Account" destructive row is visible below Sign Out; tapping it calls `router.push('/account/delete-confirm')`

---

### AC2: Guest Account Section

**Given** a user is a guest (`isGuest === true`)  
**When** the Settings screen renders  
**Then:**
- A heading reads "Not signed in" (non-interactive `Text`, not a pressable `SettingsRow`)
- A "Create account" pressable row navigates to `/auth/register`
- A "Sign in" pressable row navigates to `/auth/sign-in`
- Sign Out row is **not** visible
- Delete Account row is **not** visible

---

### AC3: Help & Support Row

**Given** any user  
**When** they tap "Help & Support" in the About section  
**Then:** `Linking.openURL('mailto:support@valuesnap.app')` is called

> **Note:** The support email is a placeholder. If a real URL exists, it can be swapped in. Use `import { Linking } from 'react-native'` — no additional dependency.

---

### AC4: Accessibility — Non-Interactive Rows

**Given** the Settings screen renders  
**When** rows with no `onPress` are displayed (e.g., Email, Plan, Version, Sign-In Method)  
**Then:**
- These rows do **not** use `SwissPressable` (must not announce as "button" to screen readers)
- They render as a plain `Box` with the same visual layout as `SettingsRow`
- `SettingsRow` must accept optional `onPress`; when absent, renders as non-interactive

---

### AC5: Dynamic App Version

**Given** any user  
**When** the About section renders  
**Then** the Version row shows the value from `Constants.expoConfig?.version ?? '1.0.0'`  
(`expo-constants` is already installed; no `import` changes needed to `package.json`)

---

### AC6: Sign Out Unchanged

**Given** an authenticated user taps "Sign Out"  
**When** `signOut()` completes  
**Then** the existing behavior from Stories 4.5 and 4.6 is preserved unchanged  
**And** the existing tests in `__tests__/settings-signout.test.tsx` all pass

---

### AC7: TypeScript Zero Errors

**Given** all modified files are saved  
**When** `cd apps/mobile && npx tsc --noEmit` runs  
**Then** zero TypeScript errors are reported

---

### AC8: Full Test Suite Remains Green

**Given** new tests are added for the new behaviors  
**When** `cd apps/mobile && npx jest --no-coverage` runs  
**Then** all existing tests pass and new tests pass

---

## Scope

| What | File | Change type |
|------|------|-------------|
| Settings screen | `app/(tabs)/settings.tsx` | **Modify** — add sign-in method, delete account, help, guest CTA, version, a11y fix |
| Settings tests | `__tests__/settings.test.tsx` | **Create** — new test file for 4.8 behaviors |

**Do NOT modify** `__tests__/settings-signout.test.tsx` — it tests existing behavior that must not regress.

---

## Dev Notes

### `SettingsRow` Accessibility Refactor

This is the most important correctness fix. The current implementation:
```tsx
// WRONG: Every row is a pressable, even non-interactive ones
<SwissPressable onPress={onPress ?? (() => {})} ...>
```

Fix: make `onPress` optional. When absent, render with `Box` instead of `SwissPressable`:
```tsx
function SettingsRow({ ..., onPress }: { onPress?: () => void; ... }) {
  if (onPress) {
    return <SwissPressable onPress={onPress} ...>...</SwissPressable>;
  }
  return <Box className="py-4 bg-paper border-b border-divider">...</Box>;
}
```

> **Caution:** After this change, the existing `settings-signout.test.tsx` tests that find `testID="settings-signout-button"` still pass because Sign Out DOES have `onPress={signOut}` — so it keeps `SwissPressable`. Verify by running the suite after the edit.

### Sign-In Method Detection

Use `session.user.app_metadata.provider` from the existing `useAuth()` hook. The value is:
- `'email'` → display `"Email"`
- `'google'` → display `"Google"`

```tsx
const { isGuest, user, session, signOut } = useAuth();
const signInMethod = session?.user?.app_metadata?.provider === 'google' ? 'Google' : 'Email';
```

This works because `session` is already exposed from `AuthContextValue`. No changes to `AuthContext.tsx` or `types/user.ts` needed.

### Dynamic Version

```tsx
import Constants from 'expo-constants';
// ...
const appVersion = Constants.expoConfig?.version ?? '1.0.0';
```

Use `appVersion` in the Version row's `value` prop.

### Delete Account Row

The route `/account/delete-confirm` will be created in Story 4.9. For this story, just wire the `onPress` to push to that route. The navigation will be a no-op until 4.9 is done.

```tsx
<SettingsRow
  label="Delete Account"
  onPress={() => router.push('/account/delete-confirm')}
  accessibilityLabel="Delete your account permanently"
  destructive
  showChevron={false}
  testID="settings-delete-account-button"
/>
```

### Help & Support

```tsx
import { Linking } from 'react-native';
// ...
<SettingsRow
  label="Help & Support"
  onPress={() => Linking.openURL('mailto:support@valuesnap.app')}
  accessibilityLabel="Get help and support"
  testID="settings-help-button"
/>
```

> **Privacy Policy and Terms of Service** rows remain non-interactive for MVP — no URLs to wire yet. A future story may connect them to hosted legal pages via `Linking.openURL`.

### Guest View CTA

Replace the current guest Email row behavior with a dedicated CTA area:
```tsx
{isGuest ? (
  <Box className="mt-8">
    <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
      Account
    </Text>
    <Text variant="body" className="text-ink-muted pb-4 border-b border-divider">
      Not signed in
    </Text>
    <SettingsRow
      label="Create account"
      onPress={() => router.push('/auth/register')}
      accessibilityLabel="Create a free account"
      testID="settings-create-account-button"
    />
    <SettingsRow
      label="Sign in"
      onPress={() => router.push('/auth/sign-in')}
      accessibilityLabel="Sign in to your account"
      testID="settings-sign-in-button"
    />
  </Box>
) : (
  /* authenticated account section as currently implemented + new rows */
)}
```

### Project Structure Notes

- `app/(tabs)/settings.tsx` — the only file that changes  
- `__tests__/settings.test.tsx` — new test file for 4.8 behaviors (do not reuse the signout test file)
- `expo-constants` is already installed (used in earlier epics); no `npm install` needed
- `Linking` is from `react-native` core — no install needed

### testID Reference

| Element | testID | Interactive? |
|---------|--------|--------------|
| Create account row (guest) | `settings-create-account-button` | Yes |
| Sign in row (guest) | `settings-sign-in-button` | Yes |
| Delete Account row | `settings-delete-account-button` | Yes |
| Help & Support row | `settings-help-button` | Yes |
| Sign-in method row | `settings-sign-in-method` | No — `Box` |
| Version row | `settings-version` | No — `Box` |

### Required Test Cases

Create `__tests__/settings.test.tsx` with these specific tests:

1. Guest view renders "Not signed in" text and both CTA rows (`settings-create-account-button`, `settings-sign-in-button`)
2. Guest view hides Sign Out and Delete Account rows
3. Authenticated view shows email address and sign-in method
4. Sign-in method shows "Google" when `app_metadata.provider === 'google'`
5. Sign-in method shows "Email" when provider is `'email'` (or absent)
6. Delete Account row navigates to `/account/delete-confirm`
7. Help & Support row calls `Linking.openURL('mailto:support@valuesnap.app')`
8. Version row shows dynamic value from `Constants.expoConfig.version`
9. Non-interactive rows render without `onPress` (no button affordance)

### Testing Pattern Reference

Follow the pattern established in `__tests__/settings-signout.test.tsx`:

```tsx
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '2.0.0' } },
}));
```

**Session mock must include `user` for sign-in method detection.** The existing signout test uses `session: { access_token: 'token' }` — that is insufficient for 4.8 tests. Use this shape instead:

```tsx
function authenticatedAuth(overrides = {}) {
  return {
    session: {
      access_token: 'token',
      user: {
        id: 'user-123',
        email: 'user@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: '2026-03-27T00:00:00.000Z',
      },
    },
    user: {
      id: 'user-123',
      email: 'user@example.com',
      createdAt: '2026-03-27T00:00:00.000Z',
      tier: 'FREE' as const,
      preferences: {},
    },
    isGuest: false,
    isLoading: false,
    signOut: jest.fn(),
    ...overrides,
  };
}
```

For the Google OAuth test case, override with:
```tsx
authenticatedAuth({
  session: {
    access_token: 'token',
    user: { ...base, app_metadata: { provider: 'google' } },
  },
})
```

NativeWind mock hoisting hazard: if `@/contexts/AuthContext` import triggers NativeWind CSS interop, use the externalized mock pattern established in Story 4.7 (`test-utils/mock-organisms.tsx` approach). For settings, the existing signout test already works inline — follow its pattern first and only externalize if Jest complains about `_ReactNativeCSSInterop`.

### What NOT to Do

- Do NOT add new rows to the Preferences section (Theme/Notifications/Currency) — those are stubs for future epics
- Do NOT change the structure of the About section beyond adding Help & Support
- Do NOT modify `AuthContext.tsx` or `types/user.ts`
- Do NOT modify `__tests__/settings-signout.test.tsx`
- Do NOT add new routes — `/account/delete-confirm` navigation link only; the screen is Story 4.9

### References

- Epic 4 plan → Story 4.8 section [Source: docs/sprint-artifacts/epic-4-plan.md#Story-4.8]
- Existing settings screen [Source: apps/mobile/app/(tabs)/settings.tsx]
- AuthContext `session` and `isGuest` [Source: apps/mobile/contexts/AuthContext.tsx]
- User type (no provider field — read from `session.user.app_metadata`) [Source: apps/mobile/types/user.ts]
- Signout test patterns [Source: apps/mobile/__tests__/settings-signout.test.tsx]
- NativeWind mock hoisting fix (externalized mocks) [Source: apps/mobile/test-utils/mock-organisms.tsx]
- Story 4.5 code review F2 finding — non-interactive `accessibilityRole="button"` [Source: dev notes in Story 4.5 artifact]
- Swiss design rules (no rounding, no shadows, divider lines, 44px targets) [Source: docs/SWISS-MINIMALIST.md]

---

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Full mobile Jest regression run on 2026-03-31

### Completion Notes List

- Refactored `SettingsRow` to render non-interactive rows as `Box` and interactive rows as `SwissPressable`, removing button affordance from static settings rows.
- Added guest account CTA rows, authenticated sign-in method display, delete account navigation, help/support action, and dynamic app version rendering.
- Added dedicated `settings.test.tsx` coverage for guest CTAs, sign-in method variants, help action, delete account navigation, dynamic version, and non-interactive row behavior.
- TypeScript validation passed with `npx tsc --noEmit`.
- Full mobile regression passed: 16/16 suites, 103/103 tests. Pre-existing `StyledText-test.js` warnings remain but the suite passes.

### File List

- apps/mobile/app/(tabs)/settings.tsx
- apps/mobile/__tests__/settings.test.tsx
