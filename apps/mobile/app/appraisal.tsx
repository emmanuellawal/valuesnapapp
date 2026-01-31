import React from 'react';
import { ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';

import { Box, Stack as SwissStack, Text } from '@/components/primitives';
import { SwissPressable } from '@/components/primitives';
import { ValuationCard } from '@/components/molecules';
import { createMockItemDetails, createMockMarketData } from '@/types/mocks';

const REPORT_ITEM = createMockItemDetails({
  itemType: 'vintage camera',
  brand: 'Canon',
  model: 'AE-1',
  visualCondition: 'used_good',
  categoryHint: 'Cameras',
});

const REPORT_MARKET = createMockMarketData({
  keywords: 'Canon AE-1 vintage camera',
  totalFound: 24,
  pricesAnalyzed: 24,
  priceRange: { min: 150, max: 350 },
  fairMarketValue: 249,
  mean: 262,
  stdDev: 41,
  confidence: 'HIGH',
});

export default function AppraisalReportScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-paper">
      <Stack.Screen options={{ title: 'Appraisal', headerShown: false }} />

      <Box className="px-6 pt-12 pb-8">
        <SwissPressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="self-start border border-divider bg-paper px-3 py-2"
        >
          <Text variant="caption" className="text-ink">
            Back
          </Text>
        </SwissPressable>

        <Text variant="h1">Appraisal report</Text>
        <Text variant="body" className="text-ink-light mt-2">
          Market estimate based on recent sales
        </Text>

        <Box className="h-px bg-divider mt-6" />

        <Box className="mt-6 w-56">
          <ValuationCard itemDetails={REPORT_ITEM} marketData={REPORT_MARKET} />
        </Box>

        <Box className="h-px bg-divider mt-8" />

        <SwissStack gap={3} className="mt-6">
          <Text variant="h2">Summary</Text>
          <Text variant="caption" className="text-ink-muted">
            Range: ${REPORT_MARKET.priceRange?.min} – ${REPORT_MARKET.priceRange?.max}
          </Text>
          <Text variant="caption" className="text-ink-muted">
            Listings analyzed: {REPORT_MARKET.pricesAnalyzed}
          </Text>
          <Text variant="caption" className="text-ink-muted">
            Confidence: {REPORT_MARKET.confidence}
          </Text>
        </SwissStack>
      </Box>
    </ScrollView>
  );
}
