/**
 * Market Data Types
 *
 * These types mirror the response structure from the backend eBay mock service.
 * Field names are converted from snake_case to camelCase.
 *
 * Backend source: backend/services/mocks/mock_ebay.py search_sold_listings()
 */

/**
 * Confidence level for market data accuracy.
 * Based on sample size and data quality.
 *
 * - HIGH: 10+ listings found, reliable pricing
 * - MEDIUM: Not currently used by backend
 * - LOW: 1-4 listings found, less reliable
 * - NONE: No listings found
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/**
 * Market data status indicating the type of response.
 *
 * - success: Valid pricing data available
 * - no_data: No listings found for search terms
 * - no_prices: Listings found but no valid prices extracted
 */
export type MarketDataStatus = 'success' | 'no_data' | 'no_prices';

/**
 * Price range with min and max values.
 * Backend field: price_range
 */
export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Market data from eBay search results.
 * Maps to backend mock_ebay.py search_sold_listings() response.
 *
 * Backend field mapping (snake_case → camelCase):
 *   - status → status
 *   - keywords → keywords
 *   - total_found → totalFound
 *   - prices_analyzed → pricesAnalyzed
 *   - outliers_removed → outliersRemoved
 *   - price_range → priceRange
 *   - fair_market_value → fairMarketValue
 *   - mean → mean
 *   - std_dev → stdDev
 *   - confidence → confidence
 *   - message → message (optional, for error states)
 *
 * @example
 * ```typescript
 * const marketData: MarketData = {
 *   status: 'success',
 *   keywords: 'Rolex Submariner stainless',
 *   totalFound: 15,
 *   pricesAnalyzed: 15,
 *   outliersRemoved: 0,
 *   priceRange: { min: 4500, max: 8500 },
 *   fairMarketValue: 6200,
 *   mean: 6150,
 *   stdDev: 850,
 *   confidence: 'HIGH'
 * };
 * ```
 */
export interface MarketData {
  /** Response status: 'success', 'no_data', or 'no_prices' */
  status: MarketDataStatus;

  /** Search keywords used for eBay query */
  keywords: string;

  /** Total number of listings found */
  totalFound: number;

  /** Number of prices analyzed (after filtering) */
  pricesAnalyzed?: number;

  /** Number of outliers removed from analysis */
  outliersRemoved?: number;

  /** Price range with min and max values */
  priceRange?: PriceRange;

  /** Fair market value (median price) */
  fairMarketValue?: number;

  /** Mean (average) price */
  mean?: number;

  /** Standard deviation of prices */
  stdDev?: number;

  /** Average days to sell (market velocity indicator) */
  avgDaysToSell?: number;

  /** Confidence level based on sample size */
  confidence: ConfidenceLevel;

  /** Optional message (used for error states like 'no_data') */
  message?: string;
}
