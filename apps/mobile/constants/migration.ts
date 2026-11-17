/**
 * Guest-migration retry constants and failure classification (Story 6.12).
 *
 * Lives outside lib/migrationQueue.ts on purpose: the history screen tests replace
 * that module with a jest.mock() factory, and any export the factory omits becomes
 * `undefined`. `elapsed >= undefined` is always false, so auto-retry would silently
 * never fire under test. Keeping these in an unmocked module removes that trap.
 *
 * Retries are event-driven (focus, resume, reconnect, pull-to-refresh). Nothing
 * here is a timer: these values are compared against `lastAttemptAt`.
 */

/**
 * Bounded timeout for the `/health` probe before a migration attempt (AC2).
 */
export const BACKEND_HEALTH_TIMEOUT_MS = 5_000;

/**
 * Burst guard: minimum gap between AUTOMATIC attempts for the same record.
 *
 * This only stops duplicate taps/events landing close together. It does NOT
 * enforce the backend's MIGRATE_GUEST_RATE_LIMIT of 10 requests per 3600 seconds.
 * Manual taps are exempt.
 */
export const MIGRATION_RETRY_COOLDOWN_MS = 60_000;

/**
 * Minimum gap between AUTOMATIC attempts after a 429.
 *
 * The backend allows 10 POSTs per 3600-second sliding window (backend/rate_limit.py).
 * `migrateGuestData` discards the `Retry-After` header and this story does not edit
 * migration.ts, so the client uses a fixed delay instead of the header.
 */
export const MIGRATION_RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;

/**
 * Delay before the next automatic attempt, based on the last recorded error.
 * A message ending in `status 429` gets the 15-minute backoff; everything else
 * (probe failures, 5xx, network errors) keeps the 60-second burst guard.
 */
export function automaticRetryDelayMs(lastError?: string): number {
  return lastError !== undefined && /status 429$/.test(lastError)
    ? MIGRATION_RATE_LIMIT_BACKOFF_MS
    : MIGRATION_RETRY_COOLDOWN_MS;
}

/**
 * Whether a failed migration should be queued for retry.
 *
 * Retryable: a fetch network failure (`TypeError`), or `Migration failed with status N`
 * where N is 401, 408, 429, or 5xx. `migrateGuestData` throws that message format
 * (apps/mobile/lib/migration.ts), so parsing it is the only signal available without
 * editing that file. Anything else (e.g. 422, "API URL is not configured") is
 * permanent and must not be retried forever.
 */
export function isRetryableMigrationError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (!(err instanceof Error)) return false;

  return /status (401|408|429|5\d\d)$/.test(err.message);
}
