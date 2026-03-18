/**
 * Mock Data Factories
 *
 * Type-safe factory functions for creating test/mock data.
 * Provides sensible defaults with override capability.
 */

import type { Identifiers, ItemDetails, VisualCondition } from './item';
import type { MarketData, ConfidenceLevel, MarketDataStatus, PriceRange } from './market';
import type { Valuation, ValuationRequest, ValuationResponse } from './valuation';
import { ValuationStatus } from './valuation';

/**
 * Create mock Identifiers with optional overrides.
 */
export function createMockIdentifiers(
  overrides?: Partial<Identifiers>
): Identifiers {
  return {
    upc: null,
    modelNumber: null,
    serialNumber: null,
    ...overrides,
  };
}

/**
 * Create mock ItemDetails with optional overrides.
 * Ensures all required fields are present with sensible defaults.
 */
export function createMockItemDetails(
  overrides?: Partial<ItemDetails>
): ItemDetails {
  return {
    itemType: 'test item',
    brand: 'Test Brand',
    model: 'Test Model',
    visualCondition: 'used_good',
    conditionDetails: 'Minor wear, good condition',
    estimatedAge: 'unknown',
    categoryHint: 'Test Category',
    searchKeywords: ['test', 'item'],
    identifiers: createMockIdentifiers(overrides?.identifiers),
    ...overrides,
  };
}

/**
 * Create mock PriceRange with optional overrides.
 */
export function createMockPriceRange(
  overrides?: Partial<PriceRange>
): PriceRange {
  return {
    min: 100,
    max: 200,
    ...overrides,
  };
}

/**
 * Create mock MarketData with optional overrides.
 * Supports different status scenarios.
 */
export function createMockMarketData(
  overrides?: Partial<MarketData>
): MarketData {
  const status = overrides?.status ?? 'success';

  // Base fields present in all statuses
  const base: MarketData = {
    status,
    keywords: 'test keywords',
    totalFound: 0,
    confidence: 'NONE',
    ...overrides,
  };

  // Add success-specific fields if status is success
  if (status === 'success') {
    return {
      ...base,
      totalFound: overrides?.totalFound ?? 15,
      pricesAnalyzed: overrides?.pricesAnalyzed ?? 15,
      outliersRemoved: overrides?.outliersRemoved ?? 0,
      priceRange: overrides?.priceRange ?? createMockPriceRange(),
      fairMarketValue: overrides?.fairMarketValue ?? 150,
      mean: overrides?.mean ?? 145,
      stdDev: overrides?.stdDev ?? 25,
      avgDaysToSell: overrides && 'avgDaysToSell' in overrides
        ? overrides.avgDaysToSell
        : 7,
      confidence: overrides?.confidence ?? 'HIGH',
    };
  }

  // Error statuses have minimal fields
  return {
    ...base,
    message: overrides?.message ?? 'No data available',
  };
}

/**
 * Create mock ValuationRequest with optional overrides.
 */
export function createMockValuationRequest(
  overrides?: Partial<ValuationRequest>
): ValuationRequest {
  return {
    imageBase64: 'base64encodedimage...',
    ...overrides,
  };
}

/**
 * Create mock ValuationResponse with optional overrides.
 */
export function createMockValuationResponse(
  overrides?: Partial<ValuationResponse>
): ValuationResponse {
  return {
    itemDetails: createMockItemDetails(overrides?.itemDetails),
    marketData: createMockMarketData(overrides?.marketData),
    ...overrides,
  };
}

/**
 * Create mock Valuation entity with optional overrides.
 */
export function createMockValuation(
  overrides?: Partial<Valuation>
): Valuation {
  const id = overrides?.id ?? `val_${Date.now()}`;
  return {
    id,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    status: overrides?.status ?? ValuationStatus.SUCCESS,
    request: createMockValuationRequest(overrides?.request),
    response: createMockValuationResponse(overrides?.response),
    ...overrides,
  };
}

// ============================================================
// Pre-built Mock Scenarios
// ============================================================

/**
 * Mock: Canon AE-1 vintage camera (high confidence)
 */
export const MOCK_CANON_CAMERA: { itemDetails: ItemDetails; marketData: MarketData } = {
  itemDetails: createMockItemDetails({
    itemType: 'vintage camera',
    brand: 'Canon',
    model: 'AE-1',
    visualCondition: 'used_good',
    conditionDetails: 'Minor wear on body, lens clear',
    estimatedAge: '1980s',
    categoryHint: 'Film Cameras',
    searchKeywords: ['Canon AE-1', 'vintage film camera', '35mm SLR'],
    identifiers: createMockIdentifiers({ modelNumber: 'AE-1' }),
  }),
  marketData: createMockMarketData({
    keywords: 'Canon AE-1 film camera',
    totalFound: 12,
    pricesAnalyzed: 12,
    priceRange: { min: 150, max: 350 },
    fairMarketValue: 249,
    mean: 245,
    stdDev: 55,
    confidence: 'HIGH',
  }),
};

/**
 * Mock: Sony headphones (medium confidence)
 */
export const MOCK_SONY_HEADPHONES: { itemDetails: ItemDetails; marketData: MarketData } = {
  itemDetails: createMockItemDetails({
    itemType: 'wireless headphones',
    brand: 'Sony',
    model: 'WH-1000XM4',
    visualCondition: 'used_excellent',
    conditionDetails: 'Like new, original packaging included',
    estimatedAge: '2020s',
    categoryHint: 'Headphones',
    searchKeywords: ['Sony WH-1000XM4', 'noise cancelling', 'wireless headphones'],
    identifiers: createMockIdentifiers({ modelNumber: 'WH-1000XM4' }),
  }),
  marketData: createMockMarketData({
    keywords: 'Sony WH-1000XM4 headphones',
    totalFound: 8,
    pricesAnalyzed: 8,
    priceRange: { min: 180, max: 280 },
    fairMarketValue: 225,
    mean: 220,
    stdDev: 30,
    confidence: 'HIGH',
  }),
};

/**
 * Mock: MEDIUM confidence market data scenario.
 * Moderate sample size with some price variance.
 * Use for testing MEDIUM confidence display (regular typography, no warning).
 */
export const MOCK_MEDIUM_CONFIDENCE_ITEM = createMockMarketData({
  confidence: 'MEDIUM',
  totalFound: 12,
  pricesAnalyzed: 12,
  fairMarketValue: 145,
  priceRange: { min: 95, max: 210 },
  mean: 148,
  stdDev: 35,
});

/**
 * Mock: LOW confidence market data scenario.
 * Few sales with high uncertainty.
 * Use for testing LOW confidence display (ConfidenceWarning, Signal color, verify link).
 */
export const MOCK_LOW_CONFIDENCE_ITEM = createMockMarketData({
  confidence: 'LOW',
  totalFound: 3,
  pricesAnalyzed: 3,
  fairMarketValue: 55,
  priceRange: { min: 30, max: 85 },
  mean: 57,
  stdDev: 28,
});

/**
 * Mock: Unknown item (low confidence)
 */
export const MOCK_UNKNOWN_ITEM: { itemDetails: ItemDetails; marketData: MarketData } = {
  itemDetails: createMockItemDetails({
    itemType: 'decorative object',
    brand: 'unknown',
    model: 'unknown',
    visualCondition: 'used_fair',
    conditionDetails: 'Some wear visible, age uncertain',
    estimatedAge: 'unknown',
    categoryHint: 'Collectibles',
    searchKeywords: ['vintage decorative', 'collectible'],
  }),
  marketData: createMockMarketData({
    status: 'no_data',
    keywords: 'vintage decorative collectible',
    totalFound: 0,
    confidence: 'NONE',
    message: 'No listings found for these search terms',
  }),
};
