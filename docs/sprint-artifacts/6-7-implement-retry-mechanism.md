# Story 6.7: Implement Retry Mechanism

Status: done

## Story

As a user,
I want to retry failed requests easily,
so that temporary issues don't stop me.

## Acceptance Criteria

1. **[VERIFIED — no new code]** When `appraise()` throws `AppraiseError('NETWORK_ERROR', ...)` and the user taps **"Try again"** in `ErrorState`, the request is resubmitted using `lastPhotoRef.current` — already wired in `handleRetry()` from Story 6.6
2. **[VERIFIED — no new code]** During any retry (manual or automatic), the `ProgressIndicator` + `ValuationCardSkeleton` are displayed while the request is in-flight — `handlePhotoCapture` already calls `setIsProcessing(true)` before the API call
3. **[VERIFIED — no new code]** After retry, either the `ValuationCard` (success path) or the correct `ErrorState` (failure path) is displayed — already implemented via `setLastResult` / `setError`
4. **[NEW WORK]** When `isOnline` transitions from `false → true` while `error.type === 'NETWORK_ERROR'` AND `lastPhotoRef.current` is non-null AND `!isProcessing`, the request is automatically re-submitted without any user interaction — this is the single change this story adds

## Tasks / Subtasks

- [x] Task A — Verify ACs 1–3 pass without code changes (AC: 1, 2, 3)
  - [x] Run `npm test -- --runInBand __tests__/camera-offline-appraise-error.story-6-4.test.tsx` — all existing tests must pass unchanged
  - [x] No camera.tsx or ErrorState changes are expected for these ACs; if tests fail, investigate regression, do not delete tests

- [x] Task B — Add auto-retry `useEffect` to `camera.tsx` (AC: 4)
  - [x] After `const isOnline = useOnlineStatus();`, add: `const prevIsOnlineRef = useRef(isOnline);`
  - [x] After the `handleRetry` function definition, add the ref update + `useEffect` (see Dev Notes for exact code):
    ```tsx
    const handleRetryRef = useRef<() => Promise<void>>(handleRetry);
    handleRetryRef.current = handleRetry;

    useEffect(() => {
      const wasOffline = !prevIsOnlineRef.current;
      prevIsOnlineRef.current = isOnline;
      if (isOnline && wasOffline && error?.type === 'NETWORK_ERROR' && !isProcessing && lastPhotoRef.current) {
        void handleRetryRef.current();
      }
    }, [isOnline, error?.type, isProcessing]);
    ```
  - [x] Verify `npm run lint` still passes with `--max-warnings 0` after adding the `useEffect`

- [x] Task C — Add auto-retry regression test (AC: 4)
  - [x] Add one new test case to `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx` (see Dev Notes for exact test body)
  - [x] Test name: `'auto-retries when isOnline transitions from false to true while NETWORK_ERROR is active'`
  - [x] The test asserts `mockAppraise` is called **twice** — once for the initial failed capture and once for the auto-retry after connectivity restores

- [x] Task D — Lint + full test suite (AC: 1–4)
  - [x] `npm run lint` exits 0 with `--max-warnings 0` from `apps/mobile/`
  - [x] `npm run test -- --runInBand` — all suites pass

## Dev Notes

### What already exists — do NOT reinvent

| Symbol | File | What it does |
|--------|------|--------------|
| `handleRetry()` | `apps/mobile/app/(tabs)/camera.tsx` ~line 95 | Calls `setError(null)` + `await handlePhotoCapture(lastPhotoRef.current)` — manual retry is complete |
| `handlePhotoCapture()` | same | Calls `setIsProcessing(true)` before API → `setIsProcessing(false)` in both success/error paths |
| `lastPhotoRef` | same | `useRef<CapturedPhoto | null>` set in `handlePhotoCapture` before every API call |
| `isOnline` | same | `useOnlineStatus()` result, already imported |
| `NetworkBanner` | `apps/mobile/components/molecules/network-banner.tsx` | Renders banner for `NETWORK_ERROR`; `"Offline — request queued"` / `"Tap Retry to submit your request"` — **do NOT modify** |
| `useOnlineStatus` | `apps/mobile/lib/hooks/useOnlineStatus.ts` | Uses `window` online/offline events — works on web only; on native, always returns `true` |

**The only new code in this story is the `useEffect` in Task B. Everything else is verification.**

### Auto-retry `useEffect` — exact implementation

Place the following **after** the `handleRetry` function definition and **before** `handlePhotoCapture` in `camera.tsx`:

```tsx
// Stable ref to latest handleRetry to avoid stale closure in the auto-retry effect.
// Updated synchronously every render so the effect always calls the current version.
const handleRetryRef = useRef<() => Promise<void>>(handleRetry);
handleRetryRef.current = handleRetry;

// Auto-retry on network restoration (Story 6.7).
// Guards:
//   isOnline && wasOffline  → only on false→true transition (prevents firing on mount or error-type change)
//   error?.type === 'NETWORK_ERROR' → only when there is a queued photo to retry
//   !isProcessing           → don't double-submit if a retry is already in-flight
//   lastPhotoRef.current    → only when a photo exists to re-submit
useEffect(() => {
  const wasOffline = !prevIsOnlineRef.current;
  prevIsOnlineRef.current = isOnline;

  if (isOnline && wasOffline && error?.type === 'NETWORK_ERROR' && !isProcessing && lastPhotoRef.current) {
    void handleRetryRef.current();
  }
}, [isOnline, error?.type, isProcessing]);
```

**Why `handleRetryRef` and not just `handleRetry` in deps?**
`handleRetry` is `async () => {...}` without `useCallback` — a new function reference every render. Including it in the deps array would make the effect fire on every render (infinite re-runs). `handleRetryRef.current = handleRetry` (a synchronous assignment in the render body) ensures the ref always holds the latest version without triggering the effect.

**Why `prevIsOnlineRef` and not just `isOnline` in deps?**
Without tracking the previous value, the effect would fire every time `isOnline` is `true` **and** `error.type === 'NETWORK_ERROR'` (e.g. on initial mount if user is online and somehow has a stale error — unlikely but possible in edge cases). The `wasOffline` guard ensures the effect only retries on an actual `false → true` transition.

**Loop-safety trace (confirmed):**
- Effect fires on transition → calls `handleRetryRef.current()` → `setError(null)` clears `error` → effect re-runs because `error?.type` changed to `undefined` → `error?.type === 'NETWORK_ERROR'` guard fails → no re-trigger ✓
- If retry also fails with NETWORK_ERROR: `setError({type:'NETWORK_ERROR'})` runs → effect re-runs because `error?.type` changed → `prevIsOnlineRef.current` is now `true`, so `wasOffline = false` → guard fails → no re-trigger ✓
- Manual tap while auto-retry is in-flight: `isProcessing=true` → `!isProcessing` guard fails ✓

### `prevIsOnlineRef` placement

Add immediately after `const isOnline = useOnlineStatus();` (currently ~line 88):
```tsx
const isOnline = useOnlineStatus();
// Track previous value for auto-retry false→true detection
const prevIsOnlineRef = useRef(isOnline);
```

### Native platform note

`useOnlineStatus` uses `window` online/offline events, which only exist in browser environments. On native iOS/Android, the hook returns `true` on mount and never changes (because `supportsOnlineStatusEvents()` is false). This means:
- **Web**: auto-retry fires correctly when connectivity is restored
- **Native**: `isOnline` never transitions to `false`, so auto-retry never fires — users must tap "Try again" manually

This is the same limitation documented in Story 6.4 and is acceptable for this story. A native-aware implementation (using `@react-native-community/netinfo`) is out of scope.

### Idempotency key behaviour during auto-retry

Each call to `handleRetry()` → `handlePhotoCapture()` → `appraise()` generates a **fresh idempotency key** via `createIdempotencyKey()` in `api.ts`. This is correct and intentional. **No changes to `api.ts`.**

**The distinction is critical — "retry" means two different things in this codebase:**

| Level | What it covers | Key behaviour |
|-------|---------------|---------------|
| `fetchWithRetry` internal loop | 3 HTTP attempts within one `appraise()` call | **Same key** reused across all 3 attempts — prevents duplicate DB rows if the server succeeded but the response was dropped mid-flight |
| User-action retry (manual tap or this story's auto-retry) | A new call to `appraise()` triggered by user or the `useEffect` | **Fresh key** — this is a new user-initiated submission per Story 6.13 Task D: *"Ensure a fresh key is generated for a new user submit action"* |

**Why fresh key for user-action retries?**
1. We don't know if the previous `appraise()` call ever reached the server. If it didn't (true network failure), a fresh key is equivalent — the server has no record of the old key.
2. If it did reach the server, reusing the old key would return a cached replay from potentially 94 seconds ago (after the `fetchWithRetry` backoff), with stale eBay market data. A fresh submission gives the user current prices.
3. The 6.13 contract was explicitly designed with "new user action = new key" semantics. Changing this would break the existing tests in `apps/mobile/__tests__/api.test.ts` that verify this behaviour.

**Do not** add an optional `idempotencyKey` parameter to `appraise()` — that would contradict Story 6.13's completed contract.

### Auto-retry test — exact code

Append to the `describe` block in `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx` (after the existing 3 tests):

```tsx
it('auto-retries when isOnline transitions from false to true while NETWORK_ERROR is active', async () => {
  // Both attempts fail: keeps test simple and avoids mocking transform output
  mockAppraise.mockRejectedValue(
    new AppraiseError('NETWORK_ERROR', 'Unable to reach server'),
  );
  mockUseOnlineStatus.mockReturnValue(true);

  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<CameraScreen />);
  });

  const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
  await act(async () => {
    await triggerCapture.props.onPress();
  });

  // First attempt failed — NETWORK_ERROR is set
  expect(mockAppraise).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();

  // Simulate Wi-Fi dropping
  mockUseOnlineStatus.mockReturnValue(false);
  await act(async () => {
    renderer!.update(<CameraScreen />);
  });

  // Simulate Wi-Fi restoring — triggers auto-retry
  mockUseOnlineStatus.mockReturnValue(true);
  await act(async () => {
    renderer!.update(<CameraScreen />);
  });

  // Auto-retry fired: appraise was called a second time
  expect(mockAppraise).toHaveBeenCalledTimes(2);
  // After auto-retry also fails, ErrorState is still shown
  expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();
});
```

### Files to touch

| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/camera.tsx` | Add `prevIsOnlineRef`, `handleRetryRef`, and the auto-retry `useEffect` (Task B) |
| `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx` | Add 1 new test case (Task C) |

**No other files change.** `api.ts`, `network-banner.tsx`, `error-state.tsx`, `useOnlineStatus.ts` are all untouched.

### UX flow after auto-retry fires

1. User is offline + NETWORK_ERROR → banner shows "Offline — request queued"
2. Wi-Fi restores → `isOnline` flips true → `useEffect` fires
3. `handleRetry()` → `setError(null)` immediately → banner and ErrorState disappear
4. `setIsProcessing(true)` → ProgressIndicator + Skeleton appear (AC 2 satisfied)
5. `appraise()` resolves → ValuationCard shown (AC 3, success path) OR rejects → ErrorState shown (AC 3, failure path)

The `NetworkBanner` message "Tap Retry to submit your request" is shown on-screen for at most one frame (~16ms) between the `isOnline=true` render and the `setError(null)` update from the effect. This is imperceptible and requires no copy change.

### Testing patterns

- Use `react-test-renderer` + `act(async () => {...})` — consistent with all existing camera tests
- `mockUseOnlineStatus.mockReturnValue(false/true)` + `renderer!.update(<CameraScreen />)` to simulate connectivity changes
- `mockAppraise.mockRejectedValue(...)` for failure; `toHaveBeenCalledTimes(N)` to count API calls
- See `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx` for full mock setup

### References

- [Source: apps/mobile/app/(tabs)/camera.tsx] — `handleRetry()` ~line 95; `handlePhotoCapture()` ~line 100; `lastPhotoRef` ~line 77; `isOnline` ~line 88; `error` state ~line 69
- [Source: apps/mobile/lib/hooks/useOnlineStatus.ts] — `useOnlineStatus()` hook (web events only)
- [Source: apps/mobile/lib/api.ts] — `appraise()` with fresh `createIdempotencyKey()` per call; `fetchWithRetry` with 3-attempt retry loop; already complete
- [Source: apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx] — existing test file to extend; mock patterns to follow
- [Source: docs/sprint-artifacts/6-6-handle-network-errors.md] — Story 6.6 Dev Notes explain `lastPhotoRef`, `NetworkBanner`, offline gate logic and camera control-flow
- [Source: docs/sprint-artifacts/6-13-appraise-idempotency-key.md] — Idempotency contract; confirms auto-retry correctly generates a fresh key per `appraise()` call
- [Source: docs/epics.md#Story 6.7] — AC source (FR54)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex (GitHub Copilot)

### Debug Log References

- `npm test -- --runInBand __tests__/camera-offline-appraise-error.story-6-4.test.tsx` (pre-change Task A verification)
- `npm test -- --runInBand __tests__/camera-offline-appraise-error.story-6-4.test.tsx __tests__/network-banner.test.tsx __tests__/error-state.test.tsx`
- `npm run lint`
- `npm test -- --runInBand`

### Completion Notes List

- Added auto-retry-on-network-restore behavior in `camera.tsx` using a guarded `useEffect` that fires only on `isOnline` false->true transitions while `NETWORK_ERROR` is active.
- Added `prevIsOnlineRef` transition tracking and `handleRetryRef` stale-closure protection to keep the effect safe and loop-free.
- Added regression test `auto-retries when isOnline transitions from false to true while NETWORK_ERROR is active`.
- Verified baseline AC 1-3 behavior before code changes (camera error suite passed unchanged).
- Validation gates passed after implementation: focused suites 13/13 tests, lint clean, full mobile suite 39/39 suites and 351/351 tests.

### File List

- `apps/mobile/app/(tabs)/camera.tsx`
- `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx`
- `docs/sprint-artifacts/6-7-implement-retry-mechanism.md`

## Senior Developer Review (AI)

**Reviewer:** GPT-5.4  
**Date:** 2026-05-31  
**Outcome:** Changes Requested (Resolved)

### Files Reviewed

- `apps/mobile/app/(tabs)/camera.tsx`
- `apps/mobile/__tests__/camera-offline-appraise-error.story-6-4.test.tsx`
- `docs/sprint-artifacts/6-7-implement-retry-mechanism.md`

### Validation Run

- `npm test -- --runInBand __tests__/camera-offline-appraise-error.story-6-4.test.tsx` — pass

### Findings

1. **MEDIUM — Auto-retry can double-submit when connectivity restores and the user manually taps Retry before the effect flushes.**  
  The new auto-retry logic in `camera.tsx` is guarded with `error?.type` and `isProcessing`, but those values are captured from the render that first sees `isOnline === true`. Because this is a passive `useEffect`, there is a short post-paint window where the user can still press the existing Retry CTA. If that manual retry starts before the queued effect runs, the effect still sees the stale `NETWORK_ERROR` / `!isProcessing` snapshot and invokes `handleRetryRef.current()` a second time, producing two `appraise()` submissions for the same recovered connection event. The handler ref avoids a stale function identity, but it does not protect against stale state for the effect guards. This path needs either current-state refs for the guard values or another one-shot suppression mechanism before the story can be approved.

### Follow-up Resolution

The race was remediated in `camera.tsx` by:
- adding current-state guard refs (`errorTypeRef`, `isProcessingRef`) used by the auto-retry effect,
- adding one-shot restore-edge suppression when manual retry fires first,
- adding a same-tick dispatch lock to prevent duplicate manual+auto submit on the same connectivity restoration event.

Regression coverage was added in `camera-offline-appraise-error.story-6-4.test.tsx`:
- `does not double-submit when online restores and user taps Retry immediately`

Validation after fix:
- `npm test -- --runInBand __tests__/camera-offline-appraise-error.story-6-4.test.tsx` — pass (5/5)
- `npm run lint -- --max-warnings 0` — pass

### Final Review Pass

**Reviewer:** GPT-5.3-Codex  
**Date:** 2026-05-31  
**Outcome:** Approved

No blocking issues remain in Story 6.7 scope.
