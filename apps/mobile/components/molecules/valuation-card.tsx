import React from 'react';
import { Image, Pressable } from 'react-native';

import { Box, Stack, Text } from '@/components/primitives';
import { ItemDetails, MarketData } from '@/types';

export interface ValuationCardProps {
  itemDetails: ItemDetails;
  marketData: MarketData;
  /** Optional image URI for displaying item photo */
  imageUri?: string;
  /** Optional press handler. If provided, the card becomes pressable. */
  onPress?: () => void;
}

/**
 * Build a display title from item details.
 * Handles edge cases: empty strings, 'unknown' values, missing data.
 */
function buildTitle(item: ItemDetails): string {
  const hasBrand = item.brand && item.brand !== 'unknown';
  const hasModel = item.model && item.model !== 'unknown';
  const hasItemType = item.itemType && item.itemType !== 'unknown';

  if (hasBrand && hasModel) {
    return `${item.brand} ${item.model}`;
  }
  if (hasBrand && hasItemType) {
    return `${item.brand} ${item.itemType}`;
  }
  if (hasItemType) {
    return item.itemType;
  }
  if (hasBrand) {
    return item.brand;
  }
  return 'Unknown Item';
}

/**
 * Format price range for display.
 * Shows fair market value when available, falls back to range.
 * Formats as currency with no decimals.
 */
function formatPrice(market: MarketData): string {
  if (market.status !== 'success' || !market.priceRange) {
    return 'No pricing data';
  }
  // Show fair market value prominently if available
  if (market.fairMarketValue) {
    return `$${Math.round(market.fairMarketValue).toLocaleString()}`;
  }
  return `$${Math.round(market.priceRange.min).toLocaleString()} - $${Math.round(market.priceRange.max).toLocaleString()}`;
}

/**
 * Format price range as secondary info.
 */
function formatPriceRange(market: MarketData): string | null {
  if (market.status !== 'success' || !market.priceRange) {
    return null;
  }
  if (market.fairMarketValue) {
    return `Range: $${Math.round(market.priceRange.min).toLocaleString()} - $${Math.round(market.priceRange.max).toLocaleString()}`;
  }
  return null;
}

/**
 * Generate sample size caption based on confidence level.
 * 
 * **Confidence Messaging Pattern (Story 2.10):**
 * | Level  | Caption                   |
 * |--------|---------------------------|
 * | HIGH   | "Based on N sales"        |
 * | MEDIUM | "Based on N sales"        |
 * | LOW    | "Limited data (N sales)"  |
 * | NONE   | null (no caption)         |
 * 
 * LOW uses different wording to signal uncertainty without alarm.
 * The ConfidenceWarning component handles LOW separately with Signal color.
 */
function getSampleSizeCaption(market: MarketData): string | null {
  if (market.status !== 'success') {
    return null;
  }
  const count = market.pricesAnalyzed ?? market.totalFound;
  if (count === 0) {
    return null;
  }
  if (market.confidence === 'LOW') {
    return `Limited data (${count} sales)`;
  }
  if (market.confidence === 'NONE') {
    return null;
  }
  return `Based on ${count} sales`;
}

/**
 * Generate velocity caption based on average days to sell.
 * 
 * **Velocity Messaging Pattern (Story 2.11):**
 * | Days     | Caption             |
 * |----------|---------------------|
 * | 1–30     | "Sells in ~N days"  |
 * | >30      | "Slow mover"        |
 * | absent   | null (no caption)   |
 */
function getVelocityCaption(market: MarketData): string | null {
  if (market.status !== 'success' || market.avgDaysToSell == null) {
    return null;
  }
  if (market.avgDaysToSell > 30) {
    return 'Slow mover';
  }
  return `Sells in ~${market.avgDaysToSell} days`;
}

export function ValuationCard({
  itemDetails,
  marketData,
  imageUri,
  onPress,
}: ValuationCardProps) {
  const title = buildTitle(itemDetails);
  const price = formatPrice(marketData);
  const priceRange = formatPriceRange(marketData);
  const sampleSizeCaption = getSampleSizeCaption(marketData);
  const velocityCaption = getVelocityCaption(marketData);
  
  // AC4: HIGH confidence uses bold typography, MEDIUM/LOW uses regular
  const isHighConfidence = marketData.confidence === 'HIGH';
  const priceClassName = isHighConfidence ? 'font-bold' : 'font-normal';

  const content = (
    <>
      {/* AC1: Item photo — Museum Mat framing (1px border, 4px internal padding) */}
      {/* max-h-[50vh] prevents the image from pushing price/data below the fold */}
      {imageUri ? (
        <Box className="border border-divider p-1 bg-paper m-3 max-h-[50vh] overflow-hidden">
          <Image
            source={{ uri: imageUri }}
            className="aspect-square w-full"
            accessibilityLabel={`Photo of ${title}`}
            resizeMode="cover"
          />
        </Box>
      ) : (
        <Box className="aspect-square max-h-[50vh] bg-divider/20 items-center justify-center" accessibilityLabel="Item photo placeholder">
          <Text variant="h1" className="text-ink-muted/30">+</Text>
        </Box>
      )}

      <Stack gap={1} className="p-4">
        {/* AC2: Item name — h3 typography (20px, semibold) */}
        <Text variant="h3" numberOfLines={2} className="font-semibold">
          {title}
        </Text>
        
        {/* AC3: Price — dramatic Swiss hierarchy */}
        {/* AC4: Bold for HIGH confidence, regular weight for MEDIUM/LOW */}
        <Text variant="display" className={`${priceClassName} mt-1`}>{price}</Text>
        
        {/* Price range as secondary info */}
        {priceRange && (
          <Text variant="caption" className="text-ink-muted mt-1">
            {priceRange}
          </Text>
        )}
        
        {/* AC5: Sample size caption */}
        {sampleSizeCaption && (
          <Text variant="caption" className="text-ink-muted">
            {sampleSizeCaption}
          </Text>
        )}
        
        {/* Story 2.11: Market velocity indicator */}
        {velocityCaption && (
          <Text variant="caption" className="text-ink-muted">
            {velocityCaption}
          </Text>
        )}
      </Stack>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open valuation for ${title}`}
        onPress={onPress}
        className="bg-paper border-2 border-ink/10 active:bg-divider/20"
        style={({ pressed }) => ({
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        {content}
      </Pressable>
    );
  }

  return <Box className="bg-paper border-2 border-ink/10">{content}</Box>;
}
