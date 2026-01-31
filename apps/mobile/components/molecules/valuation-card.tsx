import React from 'react';
import { Pressable } from 'react-native';

import { Box, Stack, Text } from '@/components/primitives';
import { ItemDetails, MarketData } from '@/types';

export interface ValuationCardProps {
  itemDetails: ItemDetails;
  marketData: MarketData;
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
 */
function formatPrice(market: MarketData): string {
  if (market.status !== 'success' || !market.priceRange) {
    return 'No pricing data';
  }
  // Show fair market value prominently if available
  if (market.fairMarketValue) {
    return `$${market.fairMarketValue}`;
  }
  return `$${market.priceRange.min} - $${market.priceRange.max}`;
}

/**
 * Format price range as secondary info.
 */
function formatPriceRange(market: MarketData): string | null {
  if (market.status !== 'success' || !market.priceRange) {
    return null;
  }
  if (market.fairMarketValue) {
    return `Range: $${market.priceRange.min} - $${market.priceRange.max}`;
  }
  return null;
}

export function ValuationCard({
  itemDetails,
  marketData,
  onPress,
}: ValuationCardProps) {
  const title = buildTitle(itemDetails);
  const price = formatPrice(marketData);
  const priceRange = formatPriceRange(marketData);
  const confidenceText = `Confidence: ${marketData.confidence}`;

  const content = (
    <>
      <Box className="aspect-square bg-divider" accessibilityLabel="Item photo placeholder" />

      <Stack gap={1} className="p-3">
        <Text variant="body" numberOfLines={2} className="font-medium">
          {title}
        </Text>
        <Text variant="h2" className="font-bold">{price}</Text>
        {priceRange && (
          <Text variant="caption" className="text-ink-muted">
            {priceRange}
          </Text>
        )}
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          {confidenceText}
        </Text>
      </Stack>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open valuation for ${title}`}
        onPress={onPress}
        className="bg-paper border border-divider active:bg-divider"
        style={({ pressed }) => ({
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        {content}
      </Pressable>
    );
  }

  return <Box className="bg-paper border border-divider">{content}</Box>;
}
