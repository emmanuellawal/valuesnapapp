import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Box, Stack, Text, SwissPressable } from '@/components/primitives';
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
 * Camera Screen - Swiss Minimalist Design with Warmth
 *
 * Primary tab for capturing item photos.
 * Applies Swiss design patterns:
 * - Asymmetric layout (flush-left, heavy right margin)
 * - Typography as primary visual element
 * - Active negative space with offset dividers
 * 
 * Warmth touches:
 * - Friendly, encouraging microcopy
 * - Subtle visual hierarchy
 */
export default function CameraScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [error, setError] = useState<{ type: ErrorType; message?: string } | null>(null);
  
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
    setIsProcessing(true);
    
    // TODO: In real implementation, send photo to backend for valuation
    // For now, simulate either success or error based on random chance (for testing)
    const simulateError = Math.random() < 0.3; // 30% chance of error for demo
    
    // Simulating ~6 second API call to show multiple progress stages
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    if (simulateError) {
      // Simulate AI identification failure
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
    
    // Encode valuation data and photo URI in URL params
    const params = new URLSearchParams({
      imageUri: photo.uri,
      // In real implementation, these would come from the backend API response
      brand: PREVIEW_ITEM.brand,
      model: PREVIEW_ITEM.model,
      itemType: PREVIEW_ITEM.itemType,
      fairMarketValue: String(PREVIEW_MARKET.fairMarketValue || 0),
      priceMin: String(PREVIEW_MARKET.priceRange?.min || 0),
      priceMax: String(PREVIEW_MARKET.priceRange?.max || 0),
      confidence: PREVIEW_MARKET.confidence,
      pricesAnalyzed: String(PREVIEW_MARKET.pricesAnalyzed || 0),
    });
    
    // Show success message with option to view report
    Alert.alert(
      'Valuation complete!',
      'Your item has been valued.',
      [
        { text: 'View report', onPress: () => router.push(`/appraisal?${params.toString()}`) },
        { text: 'Value another', style: 'cancel' },
      ]
    );
  };

  // Get time-based greeting for warmth
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView className="flex-1 bg-paper">
      {/* Balanced padding for mobile screens */}
      <Box className="px-6 pt-12 pb-8">
        {/* Warm greeting */}
        <Text variant="caption" className="text-ink-muted mb-1">
          {greeting}
        </Text>
        <Text variant="h1">What are you selling?</Text>
        <Text variant="body" className="text-ink-light mt-2">
          Snap a photo and we'll find its value
        </Text>

        {/* Full-width divider for mobile balance */}
        <Box className="h-px bg-divider mt-6" />

        {/* Capture/upload - functional implementation */}
        {/* Constrain width so the capture/upload box isn't oversized */}
        <Box className="mt-6 w-64 max-w-full">
          {error ? (
            <Box className="items-center justify-center">
              {/* Error state with retry and fallback options */}
              <ErrorState
                errorType={error.type}
                onRetry={handleRetry}
                fallbackLink={{
                  text: 'Search eBay manually',
                  href: buildEbaySearchUrl(),
                }}
              />
            </Box>
          ) : isProcessing ? (
            <Box className="items-center justify-center py-8">
              {/* Multi-stage progress indicator */}
              <ProgressIndicator
                stage={stage}
                stageProgress={stageProgress}
                isOvertime={isOvertime}
              />
              <Box className="mt-6 w-44">
                <ValuationCardSkeleton />
              </Box>
            </Box>
          ) : Platform.OS === 'web' ? (
            <FileUpload key={uploadKey} onPhotoCapture={handlePhotoCapture} />
          ) : (
            <CameraCapture onPhotoCapture={handlePhotoCapture} />
          )}
        </Box>

        {/* Full-width divider */}
        <Box className="h-px bg-divider mt-8" />

        <Stack gap={4} className="mt-8">
          <Text variant="h2">Recent valuations</Text>
          <Text variant="caption" className="text-ink-muted -mt-2">
            Your latest finds
          </Text>

          <Stack direction="horizontal" gap={4} className="flex-wrap mt-2">
            <Box className="w-44 shrink-0">
              <ValuationCard
                itemDetails={PREVIEW_ITEM}
                marketData={PREVIEW_MARKET}
                onPress={() => router.push('/appraisal?id=preview-1')}
              />
            </Box>

            <Box className="w-44 shrink-0" accessibilityLiveRegion="polite" accessibilityLabel="Loading valuation">
              <ValuationCardSkeleton />
            </Box>
          </Stack>
        </Stack>
      </Box>
    </ScrollView>
  );
}
