import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { Box, Stack, Text } from '@/components/primitives';
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
 * History Screen - Swiss Minimalist Design
 * 
 * Applies Swiss design PATTERNS matching Camera screen (Story 0.9):
 * - Asymmetric layout (flush-left, heavy right margin)
 * - Typography as primary visual element
 * - Active negative space with offset dividers
 * - No centered content
 * 
 * @see Story 0.10: Polish History and Settings Tabs
 * @see docs/SWISS-MINIMALIST.md
 */
export default function HistoryScreen() {
  const router = useRouter();
  const itemCount = MOCK_HISTORY.length;
  const totalValue = MOCK_HISTORY.reduce((sum, item) => {
    return sum + (item.marketData.fairMarketValue || 0);
  }, 0);

  return (
    <ScrollView className="flex-1 bg-paper">
      {/* Balanced padding for mobile screens */}
      <Box className="px-6 pt-12 pb-8">
        {/* Warm, personalized heading */}
        <Text variant="h1">Your collection</Text>
        
        {/* Encouraging stats */}
        <Text variant="body" className="text-ink-light mt-2">
          {itemCount} items valued at ${totalValue.toLocaleString()}
        </Text>

        {/* Full-width divider for mobile balance */}
        <Box className="h-px bg-divider mt-6" />

        <Stack gap={4} className="mt-6">
          {/* Section heading - h2 for clear hierarchy */}
          <Text variant="h2">Recent finds</Text>
          <Text variant="caption" className="text-ink-muted -mt-2">
            Tap any item to see details
          </Text>
          <HistoryGrid
            items={MOCK_HISTORY}
            onItemPress={(item) => router.push(`/appraisal?id=${item.id}`)}
          />
        </Stack>
      </Box>
    </ScrollView>
  );
}
