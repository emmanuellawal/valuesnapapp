/**
 * Tests for lib/localHistory.ts
 * Story 3.2, AC5 + AC7
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateGuestSessionId, getLocalHistory, saveToLocalHistory, deleteFromLocalHistory } from '@/lib/localHistory';
import { ValuationStatus } from '@/types/valuation';
import type { Valuation } from '@/types/valuation';

// jest-expo provides an AsyncStorage mock automatically

beforeEach(async () => {
  await AsyncStorage.clear();
});

function makeValuation(overrides?: Partial<Valuation>): Valuation {
  return {
    createdAt: new Date().toISOString(),
    status: ValuationStatus.SUCCESS,
    request: {},
    response: {
      itemDetails: {
        itemType: 'test',
        brand: 'Brand',
        model: 'Model',
        visualCondition: 'used_good',
        conditionDetails: '',
        estimatedAge: 'unknown',
        categoryHint: '',
        searchKeywords: [],
        identifiers: { upc: null, modelNumber: null, serialNumber: null },
      },
      marketData: {
        status: 'success',
        keywords: 'test',
        totalFound: 10,
        confidence: 'HIGH',
      },
    },
    ...overrides,
  };
}

describe('getOrCreateGuestSessionId', () => {
  it('creates a new session ID when none exists', async () => {
    const id = await getOrCreateGuestSessionId();
    expect(id).toBeTruthy();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns the same session ID on subsequent calls', async () => {
    const first = await getOrCreateGuestSessionId();
    const second = await getOrCreateGuestSessionId();
    expect(first).toBe(second);
  });
});

describe('getLocalHistory', () => {
  it('returns empty array when no history exists', async () => {
    const history = await getLocalHistory();
    expect(history).toEqual([]);
  });

  it('returns empty array on malformed JSON', async () => {
    await AsyncStorage.setItem('valuesnap:local_history', 'not-valid-json{{{');
    const history = await getLocalHistory();
    expect(history).toEqual([]);
  });

  it('returns empty array when stored value is not an array', async () => {
    await AsyncStorage.setItem('valuesnap:local_history', JSON.stringify({ not: 'array' }));
    const history = await getLocalHistory();
    expect(history).toEqual([]);
  });
});

describe('saveToLocalHistory', () => {
  it('saves a valuation to history', async () => {
    const val = makeValuation({ id: 'v1' });
    await saveToLocalHistory(val);

    const history = await getLocalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('v1');
  });

  it('prepends new items (newest first)', async () => {
    await saveToLocalHistory(makeValuation({ id: 'v1' }));
    await saveToLocalHistory(makeValuation({ id: 'v2' }));

    const history = await getLocalHistory();
    expect(history[0].id).toBe('v2');
    expect(history[1].id).toBe('v1');
  });

  it('enforces 5-item cap (NFR-G1)', async () => {
    for (let i = 1; i <= 7; i++) {
      await saveToLocalHistory(makeValuation({ id: `v${i}` }));
    }

    const history = await getLocalHistory();
    expect(history).toHaveLength(5);
    // Newest first: v7, v6, v5, v4, v3
    expect(history[0].id).toBe('v7');
    expect(history[4].id).toBe('v3');
  });

  it('recovers from malformed storage on save', async () => {
    // Pre-populate with garbage
    await AsyncStorage.setItem('valuesnap:local_history', 'garbage');

    // Saving should still work (getLocalHistory returns [] on bad data)
    await saveToLocalHistory(makeValuation({ id: 'v1' }));

    const history = await getLocalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('v1');
  });
});

describe('deleteFromLocalHistory', () => {
  it('removes a valuation by id field', async () => {
    await saveToLocalHistory(makeValuation({ id: 'keep-1' }));
    await saveToLocalHistory(makeValuation({ id: 'delete-me' }));
    await saveToLocalHistory(makeValuation({ id: 'keep-2' }));

    await deleteFromLocalHistory('delete-me');

    const history = await getLocalHistory();
    expect(history).toHaveLength(2);
    expect(history.find((v) => v.id === 'delete-me')).toBeUndefined();
  });

  it('removes a valuation by createdAt fallback when no id', async () => {
    const target = makeValuation({ id: undefined, createdAt: '2026-03-19T10:00:00.000Z' });
    await saveToLocalHistory(makeValuation({ id: 'keep-1' }));
    await saveToLocalHistory(target);

    await deleteFromLocalHistory('2026-03-19T10:00:00.000Z');

    const history = await getLocalHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('keep-1');
  });

  it('does nothing when id does not match any entry', async () => {
    await saveToLocalHistory(makeValuation({ id: 'v1' }));
    await saveToLocalHistory(makeValuation({ id: 'v2' }));

    await deleteFromLocalHistory('no-such-id');

    const history = await getLocalHistory();
    expect(history).toHaveLength(2);
  });
});
