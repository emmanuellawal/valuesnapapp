/**
 * Item Identification Types
 *
 * These types mirror the backend `ItemIdentity` and `Identifiers` models
 * from `backend/models.py`. Field names are converted from snake_case to camelCase.
 *
 * Backend source: backend/models.py
 */

/**
 * Visual condition of the item as assessed from the image.
 * Maps to backend `visual_condition` field values.
 *
 * Backend field: visual_condition (snake_case)
 */
export type VisualCondition =
  | 'new'
  | 'used_excellent'
  | 'used_good'
  | 'used_fair'
  | 'damaged';

/**
 * Product identifiers visible in the image.
 * Maps to backend `Identifiers` Pydantic model.
 *
 * Backend source: backend/models.py Identifiers class
 * Field mapping:
 *   - UPC → upc
 *   - model_number → modelNumber
 *   - serial_number → serialNumber
 */
export interface Identifiers {
  /** UPC barcode if visible */
  upc: string | null;
  /** Model number from labels */
  modelNumber: string | null;
  /** Serial number if visible */
  serialNumber: string | null;
}

/**
 * Detailed item identification from AI vision analysis.
 * Maps to backend `ItemIdentity` Pydantic model.
 *
 * Backend source: backend/models.py ItemIdentity class
 * Field mapping (snake_case → camelCase):
 *   - item_type → itemType
 *   - brand → brand
 *   - model → model
 *   - visual_condition → visualCondition
 *   - condition_details → conditionDetails
 *   - estimated_age → estimatedAge
 *   - category_hint → categoryHint
 *   - search_keywords → searchKeywords
 *   - description → description
 *   - identifiers → identifiers
 *
 * @example
 * ```typescript
 * const itemDetails: ItemDetails = {
 *   itemType: 'vintage wristwatch',
 *   brand: 'Rolex',
 *   model: 'Submariner',
 *   visualCondition: 'used_excellent',
 *   conditionDetails: 'Minor hairline scratches on bracelet',
 *   estimatedAge: '1990s',
 *   categoryHint: 'Wristwatches',
 *   searchKeywords: ['Rolex Submariner', 'Rolex automatic'],
 *   description: 'Vintage Rolex Submariner with light wear and a clean dial.',
 *   identifiers: {
 *     upc: null,
 *     modelNumber: 'Submariner',
 *     serialNumber: null
 *   }
 * };
 * ```
 */
export interface ItemDetails {
  /** Specific item category (e.g., 'wireless headphones', 'vintage wristwatch') */
  itemType: string;

  /** Brand name if identifiable, otherwise 'unknown' */
  brand: string;

  /** Model name or number, defaults to 'unknown' */
  model: string;

  /** Visual state of the item */
  visualCondition: VisualCondition;

  /** Brief notes on scratches, dents, or packaging state */
  conditionDetails: string;

  /** Age estimate (e.g., '1990s'), defaults to 'unknown' */
  estimatedAge: string;

  /** Best eBay category string for search */
  categoryHint: string;

  /** 3-5 precise keywords for eBay search API */
  searchKeywords: string[];

  /** eBay listing description (1-3 sentences). Empty string when AI did not provide one. */
  description: string;

  /** Product identifiers visible in the image */
  identifiers: Identifiers;
}
