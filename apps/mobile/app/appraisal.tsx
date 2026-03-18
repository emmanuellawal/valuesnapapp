import React from 'react';
import { Stack } from 'expo-router';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Box, Stack as SwissStack, Text, ScreenContainer } from '@/components/primitives';
import { SwissPressable } from '@/components/primitives';
import { ValuationCard, ConfidenceWarning } from '@/components/molecules';
import { createMockItemDetails, createMockMarketData } from '@/types/mocks';
import type { ConfidenceLevel } from '@/types';

export default function AppraisalReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri?: string;
    brand?: string;
    model?: string;
    itemType?: string;
    fairMarketValue?: string;
    priceMin?: string;
    priceMax?: string;
    confidence?: string;
    pricesAnalyzed?: string;
    avgDaysToSell?: string;
  }>();

  // Use params if available, otherwise fall back to mock data
  const REPORT_ITEM = createMockItemDetails({
    itemType: params.itemType || 'vintage camera',
    brand: params.brand || 'Canon',
    model: params.model || 'AE-1',
    visualCondition: 'used_good',
    categoryHint: 'Cameras',
  });

  const REPORT_MARKET = createMockMarketData({
    keywords: `${params.brand || 'Canon'} ${params.model || 'AE-1'}`,
    totalFound: Number(params.pricesAnalyzed) || 24,
    pricesAnalyzed: Number(params.pricesAnalyzed) || 24,
    priceRange: {
      min: Number(params.priceMin) || 150,
      max: Number(params.priceMax) || 350,
    },
    fairMarketValue: Number(params.fairMarketValue) || 249,
    mean: Number(params.fairMarketValue) || 262,
    stdDev: 41,
    confidence: (params.confidence as ConfidenceLevel) || 'HIGH',
    avgDaysToSell: params.avgDaysToSell && Number(params.avgDaysToSell) > 0
      ? Number(params.avgDaysToSell)
      : undefined,
  });

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Appraisal', headerShown: false }} />

      {/* Back — typographic, Swiss-minimal */}
      <SwissPressable
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        className="self-start py-2 mb-6"
      >
        <Text variant="body" className="text-ink-muted">
          ← Back
        </Text>
      </SwissPressable>

      <Text variant="display">Appraisal{'\n'}report</Text>
      <Text variant="body" className="text-ink-light mt-3">
        Market estimate based on recent sales
      </Text>

      <Box className="h-px bg-divider mt-8" />

      {/* Valuation card — full width */}
      <Box className="mt-8 w-full" testID="appraisal-valuation">
        <ValuationCard 
          itemDetails={REPORT_ITEM} 
          marketData={REPORT_MARKET}
          imageUri={params.imageUri}
        />
        
        {/* LOW confidence warning with verification link */}
        <ConfidenceWarning
          confidence={REPORT_MARKET.confidence}
          itemType={REPORT_ITEM.itemType}
          brand={REPORT_ITEM.brand}
          model={REPORT_ITEM.model}
        />
      </Box>

      <Box className="h-px bg-divider mt-8" />

      {/* Summary — data-dense, Swiss hierarchy */}
      <SwissStack gap={3} className="mt-8">
        <Text variant="h2">Summary</Text>
        
        <SwissStack gap={3} className="mt-2">
          <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
            <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Range</Text>
            <Text variant="body" className="font-semibold">
              ${REPORT_MARKET.priceRange?.min} – ${REPORT_MARKET.priceRange?.max}
            </Text>
          </SwissStack>
          
          <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
            <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Analyzed</Text>
            <Text variant="body" className="font-semibold">
              {REPORT_MARKET.pricesAnalyzed} listings
            </Text>
          </SwissStack>
          
          <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
            <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Confidence</Text>
            <Text variant="body" className="font-semibold">
              {REPORT_MARKET.confidence}
            </Text>
          </SwissStack>
        </SwissStack>
      </SwissStack>
    </ScreenContainer>
  );
}
