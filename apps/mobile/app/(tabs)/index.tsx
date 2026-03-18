import React, { useState, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { ValuationCard, ValuationCardSkeleton, ProgressIndicator, ErrorState, type ErrorType } from '@/components/molecules';
import { CameraCapture, FileUpload, type CapturedPhoto } from '@/components/organisms';
import { useProgressStages } from '@/lib/hooks';
import { buildEbaySearchUrl } from '@/lib/utils';
import { createMockItemDetails, createMockMarketData } from '@/types/mocks';

// Mock data for the valuation preview
const PREVIEW_ITEM = createMockItemDetails({
  itemType: 'vintage camera',
  brand: 'Canon',
  model: 'AE-1',
});

const PREVIEW_MARKET = createMockMarketData({
  priceRange: { min: 150, max: 350 },
  fairMarketValue: 249,
  confidence: 'HIGH',
});

/**
 * Camera Screen — Swiss Minimalist Design
 *
 * Primary tab for capturing item photos.
 * Swiss design patterns:
 * - Flush-left asymmetric layout
 * - Typography as primary visual element
 * - Active negative space
 * - Horizontal rule dividers
 */
export default function CameraScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [error, setError] = useState<{ type: ErrorType; message?: string } | null>(null);
  const [lastResult, setLastResult] = useState<{
    item: typeof PREVIEW_ITEM;
    market: typeof PREVIEW_MARKET;
    imageUri: string;
  } | null>(null);
  
  // Store the last photo for retry functionality
  const lastPhotoRef = useRef<CapturedPhoto | null>(null);
  
  // Progress tracking for multi-stage feedback
  const { stage, stageProgress, isOvertime, complete } = useProgressStages({
    isProcessing,
  });

  /**
   * Handle retry - re-process the same photo without re-uploading
   */
  const handleRetry = async () => {
    if (!lastPhotoRef.current) return;
    
    setError(null);
    await handlePhotoCapture(lastPhotoRef.current);
  };

  const handlePhotoCapture = async (photo: CapturedPhoto) => {
    // Store photo for potential retry
    lastPhotoRef.current = photo;
    setError(null);
    setLastResult(null);
    setIsProcessing(true);
    
    // TODO: In real implementation, send photo to backend for valuation
    const simulateError = Math.random() < 0.3;
    
    // Simulating ~6 second API call to show multiple progress stages
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    if (simulateError) {
      setIsProcessing(false);
      setError({
        type: 'AI_IDENTIFICATION_FAILED',
        message: 'Unable to identify item',
      });
      return;
    }
    
    // Mark progress as complete before hiding
    complete();
    setIsProcessing(false);
    
    // Reset FileUpload component by incrementing key
    setUploadKey(prev => prev + 1);
    
    // Store the result inline instead of using Alert
    setLastResult({
      item: PREVIEW_ITEM,
      market: PREVIEW_MARKET,
      imageUri: photo.uri,
    });
  };

  /**
   * Navigate to full appraisal report
   */
  const handleViewReport = () => {
    if (!lastResult) return;
    const params = new URLSearchParams({
      imageUri: lastResult.imageUri,
      brand: lastResult.item.brand,
      model: lastResult.item.model,
      itemType: lastResult.item.itemType,
      fairMarketValue: String(lastResult.market.fairMarketValue || 0),
      priceMin: String(lastResult.market.priceRange?.min || 0),
      priceMax: String(lastResult.market.priceRange?.max || 0),
      confidence: lastResult.market.confidence,
      pricesAnalyzed: String(lastResult.market.pricesAnalyzed || 0),
    });
    router.push(`/appraisal?${params.toString()}`);
  };

  /**
   * Dismiss result and value another item
   */
  const handleValueAnother = () => {
    setLastResult(null);
  };

  return (
    <ScreenContainer>
      {/* Header — dramatic typographic hierarchy */}
      <Text variant="display">What are you{'\n'}selling?</Text>
      <Text variant="body" className="text-ink-light mt-3">
        Snap a photo and we'll find its value
      </Text>

      <Box className="h-px bg-divider mt-8" />

      {/* Primary action area — full width for authority */}
      <Box className="mt-8">
        {lastResult ? (
          /* Inline result — Swiss-styled, no native Alert */
          <Stack gap={4}>
            <Text variant="h3" className="font-bold">Valuation complete</Text>
            <Box className="w-full">
              <ValuationCard
                itemDetails={lastResult.item}
                marketData={lastResult.market}
                imageUri={lastResult.imageUri}
                onPress={handleViewReport}
              />
            </Box>
            <Stack direction="horizontal" gap={3}>
              <SwissPressable
                accessibilityLabel="View full appraisal report"
                onPress={handleViewReport}
                className="border border-ink bg-ink px-4 py-3"
              >
                <Text variant="body" className="text-paper font-semibold">View report</Text>
              </SwissPressable>
              <SwissPressable
                accessibilityLabel="Value another item"
                onPress={handleValueAnother}
                className="border border-divider bg-paper px-4 py-3"
              >
                <Text variant="body" className="text-ink">Value another</Text>
              </SwissPressable>
            </Stack>
          </Stack>
        ) : error ? (
          <ErrorState
            errorType={error.type}
            onRetry={handleRetry}
            fallbackLink={{
              text: 'Search eBay manually',
              href: buildEbaySearchUrl(),
            }}
          />
        ) : isProcessing ? (
          <Stack gap={6} className="py-8">
            <ProgressIndicator
              stage={stage}
              stageProgress={stageProgress}
              isOvertime={isOvertime}
            />
            <Box className="w-full">
              <ValuationCardSkeleton />
            </Box>
          </Stack>
        ) : Platform.OS === 'web' ? (
          <FileUpload key={uploadKey} onPhotoCapture={handlePhotoCapture} />
        ) : (
          <CameraCapture onPhotoCapture={handlePhotoCapture} />
        )}
      </Box>

      <Box className="h-px bg-divider mt-8" />

      {/* Recent valuations — proper Swiss grid proportions */}
      <Stack gap={4} className="mt-8">
        <Text variant="h2">Recent valuations</Text>
        <Text variant="caption" className="text-ink-muted -mt-2 uppercase tracking-wide">
          Your latest finds
        </Text>

        <Stack direction="horizontal" gap={4} className="flex-wrap mt-2">
          <Box className="w-full">
            <ValuationCard
              itemDetails={PREVIEW_ITEM}
              marketData={PREVIEW_MARKET}
              onPress={() => router.push('/appraisal?id=preview-1')}
            />
          </Box>
        </Stack>
      </Stack>
    </ScreenContainer>
  );
}
