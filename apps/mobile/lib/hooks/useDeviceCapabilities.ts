/**
 * useDeviceCapabilities Hook
 * 
 * Platform detection hook for conditional rendering of
 * CameraCapture (mobile) vs FileUpload (desktop).
 * 
 * Features:
 * - Desktop detection (web + screen width >= 768px)
 * - Camera availability detection (navigator.mediaDevices)
 * - SSR safety (checks for window existence)
 * 
 * @see Story 1.2: Implement File Upload for Desktop
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

/** Desktop breakpoint in pixels */
const DESKTOP_BREAKPOINT = 768;

export interface DeviceCapabilities {
  /** Whether a camera is available on the device */
  hasCamera: boolean;
  /** Whether the device is a desktop (web + large screen) */
  isDesktop: boolean;
  /** Whether capabilities have been detected */
  isReady: boolean;
}

/**
 * Hook to detect device capabilities for platform-specific UI
 * 
 * @returns DeviceCapabilities object with hasCamera, isDesktop, and isReady flags
 * 
 * @example
 * ```tsx
 * const { hasCamera, isDesktop, isReady } = useDeviceCapabilities();
 * 
 * if (!isReady) return <LoadingIndicator />;
 * 
 * if (isDesktop || !hasCamera) {
 *   return <FileUpload onPhotoCapture={handlePhotoCapture} />;
 * }
 * return <CameraCapture onPhotoCapture={handlePhotoCapture} />;
 * ```
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [hasCamera, setHasCamera] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const detectCapabilities = async () => {
      // SSR safety: check for window existence (Story 1.2 validation note)
      if (Platform.OS !== 'web') {
        // Native mobile always has camera, never desktop
        setHasCamera(true);
        setIsDesktop(false);
        setIsReady(true);
        return;
      }

      // Check if window is available (SSR safety)
      if (typeof window === 'undefined') {
        setIsReady(true);
        return;
      }

      // Desktop detection: web platform with large screen
      const isLargeScreen = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(isLargeScreen);

      // Camera detection: check for video input devices
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = devices.some(device => device.kind === 'videoinput');
          setHasCamera(hasVideoInput);
        } else {
          // No mediaDevices API - assume no camera
          setHasCamera(false);
        }
      } catch (error) {
        // Error detecting camera - assume no camera on desktop
        console.warn('Camera detection failed:', error);
        setHasCamera(false);
      }

      setIsReady(true);
    };

    detectCapabilities();

    // Optional: Listen for window resize to update isDesktop
    // This handles orientation changes on tablets
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return { hasCamera, isDesktop, isReady };
}

export default useDeviceCapabilities;
