# Story 4.9: Implement Account Deletion Confirmation

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 2  
**FR:** FR42  
**NFRs:** NFR-S7 (GDPR — user data erasure), NFR-A1 (accessibility)

---

## Story

**As an** authenticated user,  
**I want** a dedicated confirmation screen before my account is deleted,  
**So that** I can understand the consequences and prevent accidental deletion by requiring deliberate confirmation.

---

## Background

### What Already Exists

| Already built | Detail |
|---|---|
| Settings "Delete Account" row | `settings-delete-account-button` in `app/(tabs)/settings.tsx` — already navigates to `/account/delete-confirm` via `router.push('/account/delete-confirm' as never)` |
| `app/_layout.tsx` root Stack | Registers `(tabs)`, `modal`, and `auth` routes — needs `account` added |
| `app/auth/_layout.tsx` | Pattern to follow for `app/account/_layout.tsx` |
| `Box`, `Stack`, `Text`, `SwissPressable`, `ScreenContainer` | Core primitives in `@/components/primitives` |
| `FormInput` | `@/components/atoms` — Swiss Minimalist text input with label and optional error display |
| Test pattern | `react-test-renderer` with `findByTestId` helper, hoisted `jest.mock` — see `__tests__/auth-register.test.tsx` |

### What This Story Delivers

1. **Route registration** — Add `account` Stack to `app/_layout.tsx` so `/account/delete-confirm` resolves without the `as never` type cast
2. **Stack layout** — `app/account/_layout.tsx` (same pattern as `app/auth/_layout.tsx`)
3. **Confirmation screen** — `app/account/delete-confirm.tsx`:
   - Consequence warning explaining permanent deletion
   - `FormInput` requiring the user to type `DELETE` exactly (case-sensitive)
   - Cancel button — navigates back with no side effects
   - "Delete My Account" destructive button — disabled until `confirmText === 'DELETE'`; `onPress` is a no-op placeholder that Story 4.10 will implement
4. **Type fix in settings** — Remove `as never` cast from `router.push('/account/delete-confirm')` now that the route exists
5. **Tests** — `__tests__/delete-confirm.test.tsx` covering all ACs

**No backend changes. No new dependencies.**  
The actual deletion call is Story 4.10 — this story is UI only.

---

## Acceptance Criteria

### AC1: Confirmation Screen Renders

**Given** authenticated user taps "Delete Account" in Settings  
**When** the `/account/delete-confirm` screen renders  
**Then:**
- A heading "Delete Account" is visible
- A warning paragraph is visible with `testID="delete-confirm-warning"` containing the words "permanently delete" and "cannot be undone"
- A `FormInput` is visible with `testID="delete-confirm-input"`
- A Cancel button is visible with `testID="delete-confirm-cancel-button"`
- A "Delete My Account" button is visible with `testID="delete-confirm-button"`

---

### AC2: Confirm Button Disabled by Default

**Given** the confirmation screen has rendered  
**When** the `FormInput` is empty (no text entered)  
**Then** the "Delete My Account" button is disabled (its `disabled` or `accessibilityState.disabled` prop is `true`)

---

### AC3: Confirm Button Enabled Only on Exact Match

**Given** the confirmation screen is visible  
**When** the user types exactly `DELETE` (uppercase, no spaces)  
**Then** the "Delete My Account" button becomes enabled

**And** the input uses `autoCapitalize="characters"` as a keyboard hint, while the confirmation check remains a strict case-sensitive comparison against `DELETE`

**And** when the input contains anything other than exactly `DELETE` — including `delete`, `DELETE ` (trailing space), or `DEL` — the button remains disabled

---

### AC4: Cancel Navigates Back

**Given** the confirmation screen is visible  
**When** the user presses Cancel  
**Then** `router.back()` is called and the screen dismisses with no other side effects

---

### AC5: Destructive Styling

**Given** the screen renders  
**Then:**
- "Delete My Account" button text uses the Signal (red) color class `text-signal`
- Cancel button text uses the standard ink color class `text-ink`

---

### AC6: Accessibility

**Given** the screen renders  
**Then:**
- All interactive elements have `accessibilityLabel` props
- The `FormInput` announces its label to screen readers via the existing `accessibilityLabel` prop on the underlying `TextInput`
- The disabled confirm button has `accessibilityState={{ disabled: true }}` (handled automatically by `SwissPressable` from its `disabled` prop)

---

### AC7: Type Safety — No `as never` Cast

**Given** `app/account/delete-confirm.tsx` exists and `account` is registered in `app/_layout.tsx`  
**When** `cd apps/mobile && npx tsc --noEmit` runs  
**Then** zero TypeScript errors are reported and `settings.tsx` no longer requires the `as never` cast on the route push

---

### AC8: Full Test Suite Remains Green

**Given** new tests are added for the confirmation screen  
**When** `cd apps/mobile && npx jest --no-coverage` runs  
**Then** all pre-existing tests pass and the new confirmation-screen tests pass with no regressions

---

## Scope

| What | File | Change type |
|------|------|-------------|
| Root Stack route registration | `app/_layout.tsx` | **Modify** — add `<Stack.Screen name="account" options={{ headerShown: false }} />` |
| Account stack layout | `app/account/_layout.tsx` | **Create** |
| Deletion confirmation screen | `app/account/delete-confirm.tsx` | **Create** |
| Remove `as never` cast | `app/(tabs)/settings.tsx` | **Modify** — minor type fix |
| Tests | `__tests__/delete-confirm.test.tsx` | **Create** |

---

## Dev Notes

### Route Registration Pattern

Follow the exact pattern from the `auth` route in `app/_layout.tsx`:

```tsx
// app/_layout.tsx — existing Stack (add the account line):
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
  <Stack.Screen name="auth" options={{ headerShown: false }} />
  <Stack.Screen name="account" options={{ headerShown: false }} />  {/* ADD */}
</Stack>
```

### Account Stack Layout

```tsx
// app/account/_layout.tsx
import { Stack } from 'expo-router';

export default function AccountLayout() {
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

### Confirmation Screen

The screen uses local `useState` — no react-hook-form needed since there is only one field and no form submission in this story:

```tsx
// app/account/delete-confirm.tsx
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { FormInput } from '@/components/atoms';

const CONFIRM_PHRASE = 'DELETE';

export default function DeleteConfirmScreen() {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === CONFIRM_PHRASE;

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
          Delete Account
        </Text>

        {/* Warning */}
        <Text
          variant="body"
          className="text-ink mt-12"
          testID="delete-confirm-warning"
        >
          This will permanently delete all your valuations and account data. This action cannot
          be undone.
        </Text>

        {/* Confirm input */}
        <Stack gap={6} className="mt-8">
          <FormInput
            label='Type "DELETE" to confirm'
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            testID="delete-confirm-input"
            accessibilityLabel='Type DELETE to confirm account deletion'
          />
          {/* Actions */}
          {/* Delete button — Story 4.10 implements the onPress action */}
          <SwissPressable
            onPress={() => {
              // Story 4.10 will call the deletion endpoint here
            }}
            disabled={!isConfirmed}
            accessibilityLabel="Permanently delete my account"
            className="py-4 border-b border-divider"
            testID="delete-confirm-button"
          >
            <Text variant="body" className="text-signal">
              Delete My Account
            </Text>
          </SwissPressable>

          <SwissPressable
            onPress={() => router.back()}
            accessibilityLabel="Cancel account deletion and go back"
            className="py-4 border-b border-divider"
            testID="delete-confirm-cancel-button"
          >
            <Text variant="body" className="text-ink">
              Cancel
            </Text>
          </SwissPressable>
        </Stack>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
```

> **Note on `autoCapitalize="characters"`:** Setting this makes the keyboard auto-capitalize, which reduces the chance of the user accidentally typing lowercase — but the comparison is still strict (`=== 'DELETE'`). The user must type exactly `DELETE`.

### Settings Type Fix

After the route is registered, remove the `as never` cast in `app/(tabs)/settings.tsx`:

```tsx
// BEFORE
onPress={() => router.push('/account/delete-confirm' as never)}

// AFTER
onPress={() => router.push('/account/delete-confirm')}
```

No other changes to `settings.tsx`.

### `SwissPressable` and the `disabled` Prop

`SwissPressable` extends `PressableProps`. The `disabled` prop is available and passes through to the underlying `Pressable`. It suppresses touch events when `true`. `SwissPressable` **automatically** sets `accessibilityState={{ disabled }}` from the `disabled` prop — no need to pass `accessibilityState` separately.

### testID Reference

| Element | testID | Interactive? |
|---------|--------|--------------|
| Warning text container | `delete-confirm-warning` | No |
| Confirm text input | `delete-confirm-input` | Yes — TextInput |
| Delete My Account button | `delete-confirm-button` | Yes — SwissPressable |
| Cancel button | `delete-confirm-cancel-button` | Yes — SwissPressable |

### Required Test Cases

Create `__tests__/delete-confirm.test.tsx` with these tests:

1. Screen renders without crashing
2. Warning text is visible (`testID="delete-confirm-warning"` contains "permanently delete" and "cannot be undone")
3. Confirm button is **disabled** when input is empty
4. Confirm button is **disabled** for incorrect input (`"delete"`, `"DELETE "`, `"DEL"`) — strict comparison only; input is not trimmed
5. Confirm button is **enabled** when input is exactly `"DELETE"`
6. Cancel button calls `router.back()`
7. Typing `DELETE` then clearing input disables button again

### Testing Pattern

Follow `__tests__/auth-register.test.tsx`. Key mock setup:

```tsx
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

import DeleteConfirmScreen from '../app/account/delete-confirm';
import { router } from 'expo-router';

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}
```

For the disabled-state assertions — check `props.disabled` on the button element directly:

```tsx
const deleteButton = findByTestId(renderer, 'delete-confirm-button');
expect(deleteButton.props.disabled).toBe(true);
```

For simulating input changes:

```tsx
const input = findByTestId(renderer, 'delete-confirm-input');
await act(async () => {
  input.props.onChangeText('DELETE');
});
expect(deleteButton.props.disabled).toBe(false);
```

> **Important:** The `findByTestId` helper searches the entire subtree, including children of `FormInput`. Because `FormInput` passes `testID` through to the underlying `TextInput` via `{...props}`, `findByTestId(renderer, 'delete-confirm-input')` will find the `TextInput` node and its `onChangeText` will be available directly.

### What NOT to Do

- Do NOT implement the actual deletion call — that is Story 4.10
- Do NOT add loading state or error handling — Story 4.10 adds those
- Do NOT add a "forgot to log in" guard — authenticated state is enforced at the route level in future hardening; Settings already hides the Delete Account row from guests
- Do NOT change `AuthContext.tsx` or any other existing file beyond the two noted in Scope

### References

- Epic 4 plan → Story 4.9 section [Source: docs/sprint-artifacts/epic-4-plan.md]
- Settings screen (the entry point) [Source: apps/mobile/app/(tabs)/settings.tsx]
- Root layout (route registration) [Source: apps/mobile/app/_layout.tsx]
- Auth stack layout (pattern to follow) [Source: apps/mobile/app/auth/_layout.tsx]
- FormInput component [Source: apps/mobile/components/atoms/form-input.tsx]
- SwissPressable primitives [Source: apps/mobile/components/primitives/swiss-pressable.tsx]
- Test pattern reference [Source: apps/mobile/__tests__/auth-register.test.tsx]
- Story 4.10 (next: execution) [Source: docs/sprint-artifacts/epic-4-plan.md]
