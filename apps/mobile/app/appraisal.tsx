import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';

import { Box, Stack as SwissStack, Text, ScreenContainer, SwissPressable } from '@/components/primitives';
import { ValuationCard, ConfidenceWarning, ProgressIndicator, ValuationCardSkeleton } from '@/components/molecules';
import { createMockItemDetails, createMockMarketData } from '@/types/mocks';
import type { ConfidenceLevel } from '@/types';
import { getLocalHistory, deleteFromLocalHistory } from '@/lib/localHistory';
import { useAuth } from '@/contexts/AuthContext';
import type { Valuation } from '@/types/valuation';

export function findValuationById(history: Valuation[], id: string): Valuation | undefined {
  return history.find((v) => v.id === id) ?? history.find((v) => v.createdAt === id);
}

function formatDetailTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AppraisalReportScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
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
    _demo?: string;
    id?: string;
  }>();

  const [detailValuation, setDetailValuation] = useState<Valuation | null | undefined>(undefined);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    setIsLoadingDetail(true);
    getLocalHistory().then((history) => {
      const found = findValuationById(history, params.id!);
      setDetailValuation(found ?? null);
      setIsLoadingDetail(false);
    });
  }, [params.id]);

  // ── Detail view branch ─────────────────────────────────────────────────────
  if (params.id) {
    if (isLoadingDetail || detailValuation === undefined) {
      return (
        <ScreenContainer>
          <Stack.Screen options={{ title: 'Valuation', headerShown: false }} />
          <SwissPressable
            accessibilityLabel="Go back"
            onPress={() => router.replace('/history')}
            className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
          >
            <Text variant="body" className="text-ink-muted">← Back</Text>
          </SwissPressable>
          <Text variant="display">Loading…</Text>
        </ScreenContainer>
      );
    }

    if (detailValuation === null) {
      return (
        <ScreenContainer>
          <Stack.Screen options={{ title: 'Not Found', headerShown: false }} />
          <SwissPressable
            accessibilityLabel="Go back"
            onPress={() => router.replace('/history')}
            className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
          >
            <Text variant="body" className="text-ink-muted">← Back</Text>
          </SwissPressable>
          <Text variant="display">Not{'\n'}found</Text>
          <Text variant="body" className="text-ink-light mt-3">
            This valuation could not be found.
          </Text>
        </ScreenContainer>
      );
    }

    const { response, imageUri, createdAt } = detailValuation;
    const itemDetails = response?.itemDetails;
    const marketData = response?.marketData;

    function handleDelete() {
      Alert.alert(
        'Delete valuation',
        'Remove this valuation from your history?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteFromLocalHistory(params.id!);
              router.replace('/history');
            },
          },
        ],
      );
    }

    function handleEbay() {
      if (isGuest) {
        router.push('/auth/register');
        return;
      }

      const listingId = detailValuation.id ?? response?.valuationId ?? params.id;

      if (listingId) {
        router.push(`/listing/${listingId}`);
        return;
      }

      Alert.alert('Unable to list', 'No valuation ID found. Please try re-appraising.');
    }

    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Valuation', headerShown: false }} />

        <SwissPressable
          accessibilityLabel="Go back"
          onPress={() => router.replace('/history')}
          className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
        >
          <Text variant="body" className="text-ink-muted">← Back</Text>
        </SwissPressable>

        <Text variant="display">Valuation{'\n'}detail</Text>
        <Text variant="body" className="text-ink-light mt-3">
          {formatDetailTimestamp(createdAt)}
        </Text>

        <Box className="h-px bg-divider mt-8" />

        {itemDetails && marketData && (
          <Box className="mt-8 w-full" testID="detail-valuation">
            <ValuationCard
              itemDetails={itemDetails}
              marketData={marketData}
              imageUri={imageUri}
            />
            <ConfidenceWarning
              confidence={(marketData.confidence as ConfidenceLevel) ?? 'HIGH'}
              itemType={itemDetails.itemType ?? ''}
              brand={itemDetails.brand ?? ''}
              model={itemDetails.model ?? ''}
            />
          </Box>
        )}

        <Box className="h-px bg-divider mt-8" />

        <SwissStack gap={3} className="mt-8">
          <Text variant="h2">Summary</Text>
          <SwissStack gap={3} className="mt-2">
            {marketData?.priceRange && (
              <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
                <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Range</Text>
                <Text variant="body" className="font-semibold">
                  ${marketData.priceRange.min} – ${marketData.priceRange.max}
                </Text>
              </SwissStack>
            )}
            {marketData?.pricesAnalyzed != null && (
              <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
                <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Analyzed</Text>
                <Text variant="body" className="font-semibold">
                  {marketData.pricesAnalyzed} listings
                </Text>
              </SwissStack>
            )}
            {marketData?.confidence && (
              <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
                <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Confidence</Text>
                <Text variant="body" className="font-semibold">
                  {marketData.confidence}
                </Text>
              </SwissStack>
            )}
            {itemDetails?.visualCondition && (
              <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
                <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Condition</Text>
                <Text variant="body" className="font-semibold">
                  {itemDetails.visualCondition.replace(/_/g, ' ')}
                </Text>
              </SwissStack>
            )}
            {itemDetails?.categoryHint && (
              <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
                <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Category</Text>
                <Text variant="body" className="font-semibold">
                  {itemDetails.categoryHint}
                </Text>
              </SwissStack>
            )}
            {itemDetails?.searchKeywords && itemDetails.searchKeywords.length > 0 && (
              <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
                <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Keywords</Text>
                <Text variant="body" className="font-semibold">
                  {itemDetails.searchKeywords.join(', ')}
                </Text>
              </SwissStack>
            )}
            <SwissStack direction="horizontal" gap={2} className="border-b border-divider pb-3">
              <Text variant="caption" className="text-ink-muted uppercase tracking-wide w-28">Saved</Text>
              <Text variant="body" className="font-semibold">
                {formatDetailTimestamp(createdAt)}
              </Text>
            </SwissStack>
          </SwissStack>
        </SwissStack>

        <Box className="h-px bg-divider mt-8" />

        <SwissStack gap={3} className="mt-8 mb-8">
          <SwissPressable
            accessibilityLabel="List on eBay"
            onPress={handleEbay}
            className="py-4 items-center min-h-[44px] justify-center border border-ink"
          >
            <Text variant="body" className="font-semibold">List on eBay</Text>
          </SwissPressable>
          <SwissPressable
            accessibilityLabel="Delete this valuation"
            onPress={handleDelete}
            className="py-4 items-center min-h-[44px] justify-center"
          >
            <Text variant="body" className="text-signal font-semibold">Delete</Text>
          </SwissPressable>
        </SwissStack>
      </ScreenContainer>
    );
  }

  // ── Demo loading state for screenshot tests ────────────────────────────────
  if (params._demo === 'loading') {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Loading', headerShown: false }} />
        <SwissPressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
        >
          <Text variant="body" className="text-ink-muted">← Back</Text>
        </SwissPressable>
        <Text variant="display">Finding{'\n'}value</Text>
        <Text variant="body" className="text-ink-light mt-3">Identifying your item and fetching market data</Text>
        <Box className="h-px bg-divider mt-8" />
        <Box className="mt-8 w-full">
          <ProgressIndicator stage="identifying" stageProgress={55} isOvertime={false} />
        </Box>
        <Box className="mt-6 w-full">
          <ValuationCardSkeleton />
        </Box>
      </ScreenContainer>
    );
  }

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

      {/* Back — typographic, Swiss-minimal, 44px min touch target */}
      <SwissPressable
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
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
