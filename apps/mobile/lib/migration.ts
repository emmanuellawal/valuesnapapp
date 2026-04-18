import type { HistoryGridItem } from '@/components/organisms/history-grid';
import { env } from '@/lib/env';
import type { ItemDetails, VisualCondition } from '@/types/item';
import type { ConfidenceLevel, MarketData, MarketDataStatus } from '@/types/market';

export interface ServerValuation {
  id: string;
  item_name: string;
  item_type: string;
  brand: string | null;
  price_min: number | null;
  price_max: number | null;
  fair_market_value: number | null;
  confidence: string | null;
  sample_size: number | null;
  image_thumbnail_url: string | null;
  ai_response: Record<string, unknown> | null;
  ebay_data: Record<string, unknown> | null;
  confidence_data: Record<string, unknown> | null;
  created_at: string | null;
}

const VISUAL_CONDITIONS: VisualCondition[] = [
  'new',
  'used_excellent',
  'used_good',
  'used_fair',
  'damaged',
];

const MARKET_STATUSES: MarketDataStatus[] = ['success', 'no_data', 'no_prices'];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['HIGH', 'MEDIUM', 'LOW', 'NONE'];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function asVisualCondition(value: unknown): VisualCondition {
  return typeof value === 'string' && VISUAL_CONDITIONS.includes(value as VisualCondition)
    ? (value as VisualCondition)
    : 'used_good';
}

function asMarketStatus(value: unknown): MarketDataStatus {
  return typeof value === 'string' && MARKET_STATUSES.includes(value as MarketDataStatus)
    ? (value as MarketDataStatus)
    : 'success';
}

function asConfidenceLevel(value: unknown): ConfidenceLevel {
  return typeof value === 'string' && CONFIDENCE_LEVELS.includes(value as ConfidenceLevel)
    ? (value as ConfidenceLevel)
    : 'LOW';
}

function mapServerValuationToGridItem(valuation: ServerValuation): HistoryGridItem {
  const ai = asRecord(valuation.ai_response);
  const ebay = asRecord(valuation.ebay_data);
  const identifiers = asRecord(ai.identifiers);

  const itemDetails: ItemDetails = {
    itemType: asString(ai.item_type) ?? valuation.item_type ?? 'unknown',
    brand: asString(ai.brand) ?? valuation.brand ?? 'unknown',
    model: asString(ai.model) ?? 'unknown',
    visualCondition: asVisualCondition(ai.visual_condition),
    conditionDetails: asString(ai.condition_details) ?? '',
    estimatedAge: asString(ai.estimated_age) ?? 'unknown',
    categoryHint: asString(ai.category_hint) ?? 'unknown',
    searchKeywords: asStringArray(ai.search_keywords),
    identifiers: {
      upc: asString(identifiers.UPC) ?? null,
      modelNumber: asString(identifiers.model_number) ?? null,
      serialNumber: asString(identifiers.serial_number) ?? null,
    },
  };

  const ebayPriceRange = asRecord(ebay.price_range);
  const priceMin = asNumber(ebayPriceRange.min) ?? valuation.price_min ?? undefined;
  const priceMax = asNumber(ebayPriceRange.max) ?? valuation.price_max ?? undefined;

  const marketData: MarketData = {
    status: asMarketStatus(ebay.status),
    keywords: asString(ebay.keywords) ?? '',
    totalFound: asNumber(ebay.total_found) ?? 0,
    pricesAnalyzed: asNumber(ebay.prices_analyzed) ?? valuation.sample_size ?? undefined,
    outliersRemoved: asNumber(ebay.outliers_removed),
    priceRange:
      priceMin != null && priceMax != null
        ? { min: priceMin, max: priceMax }
        : undefined,
    fairMarketValue: asNumber(ebay.fair_market_value) ?? valuation.fair_market_value ?? undefined,
    mean: asNumber(ebay.mean),
    stdDev: asNumber(ebay.std_dev),
    avgDaysToSell: asNumber(ebay.avg_days_to_sell),
    confidence: asConfidenceLevel(ebay.confidence ?? valuation.confidence),
    message: asString(ebay.message),
  };

  return {
    id: valuation.id,
    itemDetails,
    marketData,
    imageUri: valuation.image_thumbnail_url ?? undefined,
  };
}

export function mapServerValuationsToGridItems(records: ServerValuation[]): HistoryGridItem[] {
  return records.map(mapServerValuationToGridItem);
}

export async function fetchServerHistory(token: string): Promise<HistoryGridItem[]> {
  if (!env.apiUrl) {
    throw new Error('API URL is not configured');
  }

  const response = await fetch(`${env.apiUrl}/api/valuations`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`History fetch failed with status ${response.status}`);
  }

  const body = (await response.json()) as { valuations: ServerValuation[] };
  return mapServerValuationsToGridItems(body.valuations ?? []);
}

export async function migrateGuestData(
  token: string,
  guestSessionId: string,
): Promise<{ migrated: number }> {
  if (!env.apiUrl) {
    throw new Error('API URL is not configured');
  }

  const response = await fetch(`${env.apiUrl}/api/migrate-guest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guest_session_id: guestSessionId }),
  });

  if (!response.ok) {
    throw new Error(`Migration failed with status ${response.status}`);
  }

  return response.json() as Promise<{ migrated: number }>;
}