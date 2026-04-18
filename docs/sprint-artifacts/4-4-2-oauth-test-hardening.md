# Story 4.4.2: OAuth Test Hardening

**Status:** done

<!-- Micro-story created from Story 4.4 post-review findings (F2 + F3).
     Story 4.4 code review (party-mode consensus) deferred these two test gaps as Story 4.4.2. -->

## Story

As a **developer**,
I want the Google OAuth handler covered for cancel/dismiss and network error paths,
so that regressions in user-facing error handling are caught automatically.

## Background

Story 4.4 shipped the Google OAuth integration (register + sign-in) with 6 tests per screen (12 total). The post-review party-mode identified two missing test paths deferred to this story:

- **F2 (MEDIUM):** No test for cancel/dismiss path — user backs out of the Google browser without completing auth
- **F3 (MEDIUM):** No test for network error — `signInWithOAuth` throws a network-level error

Both paths are already handled in the production code (`register.tsx` and `sign-in.tsx`). This story adds 4 tests (2 per screen) to cover them without changing any production code.

## Scope

| What | File | Change |
|------|------|--------|
| Add cancel/dismiss test | `__tests__/auth-google-oauth-register.test.tsx` | +1 test |
| Add network error test | `__tests__/auth-google-oauth-register.test.tsx` | +1 test |
| Add cancel/dismiss test | `__tests__/auth-google-oauth-sign-in.test.tsx` | +1 test |
| Add network error test | `__tests__/auth-google-oauth-sign-in.test.tsx` | +1 test |

**No production code changes.** No new files. No new dependencies.

## Acceptance Criteria

### AC1: Cancel/Dismiss Path — Register Screen

**Given** the register screen renders and the user taps "Continue with Google"  
**When** `WebBrowser.openAuthSessionAsync` returns `{ type: 'cancel' }` or `{ type: 'dismiss' }`  
**Then:**
- `router.replace` is **not** called (user stays on screen)
- `exchangeCodeForSession` is **not** called
- No error message is displayed (cancel is intentional, not an error)
- `isOAuthLoading` returns to false (button resets)

---

### AC2: Network Error Path — Register Screen

**Given** the register screen renders and the user taps "Continue with Google"  
**When** `supabase.auth.signInWithOAuth` throws `new Error('Failed to fetch')`  
**Then:**
- The error message "Connection error. Please check your internet and try again." is displayed
- `router.replace` is **not** called
- `openAuthSessionAsync` is **not** called

---

### AC3: Cancel/Dismiss Path — Sign-In Screen

Identical to AC1 but applied to `SignInScreen`.

---

### AC4: Network Error Path — Sign-In Screen

Identical to AC2 but applied to `SignInScreen`.

---

### AC5: Full Test Suite Remains Green

**Given** the 4 new tests are added  
**When** the full test suite runs (`npx jest --no-coverage`)  
**Then** all tests pass — baseline 81 + 4 new = **85 tests minimum**

---

## Tasks

- [ ] **Task 1:** Add cancel/dismiss test to `auth-google-oauth-register.test.tsx` (AC1)
- [ ] **Task 2:** Add network error test to `auth-google-oauth-register.test.tsx` (AC2)
- [ ] **Task 3:** Add cancel/dismiss test to `auth-google-oauth-sign-in.test.tsx` (AC3)
- [ ] **Task 4:** Add network error test to `auth-google-oauth-sign-in.test.tsx` (AC4)
- [ ] **Task 5:** Run full test suite — confirm 85 tests pass (AC5)

## Dev Notes

### Files to Modify (Tests Only)

```
apps/mobile/__tests__/auth-google-oauth-register.test.tsx  ← add 2 tests
apps/mobile/__tests__/auth-google-oauth-sign-in.test.tsx   ← add 2 tests
```

### Files NOT to Modify

```
apps/mobile/app/auth/register.tsx     ← production code is correct, do NOT touch
apps/mobile/app/auth/sign-in.tsx      ← production code is correct, do NOT touch
```

### Production Code Behaviour (Verified)

The existing `googleSignIn` handler in both screens already handles these paths correctly:

**Cancel path** (result.type === 'cancel' or 'dismiss'):
```typescript
// In the try block, after openAuthSessionAsync:
if (result.type === 'success') {
  // ... code extraction and navigation
}
// If type is 'cancel': falls through to `finally { setIsOAuthLoading(false) }`
// No setOauthError call → no error message shown
// router.replace is not called
```

**Network error path** (signInWithOAuth throws):
```typescript
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
```

### Existing Test Structure (Reference)

Both test files follow the same pattern. Do NOT rename or restructure existing tests — add to the describe block.

**Current `describe('RegisterScreen — Google OAuth')` tests (6):**
1. renders the Google OAuth button and separator
2. calls signInWithOAuth and opens the auth browser when button is tapped
3. navigates to /(tabs) when the OAuth browser returns success
4. shows error message when signInWithOAuth returns error
5. shows not-available message when data.url is null
6. bypasses OAuth and shows Alert in mock mode

**Add after test 6 (cancel/dismiss test):**
```typescript
it('does not navigate or show error when the user cancels or dismisses the browser', async () => {
  for (const resultType of ['cancel', 'dismiss'] as const) {
    jest.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: resultType });

    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<RegisterScreen />);  // or <SignInScreen /> for sign-in file
    });

    const googleButton = renderer!.root.findByProps({
      testID: 'google-oauth-button',
    });

    await act(async () => {
      googleButton.props.onPress();
    });

    expect(router.replace).not.toHaveBeenCalled();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();

    const errorNodes = renderer!.root.findAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        (node.props.children.includes('Google sign-in') ||
          node.props.children.includes('Connection error') ||
          node.props.children.includes('not available')),
    );
    expect(errorNodes.length).toBe(0);
  }
});
```

**Add after the cancel test (network error test):**
```typescript
it('shows connection error message when signInWithOAuth throws a network error', async () => {
  mockSignInWithOAuth.mockRejectedValue(new Error('Failed to fetch'));

  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<RegisterScreen />);  // or <SignInScreen /> for sign-in file
  });

  const googleButton = renderer!.root.findByProps({
    testID: 'google-oauth-button',
  });

  await act(async () => {
    googleButton.props.onPress();
  });

  expect(router.replace).not.toHaveBeenCalled();
  expect(mockOpenAuthSession).not.toHaveBeenCalled();

  const errorNodes = renderer!.root.findAll(
    (node) =>
      typeof node.props?.children === 'string' &&
      node.props.children.includes('Connection error'),
  );
  expect(errorNodes.length).toBeGreaterThanOrEqual(1);
});
```

### Mock Setup (Already Present — No Changes Needed)

Both test files already have all required mocks in their hoisted `jest.mock` blocks:
- `mockSignInWithOAuth` — for `supabase.auth.signInWithOAuth`
- `mockExchangeCodeForSession` — for `supabase.auth.exchangeCodeForSession`
- `mockOpenAuthSession` — for `WebBrowser.openAuthSessionAsync`

`jest.clearAllMocks()` in `beforeEach` resets all mocks between tests.

### Test Baseline

- Before: 81 tests, 12 suites (all green)
- After: 85 tests, 12 suites (4 new tests added, same 12 suites)

### Story Points

0.5 — minimal scope, test-only changes, all implementation patterns already established.

### Project Structure Notes

- Test files live in `apps/mobile/__tests__/` (flat, co-located at project root level)
- Test naming convention: `auth-google-oauth-{screen}.test.tsx`
- No new files needed — tests added directly to existing files

### References

- [Story 4.4](docs/sprint-artifacts/4-4-implement-google-oauth-sign-in.md) — parent story with full OAuth implementation
- [Code review findings F2, F3](docs/sprint-artifacts/4-4-implement-google-oauth-sign-in.md#completion-notes) — origin of this story
- [Source: apps/mobile/app/auth/register.tsx] — production handler (verified behaviour)
- [Source: apps/mobile/app/auth/sign-in.tsx] — production handler (verified behaviour)
- [Source: apps/mobile/__tests__/auth-google-oauth-register.test.tsx] — existing register tests
- [Source: apps/mobile/__tests__/auth-google-oauth-sign-in.test.tsx] — existing sign-in tests

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude Sonnet 4.6)

### Debug Log References

_none_

### Completion Notes List

- Added 2 tests to `auth-google-oauth-register.test.tsx`: cancel/dismiss loop (AC1) + network error (AC2)
- Added 2 tests to `auth-google-oauth-sign-in.test.tsx`: cancel/dismiss loop (AC3) + network error (AC4)
- All 4 new tests pass; full suite: 85/85, 12 suites
- No production code modified
- Party-mode identified 3 additional untested branches (F4/F5/F6) deferred to Story 4.4.3

### File List

- `apps/mobile/__tests__/auth-google-oauth-register.test.tsx` — +2 tests (cancel/dismiss, network error)
- `apps/mobile/__tests__/auth-google-oauth-sign-in.test.tsx` — +2 tests (cancel/dismiss, network error)
