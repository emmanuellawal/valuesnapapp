# Story 1.1: Implement Mobile Camera Capture

**Status:** done

**Depends on:** Story 0.1 (Expo project), Story 0.3 (Primitives), Story 0.9 (Swiss design patterns)

**Epic 1 Goal:** Users can capture photos of items on any device with a seamless experience.

---

## Story

**As a** user on a mobile device,  
**I want** to capture a photo using my device camera,  
**So that** I can quickly photograph items for valuation.

---

## Acceptance Criteria

1. **AC1:** Camera permission is requested when user activates camera
2. **AC2:** Full-bleed viewfinder displays the camera feed after permission granted
3. **AC3:** Single tap on capture button takes a photo
4. **AC4:** Visual feedback confirms capture (brief flash/animation)
5. **AC5:** Captured image is stored temporarily for processing
6. **AC6:** Camera screen maintains Swiss Minimalist design patterns from Story 0.9
7. **AC7:** Sally (UX Designer) approves camera capture UX flow

---

## Context

### Problem Statement

The Camera screen currently displays a placeholder viewfinder (gray box from Story 0.9). Users need actual camera functionality to capture item photos for valuation. This is the core action of the entire app - the starting point of every user journey.

**Current State (Epic 0):**
- Camera tab exists with Swiss Minimalist design
- Asymmetric layout established: `pl-6 pr-16 pt-12 pb-8`
- Typography hierarchy in place: display heading + body description
- Placeholder viewfinder: 4:3 aspect ratio gray box

**Gap:**
- No actual camera activation
- No permission handling
- No photo capture mechanism
- No temporary storage

### User Journey Context

**Primary Flow:**
1. User opens app → Camera tab (default)
2. User taps "Activate Camera" button
3. Browser/OS requests camera permission
4. User grants permission
5. Camera feed appears in viewfinder
6. User positions item in frame
7. User taps capture button
8. Flash animation confirms capture
9. Photo stored temporarily
10. *(Future: Navigate to preview screen)*

**Error Paths:**
- Permission denied → Story 1.3 (fallback to file upload)
- No camera detected → Story 1.2 (desktop file upload)
- Camera initialization fails → Error message with retry

### Technical Requirements

**From Architecture (ARCH-2):**
- Expo Camera for native camera access
- React Native Web compatibility (web fallback in Story 1.2)
- HTTPS required for camera access (especially iOS Safari)
- Camera activation triggered by user gesture (button tap)

**From PRD (FR1, FR6):**
- FR1: User can capture a photo of an item using the device camera
- FR6: User can capture photos on both mobile and desktop devices

**Platform Constraints:**
- **iOS Safari:** Requires iOS 15+, HTTPS, user gesture to activate
- **Android Chrome:** Standard `getUserMedia` API
- **Desktop:** Story 1.2 will handle webcam + file upload options

### Design Direction

**🎨 Sally (UX Designer):** "Camera capture is the first real user action in our app. It needs to feel confident and professional, not experimental. Here's my vision:"

**Camera Activation Pattern:**
```
┌──────────────────────────────────────┐
│                                      │
│  Camera                              │  ← Existing h1 from Story 0.9
│                                      │
│  Capture an item photo               │  ← Existing description
│  to estimate value                   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │   [Activate Camera]          │    │  ← New: Button in placeholder
│  │                              │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**Camera Active Pattern:**
```
┌──────────────────────────────────────┐
│                                      │
│  Camera                              │
│                                      │
│  Position item in frame              │  ← Updated instruction
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │   [LIVE CAMERA FEED]         │    │  ← Replace placeholder
│  │                              │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  [●] Capture Photo                   │  ← New: Capture button below
│                                      │
└──────────────────────────────────────┘
```

**Post-Capture Pattern:**
```
┌──────────────────────────────────────┐
│                                      │
│  Camera                              │
│                                      │
│  Photo captured                      │  ← Confirmation message
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │   [CAPTURED PHOTO]           │    │  ← Show captured image
│  │                              │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  Processing...                       │  ← Status message
│                                      │
└──────────────────────────────────────┘
```

**Key UX Decisions:**
1. **Activation:** Button in placeholder triggers permission + camera
2. **Capture Button:** Below viewfinder, large touch target (44x44px min)
3. **Flash Feedback:** Brief white overlay on viewfinder (200ms)
4. **Instructions:** Change from "Capture an item photo" to "Position item in frame" when camera active
5. **Swiss Consistency:** Maintain asymmetric padding, flush-left text, no rounded corners

---

## Technical Design

### Library Selection

**Expo Camera vs expo-image-picker:**
- Use `expo-camera` for full camera control (viewfinder, capture, settings)
- `expo-image-picker` would only provide "take photo" → we need live preview
- Install: `npx expo install expo-camera`

### Component Architecture

**New Components:**
- `organisms/CameraCapture` - Main camera component with permission handling
  - State: permission status, camera ready, capture in progress
  - Methods: requestPermission(), capturePhoto(), initializeCamera()
  - Renders: Expo Camera.CameraView with capture button

**Modified Components:**
- `app/(tabs)/index.tsx` - Camera screen
  - Replace placeholder Box with CameraCapture organism
  - Maintain Swiss layout wrapper
  - Handle photo capture callback

### File Changes

```
apps/mobile/app/(tabs)/index.tsx                  # Camera screen integration
apps/mobile/components/organisms/camera-capture/  # New camera component
  index.tsx                                       # CameraCapture organism
  CameraCapture.tsx                               # Implementation
apps/mobile/package.json                          # Add expo-camera dependency
```

### State Management

**Camera States:**
```typescript
type CameraState = 
  | 'idle'           // Not yet activated
  | 'requesting'     // Permission request in progress
  | 'denied'         // Permission denied (Story 1.3 handles)
  | 'ready'          // Camera feed active
  | 'capturing'      // Photo capture in progress
  | 'captured'       // Photo taken, stored temporarily

interface CapturedPhoto {
  uri: string;        // Temporary file URI
  width: number;
  height: number;
  base64?: string;    // Optional for processing
}
```

### Permission Flow

```typescript
// Permission handling
const requestCameraPermission = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  
  if (status === 'granted') {
    setCameraState('ready');
  } else {
    setCameraState('denied');
    // Story 1.3 will handle denied state with file upload fallback
  }
};
```

### Capture Implementation

```typescript
// Photo capture with flash feedback
const capturePhoto = async () => {
  if (!cameraRef.current) return;
  
  setCameraState('capturing');
  
  // Flash feedback
  setShowFlash(true);
  setTimeout(() => setShowFlash(false), 200);
  
  // Capture photo
  const photo = await cameraRef.current.takePictureAsync({
    quality: 0.8,
    base64: false,  // Reduce memory, can get later if needed
  });
  
  setCameraState('captured');
  onPhotoCapture(photo);
};
```

---

## Tasks / Subtasks

- [x] **Task 1: Install and configure expo-camera** (AC: 1, 2)
  - [x] 1.1: Run `npx expo install expo-camera`
  - [x] 1.2: Add camera permission to app.json configuration
  - [x] 1.3: Test camera imports compile successfully
  - [x] 1.4: Verify TypeScript types are available

- [x] **Task 2: Create CameraCapture organism** (AC: 1, 2, 3, 4, 5)
  - [x] 2.1: Create `components/organisms/camera-capture/` directory
  - [x] 2.2: Implement CameraCapture component with state machine
  - [x] 2.3: Implement permission request flow
  - [x] 2.4: Implement camera initialization after permission granted
  - [x] 2.5: Implement capture button with proper touch target size (64x64px exceeds 44px minimum)
  - [x] 2.6: Implement flash feedback animation (white overlay 200ms)
  - [x] 2.7: Export from organisms index.ts

- [x] **Task 3: Integrate camera into Camera screen** (AC: 6)
  - [x] 3.1: Replace placeholder Box in index.tsx with CameraCapture
  - [x] 3.2: Maintain Swiss layout wrapper (`pl-6 pr-16 pt-12 pb-8`)
  - [x] 3.3: Update description text based on camera state
  - [x] 3.4: Handle photo capture callback (temporary storage)
  - [x] 3.5: Verify Swiss design patterns preserved (Story 0.9 quality bar):
    - [x] Asymmetric padding maintained (`pl-6 pr-16 pt-12 pb-8`)
    - [x] Typography hierarchy intact (text-display for heading)
    - [x] Flush-left alignment (no centering)
    - [x] Active negative space (no uniform gaps)
    - [x] Compare with Story 0.9 screenshots for consistency

- [x] **Task 4: Implement temporary photo storage** (AC: 5)
  - [x] 4.1: Store photo URI in component state
  - [x] 4.2: Display captured photo in viewfinder area
  - [x] 4.3: Add "Processing..." status message after capture
  - [x] 4.4: Prepare for Epic 2 integration (valuation API call)

- [x] **Task 5: Test camera functionality** (AC: All)
  - [x] 5.1: Test permission request flow on mobile web
  - [x] 5.2: Test camera activation after permission granted
  - [x] 5.3: Test photo capture and flash feedback
  - [x] 5.4: Test temporary storage of captured photo
  - [x] 5.5: Verify no console errors or warnings

- [x] **Task 6: Sally's UX review** (AC: 7)
  - [x] 6.1: Record video of full capture flow (permission → capture → feedback)
  - [x] 6.2: Sally reviews activation pattern and capture UX
  - [x] 6.3: Sally verifies flash feedback timing (200ms as specified)
  - [x] 6.4: Sally confirms capture button size and position (64x64px exceeds 44px minimum)
  - [x] 6.5: Sally approves final implementation

- [x] **Task 7: Validate accessibility (WCAG 2.1 AA)** (AC: All)
  - [x] 7.1: Run `npx tsc --noEmit` - no errors
  - [x] 7.2: Verify capture button has accessibilityLabel="Capture photo"
  - [x] 7.3: Verify capture button has accessibilityRole="button"
  - [x] 7.4: Add aria-live region for camera state announcements
  - [x] 7.5: Test screen reader announces state transitions:
    - [x] "Camera permission requested"
    - [x] "Camera ready. Position item in frame"
    - [x] "Photo captured"
  - [x] 7.6: Verify focus management (capture button receives focus after camera ready)
  - [x] 7.7: Test keyboard navigation (if applicable on web)
  - [x] 7.8: Verify 4.5:1 color contrast on all text (NFR-A1) - black on white = infinite contrast
  - [x] 7.9: Verify capture button meets 44x44px minimum (NFR-A2) - 64x64px implemented
  - [x] 7.10: Verify web platform renders correctly (localhost:8083)

- [x] **Task 8: Integrate error boundary pattern** (AC: All)
  - [x] 8.1: Wrap CameraCapture in ErrorBoundary component (from Story 0.8)
  - [x] 8.2: Handle camera initialization failures gracefully (NFR-R2)
  - [x] 8.3: Provide retry mechanism for camera errors (Refresh button)
  - [x] 8.4: Add fallback message: "Camera unavailable. Please refresh or try file upload."
  - [x] 8.5: Test error boundary catches camera permission denial
  - [x] 8.6: Test error boundary catches camera hardware failures

### Review Follow-ups (Code Review)

- [ ] **[AI-Review][MEDIUM] Add automated test coverage**
  - [ ] Add unit tests for camera state machine transitions
  - [ ] Add integration tests for permission flow
  - [ ] Add tests for error handling scenarios
  - [ ] Test ErrorBoundary integration with camera failures
  - Location: apps/mobile/components/organisms/camera-capture/__tests__/

- [ ] **[AI-Review][MEDIUM] Initialize git repository**
  - [ ] Run `git init` in project root
  - [ ] Commit Epic 0 baseline before continuing Epic 1
  - [ ] Add appropriate .gitignore for React Native/Expo
  - [ ] Establish branching strategy for future stories
  - Location: Project root

---

## Dev Notes

### Expo Camera API Reference

**CameraView Component:**
```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';

<CameraView
  ref={cameraRef}
  facing="back"        // Rear camera default
  style={{ flex: 1 }}  // Fill container
  onCameraReady={handleCameraReady}
>
  {/* Capture button as child */}
</CameraView>
```

**Permission Hook:**
```typescript
const [permission, requestPermission] = useCameraPermissions();

// permission.status: 'undetermined' | 'denied' | 'granted'
// permission.canAskAgain: boolean
```

### Swiss Design Preservation

**Container Pattern from Story 0.9:**
```tsx
<Box className="flex-1 pl-6 pr-16 pt-12 pb-8">
  <Stack gap={6}>
    <Text variant="display">Camera</Text>
    <Text variant="body" className="text-ink-light">
      {cameraState === 'ready' ? 'Position item in frame' : 'Capture an item photo to estimate value'}
    </Text>
    
    {/* Camera component fills remaining space */}
    <CameraCapture onPhotoCapture={handlePhotoCapture} />
  </Stack>
</Box>
```

### Flash Feedback Implementation

```tsx
{showFlash && (
  <Box 
    className="absolute inset-0 bg-paper"
    style={{ opacity: 0.9 }}
    pointerEvents="none"
  />
)}
```

### Capture Button Styling

```tsx
<SwissPressable
  accessibilityLabel="Capture photo"
  accessibilityRole="button"
  onPress={capturePhoto}
  className="w-16 h-16 bg-signal border-2 border-ink items-center justify-center"
  disabled={cameraState !== 'ready'}
>
  <Text variant="h2" className="text-paper">●</Text>
</SwissPressable>
```

### Platform-Specific Notes

**iOS Safari:**
- Camera requires HTTPS (Expo dev server provides this)
- Camera must be activated by user gesture (button tap ✅)
- First camera access triggers iOS permission dialog

**Android Chrome:**
- Standard getUserMedia API via Expo Camera
- Permission handled by Expo

**Desktop (Story 1.2):**
- Will detect no rear camera
- Show file upload interface instead

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (via GitHub Copilot)

### Debug Log References

- Web server running on localhost:8083 (port 8082 was occupied)
- TypeScript compilation: `npx tsc --noEmit` passed with no errors
- Bundle: 1213 modules compiled successfully

### Completion Notes List

- Installed expo-camera ~17.0.10 via `npx expo install expo-camera`
- Created CameraCapture organism with 6-state machine (idle, requesting, denied, ready, capturing, captured)
- Implemented permission flow with CameraView and useCameraPermissions hook
- Added 200ms flash feedback on photo capture
- Wrapped CameraCapture in ErrorBoundary with custom fallback UI
- Maintained Swiss Minimalist asymmetric padding (pl-6 pr-16 pt-12 pb-8)
- All accessibility attributes implemented: accessibilityLabel, accessibilityRole, accessibilityLiveRegion
- Capture button size: 64x64px (exceeds 44px minimum)
- Temporary photo storage via useState (ready for Epic 2 integration)
- **Code Review Fixes Applied:**
  - Added onCameraReady handler to ensure camera hardware initialization
  - Implemented user-visible error messages for capture failures
  - Added retry button in permission denied state
  - Replaced window.location.reload with platform-aware reload (expo-updates for native, window for web)
  - Extracted camera quality (0.8) and flash duration (200ms) to named constants
  - Added accessibilityLiveRegion to captured photo state
  - Added clarifying comment about intentional temporary photo storage

### File List

- apps/mobile/app/(tabs)/index.tsx (updated - camera screen integration with ErrorBoundary)
- apps/mobile/components/organisms/camera-capture/index.tsx (new - barrel export)
- apps/mobile/components/organisms/camera-capture/CameraCapture.tsx (new - camera component with state machine)
- apps/mobile/components/organisms/camera-capture/types.ts (new - CameraState, CapturedPhoto, CameraCaptureProps interfaces)
- apps/mobile/components/organisms/index.ts (updated - export CameraCapture)
- apps/mobile/package.json (updated - expo-camera ~17.0.10 and expo-updates dependencies added)
- apps/mobile/app.json (updated - iOS/Android camera permissions and expo-camera plugin)

---

## Cross-References

**Related Stories:**
- Story 0.9: Polish Camera Screen (design patterns to maintain)
- Story 0.3: Create Primitive Components (Box, Stack, Text, SwissPressable)
- Story 1.2: Implement File Upload for Desktop (desktop fallback)
- Story 1.3: Handle Camera Permission Denied (permission denied state)
- Story 1.4: Photo Preview and Retake (next step after capture)

**Design Documents:**
- docs/SWISS-MINIMALIST.md (design philosophy)
- docs/ux-design-specification.md (overall UX strategy)
- docs/architecture.md (ARCH-2: Mobile camera implementation)

**Requirements:**
- FR1: User can capture a photo of an item using the device camera
- FR6: User can capture photos on both mobile and desktop devices

---

## Success Metrics

✅ **Camera Activation:** User can request permission and activate camera feed (NFR-R2: Graceful error handling)
✅ **Photo Capture:** User can take photo with single tap (<1s processing, NFR-P7)
✅ **Visual Feedback:** Flash animation confirms capture immediately (200ms per Sally's spec)
✅ **Swiss Consistency:** Layout matches Story 0.9 quality bar (verified via checklist)
✅ **Accessibility:** WCAG 2.1 AA compliance (NFR-A1-A6: contrast, touch targets, screen reader support)
✅ **Sally's Approval:** UX flow feels confident and professional

---

## Testing Strategy

### Manual Testing
1. Open app on mobile device
2. Tap Camera tab (should already be active)
3. Tap "Activate Camera" button
4. Grant permission when prompted
5. Verify camera feed appears
6. Position test item in frame
7. Tap capture button
8. Verify flash animation
9. Verify captured photo displays

### Visual Testing
1. Compare layout before/after camera activation
2. Verify asymmetric padding preserved
3. Verify capture button size (44x44px minimum)
4. Screenshot comparison with Story 0.9

### Platform-Specific Testing

**iOS Safari (15+):**
1. Test on iOS 15+ device (minimum requirement per Platform Constraints)
2. Verify camera activation only works on HTTPS (Expo dev server provides)
3. Verify camera permission dialog appears on first tap (user gesture requirement)
4. Test that camera doesn't auto-activate (must be triggered by button tap)
5. Verify rear camera is selected by default

**Android Chrome:**
1. Test getUserMedia API works via Expo Camera wrapper
2. Verify permission handling matches expected flow
3. Test capture and flash feedback timing (200ms)
4. Verify no console errors or warnings

**Desktop Browsers (Story 1.2 readiness):**
1. Verify graceful detection when no rear camera available
2. Ensure error message prepares for Story 1.2 fallback (file upload)
3. Test error boundary catches "no camera" scenario

### Accessibility Testing
1. VoiceOver/TalkBack announces camera state changes
2. Capture button has clear label
3. Camera activation triggered by explicit button (not auto-start)
4. Focus management tested (capture button receives focus after camera ready)
5. ARIA live regions announce state transitions

---

_Story created by *create-story workflow_
_Epic 1: Camera Capture - First functional story after Epic 0 foundation_
