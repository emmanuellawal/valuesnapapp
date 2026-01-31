/**
 * FileUpload Types
 * 
 * TypeScript interfaces for the file upload organism.
 * 
 * @see Story 1.2: Implement File Upload for Desktop
 */

import { CapturedPhoto } from '../camera-capture/types';

/**
 * File upload state machine states
 * Represents the current state of the file upload component
 */
export type FileUploadState = 
  | 'idle'           // Waiting for file - showing upload zone
  | 'dragging'       // File being dragged over zone
  | 'validating'     // Checking file type/size
  | 'uploading'      // Processing file
  | 'uploaded'       // File ready for processing
  | 'error';         // Validation or upload error

/**
 * File validation error types
 */
export interface FileUploadError {
  type: 'invalid_format' | 'file_too_large' | 'read_error';
  message: string;
}

/**
 * Props for the FileUpload organism
 */
export interface FileUploadProps {
  /** Callback when a photo is successfully uploaded */
  onPhotoCapture: (photo: CapturedPhoto) => void;
  /** Callback when upload state changes (for parent component updates) */
  onStateChange?: (state: FileUploadState) => void;
  /** Optional test ID for testing */
  testID?: string;
}

// Re-export CapturedPhoto for convenience
export type { CapturedPhoto };
