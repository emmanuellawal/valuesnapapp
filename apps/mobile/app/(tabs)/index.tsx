import React, { useState, useRef } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { ValuationCard, ValuationCardSkeleton, ProgressIndicator, ErrorState, type ErrorType } from '@/components/molecules';
import { CameraCapture, FileUpload, type CapturedPhoto } from '@/components/organisms';
import { useProgressStages, useOnlineStatus } from '@/lib/hooks';
import { buildEbaySearchUrl } from '@/lib/utils';
import { appraise, AppraiseError } from '@/lib/api';
import { getOrCreateGuestSessionId, saveToLocalHistory } from '@/lib/localHistory';
import { transformValuationResponse } from '@/types/transformers';
import { ValuationStatus } from '@/types/valuation';
import type { ItemDetails } from '@/types/item';
import type { MarketData } from '@/types/market';

/**
 * Read an image URI as a base64-encoded string for API submission.
 * Uses expo-file-system on native (iOS/Android) and FileReader on web.
 */
async function readImageAsBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web') {
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  // Web fallback: fetch → blob → FileReader
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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
    item: ItemDetails;
    market: MarketData;
    imageUri: string;
  } | null>(null);
  
  // Store the last photo for retry functionality
  const lastPhotoRef = useRef<CapturedPhoto | null>(null);
  // Persist the most recent successful result for the bottom section
  const recentResultRef = useRef<{
    item: ItemDetails;
    market: MarketData;
    imageUri: string;
  } | null>(null);
  
  // Network awareness — disables camera capture when offline
  const isOnline = useOnlineStatus();

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
    
    try {
      // Convert image URI to base64 for API
      const imageBase64 = photo.base64 ?? await readImageAsBase64(photo.uri);
      const guestSessionId = await getOrCreateGuestSessionId();
      
      // Call the real backend
      const raw = await appraise(imageBase64, guestSessionId);
      
      // Transform raw backend response to typed frontend format
      const result = transformValuationResponse(raw as any);
      
      // Mark progress as complete before hiding
      complete();
      setIsProcessing(false);
      
      // Reset FileUpload component by incrementing key
      setUploadKey(prev => prev + 1);
      
      // Store the result inline
      const resultData = {
        item: result.itemDetails,
        market: result.marketData,
        imageUri: photo.uri,
      };
      setLastResult(resultData);
      recentResultRef.current = resultData;
      
      // Save to local guest history (best-effort)
      saveToLocalHistory({
        id: result.valuationId ?? undefined,
        createdAt: new Date().toISOString(),
        status: ValuationStatus.SUCCESS,
        request: { imageBase64: undefined }, // Don't store base64 in history
        response: result,
        imageUri: photo.uri,
      }).catch(() => {
        // Best-effort — don't block the UI
      });
    } catch (err) {
      setIsProcessing(false);
      if (err instanceof AppraiseError) {
        setError({ type: err.errorType, message: err.message });
      } else {
        setError({ type: 'GENERIC_ERROR', message: 'Something went wrong' });
      }
    }
  };

  /**
   * Navigate to full appraisal report
   */
  const handleViewReport = () => {
    const result = lastResult ?? recentResultRef.current;
    if (!result) return;
    const params = new URLSearchParams({
      imageUri: result.imageUri,
      brand: result.item.brand,
      model: result.item.model,
      itemType: result.item.itemType,
      fairMarketValue: String(result.market.fairMarketValue || 0),
      priceMin: String(result.market.priceRange?.min || 0),
      priceMax: String(result.market.priceRange?.max || 0),
      confidence: result.market.confidence,
      pricesAnalyzed: String(result.market.pricesAnalyzed || 0),
    });
    router.push(`/appraisal?${params.toString()}`);
  };

  /**
   * Dismiss result and value another item
   */
  const handleValueAnother = () => {
    setLastResult(null);
  };

  // ── Offline gate ───────────────────────────────────────────────────────────
  // All hooks above must run every render (Rules of Hooks).
  // This early return is safe: it comes after every hook call.
  if (!isOnline) {
    return (
      <ScreenContainer>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Status
        </Text>
        <Text variant="display" className="text-ink mt-2">
          You're{'\n'}offline
        </Text>
        <Text variant="body" className="text-ink-light mt-4">
          Connect to the internet to value items.
        </Text>
        <Box className="mt-8">
          <SwissPressable
            onPress={() => router.push('/history')}
            accessibilityLabel="View your valuation history"
          >
            <Text variant="body" className="font-semibold">
              View History
            </Text>
          </SwissPressable>
        </Box>
      </ScreenContainer>
    );
  }

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

      {/* Recent valuations — shows last real result when available */}
      {!lastResult && recentResultRef.current && !isProcessing && !error && (
        <Stack gap={4} className="mt-8">
          <Text variant="h2">Recent valuations</Text>
          <Text variant="caption" className="text-ink-muted -mt-2 uppercase tracking-wide">
            Your latest finds
          </Text>

          <Stack direction="horizontal" gap={4} className="flex-wrap mt-2">
            <Box className="w-full">
              <ValuationCard
                itemDetails={recentResultRef.current.item}
                marketData={recentResultRef.current.market}
                imageUri={recentResultRef.current.imageUri}
                onPress={handleViewReport}
              />
            </Box>
          </Stack>
        </Stack>
      )}
    </ScreenContainer>
  );
}
