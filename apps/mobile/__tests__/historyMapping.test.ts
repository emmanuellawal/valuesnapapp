/**
 * Tests for mapValuationsToGridItems pure function
 * Story 3.3, AC6
 */

import { mapValuationsToGridItems } from '@/app/(tabs)/history';
import { ValuationStatus } from '@/types/valuation';
import type { Valuation } from '@/types/valuation';

function makeValuation(overrides?: Partial<Valuation>): Valuation {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    status: ValuationStatus.SUCCESS,
    request: {},
    response: {
      itemDetails: {
        itemType: 'camera',
        brand: 'Canon',
        model: 'AE-1',
        visualCondition: 'used_good',
        conditionDetails: 'Minor wear',
        estimatedAge: '1970s',
        categoryHint: 'Cameras',
        searchKeywords: ['Canon AE-1', 'film camera'],
        identifiers: { upc: null, modelNumber: null, serialNumber: null },
      },
      marketData: {
        status: 'success',
        keywords: 'Canon AE-1 film camera',
        totalFound: 20,
        pricesAnalyzed: 15,
        priceRange: { min: 80, max: 200 },
        fairMarketValue: 130,
        confidence: 'HIGH',
      },
    },
    ...overrides,
  };
}

describe('mapValuationsToGridItems', () => {
  it('maps a successful valuation to HistoryGridItem with correct fields', () => {
    const val = makeValuation({ id: 'abc123' });
    const result = mapValuationsToGridItems([val]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('abc123');
    expect(result[0].itemDetails).toEqual(val.response!.itemDetails);
    expect(result[0].marketData).toEqual(val.response!.marketData);
    expect(result[0].imageUri).toBeUndefined();
  });

  it('filters out valuations with non-SUCCESS status', () => {
    const pending = makeValuation({ status: ValuationStatus.PENDING });
    const error = makeValuation({ status: ValuationStatus.ERROR });
    const success = makeValuation({ id: 'keep-me' });

    const result = mapValuationsToGridItems([pending, error, success]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('keep-me');
  });

  it('filters out SUCCESS valuations with undefined response', () => {
    const noResponse = makeValuation({ response: undefined });
    const result = mapValuationsToGridItems([noResponse]);

    expect(result).toHaveLength(0);
  });

  it('falls back to createdAt when valuation.id is undefined', () => {
    const val = makeValuation({ id: undefined });
    const result = mapValuationsToGridItems([val]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2026-01-01T00:00:00.000Z');
  });

  it('passes imageUri through when present', () => {
    const val = makeValuation({ id: 'with-image', imageUri: 'file:///photo.jpg' });
    const result = mapValuationsToGridItems([val]);

    expect(result[0].imageUri).toBe('file:///photo.jpg');
  });
});
