# Story 6.6: Handle Network Errors

Status: done

## Story

As a user,
I want clear feedback when the network is unavailable,
so that I know what's happening and can retry.

## Acceptance Criteria

1. When a network request fails (`appraise()` throws `AppraiseError('NETWORK_ERROR', ...)`), the `ErrorState` displays the title **"Connection failed"** — the user sees no technical error codes, stack traces, or HTTP status numbers
2. The existing **"Try again"** retry button in `ErrorState` continues to work (pressing it re-submits the last captured photo from `lastPhotoRef`); no changes to retry behavior in this story — verification only
3. When the device goes offline (`!isOnline`) while a `NETWORK_ERROR` state is active, a `NetworkBanner` molecule is rendered below the `ErrorState` with the text **"Offline — request queued"**
4. When the device is online and `NETWORK_ERROR` is shown, the `NetworkBanner` renders with the text **"Tap Retry to submit your request"** (i.e. the banner always shows during `NETWORK_ERROR`, not just when offline)
5. `NetworkBanner` is exported from `components/molecules/index.ts` and is a standalone, testable component
6. The existing test in `__tests__/camera-offline-appraise-error.story-6-4.test.tsx` that asserts `"Connection problem"` is updated to assert `"Connection failed"` (the title text changed in Task A)
7. New unit tests cover the `NetworkBanner` component in isolation; `npm run test` passes; `npm run lint` passes with zero warnings

## Tasks / Subtasks

- [x] Task A — Update `NETWORK_ERROR` message in `ErrorState` (AC: 1, 6)
  - [x] In `apps/mobile/components/molecules/error-state.tsx`: change `NETWORK_ERROR.title` from `'Connection problem'` to `'Connection failed'`
  - [x] Refine `NETWORK_ERROR.suggestions` to clarify the queued state: first bullet stays `"Check your internet connection"`; second bullet change from `"Try again when you have a stable connection"` to `"Your request is saved — tap Try again to submit"` (makes the queue concept concrete without implying auto-retry)
  - [x] Update `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx`: change the assertion `findByProps({ children: 'Connection problem' })` to `findByProps({ children: 'Connection failed' })`
  - [x] Run `npm run test --testPathPattern="camera-offline"` to confirm the updated test passes

- [x] Task B — Create `NetworkBanner` molecule (AC: 3, 4, 5)
  - [x] Create `apps/mobile/components/molecules/network-banner.tsx` with the interface described in Dev Notes
  - [x] Export `NetworkBanner` and `NetworkBannerProps` from `apps/mobile/components/molecules/index.ts`
  - [x] Component renders `null` when `errorType` is not `'NETWORK_ERROR'` (it is a no-op outside the error path)
  - [x] When `errorType === 'NETWORK_ERROR'`:
    - If `isOnline === false`: render a box with `<Text variant="body-sm">Offline — request queued</Text>`
    - If `isOnline === true`: render a box with `<Text variant="body-sm">Tap Retry to submit your request</Text>`
  - [x] Use `bg-ink` / `text-paper` for the banner box — matches Swiss palette; no colour for colour's sake; signal-red is reserved for CTAs only
  - [x] No rounded corners, no shadows (enforced globally via `tailwind.config.js`)

- [x] Task C — Wire `NetworkBanner` into the camera error display (AC: 3, 4)
  - [x] In `apps/mobile/app/(tabs)/camera.tsx`, import `NetworkBanner` from `@/components/molecules`
  - [x] **Fix the offline gate guard** — change `if (!isOnline)` to `if (!isOnline && !error)` in `camera.tsx`; this prevents the offline gate early-return from replacing the `ErrorState + NetworkBanner` when the user's Wi-Fi drops *after* a `NETWORK_ERROR` is set; without this fix ACs 3 and 4 are unreachable in that scenario (see control-flow analysis in Dev Notes)
  - [x] Inside the `error ?` branch of the camera JSX (currently just `<ErrorState … />`), wrap both components in a `<Stack gap={4}>`:
    ```tsx
    <Stack gap={4}>
      <ErrorState
        errorType={error.type}
        onRetry={handleRetry}
        fallbackLink={{ text: 'Search eBay manually', href: buildEbaySearchUrl() }}
      />
      <NetworkBanner errorType={error.type} isOnline={isOnline} />
    </Stack>
    ```

- [x] Task D — Unit tests for `NetworkBanner` (AC: 7)
  - [x] Create `apps/mobile/__tests__/network-banner.test.tsx`
  - [x] Test 1: renders `null` when `errorType` is not `'NETWORK_ERROR'` (e.g. `'GENERIC_ERROR'`, online)
  - [x] Test 2: renders `"Offline — request queued"` when `errorType === 'NETWORK_ERROR'` and `isOnline === false`
  - [x] Test 3: renders `"Tap Retry to submit your request"` when `errorType === 'NETWORK_ERROR'` and `isOnline === true`
  - [x] Test 4: when `isOnline` prop changes from `true` to `false` while `errorType` remains `'NETWORK_ERROR'`, the banner text updates from `"Tap Retry to submit your request"` to `"Offline — request queued"` (verifies the edge case from Dev Notes — banner reacts to connectivity change without unmount)
  - [x] Use React test renderer or `@testing-library/react-native` consistent with the project's existing test pattern (project uses `react-test-renderer` + `act` — see `camera-offline-appraise-error.story-6-4.test.tsx`)

- [x] Task E — Lint + test gates (AC: 7)
  - [x] `npm run lint` exits 0 with `--max-warnings 0` from `apps/mobile/`
  - [x] `npm run test` — all suites pass (including the updated `camera-offline` suite and new `network-banner` suite)

## Dev Notes

### What already exists — do NOT reinvent

- **`useOnlineStatus`** (`apps/mobile/lib/hooks/useOnlineStatus.ts`) — already used in `camera.tsx`; `isOnline` is already in scope; **do not re-implement**
- **`ErrorState`** (`apps/mobile/components/molecules/error-state.tsx`) — already handles `NETWORK_ERROR` type; Task A only changes the `title` string; **do not restructure the component**
- **`fetchWithRetry`** (`apps/mobile/lib/api.ts`) — already retries 2× with exponential backoff before throwing `AppraiseError('NETWORK_ERROR', ...)`; this story does NOT change retry logic (Story 6-7 owns retry on network restoration)
- **`lastPhotoRef`** in `camera.tsx` — already stores the last submitted photo for manual retry; the "queued" concept in this story maps directly to "the photo is in `lastPhotoRef` and has not been re-submitted successfully"
- **`handleRetry`** in `camera.tsx` — already re-calls `handlePhotoCapture(lastPhotoRef.current)`; no change needed
- **`NETWORK_ERROR` error type** — already in the `ErrorType` union; no type changes needed

### `NetworkBanner` exact structure

```tsx
// apps/mobile/components/molecules/network-banner.tsx
import React from 'react';
import { Box, Text } from '@/components/primitives';
import type { ErrorType } from './error-state';

export interface NetworkBannerProps {
  /** The current error type — banner is a no-op when this is not 'NETWORK_ERROR'. */
  errorType: ErrorType | null | undefined;
  /** Current network status from useOnlineStatus(). */
  isOnline: boolean;
}

export function NetworkBanner({ errorType, isOnline }: NetworkBannerProps) {
  if (errorType !== 'NETWORK_ERROR') return null;

  const message = isOnline
    ? 'Tap Retry to submit your request'
    : 'Offline — request queued';

  return (
    <Box className="bg-ink px-4 py-2">
      <Text variant="body-sm" className="text-paper">
        {message}
      </Text>
    </Box>
  );
}
```

**Swiss compliance:**
- `bg-ink` (black) + `text-paper` (white) — monochromatic, no signal-red (banner is informational, not a CTA)
- No `borderRadius`, no `shadow` — both set to `none` in `tailwind.config.js`
- `px-4 py-2` — compact; uses only as much space as the message needs

### Camera screen control-flow analysis

Current control flow in `camera.tsx`:

```
render()
  ↓
if (!isOnline && (!error || error.type !== 'NETWORK_ERROR'))
  → offline gate (early return)   ← triggers when offline AND no active NETWORK_ERROR
  ↓
return <ScreenContainer>
  …
  { error ?    ← NETWORK_ERROR lands here after a failed online request
      <ErrorState + NetworkBanner>
  : isProcessing ?
      <ProgressIndicator + Skeleton>
  : Platform.OS === 'web' ?
      <FileUpload>
  : <CameraCapture> }
```

**Edge case: user submits while online → request fails → user's Wi-Fi drops before they tap Retry**

1. `handlePhotoCapture` called → `setIsProcessing(true)` → `setError(null)`
2. `fetchWithRetry` retries 3× total → all fail → throws → `setError({ type: 'NETWORK_ERROR' })`
3. On re-render: `isOnline` may now be `false` (Wi-Fi dropped during backoff)
4. **Gate condition**: `!isOnline && (!error || error.type !== 'NETWORK_ERROR')` → `false` because `error.type === 'NETWORK_ERROR'` → offline gate does NOT fire
5. Execution falls through to `return <ScreenContainer>` → `error ?` branch renders `ErrorState + NetworkBanner`
6. `NetworkBanner` receives `isOnline=false` → renders `"Offline — request queued"`

**Why the gate is NOT simply `!error`:** Using `!error` to suppress the offline gate would suppress it for ALL error types (AI_IDENTIFICATION_FAILED, RATE_LIMIT, GENERIC_ERROR, etc.). Only `NETWORK_ERROR` needs the exception — for all other error types the offline gate wins and replaces the stale error state with the offline screen, which is the correct UX. The narrower condition `(!error || error.type !== 'NETWORK_ERROR')` preserves this invariant.

### Why this story does NOT implement auto-retry on network restoration

Auto-retry (watching `isOnline` flip `false → true` and calling `handleRetry()`) is explicitly scoped to **Story 6-7** whose AC says "automatic retry happens on network restoration". Story 6-6 only establishes the feedback layer and the "queued" state concept (the photo in `lastPhotoRef` is the queue). Story 6-7 picks up from there.

**Honesty note on "queued" language:** The banner says "Offline — request queued" but there is no background queue, worker, or async retry mechanism in this story. "Queued" means the last photo is held in `lastPhotoRef` and the user can tap Retry to re-submit it. This is intentional and accurate — the request is queued *for the user's action*, not for automatic delivery. Do not implement a background queue here; that would pre-empt Story 6-7's scope.

**Why the user has already waited before seeing "Connection failed":** `fetchWithRetry` exhausts 3 attempts with exponential backoff (up to ~94 seconds worst-case: 30s + 1s + 30s + 3s + 30s) before throwing `AppraiseError('NETWORK_ERROR')`. By the time the banner appears, the request is *not in-flight* — it has already been retried and abandoned. The banner is confirming a final failure, not a first failure.

### Message text rationale

| State | Message | Rationale |
|-------|---------|-----------|
| Error title | "Connection failed" | Matches AC example text; more direct than "Connection problem" |
| Suggestion 1 | "Check your internet connection" | Actionable, non-technical |
| Suggestion 2 | "Your request is saved — tap Try again to submit" | Makes "queued" concept concrete without implying auto-retry |
| Banner (offline) | "Offline — request queued" | Short; confirms state; no false promise of auto-retry |
| Banner (online + error) | "Tap Retry to submit your request" | Directive; focuses user on the recovery action |

### Testing patterns to follow

From `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx`:
- Use `react-test-renderer` + `act(async () => {...})`
- Mock `expo-router`, `@/contexts/AuthContext`, `@/lib/hooks`, `@/lib/api`, `@/lib/localHistory`, `@/types/transformers`, `@/components/organisms`
- `useOnlineStatus` is mocked via `jest.mock('@/lib/hooks', ...)` — for `NetworkBanner` tests, mock `errorType` and `isOnline` as props directly (no hooks to mock)

### Files to touch

| File | Change |
|------|--------|
| `apps/mobile/components/molecules/error-state.tsx` | Update `NETWORK_ERROR.title` and suggestion 2 (Task A) |
| `apps/mobile/components/molecules/network-banner.tsx` | **New file** (Task B) |
| `apps/mobile/components/molecules/index.ts` | Export `NetworkBanner` + `NetworkBannerProps` (Task B) |
| `apps/mobile/app/(tabs)/camera.tsx` | Import + wire `NetworkBanner`; change offline gate guard to `!isOnline && !error` (Task C) |
| `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx` | Update assertion text (Task A) |
| `apps/mobile/__tests__/network-banner.test.tsx` | **New file** — unit tests (Task D) |

### Project structure alignment

- New molecule `network-banner.tsx` follows same pattern as `guest-banner.tsx` and `confidence-warning.tsx` in `components/molecules/`
- Barrel export pattern: add to `components/molecules/index.ts` (see existing exports)
- Test file name pattern: `__tests__/<feature-name>.test.tsx` — new file: `network-banner.test.tsx`

### References

- [Source: apps/mobile/components/molecules/error-state.tsx] — `NETWORK_ERROR` config at line 43
- [Source: apps/mobile/app/(tabs)/camera.tsx] — offline gate at `if (!isOnline)` block; `error ?` JSX branch; `handleRetry` at line ~82
- [Source: apps/mobile/lib/hooks/useOnlineStatus.ts] — `useOnlineStatus()` hook
- [Source: apps/mobile/lib/api.ts] — `fetchWithRetry` + `AppraiseError('NETWORK_ERROR', ...)`
- [Source: apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx] — existing test to update + mock patterns to follow
- [Source: docs/epics.md#Story 6.6: Handle Network Errors] — AC source

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex (GitHub Copilot)

### Debug Log References

- `npm test -- --runInBand __tests__/camera-offline-appraise-error.story-6-4.test.tsx __tests__/network-banner.test.tsx`
- `npm run lint`
- `npm test -- --runInBand`

### Completion Notes List

- Updated `NETWORK_ERROR` UX copy to "Connection failed" with queued-state suggestion text.
- Added `NetworkBanner` molecule with online/offline message variants for `NETWORK_ERROR` context.
- Fixed camera offline gate to `if (!isOnline && !error)` so active network error state is preserved while offline.
- Wired `NetworkBanner` into camera error rendering under `ErrorState`.
- Added new unit suite `network-banner.test.tsx` with null, online, offline, and connectivity-change coverage.
- Updated existing network error copy assertion in `camera-offline-appraise-error.story-6-4.test.tsx`.
- Verified quality gates: lint passes and full mobile test suite passes (39/39 suites, 348/348 tests).

### File List

- `apps/mobile/components/molecules/error-state.tsx`
- `apps/mobile/components/molecules/network-banner.tsx`
- `apps/mobile/components/molecules/index.ts`
- `apps/mobile/app/(tabs)/camera.tsx`
- `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx`
- `apps/mobile/__tests__/network-banner.test.tsx`
