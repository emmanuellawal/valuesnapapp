/**
 * CameraCapture Types
 * 
 * TypeScript interfaces for the camera capture organism.
 * 
 * @see Story 1.1: Implement Mobile Camera Capture
 * @see Story 1.4: Photo Preview and Retake
 */

/**
 * Camera state machine states
 * Represents the current state of the camera component
 * 
 * State Flow:
 * - idle → requesting (user taps activate)
 * - requesting → ready (permission granted) OR denied (permission refused)
 * - ready → capturing (user taps capture)
 * - capturing → preview (photo taken, ready for review)
 * - preview → idle (user taps retake) OR captured (user taps use photo)
 * - captured → processing begins
 */
export type CameraState = 
  | 'idle'           // Not yet activated - showing activation button
  | 'requesting'     // Permission request in progress
  | 'denied'         // Permission denied (Story 1.3 handles fallback)
  | 'ready'          // Camera feed active, ready to capture
  | 'capturing'      // Photo capture in progress
  | 'preview'        // Photo ready for review (Story 1.4)
  | 'captured';      // Photo confirmed, triggers processing

/**
 * Captured photo data returned from camera
 */
export interface CapturedPhoto {
  /** Temporary file URI for the captured photo */
  uri: string;
  /** Photo width in pixels */
  width: number;
  /** Photo height in pixels */
  height: number;
  /** Optional base64 encoded data for processing */
  base64?: string;
}

/**
 * Props for the CameraCapture organism
 */
export interface CameraCaptureProps {
  /** Callback when a photo is successfully captured */
  onPhotoCapture: (photo: CapturedPhoto) => void;
  /** Callback when camera state changes (for parent component updates) */
  onStateChange?: (state: CameraState) => void;
  /** Optional test ID for testing */
  testID?: string;
}
