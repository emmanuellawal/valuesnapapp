/**
 * Local History Utility
 *
 * Async utility functions for managing guest valuation history in AsyncStorage.
 * Not a React hook — plain async functions for simplicity.
 *
 * - Stores up to 5 most recent valuations (NFR-G1 cap)
 * - Manages a stable guest session ID for backend association
 * - Recovers gracefully from malformed data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Valuation } from '@/types/valuation';

const HISTORY_KEY = 'valuesnap:local_history';
const GUEST_SESSION_KEY = 'valuesnap:guest_session_id';
const MAX_HISTORY_ITEMS = 5;

/**
 * Generate a UUID v4-style string.
 * Uses Math.random — sufficient for guest session IDs.
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a persistent guest session ID.
 * Aligns with GuestUser.sessionId from types/user.ts.
 */
export async function getOrCreateGuestSessionId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(GUEST_SESSION_KEY);
    if (existing) return existing;

    const newId = generateId();
    await AsyncStorage.setItem(GUEST_SESSION_KEY, newId);
    return newId;
  } catch {
    // If AsyncStorage fails entirely, return a transient ID
    return generateId();
  }
}

/**
 * Type guard: verify a parsed value has the minimum required Valuation shape.
 * Guards against corrupted or version-mismatched storage entries.
 */
function isValidValuation(item: unknown): item is Valuation {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Record<string, unknown>).status === 'string' &&
    typeof (item as Record<string, unknown>).createdAt === 'string'
  );
}

/**
 * Read local valuation history.
 * Returns empty array on any parse error or malformed data.
 * Filters out individual entries that do not match the Valuation shape.
 */
export async function getLocalHistory(): Promise<Valuation[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidValuation);
  } catch {
    return [];
  }
}

/**
 * Save a valuation to local history.
 * Prepends the new item and trims to the newest MAX_HISTORY_ITEMS.
 */
export async function saveToLocalHistory(valuation: Valuation): Promise<void> {
  try {
    const current = await getLocalHistory();
    const updated = [valuation, ...current].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Best-effort — don't crash the app if local storage fails
  }
}

/**
 * Delete a valuation from local history by id or createdAt fallback.
 * Matches the same dual-key lookup strategy used in findValuationById.
 * Best-effort — if AsyncStorage fails, history remains unchanged.
 */
export async function deleteFromLocalHistory(id: string): Promise<void> {
  try {
    const current = await getLocalHistory();
    const updated = current.filter((v) => v.id !== id && v.createdAt !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Best-effort: if delete fails, history remains unchanged
  }
}

/**
 * Clear all locally stored guest valuation history.
 * Best-effort only — server data has already become the source of truth.
 */
export async function clearLocalHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    // Best-effort: if clear fails, stale local history may remain on disk
  }
}
