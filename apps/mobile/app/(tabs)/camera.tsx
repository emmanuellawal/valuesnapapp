import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AccessibilityInfo, Platform, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useFocusEffect } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import {
  ValuationCard,
  ValuationCardSkeleton,
  ProgressIndicator,
  ErrorState,
  GuestBanner,
  NetworkBanner,
  ValuationResultOverlay,
  type ErrorType,
} from '@/components/molecules';
import { CameraCapture, FileUpload, type CapturedPhoto } from '@/components/organisms';
import { useProgressStages, useOnlineStatus } from '@/lib/hooks';
import { buildEbaySearchUrl } from '@/lib/utils';
import { appraise, AppraiseError } from '@/lib/api';
import { getLocalHistory, getOrCreateGuestSessionId, saveToLocalHistory } from '@/lib/localHistory';
import { useAuth } from '@/contexts/AuthContext';
import { transformValuationResponse } from '@/types/transformers';
import { ValuationStatus } from '@/types/valuation';
import { BREAKPOINTS } from '@/constants/breakpoints';
import type { ItemDetails } from '@/types/item';
import type { MarketData } from '@/types/market';

interface CameraResult {
  item: ItemDetails;
  market: MarketData;
  imageUri: string;
  reportId?: string | null;
}


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

async function stabilizeImageUri(uri: string): Promise<string> {
  if (Platform.OS !== 'web' || !uri.startsWith('blob:')) {
    return uri;
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
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
  const { isGuest, accessToken } = useAuth();
  const { width } = useWindowDimensions();
  const insets = React.useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  // AC #3: full-bleed capture surface is a mobile-width-only pattern.
  // [Source: apps/mobile/constants/breakpoints.ts#L5-9] BREAKPOINTS.tablet = 600
  const isMobileWidth = width < BREAKPOINTS.tablet;
  // Ref to the actual capture control so focus can return to it when the
  // result overlay is dismissed (AC #7 / Modal Rules: "Return focus on close").
  const captureControlRef = useRef<View>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [guestValuationCount, setGuestValuationCount] = useState(0);
  const [error, setError] = useState<{
    type: ErrorType;
    message?: string;
    retryAfterSeconds?: number;
  } | null>(null);
  const [lastResult, setLastResult] = useState<CameraResult | null>(null);
  
  // Store the last photo for retry functionality
  const lastPhotoRef = useRef<CapturedPhoto | null>(null);
  // Persist the most recent successful result for the bottom section
  const recentResultRef = useRef<CameraResult | null>(null);
  
  // Network awareness — disables camera capture when offline
  const isOnline = useOnlineStatus();
  // Track online transitions so auto-retry only fires on false -> true.
  const prevIsOnlineRef = useRef(isOnline);
  // One-shot suppression for the restore edge when user manually retries first.
  const skipNextAutoRetryRef = useRef(false);
  // Prevent same-tick double dispatch from manual + auto retry paths.
  const retryDispatchLockRef = useRef(false);
  // Keep current guard state in refs so effects can avoid stale render values.
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;
  const errorTypeRef = useRef<ErrorType | null>(error?.type ?? null);
  errorTypeRef.current = error?.type ?? null;

  // Progress tracking for multi-stage feedback
  const { stage, stageProgress, isOvertime, complete } = useProgressStages({
    isProcessing,
  });

  /**
   * Handle retry - re-process the same photo without re-uploading
   */
  const handleRetry = async () => {
    if (!lastPhotoRef.current || isProcessingRef.current || retryDispatchLockRef.current) return;

    retryDispatchLockRef.current = true;
    setTimeout(() => {
      retryDispatchLockRef.current = false;
    }, 0);

    // If we're on the restore edge (false -> true before effect flush),
    // let this manual retry consume that edge and skip auto-retry once.
    if (isOnline && !prevIsOnlineRef.current) {
      skipNextAutoRetryRef.current = true;
    }

    // Close the post-paint race window before queued effects flush.
    isProcessingRef.current = true;
    errorTypeRef.current = null;
    setError(null);
    await handlePhotoCapture(lastPhotoRef.current);
  };

  // Keep latest retry handler without putting handleRetry in effect deps.
  const handleRetryRef = useRef<() => Promise<void>>(handleRetry);
  handleRetryRef.current = handleRetry;

  // Auto-retry once when connectivity is restored during a NETWORK_ERROR state.
  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current;
    prevIsOnlineRef.current = isOnline;

    if (!isOnline) {
      skipNextAutoRetryRef.current = false;
      return;
    }

    if (
      isOnline &&
      wasOffline &&
      !skipNextAutoRetryRef.current &&
      !retryDispatchLockRef.current &&
      errorTypeRef.current === 'NETWORK_ERROR' &&
      !isProcessingRef.current &&
      lastPhotoRef.current
    ) {
      void handleRetryRef.current();
    }

    // Consume one-shot suppression after the restore edge is processed.
    if (wasOffline) {
      skipNextAutoRetryRef.current = false;
    }
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        return;
      }

      getLocalHistory().then((history) => {
        setGuestValuationCount(history.length);
      });
    }, [isGuest]),
  );

  const handlePhotoCapture = async (photo: CapturedPhoto) => {
    // Store photo for potential retry
    lastPhotoRef.current = photo;
    errorTypeRef.current = null;
    isProcessingRef.current = true;
    setError(null);
    setLastResult(null);
    setIsProcessing(true);
    
    try {
      // Convert image URI to base64 for API
      const imageBase64 = photo.base64 ?? await readImageAsBase64(photo.uri);
      const guestSessionId = await getOrCreateGuestSessionId();
      
      // Call the real backend
      const raw = await appraise(imageBase64, guestSessionId, { accessToken });
      
      // Transform raw backend response to typed frontend format
      const result = transformValuationResponse(raw as any);
      const stableImageUri = await stabilizeImageUri(photo.uri);
      
      // Mark progress as complete before hiding
      complete();
      isProcessingRef.current = false;
      setIsProcessing(false);
      
      // Reset FileUpload component by incrementing key
      setUploadKey(prev => prev + 1);
      
      const createdAt = new Date().toISOString();
      const localId = result.valuationId ?? createdAt;
      let savedLocally = false;
      try {
        savedLocally = await saveToLocalHistory({
          id: localId,
          createdAt,
          status: ValuationStatus.SUCCESS,
          request: { imageBase64: undefined },
          response: result,
          imageUri: stableImageUri,
        });

        if (savedLocally && isGuest) {
          const history = await getLocalHistory();
          setGuestValuationCount(history.length);
        }
      } catch {
        // Best-effort local persistence should not block the UI.
      }

      // Publish the overlay only after its report destination is durable. An
      // authenticated server ID remains a valid fallback if local storage is
      // unavailable; guests use the serialized report payload.
      const resultData: CameraResult = {
        item: result.itemDetails,
        market: result.marketData,
        imageUri: stableImageUri,
        reportId: savedLocally ? localId : (!isGuest ? result.valuationId : null),
      };
      setLastResult(resultData);
      recentResultRef.current = resultData;
    } catch (err) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      if (err instanceof AppraiseError) {
        const nextError = {
          type: err.errorType,
          message: err.message,
          retryAfterSeconds: err.retryAfterSeconds,
        };
        errorTypeRef.current = nextError.type;
        setError(nextError);
      } else {
        errorTypeRef.current = 'GENERIC_ERROR';
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
    if (result.reportId) {
      router.push(`/appraisal?id=${result.reportId}`);
      return;
    }
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
   * Dismiss result and value another item.
   * Returns focus to the capture control per the overlay's Modal Rules
   * ("Return focus on close").
   */
  const handleValueAnother = () => {
    setLastResult(null);
    requestAnimationFrame(() => {
      const node = captureControlRef.current;
      if (!node) return;
      if (Platform.OS === 'web') {
        (node as unknown as { focus?: () => void }).focus?.();
      } else {
        AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
      }
    });
  };

  // ── Offline gate ───────────────────────────────────────────────────────────
  // All hooks above must run every render (Rules of Hooks).
  // This early return is safe: it comes after every hook call.
  //
  // Exception: when a NETWORK_ERROR is active the offline gate is suppressed so
  // the ErrorState + NetworkBanner remain visible and the user sees the queued
  // state rather than being silently replaced by the generic offline screen.
  // All other error types (AI_IDENTIFICATION_FAILED, RATE_LIMIT, etc.) yield to
  // the offline gate — offline always wins for non-network errors.
  if (!isOnline && (!error || error.type !== 'NETWORK_ERROR')) {
    return (
      <ScreenContainer>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Status
        </Text>
        <Text variant="display" className="text-ink mt-2">
          You{"'"}re{'\n'}offline
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

  const isRateLimitError = error?.type === 'RATE_LIMIT';
  const retryMinutes = Math.ceil((error?.retryAfterSeconds ?? 60) / 60);
  const rateLimitSuggestions = [
    `Try again in ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}`,
  ];

  // AC #3: full-bleed capture surface — mobile widths only, and only when
  // there is nothing else to show (no error, not processing). It stays
  // rendered while lastResult is set so the result overlay has a surface
  // to slide over. [Source: docs/ux-design-specification.md#L2304-2316]
  const showFullBleed = isMobileWidth && !error && !isProcessing;

  const captureSurface = Platform.OS === 'web' ? (
    <FileUpload
      key={uploadKey}
      focusRef={captureControlRef}
      onPhotoCapture={handlePhotoCapture}
    />
  ) : (
    <CameraCapture
      key={uploadKey}
      focusRef={captureControlRef}
      onPhotoCapture={handlePhotoCapture}
    />
  );

  // AC #4/#7: the successful result now renders as a sliding overlay over
  // the capture surface instead of an inline card in the scroll column.
  const resultOverlay = lastResult ? (
    <ValuationResultOverlay
      item={lastResult.item}
      market={lastResult.market}
      imageUri={lastResult.imageUri}
      onViewReport={handleViewReport}
      onDismiss={handleValueAnother}
    />
  ) : null;

  if (showFullBleed) {
    return (
      <>
        <Box
          testID="camera-fullbleed-surface"
          className="flex-1 bg-paper w-full"
          style={{ paddingTop: Math.max(insets.top, 64) }}
          accessibilityElementsHidden={Boolean(lastResult)}
          importantForAccessibility={lastResult ? 'no-hide-descendants' : 'auto'}
          aria-hidden={lastResult ? true : undefined}
        >
          <Box className="px-6">
            <Text variant="display">What are you{'\n'}selling?</Text>
            <Text variant="body" className="text-ink-light mt-3">
              Snap a photo and we{"'"}ll find its value
            </Text>
            <Box className="h-px bg-divider mt-8" />
          </Box>

          <View style={{ flex: 1, marginTop: 32 }}>
            {captureSurface}
          </View>
        </Box>

        {isGuest && guestValuationCount >= 3 && (
          <Box className="absolute left-0 right-0 bottom-0 px-6">
            <GuestBanner visible />
          </Box>
        )}

        {resultOverlay}
      </>
    );
  }

  return (
    <>
      <ScreenContainer
        accessibilityElementsHidden={Boolean(lastResult)}
        importantForAccessibility={lastResult ? 'no-hide-descendants' : 'auto'}
        aria-hidden={lastResult ? true : undefined}
      >
        {/* Header — dramatic typographic hierarchy */}
        <Text variant="display">What are you{'\n'}selling?</Text>
        <Text variant="body" className="text-ink-light mt-3">
          Snap a photo and we{"'"}ll find its value
        </Text>

        <Box className="h-px bg-divider mt-8" />

        {/* Primary action area — full width for authority */}
        <Box className="mt-8">
          {error ? (
            <Stack gap={4}>
              <ErrorState
                errorType={error.type}
                suggestions={isRateLimitError ? rateLimitSuggestions : undefined}
                onRetry={isRateLimitError ? undefined : handleRetry}
                onDismiss={isRateLimitError ? () => setError(null) : undefined}
                fallbackLink={isRateLimitError
                  ? (isGuest ? { text: 'Create a free account', href: '/auth/register' } : undefined)
                  : {
                    text: 'Search eBay manually',
                    href: buildEbaySearchUrl(),
                  }}
              />
              <NetworkBanner errorType={error.type} isOnline={isOnline} />
            </Stack>
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
          ) : (
            <View>{captureSurface}</View>
          )}
        </Box>

        <Box className="h-px bg-divider mt-8" />

        <GuestBanner visible={isGuest && guestValuationCount >= 3} />

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

      {resultOverlay}
    </>
  );
}
