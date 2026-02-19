# Epic 1 Camera Capture - Screenshot Evidence

This directory contains cross-platform screenshot evidence for Story 1.6 verification.

## Directory Structure

```
epic-1/
  ios-safari/           # iOS Safari screenshots (iPhone/iPad)
  android-chrome/       # Android Chrome screenshots
  desktop-chrome/       # Desktop Chrome screenshots
  desktop-firefox/      # Desktop Firefox screenshots (optional)
  desktop-safari/       # Desktop Safari screenshots (macOS, optional)
  desktop-no-webcam/    # Desktop file upload fallback
```

## Screenshot Naming Convention

All screenshots follow this naming pattern:

```
00-idle.png                          # Initial state before camera access
01-requesting-permissions.png        # Permission request dialog
02-permissions-denied.png            # Permission denied state
03-ready.png                        # Camera viewfinder ready
04-capturing.png                    # Flash/capture feedback (if capturable)
05-preview.png                      # Photo preview with retake/confirm
06-captured.png                     # Final captured state
07-quality-validation-pass.png      # Quality check passed (800x600+)
08-quality-validation-fail.png      # Quality check failed (low resolution)
```

## Screenshot Requirements

**Full Context:**
- Capture FULL screen (not cropped)
- Show browser chrome (URL bar) to prove platform
- Include date/time if visible
- Use high resolution (retina/2x if available)

**Platform Proof:**
- iOS: Show iOS status bar + Safari UI
- Android: Show Android status bar + Chrome UI
- Desktop: Show browser window with URL bar

## Testing Instructions

### iOS Safari
1. Open https://localhost:8083 on physical iPhone (iOS 15+)
2. Accept HTTPS certificate warning
3. Navigate to Camera tab
4. Capture screenshots of all states
5. Test permission flows: grant, deny

### Android Chrome
1. Open https://localhost:8083 on physical Android or emulator
2. Accept HTTPS certificate warning
3. Navigate to Camera tab
4. Capture screenshots of all states
5. Test permission flows: grant, deny

### Desktop Chrome
1. Open https://localhost:8083 in Chrome
2. Navigate to Camera tab
3. Capture screenshots with webcam
4. Test permission flows: grant, deny, revoke
5. Capture photo and verify quality validation

### Desktop (No Webcam)
1. Disable/disconnect webcam
2. Open https://localhost:8083 in Chrome
3. Navigate to Camera tab
4. Verify file upload fallback appears
5. Capture screenshot of fallback UI

## Cross-Platform Test Matrix

Track results in: `/docs/verification/epic-1-cross-platform-matrix.md`

## Notes

- Screenshots capture visual quality gaps for analysis
- Each platform screenshot set proves expo-camera cross-platform abstraction
- Permission flows may differ by platform (iOS requires HTTPS + user gesture)
