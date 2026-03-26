/**
 * Tests for findValuationById pure function
 * Story 3.4, AC7
 */

import { findValuationById } from '@/app/appraisal';
import { ValuationStatus } from '@/types/valuation';
import type { Valuation } from '@/types/valuation';

function makeValuation(overrides?: Partial<Valuation>): Valuation {
  return {
    createdAt: '2026-03-19T15:45:00.000Z',
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

describe('findValuationById', () => {
  it('finds a valuation by its id field', () => {
    const v = makeValuation({ id: 'uuid-abc-123' });
    const history = [makeValuation({ id: 'other-1' }), v, makeValuation({ id: 'other-2' })];
    expect(findValuationById(history, 'uuid-abc-123')).toBe(v);
  });

  it('falls back to createdAt match when no id field matches', () => {
    const v = makeValuation({ id: undefined, createdAt: '2026-03-19T10:00:00.000Z' });
    const history = [
      makeValuation({ id: 'other-1', createdAt: '2026-03-18T00:00:00.000Z' }),
      v,
    ];
    expect(findValuationById(history, '2026-03-19T10:00:00.000Z')).toBe(v);
  });

  it('returns undefined when no match found', () => {
    const history = [makeValuation({ id: 'v1' }), makeValuation({ id: 'v2' })];
    expect(findValuationById(history, 'does-not-exist')).toBeUndefined();
  });
});
