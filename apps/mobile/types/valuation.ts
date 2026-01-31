/**
 * Valuation Types
 *
 * Types for valuation requests, responses, and stored entities.
 */

import { ItemDetails } from './item';
import { MarketData } from './market';

/**
 * Status of a valuation process.
 */
export enum ValuationStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

/**
 * Request payload for initiating a valuation.
 */
export interface ValuationRequest {
  /** Base64 encoded image or image URL */
  imageBase64?: string;
  imageUrl?: string;

  /** Optional request options */
  options?: {
    /** Force refresh bypassing cache */
    forceRefresh?: boolean;
  };
}

/**
 * Response payload for a successful valuation.
 * Contains both item identification and market data.
 */
export interface ValuationResponse {
  /** AI-identified item details */
  itemDetails: ItemDetails;

  /** Market pricing data from eBay */
  marketData: MarketData;
}

/**
 * Full Valuation entity for storage and history.
 */
export interface Valuation {
  /** Unique valuation ID */
  id: string;

  /** ISO timestamp of creation */
  createdAt: string;

  /** Current status of the valuation */
  status: ValuationStatus;

  /** Original request data */
  request: ValuationRequest;

  /** Valuation result (present when status is SUCCESS) */
  response?: ValuationResponse;

  /** Error message (present when status is ERROR) */
  error?: string;

  /** Optional image URI for display */
  imageUri?: string;
}
