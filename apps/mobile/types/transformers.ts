/**
 * API Response Transformers
 *
 * Handles the snake_case → camelCase conversion and field name normalization
 * when parsing API responses from the Python backend.
 *
 * CRITICAL: The backend uses `UPC` (uppercase) while frontend uses `upc` (lowercase).
 * These transformers ensure consistent field naming across the app.
 */

import type { Identifiers, ItemDetails, VisualCondition } from './item';
import type { MarketData, ConfidenceLevel, MarketDataStatus, PriceRange } from './market';

/**
 * Raw backend response for Identifiers (before transformation).
 * Note: UPC is uppercase in Python backend.
 */
interface RawIdentifiers {
  UPC?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
}

/**
 * Raw backend response for ItemIdentity (before transformation).
 */
interface RawItemIdentity {
  item_type: string;
  brand: string;
  model: string;
  visual_condition: string;
  condition_details: string;
  estimated_age: string;
  category_hint: string;
  search_keywords: string[];
  identifiers: RawIdentifiers;
}

/**
 * Raw backend response for market data (before transformation).
 */
interface RawMarketData {
  status: string;
  keywords: string;
  total_found: number;
  prices_analyzed?: number;
  outliers_removed?: number;
  price_range?: { min: number; max: number } | null;
  fair_market_value?: number;
  mean?: number;
  std_dev?: number;
  avg_days_to_sell?: number;
  confidence: string;
  message?: string;
}

/**
 * Valid visual condition values from the backend.
 */
const VALID_CONDITIONS: VisualCondition[] = [
  'new',
  'used_excellent',
  'used_good',
  'used_fair',
  'damaged',
];

/**
 * Valid confidence levels from the backend.
 */
const VALID_CONFIDENCE: ConfidenceLevel[] = ['HIGH', 'MEDIUM', 'LOW', 'NONE'];

/**
 * Valid market data statuses from the backend.
 */
const VALID_STATUSES: MarketDataStatus[] = ['success', 'no_data', 'no_prices'];

/**
 * Safely parse visual condition with fallback.
 * Guards against unexpected AI-generated values.
 */
function parseVisualCondition(value: string): VisualCondition {
  const normalized = value.toLowerCase().replace(/[- ]/g, '_');
  if (VALID_CONDITIONS.includes(normalized as VisualCondition)) {
    return normalized as VisualCondition;
  }
  // Attempt fuzzy matching for common variations
  if (normalized.includes('excellent') || normalized === 'like_new') {
    return 'used_excellent';
  }
  if (normalized.includes('good')) {
    return 'used_good';
  }
  if (normalized.includes('fair') || normalized === 'acceptable') {
    return 'used_fair';
  }
  if (normalized.includes('new') && !normalized.includes('used')) {
    return 'new';
  }
  // Default to used_good if unrecognized
  console.warn(`Unknown visual condition: "${value}", defaulting to "used_good"`);
  return 'used_good';
}

/**
 * Safely parse confidence level with fallback.
 */
function parseConfidence(value: string): ConfidenceLevel {
  const upper = value.toUpperCase();
  if (VALID_CONFIDENCE.includes(upper as ConfidenceLevel)) {
    return upper as ConfidenceLevel;
  }
  console.warn(`Unknown confidence level: "${value}", defaulting to "LOW"`);
  return 'LOW';
}

/**
 * Safely parse market data status with fallback.
 */
function parseStatus(value: string): MarketDataStatus {
  const lower = value.toLowerCase();
  if (VALID_STATUSES.includes(lower as MarketDataStatus)) {
    return lower as MarketDataStatus;
  }
  console.warn(`Unknown market status: "${value}", defaulting to "no_data"`);
  return 'no_data';
}

/**
 * Transform raw backend Identifiers to frontend format.
 * Handles UPC → upc conversion.
 */
export function transformIdentifiers(raw: RawIdentifiers): Identifiers {
  return {
    upc: raw.UPC ?? null,
    modelNumber: raw.model_number ?? null,
    serialNumber: raw.serial_number ?? null,
  };
}

/**
 * Transform raw backend ItemIdentity to frontend ItemDetails.
 * Converts all snake_case to camelCase and validates enums.
 */
export function transformItemDetails(raw: RawItemIdentity): ItemDetails {
  return {
    itemType: raw.item_type,
    brand: raw.brand,
    model: raw.model,
    visualCondition: parseVisualCondition(raw.visual_condition),
    conditionDetails: raw.condition_details,
    estimatedAge: raw.estimated_age,
    categoryHint: raw.category_hint,
    searchKeywords: raw.search_keywords,
    identifiers: transformIdentifiers(raw.identifiers),
  };
}

/**
 * Transform raw backend market data to frontend MarketData.
 * Converts all snake_case to camelCase and validates enums.
 */
export function transformMarketData(raw: RawMarketData): MarketData {
  const priceRange: PriceRange | undefined = raw.price_range
    ? { min: raw.price_range.min, max: raw.price_range.max }
    : undefined;

  return {
    status: parseStatus(raw.status),
    keywords: raw.keywords,
    totalFound: raw.total_found,
    pricesAnalyzed: raw.prices_analyzed,
    outliersRemoved: raw.outliers_removed,
    priceRange,
    fairMarketValue: raw.fair_market_value,
    mean: raw.mean,
    stdDev: raw.std_dev,
    avgDaysToSell: raw.avg_days_to_sell,
    confidence: parseConfidence(raw.confidence),
    message: raw.message,
  };
}

/**
 * Transform a complete valuation response from the backend.
 */
export function transformValuationResponse(raw: {
  item_identity: RawItemIdentity;
  market_data: RawMarketData;
}): { itemDetails: ItemDetails; marketData: MarketData } {
  return {
    itemDetails: transformItemDetails(raw.item_identity),
    marketData: transformMarketData(raw.market_data),
  };
}
