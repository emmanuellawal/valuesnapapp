/**
 * Pending Migration Queue (Story 6.12)
 *
 * Durable AsyncStorage record for a guest-to-account migration that failed with
 * a retryable error. Plain async functions, same shape as lib/localHistory.ts:
 * every call is wrapped in try/catch and resolves to a safe default. Nothing
 * here ever throws.
 *
 * The record holds bookkeeping only. It never holds an access token, a session
 * value, or any other credential: `userId` is the Supabase user UUID and
 * `guestSessionId` is a locally generated UUID.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_MIGRATION_KEY = 'valuesnap:pending_migration';

export interface PendingMigration {
  /** Supabase user id the import was started for. Auto-retry only runs for this user. */
  userId: string;
  guestSessionId: string;
  /** ISO timestamp of the first failure. */
  queuedAt: string;
  /** Starts at 1, increments per failed attempt (including probe failures). */
  attempts: number;
  /** ISO timestamp of the most recent failed attempt (including probe failures). */
  lastAttemptAt: string;
  /** Last caught error's message, for debugging and 429 detection. Never a token. */
  lastError?: string;
}

/**
 * Type guard: verify a parsed value has the required PendingMigration shape.
 * Guards against corrupted or version-mismatched storage entries.
 */
function isValidPendingMigration(item: unknown): item is PendingMigration {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;

  const record = item as Record<string, unknown>;
  return (
    typeof record.userId === 'string' &&
    record.userId.trim().length > 0 &&
    typeof record.guestSessionId === 'string' &&
    record.guestSessionId.trim().length > 0 &&
    typeof record.queuedAt === 'string' &&
    record.queuedAt.trim().length > 0 &&
    typeof record.lastAttemptAt === 'string' &&
    record.lastAttemptAt.trim().length > 0 &&
    typeof record.attempts === 'number' &&
    Number.isInteger(record.attempts) &&
    record.attempts >= 1
  );
}

/**
 * Read the pending migration record.
 * Returns null when absent, malformed, or when storage fails.
 */
export async function getPendingMigration(): Promise<PendingMigration | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_MIGRATION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidPendingMigration(parsed)) return null;

    return {
      userId: parsed.userId,
      guestSessionId: parsed.guestSessionId,
      queuedAt: parsed.queuedAt,
      attempts: parsed.attempts,
      lastAttemptAt: parsed.lastAttemptAt,
      ...(typeof parsed.lastError === 'string' ? { lastError: parsed.lastError } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Persist the pending migration record. Best-effort: storage errors are swallowed.
 * Only the declared bookkeeping fields are written, so a caller passing a wider
 * object cannot leak an extra value (e.g. a token) into storage.
 */
export async function savePendingMigration(record: PendingMigration): Promise<void> {
  try {
    const safe: PendingMigration = {
      userId: record.userId,
      guestSessionId: record.guestSessionId,
      queuedAt: record.queuedAt,
      attempts: record.attempts,
      lastAttemptAt: record.lastAttemptAt,
      ...(record.lastError !== undefined ? { lastError: record.lastError } : {}),
    };
    await AsyncStorage.setItem(PENDING_MIGRATION_KEY, JSON.stringify(safe));
  } catch {
    // Best-effort: the manual "Import to account" button still works without a record.
  }
}

/**
 * Delete the pending migration record. Best-effort: storage errors are swallowed.
 */
export async function clearPendingMigration(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_MIGRATION_KEY);
  } catch {
    // Best-effort: a stale record is harmless. The server's IS NULL guard makes a
    // repeat migrate call return {"migrated": 0}.
  }
}
