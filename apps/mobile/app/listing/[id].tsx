import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { findValuationById } from '@/app/appraisal';
import { ListingForm } from '@/components/organisms';
import { Box, ScreenContainer, SwissPressable, Text } from '@/components/primitives';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalHistory } from '@/lib/localHistory';
import { uploadListingPhoto } from '@/lib/storage';
import { buildAiListingTitle, mapVisualConditionToListingCondition } from '@/lib/utils';
import type { Valuation } from '@/types/valuation';

function normalizeRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { isGuest, user } = useAuth();
  const valuationId = normalizeRouteParam(id);
  const [valuation, setValuation] = useState<Valuation | null | undefined>(undefined);
  const [hostedPhotoUrl, setHostedPhotoUrl] = useState<string | undefined>(undefined);
  const [photoUploadState, setPhotoUploadState] = useState<
    'uploading' | 'done' | 'error' | undefined
  >(undefined);
  const [photoUploadRetryKey, setPhotoUploadRetryKey] = useState(0);

  useEffect(() => {
    if (isGuest) {
      router.replace('/auth/register');
    }
  }, [isGuest, router]);

  useEffect(() => {
    if (!valuationId) {
      return;
    }

    getLocalHistory()
      .then((history) => {
        const foundValuation = findValuationById(history, valuationId);
        setValuation(foundValuation ?? null);
      })
      .catch(() => {
        setValuation(null);
      });
  }, [valuationId]);

  useEffect(() => {
    const imageUri = valuation?.imageUri;
    const userId = user?.id;

    if (!imageUri || !userId || !valuationId) {
      setHostedPhotoUrl(undefined);
      setPhotoUploadState(undefined);
      return;
    }

    let cancelled = false;
    setHostedPhotoUrl(undefined);
    setPhotoUploadState('uploading');

    uploadListingPhoto(imageUri, userId, valuationId)
      .then((url) => {
        if (cancelled) {
          return;
        }

        setHostedPhotoUrl(url);
        setPhotoUploadState('done');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.warn('Photo upload failed:', error);
        setPhotoUploadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [photoUploadRetryKey, user?.id, valuation?.imageUri, valuationId]);

  function handleRetryPhotoUpload() {
    setPhotoUploadState('uploading');
    setPhotoUploadRetryKey((current) => current + 1);
  }

  if (isGuest) {
    return null;
  }

  const aiTitle = valuation?.response?.itemDetails
    ? buildAiListingTitle(valuation.response.itemDetails)
    : undefined;
  const aiDescription = valuation?.response?.itemDetails?.description?.trim() || undefined;
  const fmv = valuation?.response?.marketData?.fairMarketValue;
  const aiPrice = fmv != null && fmv > 0 ? fmv.toString() : undefined;
  const aiCategory = valuation?.response?.itemDetails?.categoryHint?.trim() || undefined;
  const aiCondition = valuation?.response?.itemDetails?.visualCondition
    ? mapVisualConditionToListingCondition(valuation.response.itemDetails.visualCondition)
    : undefined;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-paper"
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: 'Create Listing', headerShown: false }} />

        <SwissPressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="self-start py-3 pr-4 mb-6 min-h-[44px] justify-center"
        >
          <Text variant="body" className="text-ink-muted">
            ← Back
          </Text>
        </SwissPressable>

        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Marketplace
        </Text>
        <Text variant="h1" className="text-ink mt-2">
          Create listing
        </Text>
        <Text variant="body" className="text-ink-light mt-3">
          Review the listing details before copying them into eBay.
        </Text>

        <Box className="h-px bg-divider mt-8" />

        {valuationId ? (
          valuation === undefined ? (
            <Text variant="body" className="text-ink-muted mt-12">
              Loading…
            </Text>
          ) : (
            <ListingForm
              valuationId={valuationId}
              initialValues={
                aiTitle || aiDescription || aiPrice || aiCategory || aiCondition
                  ? {
                      ...(aiTitle ? { title: aiTitle } : {}),
                      ...(aiDescription ? { description: aiDescription } : {}),
                      ...(aiPrice ? { price: aiPrice } : {}),
                      ...(aiCategory ? { category: aiCategory } : {}),
                      ...(aiCondition ? { condition: aiCondition } : {}),
                    }
                  : undefined
              }
              priceRange={valuation?.response?.marketData?.priceRange}
              photoUri={valuation?.imageUri ?? undefined}
              hostedPhotoUrl={hostedPhotoUrl}
              photoUploadState={photoUploadState}
              onRetryPhotoUpload={handleRetryPhotoUpload}
            />
          )
        ) : (
          <Box className="mt-12">
            <Text variant="body" className="text-signal">
              Listing could not be opened because the valuation ID is missing.
            </Text>
          </Box>
        )}
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}