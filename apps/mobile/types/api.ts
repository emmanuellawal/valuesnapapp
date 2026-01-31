/**
 * API Response Types
 *
 * Implements ARCH-17 discriminated union pattern for type-safe API responses.
 * The discriminated union allows TypeScript to narrow types based on `success` field.
 *
 * @example
 * ```typescript
 * const response: ApiResponse<ValuationResponse> = await api.fetch('/valuation');
 *
 * if (response.success) {
 *   // TypeScript knows response.data exists here - no optional chaining needed!
 *   console.log(response.data.itemDetails.brand);
 * } else {
 *   // TypeScript knows response.error exists here
 *   console.error(response.error.message);
 * }
 * ```
 */

/**
 * Standard error codes for API responses.
 * Maps to backend error handling.
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AI_ERROR = 'AI_ERROR',
  EBAY_ERROR = 'EBAY_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Success response wrapper.
 * When success is true, data is guaranteed to exist.
 *
 * @template T - The type of the data payload
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error response wrapper.
 * When success is false, error is guaranteed to exist.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: {
      reason?: string;
      suggestion?: string;
      field?: string;
    };
  };
}

/**
 * Discriminated union for API responses.
 * Use type narrowing with `if (response.success)` to access data safely.
 *
 * @template T - The type of the data payload on success
 *
 * @example
 * ```typescript
 * async function fetchData(): Promise<ApiResponse<MyData>> {
 *   const response = await fetch('/api/data');
 *   return response.json();
 * }
 *
 * const result = await fetchData();
 * if (result.success) {
 *   // result.data is typed as MyData
 *   processData(result.data);
 * } else {
 *   // result.error is typed with code, message, details
 *   showError(result.error.message);
 * }
 * ```
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
