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

/** Options for the internal retry helper. Exported for tests. */
export interface FetchWithRetryOptions {
  /** Per-attempt timeout in ms. Aborts the in-flight fetch when exceeded. */
  timeoutMs?: number;
  /** Max retry attempts AFTER the first try (so total = retries + 1). */
  retries?: number;
  /** Base backoff delay in ms. Multiplied by factor^attempt. */
  backoffBaseMs?: number;
  /** Exponential factor. Default 3 → delays 1s, 3s, 9s... */
  backoffFactor?: number;
}

/** HTTP status codes that justify a retry. 4xx and most 5xx do NOT. */
const RETRYABLE_STATUS = new Set([502, 503, 504]);

/** Sleep helper that honours fake timers in tests. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch() wrapper with per-attempt timeout, exponential backoff, and narrow
 * retry on transient network/server errors.
 *
 * Retry triggers:
 *   - fetch() throws (DNS, TCP, TLS, AbortError from our timeout)
 *   - response.status ∈ {502, 503, 504}
 *
 * Never retries on 2xx/3xx/4xx. See 5.5-7-network-polish.md Dev Notes for
 * rationale (429 retry would worsen rate-limiting; 400 retry is wasted work).
 *
 * Exported for unit tests; production code should call appraise() instead.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 30_000,
    retries = 2,
    backoffBaseMs = 1_000,
    backoffFactor = 3,
  } = options;

  let lastError: unknown = new Error('fetchWithRetry: no attempts made');

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      if (RETRYABLE_STATUS.has(response.status) && attempt < retries) {
        await delay(backoffBaseMs * backoffFactor ** attempt);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      await delay(backoffBaseMs * backoffFactor ** attempt);
    }
  }

  throw lastError;
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
 * Retries transient failures (network errors, 502/503/504) up to 2 times with
 * exponential backoff. 4xx responses are surfaced immediately.
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
    response = await fetchWithRetry(`${env.apiUrl}/api/appraise`, {
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
