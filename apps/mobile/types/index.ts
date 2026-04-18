/**
 * Barrel export for all shared types.
 *
 * Usage:
 * ```typescript
 * import {
 *   ApiResponse,
 *   ItemDetails,
 *   MarketData,
 *   Valuation
 * } from '@/types';
 * ```
 */

// API types
export {
  ErrorCode,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
} from './api';

// Item identification types
export {
  type VisualCondition,
  type Identifiers,
  type ItemDetails,
} from './item';

// Market data types
export {
  type ConfidenceLevel,
  type MarketDataStatus,
  type PriceRange,
  type MarketData,
} from './market';

// Valuation types
export {
  ValuationStatus,
  type ValuationRequest,
  type ValuationResponse,
  type Valuation,
  type ConfidenceData,
} from './valuation';

// Listing types
export {
  LISTING_TITLE_MAX_LENGTH,
  LISTING_CONDITION_VALUES,
  listingFormSchema,
  type ListingCondition,
  type ListingFormValues,
  type ListingDraft,
} from './listing';

// User and auth types
export {
  type UserTier,
  type User,
  type GuestUser,
  type AuthState,
  isUser,
  isGuestUser,
} from './user';

// Transformers for API response parsing
export {
  transformIdentifiers,
  transformItemDetails,
  transformMarketData,
  transformConfidenceData,
  transformValuationResponse,
} from './transformers';

// Mock data factories (for testing/development)
export {
  createMockIdentifiers,
  createMockItemDetails,
  createMockPriceRange,
  createMockMarketData,
  createMockValuationRequest,
  createMockValuationResponse,
  createMockValuation,
  MOCK_CANON_CAMERA,
  MOCK_SONY_HEADPHONES,
  MOCK_MEDIUM_CONFIDENCE_ITEM,
  MOCK_LOW_CONFIDENCE_ITEM,
  MOCK_UNKNOWN_ITEM,
} from './mocks';
