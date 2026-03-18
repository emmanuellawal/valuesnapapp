import React from 'react';
import { useRouter } from 'expo-router';

import { Box, Stack, Text, ScreenContainer } from '@/components/primitives';
import { HistoryGridSkeleton } from '@/components/molecules';
import { HistoryGrid, type HistoryGridItem } from '@/components/organisms/history-grid';
import {
  MOCK_CANON_CAMERA,
  MOCK_SONY_HEADPHONES,
  createMockItemDetails,
  createMockMarketData,
} from '@/types/mocks';

// Build history items from mock factories
const MOCK_HISTORY: HistoryGridItem[] = [
  {
    id: '1',
    ...MOCK_CANON_CAMERA,
  },
  {
    id: '2',
    itemDetails: createMockItemDetails({
      itemType: 'messenger bag',
      brand: 'Coach',
      model: 'unknown',
      visualCondition: 'used_excellent',
      conditionDetails: 'Light patina, no scratches',
      categoryHint: 'Bags',
      searchKeywords: ['Coach messenger bag', 'leather bag'],
    }),
    marketData: createMockMarketData({
      keywords: 'Coach leather messenger bag',
      totalFound: 8,
      pricesAnalyzed: 8,
      priceRange: { min: 80, max: 180 },
      fairMarketValue: 120,
      mean: 115,
      stdDev: 28,
      avgDaysToSell: 5,
      confidence: 'HIGH',
    }),
  },
  {
    id: '3',
    ...MOCK_SONY_HEADPHONES,
  },
  // MEDIUM confidence item for testing
  {
    id: '4',
    itemDetails: createMockItemDetails({
      itemType: 'desk lamp',
      brand: 'Anglepoise',
      model: 'Type 75',
      visualCondition: 'used_good',
      conditionDetails: 'Minor scratches on base',
      categoryHint: 'Lighting',
      searchKeywords: ['Anglepoise lamp', 'desk lamp'],
    }),
    marketData: createMockMarketData({
      keywords: 'Anglepoise Type 75 lamp',
      totalFound: 12,
      pricesAnalyzed: 12,
      priceRange: { min: 85, max: 220 },
      fairMarketValue: 145,
      mean: 142,
      stdDev: 48,
      avgDaysToSell: 14,
      confidence: 'MEDIUM',
    }),
  },
  // LOW confidence item for testing
  {
    id: '5',
    itemDetails: createMockItemDetails({
      itemType: 'art print',
      brand: 'Unknown',
      model: 'Vintage botanical',
      visualCondition: 'used_excellent',
      conditionDetails: 'No damage, slight yellowing',
      categoryHint: 'Art',
      searchKeywords: ['vintage botanical print', 'art print'],
    }),
    marketData: createMockMarketData({
      keywords: 'vintage botanical art print',
      totalFound: 3,
      pricesAnalyzed: 3,
      priceRange: { min: 25, max: 90 },
      fairMarketValue: 55,
      mean: 52,
      stdDev: 28,
      avgDaysToSell: 38,
      confidence: 'LOW',
    }),
  },
];

/**
 * History Screen — Swiss Minimalist Design
 * 
 * Collection overview with portfolio metrics.
 */
export default function HistoryScreen() {
  const router = useRouter();
  const itemCount = MOCK_HISTORY.length;
  const totalValue = MOCK_HISTORY.reduce((sum, item) => {
    return sum + (item.marketData.fairMarketValue || 0);
  }, 0);

  return (
    <ScreenContainer>
      {/* Hero stats */}
      <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
        Your collection
      </Text>
      <Text variant="display" className="text-ink mt-2">
        ${totalValue.toLocaleString()}
      </Text>
      <Text variant="body" className="text-ink-light mt-2">
        {itemCount} items valued
      </Text>

      {/* Items section */}
      <Box className="mt-12">
        <Stack gap={1} className="mb-6">
          <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
            All items
          </Text>
          <Text variant="h2" className="text-ink">
            Recent valuations
          </Text>
        </Stack>

        <HistoryGrid
          items={MOCK_HISTORY}
          onItemPress={(item) => router.push(`/appraisal?id=${item.id}`)}
        />
      </Box>
    </ScreenContainer>
  );
}
