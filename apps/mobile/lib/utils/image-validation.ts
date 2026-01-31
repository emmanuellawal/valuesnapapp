/**
 * Image Quality Validation
 * 
 * Validates captured/uploaded photos against minimum quality requirements:
 * - Resolution: ≥800x600 pixels (NFR-AI7)
 * - File size: ≤5MB (performance optimization)
 * 
 * Non-blocking validation: warnings inform users but don't prevent proceeding
 * 
 * @see Story 1.5: Photo Quality Validation
 * @see docs/epics.md NFR-AI7: Photo quality detection (minimum 800x600)
 */

/**
 * Type of quality issue detected
 */
export type ImageQualityIssueType = 'LOW_RESOLUTION' | 'LARGE_FILE_SIZE';

/**
 * Represents a single quality issue found during validation
 */
export interface ImageQualityIssue {
  /** Type of quality issue */
  type: ImageQualityIssueType;
  /** Severity level - all issues are warnings (non-blocking) */
  severity: 'WARNING';
  /** User-facing message describing the issue with specific details */
  message: string;
  /** Optional actionable suggestion for the user */
  suggestion?: string;
}

/**
 * Result of image quality validation
 */
export interface ImageQualityResult {
  /** True if no quality issues detected */
  isValid: boolean;
  /** Array of quality issues found (empty if isValid is true) */
  issues: ImageQualityIssue[];
  /** Image metadata used for validation */
  metadata: {
    /** Image width in pixels */
    width: number;
    /** Image height in pixels */
    height: number;
    /** File size in bytes (if available) */
    fileSizeBytes?: number;
    /** File size in MB as formatted string (if available) */
    fileSizeMB?: string;
  };
}

/**
 * Minimum width required for AI identification (NFR-AI7)
 */
const MIN_WIDTH = 800;

/**
 * Minimum height required for AI identification (NFR-AI7)
 */
const MIN_HEIGHT = 600;

/**
 * Maximum file size before performance warning (5MB)
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validate image quality based on dimensions and file size
 * 
 * This is a synchronous validation that checks:
 * 1. Resolution: width ≥ 800 AND height ≥ 600 (NFR-AI7)
 * 2. File size: ≤ 5MB (performance optimization)
 * 
 * All validation issues are non-blocking warnings - users can proceed anyway.
 * 
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param fileSizeBytes - Optional file size in bytes (if available)
 * @returns ImageQualityResult with issues array (empty if valid)
 * 
 * @example
 * ```typescript
 * const result = validateImageQuality(640, 480);
 * if (!result.isValid) {
 *   console.log('Quality warnings:', result.issues);
 * }
 * ```
 */
export function validateImageQuality(
  width: number,
  height: number,
  fileSizeBytes?: number
): ImageQualityResult {
  const issues: ImageQualityIssue[] = [];

  // Check resolution (critical for AI identification)
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    issues.push({
      type: 'LOW_RESOLUTION',
      severity: 'WARNING',
      message: `Photo resolution is low (${width}×${height}). For best results, use at least ${MIN_WIDTH}×${MIN_HEIGHT}.`,
      suggestion: 'Try better lighting or move closer',
    });
  }

  // Check file size (performance optimization)
  if (fileSizeBytes !== undefined && fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    issues.push({
      type: 'LARGE_FILE_SIZE',
      severity: 'WARNING',
      message: `Photo file size is large (${fileSizeMB}MB). This may slow processing.`,
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    metadata: {
      width,
      height,
      fileSizeBytes,
      fileSizeMB: fileSizeBytes !== undefined 
        ? (fileSizeBytes / (1024 * 1024)).toFixed(1) 
        : undefined,
    },
  };
}

/**
 * Check if resolution meets minimum requirements
 * 
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns True if resolution is sufficient for AI identification
 */
export function isResolutionSufficient(width: number, height: number): boolean {
  return width >= MIN_WIDTH && height >= MIN_HEIGHT;
}

/**
 * Check if file size is within acceptable limits
 * 
 * @param fileSizeBytes - File size in bytes
 * @returns True if file size won't impact performance
 */
export function isFileSizeAcceptable(fileSizeBytes: number): boolean {
  return fileSizeBytes <= MAX_FILE_SIZE_BYTES;
}

/**
 * Get minimum resolution requirements
 * 
 * @returns Object with minimum width and height
 */
export function getMinimumResolution(): { width: number; height: number } {
  return { width: MIN_WIDTH, height: MIN_HEIGHT };
}

/**
 * Get maximum file size limit in bytes
 * 
 * @returns Maximum file size in bytes
 */
export function getMaxFileSizeBytes(): number {
  return MAX_FILE_SIZE_BYTES;
}
