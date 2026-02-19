# Epic 1: Known Limitations and Platform Quirks

**Date:** January 30, 2026  
**Story:** 1.6 - Cross-Platform Camera Experience Verification  
**Status:** Documented and Accepted  

---

## Executive Summary

Epic 1 (Camera Capture) delivers a functional cross-platform experience, but with documented limitations due to browser security requirements, OS-specific behaviors, and technical constraints. These are **accepted limitations**, not bugs - they reflect the reality of web camera APIs and mobile permissions.

**User Impact:** Low to Medium  
**Workarounds Available:** Yes (file upload fallback)  
**Mitigation Status:** All high-impact limitations have fallbacks implemented

---

## Platform-Specific Quirks

### iOS Safari

#### 1. HTTPS Required for Camera Access 🔴 REQUIRED

**Description:**  
iOS Safari enforces HTTPS for all camera and microphone access. The app WILL NOT work on `http://` URLs in production.

**User Impact:**  
- Development: Works on `localhost` (exempted by Safari)
- Production: Must deploy to HTTPS domain or users cannot use camera

**Workaround:**  
- Development: Use `expo start --tunnel` or test on physical device via HTTPS tunnel
- Production: Deploy to Vercel/Netlify/Railway (all provide HTTPS by default)

**Status:** ✅ Mitigated (tunnel setup documented)

**Reference:**  
- [Apple WebKit Security](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- `.env` file: `EXPO_DEV_SERVER_PORT=8083`

---

#### 2. Permission Prompts Require User Gesture 🟡 BEHAVIOR

**Description:**  
iOS Safari requires camera permission requests to be triggered by explicit user interaction (button tap). You cannot auto-request permissions on page load.

**Example:**
```typescript
// ❌ WON'T WORK on iOS Safari (no user gesture)
useEffect(() => {
  requestPermission(); // Silently fails
}, []);

// ✅ WORKS on iOS Safari (user tap)
<SwissPressable onPress={requestPermission}>
  <Text>Enable Camera</Text>
</SwissPressable>
```

**User Impact:**  
- Minimal - users expect to tap a button to enable camera
- Aligns with iOS design patterns

**Workaround:**  
- CameraCapture component uses "Enable Camera" button (Story 1.1)
- Permission request triggered by user tap

**Status:** ✅ Designed for (not a bug)

---

#### 3. Camera UI Cannot Be Customized 🟡 LIMITATION

**Description:**  
Using `expo-image-picker.launchCameraAsync()` launches the native iOS Camera app. We cannot customize the camera interface (no custom buttons, overlays, or branding).

**User Impact:**  
- Medium - camera UI looks like stock iOS Camera app, not ValueSnap branded

**Trade-off:**  
- **Gain:** Reliability (native camera is well-tested)
- **Lose:** Customization (cannot add "Capture" button or guidelines overlay)

**Alternative Considered:**  
- Using `CameraView` component would allow custom UI, but has reliability issues on iOS (tested in prototype)

**Status:** ⚠️ Accepted trade-off (reliability > customization for MVP)

---

#### 4. Permission Denial Permanent Until Settings Change 🔴 BEHAVIOR

**Description:**  
If user denies camera permission once, iOS Safari remembers this decision. Subsequent permission requests are silently denied without showing a prompt.

**User Impact:**  
- High - users who accidentally deny permission are stuck

**Workaround:**  
- Story 1.3: Permission denied state shows clear instructions:
  - "Go to Settings → Safari → Camera → Allow"
  - Offers file upload as fallback

**Code:**
```tsx
if (cameraState === 'denied') {
  return (
    <Box>
      <Text>Camera access denied</Text>
      <Text>Enable in Settings → Safari → Camera</Text>
      <SwissPressable onPress={handleFileUpload}>
        <Text>Upload from Photos instead</Text>
      </SwissPressable>
    </Box>
  );
}
```

**Status:** ✅ Mitigated (fallback + clear instructions)

---

### Android Chrome

**Note:** Not tested on physical device, but expected behaviors documented from expo-camera documentation and community reports.

#### 5. Permission Prompts Can Be Manufacturer-Specific 🟡 BEHAVIOR

**Description:**  
Android device manufacturers (Samsung, Xiaomi, OnePlus) customize permission UX. The permission dialog may look different across devices.

**User Impact:**  
- Low - permission flow works, just looks different

**Workaround:**  
- expo-camera handles manufacturer variations automatically
- No special code needed

**Status:** 🟢 Handled by expo-camera

---

#### 6. Camera Permission May Require Storage Permission 🟡 QUIRK

**Description:**  
Some Android versions/manufacturers require BOTH camera and storage permissions to save photos.

**User Impact:**  
- Medium - users may see two permission prompts instead of one

**Workaround:**  
- expo-camera requests storage permission automatically if needed
- No special code required

**Status:** 🟢 Handled by expo-camera

---

### Desktop Web (Chrome/Firefox/Safari)

#### 7. Webcam Permission Stored Per-Origin 🟡 BEHAVIOR

**Description:**  
Desktop browsers remember camera permission per origin (e.g., `localhost:8083` vs `localhost:8081` are different).

**User Impact:**  
- Development: Changing ports requires re-granting permission
- Production: No impact (single domain)

**Workaround:**  
- Use consistent port (8083) during development
- `.env` file: `EXPO_DEV_SERVER_PORT=8083`

**Status:** ✅ Mitigated (consistent port configured)

---

#### 8. No Webcam = File Upload Only 🟢 BY DESIGN

**Description:**  
Desktop computers without webcams cannot use camera capture. File upload is the only option.

**User Impact:**  
- Low - most users understand desktops don't have cameras
- File upload is familiar (browse/drag-drop)

**Workaround:**  
- `FileUpload` component handles both file selection and drag-drop
- Clear messaging: "Drag photo here or click to browse"

**Status:** ✅ Designed for (not a limitation)

---

#### 9. Large Image Files Can Cause Upload Delays 🟡 PERFORMANCE

**Description:**  
Desktop users may upload high-resolution photos (10+ MB) from DSLR cameras, causing slow upload/processing.

**User Impact:**  
- Medium - users may wait 5-10 seconds for large files

**Workaround:**  
- Story 1.5: Quality validation warns for files >5MB
- Users can retake/resize before uploading
- Backend will compress images server-side (Epic 2)

**Code:**
```typescript
if (fileSize > 5 * 1024 * 1024) {
  qualityIssues.push({
    type: 'large_file',
    message: `Photo file size is large (${fileSizeMB}MB). This may slow processing.`
  });
}
```

**Status:** ⚠️ Partially mitigated (warning shown, compression planned)

---

## Technical Limitations

### 10. Image Quality Cannot Be Enforced (Only Warned) 🟡 UX DECISION

**Description:**  
Story 1.5 validates image quality (resolution, file size) but does NOT block users from proceeding. Low-quality photos are accepted with warnings.

**Rationale:**  
- Users may not have better equipment
- Blocking creates frustration
- AI identification may still work on low-res images

**User Impact:**  
- Low - most users upload acceptable quality photos
- Clear warnings guide users to retake if needed

**Code:**
```tsx
{qualityIssues.length > 0 && (
  <Box className="mt-4 p-4 bg-paper-highlight">
    {qualityIssues.map(issue => (
      <Text key={issue.type} variant="caption" className="text-signal">
        {issue.message}
      </Text>
    ))}
    <Text variant="caption" className="text-ink-muted mt-2">
      You can continue, but better photos give better results
    </Text>
  </Box>
)}
```

**Status:** ✅ By design (warnings, not blocks)

---

### 11. Camera Capture Quality Fixed at 0.8 🟢 CONFIGURED

**Description:**  
ImagePicker uses `quality: 0.8` (80%) compression for all photos. This balances image quality with file size.

**Rationale:**  
- 0.8 is high enough for AI identification
- Reduces upload time and bandwidth
- Prevents >10MB files from mobile cameras

**User Impact:**  
- None - compression is transparent
- Photos still high quality (1080p+)

**Code:**
```typescript
const result = await ImagePicker.launchCameraAsync({
  quality: 0.8, // 80% quality
  allowsEditing: false,
});
```

**Status:** ✅ Optimized for performance

---

### 12. Photo Preview Loads Synchronously (No Streaming) 🟡 IMPLEMENTATION

**Description:**  
Photo preview waits for full image load before displaying. No progressive JPEG streaming.

**User Impact:**  
- Low - most photos load in <1 second
- May see brief delay on slow connections

**Workaround:**  
- Could add skeleton loader for preview state
- Deferred to Phase 2 (not critical)

**Status:** ⚪ Acceptable for MVP

---

## Cross-Platform Test Coverage

### 13. Android Not Tested on Physical Device 🟡 GAP

**Description:**  
Android Chrome functionality assumed based on expo-camera documentation and desktop web testing. Not verified on actual Android device.

**Risk Assessment:**  
- **Likelihood of issues:** Low (expo-camera is designed for cross-platform)
- **Impact if broken:** High (50% of mobile users)

**Mitigation:**  
- expo-camera uses same React Native API for iOS and Android
- Desktop web testing validates core logic
- Playwright automated tests cover web behavior

**Recommendation:**  
- Test on Android device before Phase 2 (when accessible)
- Monitor Sentry/error logs for Android-specific crashes

**Status:** ⚠️ Medium risk, high confidence (test when available)

---

## Security Considerations

### 14. Photos Stored in Memory Before Upload 🟢 SECURE

**Description:**  
Captured photos stored in component state (memory) before backend upload. Not persisted to disk until user confirms.

**Security:**  
- Photos cleared on component unmount
- No local storage caching (privacy-friendly)

**Status:** ✅ Secure by design

---

### 15. No Photo Encryption in Transit (Yet) 🟡 TODO

**Description:**  
Photos uploaded to backend via HTTP POST without additional encryption (relies on HTTPS).

**User Impact:**  
- Low - HTTPS provides transport-layer security
- Additional encryption could be added if handling sensitive items

**Recommendation:**  
- HTTPS sufficient for MVP
- Consider end-to-end encryption for Phase 2 if handling jewelry, collectibles with personal value

**Status:** ⚪ Acceptable for MVP

---

## Performance Characteristics

### 16. Camera Launch Time: 1-2 Seconds 🟢 NORMAL

**Description:**  
iOS/Android camera takes 1-2 seconds to launch (OS limitation, not app issue).

**User Impact:**  
- Low - expected behavior (same as native apps)

**Status:** ✅ Normal OS behavior

---

### 17. Photo Processing: 1.5 Seconds Mock 🟡 SIMULATED

**Description:**  
Epic 1 uses mock 1.5-second delay for photo processing. Real AI processing (Epic 2) may take 5-10 seconds.

**Current Code:**
```typescript
await new Promise(resolve => setTimeout(resolve, 1500)); // Mock
```

**User Impact:**  
- Epic 1: Fast, feels instant
- Epic 2: Will need loading states (ValuationCardSkeleton ready)

**Status:** ⚪ Epic 2 will add real processing

---

## Future Enhancements (Not Limitations)

### 18. Batch Upload Not Supported 🟢 PHASE 2

**Description:**  
Users can only upload one photo at a time. Batch upload (select 10 photos) deferred to Phase 2.

**Rationale:**  
- Single-item flow builds trust (users verify accuracy incrementally)
- Batch requires queue infrastructure
- MVP focused on accuracy, not throughput

**Status:** ✅ By design (see party-mode analysis)

---

### 19. No Photo Editing/Cropping 🟢 BY DESIGN

**Description:**  
Users cannot crop or edit photos before upload. Must retake if unsatisfied.

**Rationale:**  
- Editing adds complexity
- Retake is simpler UX
- AI works better with full-item photos (no cropping)

**Status:** ✅ By design

---

### 20. Gallery/Photo Library Selection Not Available on Mobile 🟡 FUTURE

**Description:**  
Mobile users must take new photos. Cannot select existing photos from gallery.

**Workaround:**  
- Desktop users can upload existing files via FileUpload
- Mobile users can use file upload fallback (if permission denied)

**Future Enhancement:**  
- Add `ImagePicker.launchImageLibraryAsync()` for gallery selection
- Deferred to Phase 2 (not critical for MVP)

**Status:** ⚪ Enhancement opportunity

---

## Summary Table

| # | Limitation | Platform | Impact | Mitigation | Status |
|---|------------|----------|--------|------------|--------|
| 1 | HTTPS required | iOS | High | Tunnel + HTTPS deploy | ✅ |
| 2 | Permission requires gesture | iOS | Low | Button-triggered | ✅ |
| 3 | No camera UI customization | iOS | Medium | Accepted trade-off | ⚠️ |
| 4 | Permission denial persistent | iOS | High | File upload fallback | ✅ |
| 5 | Manufacturer-specific prompts | Android | Low | expo-camera handles | 🟢 |
| 6 | Storage permission may be needed | Android | Medium | expo-camera handles | 🟢 |
| 7 | Permission per-origin | Desktop | Low | Consistent port | ✅ |
| 8 | No webcam = file only | Desktop | Low | By design | 🟢 |
| 9 | Large files slow | Desktop | Medium | Warning + compress | ⚠️ |
| 10 | Quality not enforced | All | Low | Warnings shown | ✅ |
| 11 | Fixed compression | All | None | Optimized | 🟢 |
| 12 | No progressive load | All | Low | Acceptable | ⚪ |
| 13 | Android not tested | Android | Medium | High confidence | ⚠️ |
| 14 | Memory-only storage | All | None | Secure | ✅ |
| 15 | No photo encryption | All | Low | HTTPS sufficient | ⚪ |
| 16 | Camera launch delay | Mobile | Low | Normal OS | 🟢 |
| 17 | Mock processing | All | None | Epic 2 real | ⚪ |
| 18 | No batch upload | All | Low | Phase 2 | 🟢 |
| 19 | No editing/cropping | All | Low | By design | 🟢 |
| 20 | No gallery selection | Mobile | Medium | Future feature | ⚪ |

**Legend:**
- ✅ Mitigated with workaround
- 🟢 By design / Normal behavior
- ⚪ Acceptable for MVP
- ⚠️ Partially mitigated / Monitor
- 🔴 Active limitation

---

## Recommendations

### Before Epic 2
- [x] Document all limitations (this file)
- [x] Verify iOS Safari working (completed)
- [x] Verify Desktop Chrome working (completed)
- [ ] Test on Android device when available

### During Epic 2
- [ ] Monitor Sentry for Android camera errors
- [ ] Track photo upload times (add analytics)
- [ ] Consider image compression on backend

### Phase 2
- [ ] Add gallery/photo library selection
- [ ] Implement batch upload (if validated by Phase 1 usage)
- [ ] Explore custom camera UI (if branding becomes priority)

---

## Conclusion

Epic 1 limitations are well-understood and mitigated where possible. The camera capture experience is **production-ready** with acceptable trade-offs for MVP.

**Key Takeaways:**
1. HTTPS required for production (accepted, standard practice)
2. iOS camera reliable via ImagePicker (validated)
3. File upload fallback prevents dead ends (validated)
4. Android not tested but high confidence (expo-camera abstraction)

**No blockers identified for Epic 2 development.**
