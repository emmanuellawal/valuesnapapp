import React, { useState, useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';

import { Box, Stack as SwissStack, Text, ScreenContainer, SwissPressable } from '@/components/primitives';
import { ValuationCard, ConfidenceWarning, ProgressIndicator, ValuationCardSkeleton } from '@/components/molecules';
import { AppraisalWorkstation, SwissSidebarItem } from '@/components/organisms';
import { BREAKPOINTS, computeRailWidth } from '@/constants/breakpoints';
import { createMockItemDetails, createMockMarketData } from '@/types/mocks';
import type { ConfidenceLevel } from '@/types';
import { getLocalHistory, deleteFromLocalHistory } from '@/lib/localHistory';
import { fetchServerValuationById } from '@/lib/migration';
import { showAlert } from '@/lib/dialog';
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

function parseOptionalNumber(value?: string): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function AppraisalReportScreen() {
  const router = useRouter();
  const { isGuest, accessToken } = useAuth();
  const { width } = useWindowDimensions();
  // Story 6.10 decision (party-mode 2026-09-04): gate is Platform.OS === 'web'
  // AND width, not width alone — a native iPad Pro in landscape (>=1024px,
  // touch-only) has no "desktop browser" per docs/epics.md FR46, and the
  // workstation's router.replace-based rail nav would misfire there.
  const isDesktop = Platform.OS === 'web' && width >= BREAKPOINTS.desktop;
  const railWidth = computeRailWidth(width);
  const navItems: SwissSidebarItem[] = [
    { key: 'camera', label: 'Camera', icon: 'camera', isActive: true, onPress: () => router.replace('/camera') },
    { key: 'history', label: 'History', icon: 'list', isActive: false, onPress: () => router.replace('/history') },
    { key: 'settings', label: 'Settings', icon: 'settings', isActive: false, onPress: () => router.replace('/settings') },
  ];
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
    _demo?: string;
    id?: string;
  }>();

  const [detailValuation, setDetailValuation] = useState<Valuation | null | undefined>(undefined);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    let cancelled = false;
    setIsLoadingDetail(true);

    (async () => {
      const history = await getLocalHistory();
      const local = findValuationById(history, params.id!);
      if (cancelled) return;

      if (local) {
        setDetailValuation(local);
        setIsLoadingDetail(false);
        return;
      }

      if (accessToken) {
        try {
          const serverValuation = await fetchServerValuationById(accessToken, params.id!);
          if (!cancelled) {
            setDetailValuation(serverValuation);
          }
        } catch {
          if (!cancelled) {
            setDetailValuation(null);
          }
        }
      } else if (!cancelled) {
        setDetailValuation(null);
      }

      if (!cancelled) {
        setIsLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id, accessToken]);

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

    const { response, imageUri, createdAt, id: valuationId } = detailValuation;
    const itemDetails = response?.itemDetails;
    const marketData = response?.marketData;
    function handleDelete() {
      showAlert(
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

      const listingId = valuationId ?? response?.valuationId ?? params.id;

      if (listingId) {
        router.push(`/listing/${listingId}`);
        return;
      }

      showAlert('Unable to list', 'No valuation ID found. Please try re-appraising.');
    }

    const backButton = (
      <SwissPressable
        accessibilityLabel="Go to history"
        onPress={() => router.replace('/history')}
        className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
      >
        <Text variant="body" className="text-ink-muted">← History</Text>
      </SwissPressable>
    );

    const summaryAndDelete = (
      <>
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
            accessibilityLabel="Delete this valuation"
            onPress={handleDelete}
            className="py-4 items-center min-h-[44px] justify-center"
          >
            <Text variant="body" className="text-signal font-semibold">Delete</Text>
          </SwissPressable>
        </SwissStack>
      </>
    );

    // Story 6.10 decision (party-mode 2026-09-04): ValuationCard is kept
    // whole and unmodified as the image pane's content — not split into
    // exported formatting helpers. See Dev Notes in
    // docs/sprint-artifacts/6-10-implement-desktop-ux-patterns.md.
    if (isDesktop) {
      return (
        <>
          <Stack.Screen options={{ title: 'Valuation', headerShown: false }} />
          <AppraisalWorkstation
            railWidth={railWidth}
            navItems={navItems}
            imagePane={
              itemDetails && marketData ? (
                <Box className="w-full" testID="detail-valuation">
                  <ValuationCard
                    itemDetails={itemDetails}
                    marketData={marketData}
                    imageUri={imageUri}
                    compact
                  />
                </Box>
              ) : null
            }
          >
            {backButton}
            <Text variant="display">Valuation{'\n'}detail</Text>
            <Text variant="body" className="text-ink-light mt-3">
              {formatDetailTimestamp(createdAt)}
            </Text>
            <Box className="h-px bg-divider mt-8" />
            {itemDetails && marketData && (
              <Box className="mt-8 w-full">
                <ConfidenceWarning
                  confidence={(marketData.confidence as ConfidenceLevel) ?? 'HIGH'}
                  itemType={itemDetails.itemType ?? ''}
                  brand={itemDetails.brand ?? ''}
                  model={itemDetails.model ?? ''}
                />
              </Box>
            )}
            <Box className="h-px bg-divider mt-8" />
            {summaryAndDelete}
          </AppraisalWorkstation>
        </>
      );
    }

    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'Valuation', headerShown: false }} />

        {backButton}

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

        {summaryAndDelete}
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

  const pricesAnalyzed = parseOptionalNumber(params.pricesAnalyzed);
  const fairMarketValue = parseOptionalNumber(params.fairMarketValue);
  const priceMin = parseOptionalNumber(params.priceMin);
  const priceMax = parseOptionalNumber(params.priceMax);
  const confidence = (params.confidence as ConfidenceLevel | undefined) ?? 'LOW';

  const REPORT_ITEM = createMockItemDetails({
    itemType: params.itemType ?? 'unknown item',
    brand: params.brand ?? 'unknown',
    model: params.model ?? 'unknown',
    visualCondition: 'used_good',
    categoryHint: params.itemType ?? 'unknown',
  });

  const REPORT_MARKET = createMockMarketData({
    keywords: `${params.brand ?? ''} ${params.model ?? ''}`.trim() || 'item',
    totalFound: pricesAnalyzed ?? 0,
    pricesAnalyzed: pricesAnalyzed ?? 0,
    priceRange:
      priceMin != null && priceMax != null
        ? { min: priceMin, max: priceMax }
        : undefined,
    fairMarketValue,
    stdDev: 0,
    confidence,
  });

  const mainBackButton = (
    <SwissPressable
      accessibilityLabel="Go back"
      onPress={() => router.back()}
      className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
    >
      <Text variant="body" className="text-ink-muted">
        ← Back
      </Text>
    </SwissPressable>
  );

  const mainSummary = (
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
  );

  // Story 6.10 decision (party-mode 2026-09-04): ValuationCard is kept
  // whole and unmodified as the image pane's content — not split into
  // exported formatting helpers.
  if (isDesktop) {
    return (
      <>
        <Stack.Screen options={{ title: 'Appraisal', headerShown: false }} />
        <AppraisalWorkstation
          railWidth={railWidth}
          navItems={navItems}
          imagePane={
            <Box className="w-full" testID="appraisal-valuation">
              <ValuationCard
                itemDetails={REPORT_ITEM}
                marketData={REPORT_MARKET}
                imageUri={params.imageUri}
                compact
              />
            </Box>
          }
        >
          {mainBackButton}
          <Text variant="display">Appraisal{'\n'}report</Text>
          <Text variant="body" className="text-ink-light mt-3">
            Identified item and market estimate
          </Text>
          <Box className="h-px bg-divider mt-8" />
          <Box className="mt-8 w-full">
            <ConfidenceWarning
              confidence={REPORT_MARKET.confidence}
              itemType={REPORT_ITEM.itemType}
              brand={REPORT_ITEM.brand}
              model={REPORT_ITEM.model}
            />
          </Box>
          <Box className="h-px bg-divider mt-8" />
          {mainSummary}
        </AppraisalWorkstation>
      </>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Appraisal', headerShown: false }} />

      {/* Back — typographic, Swiss-minimal, 44px min touch target */}
      {mainBackButton}

      <Text variant="display">Appraisal{'\n'}report</Text>
      <Text variant="body" className="text-ink-light mt-3">
        Identified item and market estimate
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
      {mainSummary}
    </ScreenContainer>
  );
}
