/**
 * Tests for constants/migration.ts
 * Story 6.12, AC1 + AC3
 */

import {
  BACKEND_HEALTH_TIMEOUT_MS,
  MIGRATION_RATE_LIMIT_BACKOFF_MS,
  MIGRATION_RETRY_COOLDOWN_MS,
  automaticRetryDelayMs,
  isRetryableMigrationError,
} from '@/constants/migration';

describe('migration constants', () => {
  it('uses a 5 second health-probe timeout', () => {
    expect(BACKEND_HEALTH_TIMEOUT_MS).toBe(5000);
  });

  it('uses a 60 second burst guard', () => {
    expect(MIGRATION_RETRY_COOLDOWN_MS).toBe(60000);
  });

  it('uses a 15 minute rate-limit backoff', () => {
    expect(MIGRATION_RATE_LIMIT_BACKOFF_MS).toBe(900000);
  });
});

describe('automaticRetryDelayMs', () => {
  it('returns the burst guard when there is no last error', () => {
    expect(automaticRetryDelayMs()).toBe(MIGRATION_RETRY_COOLDOWN_MS);
    expect(automaticRetryDelayMs(undefined)).toBe(MIGRATION_RETRY_COOLDOWN_MS);
  });

  it('returns the 15 minute backoff for a 429', () => {
    expect(automaticRetryDelayMs('Migration failed with status 429')).toBe(
      MIGRATION_RATE_LIMIT_BACKOFF_MS,
    );
  });

  it.each([
    'Health check failed',
    'Migration failed with status 503',
    'Migration failed with status 401',
    'Failed to fetch',
  ])('returns the burst guard for %s', (message) => {
    expect(automaticRetryDelayMs(message)).toBe(MIGRATION_RETRY_COOLDOWN_MS);
  });

  it('does not treat 4290-style suffixes as a 429', () => {
    expect(automaticRetryDelayMs('Migration failed with status 4290')).toBe(
      MIGRATION_RETRY_COOLDOWN_MS,
    );
  });
});

describe('isRetryableMigrationError', () => {
  it('is true for a fetch network failure (TypeError)', () => {
    expect(isRetryableMigrationError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it.each([401, 408, 429, 500, 502, 503, 599])('is true for status %i', (status) => {
    expect(isRetryableMigrationError(new Error(`Migration failed with status ${status}`))).toBe(
      true,
    );
  });

  it.each([
    ['bare numeric message', new Error('500')],
    ['missing config', new Error('API URL is not configured')],
    ['422 unprocessable', new Error('Migration failed with status 422')],
    ['400 bad request', new Error('Migration failed with status 400')],
    ['403 forbidden', new Error('Migration failed with status 403')],
    ['404 not found', new Error('Migration failed with status 404')],
    ['600 out of range', new Error('Migration failed with status 600')],
    ['trailing text after status', new Error('Migration failed with status 503 oops')],
    ['non-Error string', 'Migration failed with status 503'],
    ['null', null],
    ['undefined', undefined],
  ])('is false for %s', (_label, err) => {
    expect(isRetryableMigrationError(err)).toBe(false);
  });
});
