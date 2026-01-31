import React, { useState } from 'react';
import { ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Box, Stack, Text, SwissPressable } from '@/components/primitives';
import { ValuationCard, ValuationCardSkeleton } from '@/components/molecules';
import { CameraCapture, FileUpload, type CapturedPhoto } from '@/components/organisms';
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

  const handlePhotoCapture = async (_photo: CapturedPhoto) => {
    setIsProcessing(true);
    
    // TODO: In real implementation, send photo to backend for valuation
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsProcessing(false);
    
    // Reset FileUpload component by incrementing key
    setUploadKey(prev => prev + 1);
    
    // Show success message with option to view report
    Alert.alert(
      'Valuation complete!',
      'Your item has been valued. Check History to see details.',
      [
        { text: 'View report', onPress: () => router.push('/appraisal') },
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
          {isProcessing ? (
            <Box className="items-center justify-center py-8">
              <Text variant="body" className="text-ink-muted">
                Analyzing your item...
              </Text>
              <Box className="mt-4 w-44">
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
