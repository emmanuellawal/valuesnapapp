# Story 3.5: Implement Offline Viewing

**Status:** done

---

## Story

**As a** user,
**I want** to view my cached valuations when offline,
**So that** I can reference my data without an internet connection.

---

## Business Context

### Why This Story Matters

Stories 3.3 and 3.4 wired the History tab and detail screen to AsyncStorage. Technically the data already loads from local storage — but the app has no awareness of network state. Without this story, the app silently works offline for history (good), but also silently allows the user to initiate a camera valuation that will fail at the API call stage (bad UX). Story 3.5 makes the app network-aware: it surfaces a clear "Offline mode" indicator on the History tab and proactively disables the Camera flow with a friendly message rather than letting users reach a confusing API error.

**Current State:**
- ✅ `apps/mobile/lib/localHistory.ts` — `getLocalHistory()` reads from AsyncStorage, already works offline (graceful empty return on errors)
- ✅ `apps/mobile/app/(tabs)/history.tsx` — History tab renders real local data; `useFocusEffect` re-fetches on tab focus
- ✅ `apps/mobile/app/(tabs)/index.tsx` — Camera tab; submits to `appraise()` API (will fail when offline)
- ✅ `apps/mobile/lib/hooks/` — Hooks directory with `useProgressStages`, `useDeviceCapabilities`; new hook goes here
- ✅ `apps/mobile/lib/hooks/index.ts` — Re-exports all hooks; must include new `useOnlineStatus`
- ❌ No network-state hook exists in the codebase
- ❌ No offline indicator shown to the user anywhere in the app
- ❌ Camera tab does not guard against offline state — user will see an API error/timeout instead of a clear message

**What This Story Delivers:**
- `useOnlineStatus` hook: cross-platform network detection using `navigator.onLine` + `online`/`offline` events
- History tab: non-blocking offline banner ("Offline mode — showing cached valuations") when `!isOnline`
- Camera tab: disabled state overlay when `!isOnline` — replaces capture controls with a friendly offline message and a link to History
- No crashes, no blank screens, no silent API failures when network is absent

### Value Delivery

- **Completes Epic 3 (History & Persistence):** This is the final story — the Epic goal is "save, view, and manage valuations across sessions, even offline"
- **NFR-R3 compliance:** "Cached valuations viewable offline" (originally NFR-R3: Offline capability)
- **FR34 compliance:** "User can view cached valuations when offline (if previously loaded)"
- **Trust building:** A clear offline state prevents user confusion and failed API attempts

### Epic Context

This is Story 5 of 5 in Epic 3 (History & Persistence). It completes the epic.

```
3.1 DB Schema
   └─► 3.2 Save Valuation Flow
          └─► 3.3 History List View
                 └─► 3.4 Valuation Details
                        └─► 3.5 Offline Viewing ◄── you are here (EPIC CLOSER)
```

---

## Acceptance Criteria

### AC1: Offline Status Detection Works Cross-Platform

**Given** the app is running on any platform (web, iOS, Android)  
**When** the device has no network connectivity  
**Then** a `useOnlineStatus` hook correctly reports `isOnline: false`  
**And** when connectivity is restored, the hook updates to `isOnline: true`  
**And** on native platforms where `navigator.onLine` is unavailable, the hook defaults to `true` (always online — conservative fallback, network errors still handled by the API layer)

---

### AC2: Offline Banner on History Tab

**Given** the user has navigated to the History tab  
**When** the device is offline  
**Then** a non-blocking "Offline mode" indicator is displayed on the History screen  
**And** the indicator text reads: "Offline — showing cached valuations"  
**And** the indicator is positioned below the stats header and above the "All items" section  
**And** existing cached valuations continue to display normally below the indicator  
**And** when the device comes back online, the indicator disappears without a page refresh

---

### AC3: Camera Tab Disabled When Offline

**Given** the user navigates to the Camera tab  
**When** the device is offline  
**Then** the camera capture controls and file upload are replaced with an offline state message  
**And** the message reads: "You're offline" (heading) + "Connect to the internet to value items" (body)  
**And** a "View History" button is shown that navigates to the History tab  
**And** the camera/upload components are NOT mounted when offline (to avoid requesting permissions for no reason)  
**And** when connectivity is restored, the Camera tab shows the normal capture UI

---

### AC4: No Crashes or Errors in Offline State

**Given** the app is launched while offline  
**When** the user navigates between tabs  
**Then** no uncaught errors, blank screens, or loading spinners that never resolve occur  
**And** AsyncStorage reads in the History tab complete normally (they are network-independent)  
**And** the app does not attempt to call the valuation API (network-aware gating at AC3 prevents this)

---

### AC5: Unit Test Covers Online Status Hook Logic

**Given** a `getInitialOnlineStatus(): boolean` pure helper is extracted from the hook  
**When** the unit test suite runs  
**Then** the tests cover:
  - Returns `true` when `navigator.onLine` is `true`
  - Returns `false` when `navigator.onLine` is `false`
  - Returns `true` (safe default) when `navigator` is undefined (native non-web environment)  
**And** `npx jest` exits with all tests passing (including pre-existing tests)

---

## Tasks / Subtasks

- [x] Create `useOnlineStatus` hook (AC1, AC5)
  - [x] Create `apps/mobile/lib/hooks/useOnlineStatus.ts`
  - [x] Extract `getInitialOnlineStatus(): boolean` as an exported pure helper:
    ```typescript
    export function getInitialOnlineStatus(): boolean {
      if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
        return true; // Safe default for native non-web platforms
      }
      return navigator.onLine;
    }
    ```
  - [x] Implement the hook using `useState(getInitialOnlineStatus())` + `useEffect` to add/remove `online`/`offline` event listeners on `window`:
    ```typescript
    export function useOnlineStatus(): boolean {
      const [isOnline, setIsOnline] = useState(getInitialOnlineStatus);
      useEffect(() => {
        if (typeof window === 'undefined') return; // native guard
        const setOnline = () => setIsOnline(true);
        const setOffline = () => setIsOnline(false);
        window.addEventListener('online', setOnline);
        window.addEventListener('offline', setOffline);
        return () => {
          window.removeEventListener('online', setOnline);
          window.removeEventListener('offline', setOffline);
        };
      }, []);
      return isOnline;
    }
    ```
  - [x] Export from `apps/mobile/lib/hooks/index.ts`
  - [x] Write unit test `apps/mobile/__tests__/useOnlineStatus.test.ts` covering the pure `getInitialOnlineStatus` function (3 cases: online, offline, navigator undefined)

- [x] Add offline banner to History tab (AC2)
  - [x] Import `useOnlineStatus` in `apps/mobile/app/(tabs)/history.tsx`
  - [x] Add `const isOnline = useOnlineStatus();` call in the component body
  - [x] Add the offline banner **between** the hero stats block and the "All items / Recent valuations" header section, conditionally rendered when `!isOnline`:
    ```tsx
    {!isOnline && (
      <Box className="mt-6 px-3 py-2 bg-paper border border-divider">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Offline — showing cached valuations
        </Text>
      </Box>
    )}
    ```
  - [x] The banner must NOT block history display — history renders normally below it

- [x] Add offline state to Camera tab (AC3)
  - [x] Import `useOnlineStatus` in `apps/mobile/app/(tabs)/index.tsx`
  - [x] Add `const isOnline = useOnlineStatus();` call at the top of `CameraScreen`
  - [x] Add an early branch BEFORE the camera/upload JSX renders: if `!isOnline`, render the offline state UI instead:
    ```tsx
    if (!isOnline) {
      return (
        <ScreenContainer>
          <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
            Status
          </Text>
          <Text variant="display" className="text-ink mt-2">
            You're{'\n'}offline
          </Text>
          <Text variant="body" className="text-ink-light mt-4">
            Connect to the internet to value items.
          </Text>
          <Box className="mt-8">
            <SwissPressable
              onPress={() => router.push('/history')}
              accessibilityLabel="View your valuation history"
            >
              <Text variant="body" className="font-semibold">
                View History
              </Text>
            </SwissPressable>
          </Box>
        </ScreenContainer>
      );
    }
    ```
  - [x] The `router` is already imported in `index.tsx` — no new import needed
  - [x] If connectivity drops mid-session, it is acceptable for the offline branch to replace the camera UI on the next render; do not keep camera/upload components mounted while offline

---

## Dev Notes

### Network Detection Strategy

**Why `navigator.onLine` instead of a package:**  
`@react-native-community/netinfo` is NOT installed and the architecture states no new packages should be added unless necessary. `navigator.onLine` is the W3C standard for PWA network detection. Since ValueSnap is a **Mobile-First PWA** (primary runtime: web browser), this is the correct API.

React Native Web (our web renderer) fully supports `navigator.onLine` and the `window.addEventListener('online'/'offline')` events. These work in:
- Chrome/Edge on PWA desktop
- Safari on iOS PWA
- Firefox on web

For native iOS/Android (non-web Expo builds), `navigator` exists in Hermes but `navigator.onLine` behaviour varies. The `typeof navigator === 'undefined'` guard plus the `typeof window === 'undefined'` event-listener guard handles this safely — native builds will always return `true`, and if a user is offline on native and tries to appraise, the existing API error handling in `index.tsx` (`catch (err)` → `setError`) will handle it gracefully.

**Do NOT install `@react-native-community/netinfo`.** It would require native rebuild and adds Expo SDK configuration overhead not warranted for MVP.

### Swiss Minimalist Offline UI Pattern

Following the Swiss Minimalist design language (see `docs/SWISS-MINIMALIST.md`):
- **No icons** — use typography only (caption label "Status" + display text "You're offline")
- **No toast or modal** — inline state only
- **Negative space is intentional** — the offline banner in History is a quiet, small caption-style strip, not an alert
- **Camera tab offline state** mirrors the empty state pattern from `history.tsx` (heading + body text + CTA button)
- The offline banner uses `bg-paper border-divider` — same as all divider treatments in the app (see `components/primitives/box.tsx`)

### Primary Files to Change

| File | Change | Status |
|------|--------|--------|
| `apps/mobile/lib/hooks/useOnlineStatus.ts` | NEW hook file | New |
| `apps/mobile/lib/hooks/index.ts` | Add `useOnlineStatus` export | Modify |
| `apps/mobile/app/(tabs)/history.tsx` | Add offline banner | Modify |
| `apps/mobile/app/(tabs)/index.tsx` | Add offline-aware gate | Modify |

**New test file:**
- `apps/mobile/__tests__/useOnlineStatus.test.ts`

**No backend changes. No new npm packages. No new route files.**

### Preservation Constraints

- **`index.tsx` camera flow must remain intact** — the `!isOnline` branch is an early return before any existing JSX, so the entire existing camera/upload/appraisal flow is untouched when online
- **`history.tsx` history display must remain intact** — the banner is purely additive; no existing JSX is removed or conditionally hidden
- **`useProgressStages` and `useDeviceCapabilities`** hooks must not be modified
- **All 27 existing tests must continue to pass** — `useOnlineStatus` tests are additive

### Existing Hook Pattern Reference

Follow the exact pattern of `useProgressStages.ts` for hook file structure:
- Default export if only one export; named export preferred for testability
- Comment block describing the hook purpose
- File in `apps/mobile/lib/hooks/`
- Exported from `apps/mobile/lib/hooks/index.ts`

Example from `index.ts`:
```typescript
export { useProgressStages } from './useProgressStages';
export { useDeviceCapabilities } from './useDeviceCapabilities';
// Add:
export { useOnlineStatus, getInitialOnlineStatus } from './useOnlineStatus';
```

### Offline Banner Position in `history.tsx`

The current render structure of `history.tsx`:
```
<ScreenContainer>
  <Text variant="caption">Your collection</Text>          ← hero stats
  <Text variant="display">${totalValue}</Text>
  <Text variant="body">{itemCount} items valued</Text>

  ← INSERT OFFLINE BANNER HERE (mt-6 spacing) →

  <Box className="mt-12">                                  ← "All items" section
    <Stack gap={1} className="mb-6">
      <Text variant="caption">All items</Text>
      <Text variant="h2">Recent valuations</Text>
    </Stack>
    {isLoading ? <HistoryGridSkeleton /> : itemCount === 0 ? <EmptyState /> : <HistoryGrid />}
  </Box>
</ScreenContainer>
```

The banner with `className="mt-6"` sits between the hero stats and the `mt-12` "All items" section.

### `getInitialOnlineStatus` Unit Test Pattern

```typescript
// apps/mobile/__tests__/useOnlineStatus.test.ts
import { getInitialOnlineStatus } from '@/lib/hooks/useOnlineStatus';

describe('getInitialOnlineStatus', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
    expect(getInitialOnlineStatus()).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    });
    expect(getInitialOnlineStatus()).toBe(false);
  });

  it('returns true (safe default) when navigator is undefined', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(getInitialOnlineStatus()).toBe(true);
  });
});
```

This tests ONLY the pure function (not the hook itself), keeping tests fast and free of React test renderer overhead.

### Testing Command

```bash
# Run all unit tests (verify no regressions)
cd apps/mobile && npx jest --testPathPattern='__tests__'

# TypeScript check
cd apps/mobile && npx tsc --noEmit
```

### References

- FR34: "User can view cached valuations when offline (if previously loaded)" [Source: docs/prd.md#FR34]
- NFR-R3: "Offline capability — Cached valuations viewable offline" [Source: docs/prd.md#NFR-R3]
- Architecture: "Offline: Cached valuations viewable, request queuing for network resilience" [Source: docs/architecture.md]
- UX: "Offline: Cached appraisals viewable without internet" [Source: docs/ux-design-specification.md#Platform-Capabilities]
- `useProgressStages` pattern: [apps/mobile/lib/hooks/useProgressStages.ts](apps/mobile/lib/hooks/useProgressStages.ts)
- `useDeviceCapabilities` export pattern: [apps/mobile/lib/hooks/index.ts](apps/mobile/lib/hooks/index.ts)
- `localHistory.ts` (already offline-resilient): [apps/mobile/lib/localHistory.ts](apps/mobile/lib/localHistory.ts)
- Story 3.3 (History tab source): [docs/sprint-artifacts/3-3-build-history-list-view.md](docs/sprint-artifacts/3-3-build-history-list-view.md)
- Story 3.4 (Detail screen source): [docs/sprint-artifacts/3-4-display-valuation-details.md](docs/sprint-artifacts/3-4-display-valuation-details.md)

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (dev-story workflow — 2026-03-22)

### Debug Log References

N/A — no unexpected failures.

### Completion Notes List

- TDD cycle: RED (`useOnlineStatus.test.ts` with 3 failing tests) → GREEN (hook + UI changes) → verified.
- `getInitialOnlineStatus` extracted as a pure function to enable zero-dependency unit tests (no React renderer needed).
- The `!isOnline` early return in `index.tsx` is placed after ALL hook calls to satisfy React Rules of Hooks. Specifically after `useProgressStages` — per Amelia's review note.
- Offline gate in `index.tsx` uses `router.push('/history')` (not `/(tabs)/history`) matching existing routing conventions in this repo.
- `useOnlineStatus` exported as both a named export and a barrel export from `lib/hooks/index.ts`.
- 30/30 tests passing (27 pre-existing + 3 new `getInitialOnlineStatus` tests). 0 TypeScript errors.
- Closes Epic 3: all 5 stories now complete.

### File List

| File | Change |
|------|--------|
| `apps/mobile/lib/hooks/useOnlineStatus.ts` | New: `getInitialOnlineStatus` + `useOnlineStatus` hook |
| `apps/mobile/lib/hooks/index.ts` | Added `useOnlineStatus` + `getInitialOnlineStatus` export |
| `apps/mobile/app/(tabs)/history.tsx` | Added `useOnlineStatus` import + offline banner between stats and items section |
| `apps/mobile/app/(tabs)/index.tsx` | Added `useOnlineStatus` import + offline gate (early return after all hooks) |
| `apps/mobile/__tests__/useOnlineStatus.test.ts` | New: 3 unit tests for `getInitialOnlineStatus` |

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-22 | 0.1 | Story created (SM workflow) | claude-sonnet-4-6 |
| 2026-03-22 | 1.0 | Implementation complete (dev-story workflow) | claude-sonnet-4-6 |
