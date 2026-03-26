/**
 * API Client
 *
 * Typed client for the ValueSnap backend.
 * Maps HTTP errors to the ErrorType union used by ErrorState component.
 */

import { env } from '@/lib/env';
import type { ErrorType } from '@/components/molecules/error-state';

/** Raw backend appraisal response (before transformation). */
export interface RawAppraiseResponse {
  identity: Record<string, unknown>;
  valuation: Record<string, unknown>;
  confidence: Record<string, unknown>;
  valuation_id: string | null;
}

/** Error thrown by API client — carries an ErrorType for UI mapping. */
export class AppraiseError extends Error {
  constructor(
    public readonly errorType: ErrorType,
    message: string,
  ) {
    super(message);
    this.name = 'AppraiseError';
  }
}

/**
 * Map a backend error code to the frontend ErrorType union.
 */
function mapErrorCode(code: string | undefined): ErrorType {
  switch (code) {
    case 'AI_IDENTIFICATION_FAILED':
    case 'AI_TIMEOUT':
    case 'INVALID_IMAGE':
    case 'RATE_LIMIT':
      return code as ErrorType;
    default:
      return 'GENERIC_ERROR';
  }
}

/**
 * Call /api/appraise with an image and guest session ID.
 *
 * @throws AppraiseError with a mapped ErrorType on failure.
 */
export async function appraise(
  imageBase64: string,
  guestSessionId: string,
): Promise<RawAppraiseResponse> {
  if (!env.apiUrl) {
    throw new AppraiseError('GENERIC_ERROR', 'API URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/api/appraise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        guest_session_id: guestSessionId,
      }),
    });
  } catch {
    throw new AppraiseError('NETWORK_ERROR', 'Unable to reach the server');
  }

  if (!response.ok) {
    // Try to parse structured error from backend
    let errorType: ErrorType = 'GENERIC_ERROR';
    let message = `Request failed with status ${response.status}`;

    if (response.status === 429) {
      throw new AppraiseError('RATE_LIMIT', 'Too many requests');
    }

    try {
      const body = await response.json();
      if (body?.error?.code) {
        errorType = mapErrorCode(body.error.code);
        message = body.error.message || message;
      }
    } catch {
      // Could not parse error body — use defaults
    }

    throw new AppraiseError(errorType, message);
  }

  return response.json();
}
