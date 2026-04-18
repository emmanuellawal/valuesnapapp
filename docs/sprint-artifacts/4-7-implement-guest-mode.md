# Story 4.7: Implement Guest Mode

**Status:** done  
**Epic:** 4 — User Authentication  
**Points:** 3  
**FR:** FR39  
**NFRs:** NFR-G1, NFR-G2, NFR-G3, NFR-S8

---

## Story

**As a** user who hasn't created an account,  
**I want** to try the app freely and be nudged toward account creation at the right moment,  
**So that** I experience real value before committing to registration.

---

## Background

### What Already Exists

Stories 4.1–4.6 established a complete auth lifecycle. The following is already implemented and must not be changed:

| Already built | Location |
|---|---|
| `isGuest: boolean` in `useAuth()` — true when `session === null && !isLoading` | `contexts/AuthContext.tsx` |
| `localHistory.ts` — enforces 5-item cap via `MAX_HISTORY_ITEMS = 5` | `lib/localHistory.ts` |
| `saveToLocalHistory()` called after every valuation | `app/(tabs)/index.tsx` |
| `getLocalHistory()` returns capped `Valuation[]` | `lib/localHistory.ts` |
| Settings screen shows "Not signed in" / register link for guests | `app/(tabs)/settings.tsx` |
| History screen reads from localHistory | `app/(tabs)/history.tsx` |
| Auth screens: `app/auth/register.tsx`, `app/auth/sign-in.tsx` | `app/auth/` |
| "List on eBay" in appraisal screen shows `Alert.alert('Coming soon')` | `app/appraisal.tsx` |

### What This Story Delivers

Three discrete changes:

1. **`GuestBanner` component** — shows after the guest's 3rd valuation, prompts account creation
2. **Camera screen wired to show `GuestBanner`** — reads local history count post-save
3. **Listing gate in appraisal screen** — when guest taps "List on eBay", redirect to register instead of showing "Coming soon"

**NFR-G1 (5-item local history cap)** is already enforced by `localHistory.ts`. No code change needed.

**NFR-G2 (guest session until browser cache cleared)** is already satisfied — `AsyncStorage` persists until cleared. No code change needed.

### Guest Count Logic

After `saveToLocalHistory()` completes in the Camera screen, call `getLocalHistory()` to get the current count. Store it in state. Render `GuestBanner` when:

```
isGuest === true AND localHistoryCount >= 3
```

---

## Acceptance Criteria

### AC1: Guest Valuations Work Without Account

**Given** a user opens the app with no Supabase session  
**When** `useAuth()` is consulted  
**Then:**
- `isGuest` is `true`
- `user` is `null`
- The Camera, History, and Settings tabs all render without error
- Valuations proceed normally through the AI/backend flow (no auth gate at valuation time)

---

### AC2: Local History Capped at 5 Items (NFR-G1)

**Given** a guest has completed 5 valuations (already saved in localHistory)  
**When** a 6th valuation completes and `saveToLocalHistory()` is called  
**Then:**
- Local history still contains exactly 5 items
- The 6th item replaces the oldest (FIFO trim, newest first)
- `getLocalHistory()` never returns more than 5 items

> **Note:** This is already enforced by `MAX_HISTORY_ITEMS = 5` in `lib/localHistory.ts`. AC2 is verified by the existing `localHistory.test.ts` — no new code required.

---

### AC3: GuestBanner Renders After 3rd Valuation

**Given** a guest has completed exactly 3 valuations (localHistory count = 3)  
**When** the Camera screen shows the valuation result  
**Then:**
- A `GuestBanner` appears below the result card
- The banner text reads: `"Save unlimited history — create a free account."`
- A primary pressable labeled `"Create account"` navigates to `/auth/register`
- A secondary pressable labeled `"Sign in"` navigates to `/auth/sign-in`
- Both links have `accessibilityRole="button"` and explicit `accessibilityLabel`

---

### AC4: GuestBanner Hidden Before 3rd Valuation

**Given** a guest has completed 0, 1, or 2 valuations  
**When** the Camera screen shows (or does not show) a result  
**Then** the `GuestBanner` is **not rendered** at all (no empty space, no collapsed view)

---

### AC5: GuestBanner Hidden for Authenticated Users

**Given** the user is authenticated (`isGuest === false`)  
**When** any number of valuations have been completed  
**Then** the `GuestBanner` is **never rendered** regardless of history count

---

### AC6: GuestBanner Swiss Design Compliance

**Given** the `GuestBanner` renders  
**Then:**
- Container: `bg-paper border-t border-divider py-4` (flush with screen edge, no rounding, no shadow)
- Banner text: `Text variant="body"` in `text-ink`
- "Create account" label: `font-semibold text-ink` inside a `border border-ink bg-ink` pressable with `text-paper` text
- "Sign in" label: regular weight, `text-ink`, no border fill (secondary action)
- Touch targets ≥ 44px height (`py-3` minimum on each pressable)
- No rounded corners, no shadows, no colored backgrounds other than `bg-paper`

---

### AC7: Listing Gate — Redirect Guest to Register (NFR-G3)

**Given** the user is a guest (`isGuest === true`)  
**When** they tap "List on eBay" on the appraisal screen  
**Then:**
- `router.push('/auth/register')` is called
- The "Coming soon" `Alert.alert` is **not** shown to guests
- The redirect is immediate (no intermediate modal)

**Given** the user is authenticated (`isGuest === false`)  
**When** they tap "List on eBay" on the appraisal screen  
**Then:**
- The existing `Alert.alert('Coming soon', ...)` behaviour is preserved unchanged (listing UI is Epic 5)

---

### AC8: TypeScript Zero Errors

**Given** all new and modified files are saved  
**When** `cd apps/mobile && npx tsc --noEmit` runs  
**Then** zero TypeScript errors are reported

---

### AC9: Full Test Suite Remains Green

**Given** the new and updated guest-mode test files are added  
**When** the full suite runs (`cd apps/mobile && npx jest --no-coverage`)  
**Then** all existing tests pass and the new tests pass  
**And** the test plan covers both component-level banner behavior and screen-level guest-mode behavior

---

## Scope

| What | File | Change type |
|------|------|-------------|
| GuestBanner molecule | `components/molecules/guest-banner.tsx` | **Create** |
| Molecule index | `components/molecules/index.ts` | **Modify** — add export |
| Camera screen | `app/(tabs)/index.tsx` | **Modify** — import auth, count history, render banner |
| Appraisal screen | `app/appraisal.tsx` | **Modify** — import auth, gate listing button |
| GuestBanner tests | `__tests__/guest-banner.test.tsx` | **Create** |
| Camera guest-mode tests | `__tests__/camera-guest-mode.test.tsx` | **Create** |
| Appraisal guest-gate tests | `__tests__/appraisal-guest-gate.test.tsx` | **Create** |

**No backend changes. No new dependencies. No schema changes.**

---

## Tasks

### Task 1: Create `components/molecules/GuestBanner.tsx`

```tsx
import React from 'react';
import { router } from 'expo-router';
import { Box, Stack, Text, SwissPressable } from '@/components/primitives';

interface GuestBannerProps {
  /** Banner only renders when visible is true */
  visible: boolean;
}

export function GuestBanner({ visible }: GuestBannerProps) {
  if (!visible) return null;

  return (
    <Box
      className="bg-paper border-t border-divider py-4"
      testID="guest-banner"
      accessibilityRole="complementary"
      accessibilityLabel="Create a free account to save unlimited history"
    >
      <Text variant="body" className="text-ink mb-3">
        Save unlimited history — create a free account.
      </Text>
      <Stack direction="horizontal" gap={3}>
        <SwissPressable
          accessibilityLabel="Create a free account"
          accessibilityRole="button"
          onPress={() => router.push('/auth/register')}
          className="border border-ink bg-ink px-4 py-3 min-h-[44px] justify-center"
          testID="guest-banner-register"
        >
          <Text variant="body" className="text-paper font-semibold">Create account</Text>
        </SwissPressable>
        <SwissPressable
          accessibilityLabel="Sign in to your account"
          accessibilityRole="button"
          onPress={() => router.push('/auth/sign-in')}
          className="px-4 py-3 min-h-[44px] justify-center"
          testID="guest-banner-signin"
        >
          <Text variant="body" className="text-ink">Sign in</Text>
        </SwissPressable>
      </Stack>
    </Box>
  );
}
```

### Task 2: Export from `components/molecules/index.ts`

Add the following export line at the bottom of the existing exports:

```ts
export { GuestBanner } from './GuestBanner';
```

### Task 3: Modify `app/(tabs)/index.tsx` — Wire GuestBanner

**3a. Add imports** (near the top, with other imports):

```tsx
import { GuestBanner } from '@/components/molecules';
import { useAuth } from '@/contexts/AuthContext';
```

**3b. Add state inside `CameraScreen`** (after existing `useState` declarations):

```tsx
const { isGuest } = useAuth();
const [guestValuationCount, setGuestValuationCount] = useState(0);
```

**3c. Replace the current fire-and-forget history save with an awaited best-effort block**, then load the updated count from storage:

```tsx
try {
  await saveToLocalHistory({
    id: result.valuationId ?? undefined,
    createdAt: new Date().toISOString(),
    status: ValuationStatus.SUCCESS,
    request: { imageBase64: undefined },
    response: result,
    imageUri: photo.uri,
  });

  if (isGuest) {
    const history = await getLocalHistory();
    setGuestValuationCount(history.length);
  }
} catch {
  // Best-effort local persistence should not block the UI.
}
```

This avoids a race where `getLocalHistory()` could read stale data if the save is still pending.

Note: Import `getLocalHistory` — it is **not** currently imported in `app/(tabs)/index.tsx`, so extend the existing `localHistory` import.

**3d. Render `GuestBanner`** — place it after the divider that follows the primary action area (`<Box className="h-px bg-divider mt-8" />`):

```tsx
<GuestBanner visible={isGuest && guestValuationCount >= 3} />
```

Position: immediately after the divider following the main capture/result area, and before the "Recent valuations" section.

### Task 4: Modify `app/appraisal.tsx` — Guest Listing Gate (NFR-G3)

**4a. Add import** (near top with other imports):

```tsx
import { useAuth } from '@/contexts/AuthContext';
```

**4b. Inside `AppraisalReportScreen`**, add auth hook call. The detail view branch uses an inner function scope — place the hook call at the top of the main component (before any `if` branches, to comply with Rules of Hooks):

```tsx
const { isGuest } = useAuth();
```

**4c. Replace `handleEbay` function** inside the detail view branch:

```tsx
function handleEbay() {
  if (isGuest) {
    router.push('/auth/register');
    return;
  }
  Alert.alert('Coming soon', 'eBay listing will be available in a future update.');
}
```

> `isGuest` is captured from the outer closure — this is safe since `handleEbay` is defined inside the detail branch render path, which runs after all hooks at the top of `AppraisalReportScreen`.

### Task 5: Write `__tests__/guest-banner.test.tsx`

Write focused component tests following the existing pattern (`react-test-renderer` + `act(async () => {})`):

```tsx
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { GuestBanner } from '../components/molecules/GuestBanner';
import { router } from 'expo-router';

const mockRouter = router as jest.Mocked<typeof router>;

describe('GuestBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TC1: visible=false renders nothing
  it('renders null when visible is false', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={false} />);
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  // TC2: visible=true renders banner
  it('renders banner when visible is true', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });
    const banner = renderer!.root.findByProps({ testID: 'guest-banner' });
    expect(banner).toBeTruthy();
  });

  // TC3: banner contains expected text
  it('displays account creation prompt text', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });
    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('Save unlimited history');
  });

  // TC4: "Create account" button present
  it('renders Create account button', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });
    const btn = renderer!.root.findByProps({ testID: 'guest-banner-register' });
    expect(btn).toBeTruthy();
  });

  // TC5: "Sign in" button present
  it('renders Sign in button', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });
    const btn = renderer!.root.findByProps({ testID: 'guest-banner-signin' });
    expect(btn).toBeTruthy();
  });

  // TC6: "Create account" navigates to register
  it('navigates to /auth/register on Create account press', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });
    const btn = renderer!.root.findByProps({ testID: 'guest-banner-register' });
    await act(async () => {
      btn.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/register');
  });

  // TC7: "Sign in" navigates to sign-in
  it('navigates to /auth/sign-in on Sign in press', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });
    const btn = renderer!.root.findByProps({ testID: 'guest-banner-signin' });
    await act(async () => {
      btn.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/sign-in');
  });

  // TC8: toggling visible=true then false removes banner
  it('unmounts banner when visible changes to false', async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<GuestBanner visible={true} />);
    });
    expect(renderer!.root.findByProps({ testID: 'guest-banner' })).toBeTruthy();
    await act(async () => {
      renderer!.update(<GuestBanner visible={false} />);
    });
    expect(renderer!.toJSON()).toBeNull();
  });
});
```

### Task 6: Write `__tests__/camera-guest-mode.test.tsx`

Add screen-level tests for `app/(tabs)/index.tsx` that mock `useAuth`, `saveToLocalHistory`, `getLocalHistory`, and the valuation pipeline. Cover these cases:

- Guest with updated history count `3` after a successful valuation sees `testID="guest-banner"`
- Guest with updated history count `2` does **not** see the banner
- Authenticated user does **not** see the banner even when history count is `3` or more
- If `saveToLocalHistory` rejects, the valuation still renders and the banner does not crash the screen

Use the existing screen-test style from `__tests__/settings-signout.test.tsx`: hoisted mocks, typed mock accessors, and assertions via `findByProps` / `findAll`.

### Task 7: Write `__tests__/appraisal-guest-gate.test.tsx`

Add screen-level tests for `app/appraisal.tsx` that mock `useAuth`, `expo-router`, and `Alert.alert`. Cover these cases:

- Guest pressing "List on eBay" calls `router.push('/auth/register')`
- Guest pressing "List on eBay" does **not** call `Alert.alert`
- Authenticated user pressing "List on eBay" preserves the existing `Alert.alert('Coming soon', ...)` behavior

Use a detail-view render path (`params.id`) or a simple params setup that reaches the button without relying on the backend.

### Task 8: TypeScript Verification

```bash
cd apps/mobile && npx tsc --noEmit
```

Zero errors expected.

### Task 9: Run Full Test Suite

```bash
cd apps/mobile && npx jest --no-coverage
```

All existing tests must pass. New GuestBanner tests must all pass.

---

## Technical Notes

### AuthContext `isGuest` is Stable

`isGuest` is `true` exactly when `session === null && !isLoading`. After `isLoading` flips to `false` on mount, this value is stable and reactive. No polling or manual refresh needed.

### History Count vs Banner Visibility

The banner state (`guestValuationCount`) is session-local. It starts at 0 and is updated after each successful valuation save within the current app session. The save must be awaited before reading back `getLocalHistory()`; otherwise, the banner can miss the threshold because of stale storage reads. With the awaited flow:
- If a returning guest (already has 3+ saves) opens the app and takes a new photo, the banner shows after that photo's result (the post-save count read will be ≥ 3).
- If they open the app and go straight to History without taking a photo, the banner on the Camera screen is not shown (count starts at 0 in the session). This is acceptable — the banner is a post-valuation CTA, not a persistent nag.

If the product decides a persistent banner on app launch is needed for returning guests with ≥ 3 history items, that is a follow-on story (not in scope here).

### `getLocalHistory` Import in Camera Screen

`getLocalHistory` is not yet imported in `app/(tabs)/index.tsx`. The file currently imports:

```ts
import { getOrCreateGuestSessionId, saveToLocalHistory } from '@/lib/localHistory';
```

Just add `getLocalHistory` to this import:

```ts
import { getOrCreateGuestSessionId, saveToLocalHistory, getLocalHistory } from '@/lib/localHistory';
```

### Rules of Hooks in `appraisal.tsx`

`AppraisalReportScreen` has multiple early-return branches (`if (params.id)`, `if (params._demo === 'loading')`, etc.). The `useAuth()` call **must go at the very top of the component** before any `if` branches. The `isGuest` value is then available in all branches via closure.

### NFR-G3 Listing Gate Scope

The "List on eBay" button in `appraisal.tsx` currently shows a "Coming soon" alert for all users (listing UI is Epic 5). This story changes the behavior for guests only: redirect to `/auth/register`. Authenticated users continue to see the "Coming soon" alert unchanged. The full listing flow is built in Epic 5.

### Rate Limiting Gap (NFR-S8)

NFR-S8 specifies 10 valuations/hour for guests. Backend rate limiting (not frontend) enforces this. The frontend does not need to count or gate API calls — the backend returns a rate-limit error if exceeded, which the existing `AppraiseError` path handles. No frontend change needed for NFR-S8.

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Persistent banner on app launch for returning guests | Follow-on story if needed — post-valuation CTA is sufficient for MVP |
| Guest → Account data migration | Story 4.11 — separate story |
| Banner on History or Settings tabs | Not in the epics acceptance criteria |
| Limiting backend API calls on the frontend | Backend enforces NFR-S8; not a frontend concern |
| Full listing form | Epic 5 — all 10 listing stories |
| Account deletion | Stories 4.9–4.10 |
| Settings screen full rebuild | Story 4.8 |

---

## Definition of Done

- [x] `components/molecules/guest-banner.tsx` created and exported from `components/molecules/index.ts`
- [x] Camera screen (`app/(tabs)/index.tsx`) imports `useAuth` and `GuestBanner`, tracks `guestValuationCount`, renders banner when `isGuest && count >= 3`
- [x] Appraisal screen (`app/appraisal.tsx`) imports `useAuth` at top of component; `handleEbay` redirects guests to `/auth/register`, authenticated users see "Coming soon" unchanged
- [x] `saveToLocalHistory` / `getLocalHistory` flow in Camera screen is awaited in a best-effort block so guest banner threshold checks are deterministic
- [x] `__tests__/guest-banner.test.tsx` created and passes
- [x] `__tests__/camera-guest-mode.test.tsx` created and passes
- [x] `__tests__/appraisal-guest-gate.test.tsx` created and passes
- [x] `npx tsc --noEmit` reports zero errors
- [x] Full jest suite green (all existing tests still pass)
- [x] No `console.error` or `console.warn` in test output related to new code
- [x] Swiss Minimalist design verified: no rounded corners, no shadows, correct colors (`bg-paper`, `border-divider`, `text-signal` not used — this is not a destructive action)

## Dev Agent Record

### Agent Model Used

GitHub Copilot (GPT-5.4)

### Debug Log References

- `cd apps/mobile && npx tsc --noEmit`
- `cd apps/mobile && npx jest --no-coverage __tests__/guest-banner.test.tsx __tests__/camera-guest-mode.test.tsx __tests__/appraisal-guest-gate.test.tsx`
- `cd apps/mobile && npx jest --no-coverage`

### Completion Notes List

- Added `GuestBanner` as a new molecule and exported it from the molecules index
- Wired guest valuation count updates into the Camera screen using awaited best-effort local history persistence
- Added guest-only redirect behavior to the appraisal detail screen's "List on eBay" action
- Added focused tests for the banner component, camera guest threshold behavior, and appraisal guest gating
- Updated `valuationDetail.test.ts` to isolate the pure helper import after `appraisal.tsx` gained an auth dependency
- TypeScript check passed and full mobile Jest suite passed: 95 tests across 15 suites
- Existing `components/__tests__/StyledText-test.js` still emits an act warning during the suite, but it remains passing and is unrelated to Story 4.7

### File List

- `apps/mobile/components/molecules/guest-banner.tsx` — new guest upgrade CTA molecule
- `apps/mobile/components/molecules/index.ts` — exported `GuestBanner`
- `apps/mobile/app/(tabs)/index.tsx` — guest banner rendering and deterministic local history count updates
- `apps/mobile/app/appraisal.tsx` — guest-only register redirect for "List on eBay"
- `apps/mobile/__tests__/guest-banner.test.tsx` — component coverage for banner rendering and navigation
- `apps/mobile/__tests__/camera-guest-mode.test.tsx` — camera screen guest threshold coverage
- `apps/mobile/__tests__/appraisal-guest-gate.test.tsx` — guest/app user listing gate coverage
- `apps/mobile/__tests__/valuationDetail.test.ts` — isolated helper import from AuthContext dependency
- `apps/mobile/test-utils/mock-organisms.tsx` — shared test helper for camera/upload mocks
