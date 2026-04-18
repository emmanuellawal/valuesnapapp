# Story 4.10: Execute Account Deletion

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 3  
**FR:** FR42  
**NFRs:** NFR-S7 (GDPR — user data erasure), NFR-P2 (≤ 5 s response time), NFR-A1 (accessibility)

---

## Story

**As an** authenticated user who has confirmed deletion on the confirmation screen,  
**I want** my account and all my data to be permanently deleted when I press "Delete My Account",  
**So that** I can exercise my GDPR right to erasure and know my data is completely removed.

---

## Background

### What Already Exists

| Already built | Detail |
|---|---|
| Confirmation screen | `app/account/delete-confirm.tsx` — has "Delete My Account" button with `onPress={() => {}}` no-op placeholder (Story 4.9) |
| `useAuth()` hook | `contexts/AuthContext.tsx` — provides `{ session, user, isGuest, isLoading, signOut }` |
| `supabase` client | `lib/supabase.ts` — anon key, AsyncStorage persistence; exposes `supabase.auth.getSession()` |
| Backend `get_supabase()` | `backend/cache.py` — service_role Supabase client singleton; not yet imported in `main.py` (only `get_cache_stats` is) |
| `ValuationRepository` | `backend/services/valuations.py` — `delete_by_id()` covers single records; bulk-delete by user_id is new |
| `DELETE /api/account` (stub) | Not yet exists — this story creates it |
| Settings test mock pattern | `__tests__/settings-signout.test.tsx` — pattern for mocking `useAuth` and asserting `signOut` |
| Backend integration test pattern | `backend/tests/test_appraise_persistence.py` — pattern for `TestClient` + mocking Supabase |

### What This Story Delivers

1. **Backend endpoint** `DELETE /api/account` in `backend/main.py`:
   - Validates the `Authorization: Bearer <token>` JWT header
   - Retrieves the authenticated user via `supabase.auth.get_user(token)`
   - Deletes the user's valuations from the `valuations` table
   - Deletes the user from Supabase Auth via `supabase.auth.admin.delete_user(user_id)`
   - Returns `{ "success": true }` on success
   - Returns 401 for missing or invalid token; 500 on deletion failure

2. **Frontend changes** to `app/account/delete-confirm.tsx`:
   - Replace the no-op `onPress` with a real handler
   - Add `isDeleting` and `deleteError` state
   - On press: get JWT from `supabase.auth.getSession()`, call the backend, handle success/failure
   - Loading state: button text changes to `"Deleting…"`, button stays disabled
   - Success path: call `signOut()` then `router.replace('/(tabs)')`
   - Failure path: show error text below button, re-enable button (no navigation)

3. **Test updates**:
   - Add `useAuth` mock to `__tests__/delete-confirm.test.tsx` (required because the screen now calls `useAuth()` — without this the existing 7 tests fail)
   - Add new `describe('execution')` block in the same file covering the 5 execution scenarios
   - Create `backend/tests/test_delete_account.py` with 5 backend scenarios

**No new frontend dependencies. No new backend dependencies.**  
No changes to AuthContext, settings, or any other file beyond the scope table below.

---

## Acceptance Criteria

### AC1: DELETE /api/account Endpoint Exists

**Given** the FastAPI backend is running  
**When** `DELETE /api/account` is called with a valid `Authorization: Bearer <jwt>` header  
**Then** the endpoint:
- Deletes all valuations where `user_id` equals the authenticated user's ID
- Deletes the user from Supabase Auth via the admin API
- Returns HTTP 200 with body `{ "success": true }`

---

### AC2: Authentication Required

**Given** `DELETE /api/account` is called  
**When** the `Authorization` header is missing, malformed (not `Bearer <token>`), or contains an invalid/expired token  
**Then** the endpoint returns HTTP 401 with a JSON error body  
**And** no data is deleted

---

### AC3: Deletion Order — Valuations Before Auth User

**Given** a valid deletion request is processed  
**When** both steps succeed  
**Then** valuations are deleted first and the auth user second

**And** if the valuations delete raises an exception, the auth user is NOT deleted and the endpoint returns 500  
**And** if the auth user delete raises an exception after valuations are already deleted, the endpoint returns 500 (partial failure is logged; the account password is invalidated by Supabase, making the account inaccessible even if the auth record persists briefly)

---

### AC4: Frontend Loading State

**Given** the confirmation screen is visible and the input contains exactly `DELETE`  
**When** the user presses "Delete My Account"  
**Then** the button text changes to `"Deleting…"` and the button becomes disabled (via `isDeleting` state)  
**And** the button remains in this state until the backend responds

---

### AC5: Frontend Success Path

**Given** the backend `DELETE /api/account` returns 200  
**When** the response is received  
**Then:**
- `signOut()` (from `useAuth()`) is called — this clears the Supabase session and AuthContext state
- `router.replace('/(tabs)')` is called — navigating back to the Camera tab in guest mode
- No error message is shown

---

### AC6: Frontend Failure Path

**Given** the backend `DELETE /api/account` returns a non-200 status or the network request throws  
**When** the response (or error) is received  
**Then:**
- An inline error message is displayed with `testID="delete-confirm-error"` containing the text `"deletion failed"` (case-insensitive)
- The "Delete My Account" button is re-enabled (i.e., `isDeleting` is set back to `false`)
- `signOut()` is NOT called
- `router.replace()` is NOT called

---

### AC7: Mock Mode Bypass

**Given** `env.useMock === true` (development environment)  
**When** the user presses "Delete My Account"  
**Then:**
- The backend API is NOT called
- `signOut()` is called directly
- `router.replace('/(tabs)')` is called
- This preserves the development workflow where Supabase is not configured

---

### AC8: Full Test Suite Remains Green

**Given** the existing 7 confirmation-screen tests and all pre-existing tests  
**When** `cd apps/mobile && npx jest --no-coverage` runs  
**Then** all pre-existing tests pass with no regressions and the new execution tests pass

---

## Scope

| What | File | Change type |
|------|------|-------------|
| `DELETE /api/account` endpoint | `backend/main.py` | **Modify** — add endpoint after existing `/admin/*` routes |
| Backend endpoint tests | `backend/tests/test_delete_account.py` | **Create** |
| Execute deletion + loading/error state | `app/account/delete-confirm.tsx` | **Modify** — add `useAuth`, `isDeleting`, `deleteError`, replace no-op `onPress` |
| Add `useAuth` mock to existing test file | `__tests__/delete-confirm.test.tsx` | **Modify** — add hoisted mocks so existing 7 tests still pass; add `describe('execution')` block |

---

## Dev Notes

### Backend Endpoint

Add to `backend/main.py` after the existing admin/observability routes:

```python
from fastapi import Request

@app.delete("/api/account")
async def delete_account(request: Request):
    """
    Delete the authenticated user's account and all their valuations.

    Auth: Bearer JWT (Supabase access token).
    Deletion order: valuations first, then auth user.
    NFR-S7: GDPR right to erasure.
    NFR-P2: Must complete within 5 seconds.
    """
    # 1. Extract and validate Bearer token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    # 2. Verify token → get authenticated user
    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # 3. Delete valuations (step 1 — must succeed before auth user is deleted)
    try:
        supabase.table("valuations").delete().eq("user_id", user_id).execute()
        logger.info(f"Deleted valuations for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to delete valuations for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account data")

    # 4. Delete auth user (step 2)
    try:
        supabase.auth.admin.delete_user(user_id)
        logger.info(f"Deleted auth user {user_id}")
    except Exception as e:
        logger.error(f"Failed to delete auth user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")

    return {"success": True}
```

> **Note on imports:** `HTTPException` is already imported in `main.py` (`from fastapi import FastAPI, HTTPException`). Add `Request` to the same import. `get_supabase` is NOT currently imported — `main.py` only imports `get_cache_stats` from `backend.cache`. Add `get_supabase` to that import: `from backend.cache import get_cache_stats, get_supabase`.

### Frontend Screen Changes

The screen needs two new state variables and `useAuth`. Replace the relevant sections of `delete-confirm.tsx`:

```tsx
// Add useAuth import:
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
// (React, useState, KeyboardAvoidingView, Platform, router are already imported)

export default function DeleteConfirmScreen() {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { signOut } = useAuth();
  const isConfirmed = confirmText === CONFIRM_PHRASE;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    // Mock mode bypass — no real backend call needed in development
    if (env.useMock) {
      await signOut();
      router.replace('/(tabs)');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setDeleteError('Session expired. Please sign in again.');
        setIsDeleting(false);
        return;
      }

      const response = await fetch(`${env.apiUrl}/api/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Success: clear session and navigate to Camera (guest mode)
      await signOut();
      router.replace('/(tabs)');
    } catch {
      setDeleteError('Account deletion failed. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    // ... same outer layout ...

    // Update the Delete button:
    <SwissPressable
      onPress={handleDelete}
      disabled={!isConfirmed || isDeleting}
      accessibilityLabel={isDeleting ? 'Deleting account' : 'Permanently delete my account'}
      className="py-4 border-b border-divider"
      testID="delete-confirm-button"
    >
      <Text variant="body" className="text-signal">
        {isDeleting ? 'Deleting…' : 'Delete My Account'}
      </Text>
    </SwissPressable>

    // Add error display below the Delete button (before Cancel):
    {deleteError ? (
      <View accessibilityLiveRegion="polite" testID="delete-confirm-error">
        <Text variant="body-sm" className="text-signal">
          {deleteError}
        </Text>
      </View>
    ) : null}

    // Cancel button — unchanged
  );
}
```

> **Note on `View` import:** `View` from `react-native` is needed for the `accessibilityLiveRegion` wrapper on error text. See the sign-in screen for this same pattern.

### Updating the Existing Test File

The existing `__tests__/delete-confirm.test.tsx` renders `DeleteConfirmScreen` without mocking `useAuth`. Once the screen calls `useAuth()`, all 7 existing tests will throw `"useAuth must be used within <AuthProvider>"` unless the mock is added. The hoisted block at the top of the file needs two new mocks:

```tsx
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false, apiUrl: 'http://localhost:8000' },
}));
```

And a `beforeEach` (or inline setup) to provide nominal `useAuth` return values for the existing UI tests:

```tsx
import { useAuth } from '@/contexts/AuthContext';
const mockUseAuth = useAuth as jest.Mock;
const mockSignOut = jest.fn();

// In the existing describe block's beforeEach:
beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ signOut: mockSignOut });
});
```

> The existing UI tests (render, warning text, disabled state, incorrect input, exact match, cancel, re-disable) do not press the delete button after enabling it, so they are unaffected by the `handleDelete` implementation. No existing assertion needs to change.

> **Important — `renderScreen` scope:** `renderScreen` is currently defined inside `describe('DeleteConfirmScreen', ...)`. The execution `describe` block needs it too, so move it to **module scope** (before both `describe` blocks) at the same time as adding the new mocks.

### New Frontend Test Cases (Execution Block)

Add a second `describe('DeleteConfirmScreen — execution', ...)` block in the same file:

```tsx
import { supabase } from '@/lib/supabase';
const mockGetSession = supabase.auth.getSession as jest.Mock;

describe('DeleteConfirmScreen — execution', () => {
  // Shared setup: render with DELETE typed so button is enabled
  // (renderScreen is at module scope — see note above)
  async function renderReady() {
    mockUseAuth.mockReturnValue({ signOut: mockSignOut });
    const renderer = await renderScreen();
    const input = findByTestId(renderer, 'delete-confirm-input');
    await act(async () => { input.props.onChangeText('DELETE'); });
    return renderer;
  }
  // ... test cases ...
});
```

### Required Backend Test Cases

Create `backend/tests/test_delete_account.py`:

1. **`test_delete_account_success`** — valid token → 200 `{ "success": true }`, `delete_user` called
2. **`test_delete_account_missing_auth_header`** — no `Authorization` header → 401
3. **`test_delete_account_invalid_token`** — `supabase.auth.get_user` raises → 401
4. **`test_delete_account_valuations_delete_fails`** — table delete raises → 500, `delete_user` NOT called
5. **`test_delete_account_auth_delete_fails`** — valuations delete succeeds, `delete_user` raises → 500

All backend tests use `unittest.mock.patch` — no real Supabase connection needed.

### Required Frontend Test Cases (Execution Block)

Add to `__tests__/delete-confirm.test.tsx`:

1. Shows `"Deleting…"` button text and disables button while request is in-flight — **Implementation note:** `await act(async () => onPress())` runs the full handler before returning, making mid-flight state unobservable. Instead: mock `global.fetch` with a never-resolving promise (`new Promise(() => {})`), call `onPress()` *inside a non-awaited* `act()`, then flush synchronous state updates with a second `await act(async () => {})` and assert the loading state before resolving the fetch.
2. On HTTP 200 response: calls `mockSignOut` and `router.replace('/(tabs)')`
3. On HTTP 500 response: shows error text with `testID="delete-confirm-error"` containing `"deletion failed"`, does NOT call `signOut`, does NOT navigate
4. On network error (fetch throws): shows error text, re-enables button
5. Mock mode (`env.useMock = true`): skips fetch, calls `signOut`, calls `router.replace('/(tabs)')`

### What NOT to Do

- Do NOT add a confirmation toast — the navigation back to Camera serves as implicit confirmation
- Do NOT call `AsyncStorage.clear()` explicitly — `signOut()` → `supabase.auth.signOut()` handles session cleanup, and guest mode will initialize fresh local state automatically
- Do NOT add rate limiting or re-authentication requirement at this layer — out of scope for Phase 1
- Do NOT modify `AuthContext.tsx` — `signOut` already does everything needed
- Do NOT add optimistic UI — the button must stay in "Deleting…" state until the response arrives

### Deletion Order Rationale

The deletion order (valuations first, then auth user) is chosen because:

- The `valuations` table has `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` — if the auth user is deleted first, PostgreSQL cascades to `SET NULL` on the valuations, leaving orphaned data rows. This violates GDPR erasure.
- If valuations are deleted first but auth user delete fails, the user still has their account but no data — they can retry deletion. This is recoverable.
- The reverse — auth deleted but data remains as SET NULL orphans — is not recoverable.

### testID Reference

| Element | testID | Exists in | Notes |
|---------|--------|-----------|-------|
| Delete button | `delete-confirm-button` | Story 4.9 | Text/disabled state changes in 4.10 |
| Cancel button | `delete-confirm-cancel-button` | Story 4.9 | Unchanged |
| Confirm input | `delete-confirm-input` | Story 4.9 | Unchanged |
| Error message | `delete-confirm-error` | **Story 4.10** | New — only rendered when `deleteError !== null` |

### References

- Epic 4 plan — Story 4.10 section [Source: docs/sprint-artifacts/epic-4-plan.md]
- Confirmation screen entry point [Source: apps/mobile/app/account/delete-confirm.tsx]
- AuthContext (signOut) [Source: apps/mobile/contexts/AuthContext.tsx]
- Supabase client [Source: apps/mobile/lib/supabase.ts]
- Backend main.py [Source: backend/main.py]
- Backend service_role client [Source: backend/cache.py]
- Valuations table schema [Source: backend/migrations/002_create_valuations_table.sql]
- Sign-in screen (error + loading pattern) [Source: apps/mobile/app/auth/sign-in.tsx]
- Backend persistence tests (mock pattern) [Source: backend/tests/test_appraise_persistence.py]
