/**
 * Tests for lib/migrationQueue.ts
 * Story 6.12, AC1 + AC4
 *
 * Tests the REAL module against the real AsyncStorage mock, so storage is
 * cleared before each test (the mock backs onto a module-level object).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPendingMigration,
  getPendingMigration,
  savePendingMigration,
  type PendingMigration,
} from '@/lib/migrationQueue';

const KEY = 'valuesnap:pending_migration';

function makeRecord(overrides?: Partial<PendingMigration>): PendingMigration {
  return {
    userId: 'user-123',
    guestSessionId: 'guest-123',
    queuedAt: '2026-11-11T00:00:00.000Z',
    attempts: 1,
    lastAttemptAt: '2026-11-11T00:00:00.000Z',
    lastError: 'Migration failed with status 503',
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('migrationQueue', () => {
  it('returns null when nothing is stored', async () => {
    await expect(getPendingMigration()).resolves.toBeNull();
  });

  it('round-trips a saved record', async () => {
    const record = makeRecord();
    await savePendingMigration(record);

    await expect(getPendingMigration()).resolves.toEqual(record);
  });

  it('stores under the valuesnap-prefixed key', async () => {
    await savePendingMigration(makeRecord());

    expect(await AsyncStorage.getItem(KEY)).not.toBeNull();
  });

  it('overwrites an existing record', async () => {
    await savePendingMigration(makeRecord({ attempts: 1 }));
    await savePendingMigration(makeRecord({ attempts: 2 }));

    const stored = await getPendingMigration();
    expect(stored?.attempts).toBe(2);
  });

  it('clears the record', async () => {
    await savePendingMigration(makeRecord());
    await clearPendingMigration();

    await expect(getPendingMigration()).resolves.toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('clear is a no-op when nothing is stored', async () => {
    await expect(clearPendingMigration()).resolves.toBeUndefined();
  });

  it('never persists anything beyond the declared bookkeeping fields', async () => {
    await savePendingMigration(
      // Simulate a caller sneaking a secret in via a wider object.
      { ...makeRecord(), access_token: 'secret-token' } as PendingMigration,
    );

    const raw = (await AsyncStorage.getItem(KEY)) ?? '';
    expect(raw).not.toContain('secret-token');
    expect(raw).not.toContain('access_token');
  });

  describe('malformed data recovery', () => {
    it('returns null for non-JSON content', async () => {
      await AsyncStorage.setItem(KEY, '{not json');

      await expect(getPendingMigration()).resolves.toBeNull();
    });

    it('returns null when the JSON is not an object', async () => {
      await AsyncStorage.setItem(KEY, JSON.stringify(['a', 'b']));

      await expect(getPendingMigration()).resolves.toBeNull();
    });

    it('returns null when JSON is null', async () => {
      await AsyncStorage.setItem(KEY, 'null');

      await expect(getPendingMigration()).resolves.toBeNull();
    });

    it.each([
      ['userId', { userId: 42 }],
      ['empty userId', { userId: '   ' }],
      ['guestSessionId', { guestSessionId: undefined }],
      ['empty guestSessionId', { guestSessionId: '' }],
      ['queuedAt', { queuedAt: 123 }],
      ['lastAttemptAt', { lastAttemptAt: null }],
      ['attempts string', { attempts: '1' }],
      ['attempts zero', { attempts: 0 }],
      ['attempts negative', { attempts: -2 }],
      ['attempts float', { attempts: 1.5 }],
    ])('returns null when %s has an invalid value', async (_field, patch) => {
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...makeRecord(), ...patch }));

      await expect(getPendingMigration()).resolves.toBeNull();
    });

    it('returns null when attempts is not a finite number', async () => {
      await AsyncStorage.setItem(
        KEY,
        // JSON cannot encode NaN/Infinity; they serialise to null.
        JSON.stringify({ ...makeRecord(), attempts: Number.POSITIVE_INFINITY }),
      );

      await expect(getPendingMigration()).resolves.toBeNull();
    });
  });

  describe('storage failures never throw', () => {
    it('getPendingMigration resolves null when getItem rejects', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));

      await expect(getPendingMigration()).resolves.toBeNull();
    });

    it('savePendingMigration swallows setItem rejection', async () => {
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

      await expect(savePendingMigration(makeRecord())).resolves.toBeUndefined();
    });

    it('clearPendingMigration swallows removeItem rejection', async () => {
      jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk'));

      await expect(clearPendingMigration()).resolves.toBeUndefined();
    });
  });
});
