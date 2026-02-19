# Epic 1 Camera Capture - Cross-Platform Test Matrix

**Story 1.6:** Cross-Platform Camera Experience Verification  
**Date:** January 5, 2026  
**Tester:** [Your Name]

---

## Test Matrix

| Platform | Browser | Version | Camera Access | Permissions | Capture | Quality Check | Screenshot Set | Notes |
|----------|---------|---------|---------------|-------------|---------|---------------|----------------|-------|
| **iOS** | Safari | 15+ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | HTTPS required, test on physical device |
| **iOS** | Chrome | Latest | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | May use Safari WebView |
| **Android** | Chrome | Latest | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | getUserMedia API |
| **Android** | Firefox | Latest | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Secondary test (optional) |
| **Desktop** | Chrome | Latest | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Webcam test |
| **Desktop** | Firefox | Latest | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Webcam test (optional) |
| **Desktop** | Safari | Latest | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | macOS only (optional) |
| **Desktop** | No Webcam | N/A | N/A | N/A | ⬜ | ⬜ | ⬜ | File upload fallback |

**Legend:**
- ✅ = Passed
- ❌ = Failed
- ⚠️ = Partial / with issues
- ⬜ = Not tested
- N/A = Not applicable

---

## Testing Instructions

### Before Testing
1. Start Expo dev server: `npm start` in `/apps/mobile`
2. Access URL: `http://localhost:8083` (configured project port)
3. Accept self-signed certificate warnings if testing with HTTPS

### Test Flow for Each Platform

**Phase 1: Initial Load**
1. Open Camera tab
2. Screenshot: `00-idle.png` - initial state before camera access

**Phase 2: Permission Request**
1. Observe permission request behavior
2. Screenshot: `01-requesting-permissions.png` - permission dialog

**Phase 3: Permission Denied**
1. Deny camera permission (if testing denial flow)
2. Screenshot: `02-permissions-denied.png` - error state
3. Verify error message clarity and recovery instructions

**Phase 4: Permission Granted**
1. Grant camera permission (or reset and grant)
2. Screenshot: `03-ready.png` - camera viewfinder ready
3. Verify viewfinder shows live camera feed

**Phase 5: Photo Capture**
1. Tap capture button
2. Screenshot: `04-capturing.png` - flash feedback (if capturable, may be too fast)
3. Verify flash feedback appears

**Phase 6: Photo Preview**
1. After capture, preview screen appears
2. Screenshot: `05-preview.png` - photo preview with retake/confirm
3. Verify retake and confirm buttons are visible and functional

**Phase 7: Quality Validation - Pass**
1. Capture photo with good quality (800x600+)
2. Confirm photo
3. Screenshot: `07-quality-validation-pass.png` - quality check passed

**Phase 8: Quality Validation - Fail**
1. Capture photo with low resolution (if possible via low-quality camera or image)
2. Confirm photo
3. Screenshot: `08-quality-validation-fail.png` - quality warning shown

---

## Platform-Specific Behaviors to Document

### iOS Safari
- **HTTPS Requirement:** Camera API requires HTTPS (not http://)
- **User Gesture:** Camera must be initiated by user tap/click (not automatic on load)
- **iOS Version:** Requires iOS 15+ for WebRTC camera support
- **Permission Persistence:** Safari remembers permission per domain
- **Observed Issues:** [Document any issues encountered]

### Android Chrome
- **getUserMedia API:** Uses standard Web API
- **Permission Model:** Chrome permission prompt
- **Performance:** [Note any lag or performance issues]
- **Observed Issues:** [Document any issues encountered]

### Desktop Chrome
- **Webcam Detection:** Detects available webcams automatically
- **Permission Model:** Chrome permission prompt with device selection
- **Performance:** [Note any lag or performance issues]
- **Observed Issues:** [Document any issues encountered]

### Desktop (No Webcam)
- **Fallback Behavior:** Should show file upload interface
- **File Upload:** Accepts image files (.jpg, .png, .heic)
- **Quality Validation:** Should validate uploaded files same as captured
- **Observed Issues:** [Document any issues encountered]

---

## Known Limitations

### Documented by expo-camera
- **iOS Safari:** Requires HTTPS in production
- **iOS Version:** Requires iOS 15+ for camera support
- **User Gesture:** iOS requires user interaction to initiate camera (not auto-load)
- **Browser Support:** Limited support in older browsers (IE, old Safari)

### Discovered During Testing
[Add any limitations discovered during Story 1.6 testing]

---

## Results Summary

**Platforms Tested:** [X / 8]  
**Platforms Passed:** [X / tested]  
**Critical Issues Found:** [number]  
**Overall Cross-Platform Grade:** [A / B / C / D / F]

### Critical Issues
1. [Issue description] - Platform: [platform] - Severity: [high/medium/low]

### Visual Quality Issues
1. [Visual gap] - Platform: [platform] - Reference: [screenshot]

---

## Test Environment

**Developer Machine:**
- OS: [Linux/macOS/Windows]
- Node Version: [version]
- Expo Version: [version]
- expo-camera Version: 17.0.10

**Test Devices:**
- iOS: [iPhone model, iOS version]
- Android: [Device model, Android version]
- Desktop: [Browser versions tested]

---

## Screenshot Organization

All screenshots stored in: `/docs/verification/screenshots/epic-1/`

**Directory Structure:**
```
epic-1/
  ios-safari/
    00-idle.png
    01-requesting-permissions.png
    02-permissions-denied.png
    03-ready.png
    04-capturing.png
    05-preview.png
    06-captured.png
    07-quality-validation-pass.png
    08-quality-validation-fail.png
  android-chrome/
    [same structure]
  desktop-chrome/
    [same structure]
  desktop-no-webcam/
    00-file-upload-fallback.png
```

---

## Next Steps

After completing test matrix:
1. [ ] Complete UX quality verification checklist
2. [ ] Create gap analysis document
3. [ ] Create architectural decision document
4. [ ] Update sprint status to "review"
5. [ ] Present findings to team
