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

export interface AppraiseOptions {
  accessToken?: string | null;
}

/** Error thrown by API client — carries an ErrorType for UI mapping. */
export class AppraiseError extends Error {
  constructor(
    public readonly errorType: ErrorType,
    message: string,
    public readonly retryAfterSeconds?: number,
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
  /** Exponential factor. Default 3 → delays 1s, 3s between attempts (with default retries=2). */
  backoffFactor?: number;
}

/** HTTP status codes that justify a retry. 4xx and most 5xx do NOT. */
const RETRYABLE_STATUS = new Set([502, 503, 504]);

/** AI identification can legitimately take up to ~90s (3 OpenAI attempts × 30s). */
const APPRAISE_TIMEOUT_MS = 120_000;

/** Sleep helper that honours fake timers in tests. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate one idempotency key per user-initiated submission. */
function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * fetch() wrapper with per-attempt timeout, exponential backoff, and narrow
 * retry on transient network/server errors.
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
      if (attempt >= retries) {
        throw error;
      }
      await delay(backoffBaseMs * backoffFactor ** attempt);
    }
  }

  throw new Error('fetchWithRetry: exhausted attempts');
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
  options: AppraiseOptions = {},
): Promise<RawAppraiseResponse> {
  if (!env.apiUrl) {
    throw new AppraiseError('GENERIC_ERROR', 'API URL is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Idempotency-Key': createIdempotencyKey(),
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetchWithRetry(
      `${env.apiUrl}/api/appraise`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_base64: imageBase64,
          guest_session_id: guestSessionId,
        }),
      },
      { timeoutMs: APPRAISE_TIMEOUT_MS, retries: 1 },
    );
  } catch {
    throw new AppraiseError('NETWORK_ERROR', 'Unable to reach the server');
  }

  if (!response.ok) {
    let errorType: ErrorType = 'GENERIC_ERROR';
    let message = `Request failed with status ${response.status}`;

    if (response.status === 429) {
      const retryAfterRaw = response.headers?.get?.('Retry-After');
      const parsedRetryAfter = Number.parseInt(retryAfterRaw ?? '', 10);
      const retryAfterSeconds = Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0
        ? parsedRetryAfter
        : 60;
      throw new AppraiseError('RATE_LIMIT', 'Too many requests', retryAfterSeconds);
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
