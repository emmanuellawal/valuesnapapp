import React from 'react';
import { Alert, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { FormInput } from '@/components/atoms';
import { Box, Stack, SwissPressable, Text } from '@/components/primitives';
import {
  LISTING_CONDITION_VALUES,
  LISTING_TITLE_MAX_LENGTH,
  type ListingCondition,
  type ListingFormValues,
  listingFormSchema,
} from '@/types/listing';

const TITLE_INPUT_SOFT_LIMIT = LISTING_TITLE_MAX_LENGTH + 5;

export interface ListingFormProps {
  valuationId: string;
  onSubmit?: (values: ListingFormValues) => void;
  initialValues?: Partial<ListingFormValues>;
  priceRange?: { min: number; max: number };
  photoUri?: string;
  hostedPhotoUrl?: string;
  photoUploadState?: 'uploading' | 'done' | 'error';
  onRetryPhotoUpload?: () => void;
}

export function ListingForm({
  valuationId,
  onSubmit,
  initialValues,
  priceRange,
  photoUri,
  hostedPhotoUrl,
  photoUploadState,
  onRetryPhotoUpload,
}: ListingFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      category: '',
      // RHF text inputs start empty; schema validation rejects this until a valid enum is entered.
      condition: '' as ListingCondition,
      price: '',
      description: '',
      ...(initialValues ?? {}),
    },
  });

  const titleValue = watch('title');
  const titleLength = titleValue?.length ?? 0;

  async function handleValidSubmit(values: ListingFormValues) {
    const lines: string[] = [
      `Title: ${values.title}`,
      `Category: ${values.category}`,
      `Condition: ${values.condition.replace(/_/g, ' ')}`,
      `Price: $${values.price}`,
    ];

    if (values.description.trim()) {
      lines.push(`Description: ${values.description}`);
    }

    if (hostedPhotoUrl) {
      lines.push(`Photo: ${hostedPhotoUrl}`);
    }

    try {
      await Clipboard.setStringAsync(lines.join('\n'));
      Alert.alert('Copied', 'Listing details copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Unable to copy to clipboard. Please try again.');
    }

    onSubmit?.(values);
  }

  return (
    <Stack gap={6} className="mt-12">
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <Stack gap={2}>
            <FormInput
              ref={ref}
              label="Title *"
              placeholder="Brand model key details"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
              returnKeyType="next"
              autoCapitalize="words"
              maxLength={TITLE_INPUT_SOFT_LIMIT}
              testID="listing-title-input"
            />
            <Stack gap={1}>
              <Text variant="caption" className="text-ink-muted self-end">
                {titleLength}/{LISTING_TITLE_MAX_LENGTH}
              </Text>
              {initialValues?.title?.trim() && !dirtyFields.title ? (
                <Text
                  variant="caption"
                  className="text-ink-muted"
                  testID="listing-title-ai-badge"
                >
                  AI-generated
                </Text>
              ) : null}
              {!initialValues?.title?.trim() && !titleValue?.trim() ? (
                <Text
                  variant="caption"
                  className="text-ink-muted"
                  testID="listing-title-manual-badge"
                >
                  Enter manually
                </Text>
              ) : null}
            </Stack>
          </Stack>
        )}
      />

      <Controller
        control={control}
        name="category"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <Stack gap={1}>
            <FormInput
              ref={ref}
              label="Category *"
              placeholder="Category"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.category?.message}
              returnKeyType="next"
              autoCapitalize="words"
              testID="listing-category-input"
            />
            {initialValues?.category?.trim() && !dirtyFields.category ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-category-ai-badge"
              >
                AI-generated
              </Text>
            ) : null}
            {!initialValues?.category?.trim() && !dirtyFields.category ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-category-manual-badge"
              >
                Enter manually
              </Text>
            ) : null}
          </Stack>
        )}
      />

      <Controller
        control={control}
        name="condition"
        render={({ field: { onChange, onBlur, value } }) => (
          <Stack gap={1}>
            <Text variant="caption" className="text-ink uppercase tracking-wide">
              Condition *
            </Text>
            <Stack direction="horizontal" gap={1} className="flex-wrap">
              {LISTING_CONDITION_VALUES.map((conditionValue) => {
                const isSelected = value === conditionValue;
                const label = conditionValue.replace(/_/g, ' ');

                return (
                  <SwissPressable
                    key={conditionValue}
                    accessibilityLabel={`Condition: ${label}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(conditionValue);
                      onBlur();
                    }}
                    testID={`listing-condition-option-${conditionValue}`}
                    className={
                      isSelected
                        ? 'px-3 py-2 min-h-[44px] justify-center border bg-ink border-ink'
                        : 'px-3 py-2 min-h-[44px] justify-center border bg-paper border-divider'
                    }
                  >
                    <Text variant="caption" className={isSelected ? 'text-paper' : 'text-ink'}>
                      {label}
                    </Text>
                  </SwissPressable>
                );
              })}
            </Stack>
            {errors.condition?.message ? (
              <Text variant="caption" className="text-signal">
                {errors.condition.message}
              </Text>
            ) : null}
            {initialValues?.condition && !dirtyFields.condition ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-condition-ai-badge"
              >
                AI-generated
              </Text>
            ) : null}
            {!initialValues?.condition && !dirtyFields.condition ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-condition-manual-badge"
              >
                Enter manually
              </Text>
            ) : null}
          </Stack>
        )}
      />

      <Controller
        control={control}
        name="price"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <Stack gap={1}>
            <FormInput
              ref={ref}
              label="Price *"
              placeholder="0.00"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.price?.message}
              returnKeyType="next"
              keyboardType="decimal-pad"
              testID="listing-price-input"
            />
            {initialValues?.price?.trim() && !dirtyFields.price ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-price-ai-badge"
              >
                AI-generated
              </Text>
            ) : null}
            {initialValues?.price?.trim() && !dirtyFields.price && priceRange ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-price-range-caption"
              >
                {`Estimated: $${priceRange.min}–${priceRange.max}`}
              </Text>
            ) : null}
            {!initialValues?.price?.trim() && !dirtyFields.price ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-price-manual-badge"
              >
                Enter manually
              </Text>
            ) : null}
          </Stack>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <Stack gap={1}>
            <FormInput
              ref={ref}
              label="Description"
              placeholder="Describe the item for buyers"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="sentences"
              testID="listing-description-input"
            />
            {initialValues?.description?.trim() && !dirtyFields.description ? (
              <Text
                variant="caption"
                className="text-ink-muted"
                testID="listing-description-ai-badge"
              >
                AI-generated
              </Text>
            ) : null}
          </Stack>
        )}
      />

      <Stack gap={2}>
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
          Photos
        </Text>
        <Text variant="caption" className="text-ink-muted">
          (from valuation)
        </Text>
        {photoUri ? (
          <Box className="border border-divider p-1 bg-paper overflow-hidden">
            <Image
              source={{ uri: photoUri }}
              className="aspect-square w-full"
              resizeMode="cover"
              accessibilityLabel="Valuation photo"
              testID="listing-photo-image"
            />
          </Box>
        ) : (
          <Box
            testID="listing-photo-placeholder"
            className="w-full h-24 border border-divider items-center justify-center"
          >
            <Text variant="caption" className="text-ink-muted">
              Photo will appear here
            </Text>
          </Box>
        )}
        {photoUploadState === 'uploading' ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-photo-upload-status"
          >
            Hosting photo for sharing...
          </Text>
        ) : photoUploadState === 'error' ? (
          <Text
            variant="caption"
            className="text-ink-muted"
            testID="listing-photo-upload-status"
          >
            Photo upload failed — listing will copy without a photo URL
          </Text>
        ) : null}
        {photoUploadState === 'error' && onRetryPhotoUpload ? (
          <SwissPressable
            accessibilityLabel="Retry photo upload"
            accessibilityRole="button"
            onPress={onRetryPhotoUpload}
            testID="listing-photo-upload-retry-button"
            className="self-start py-2 pr-4 min-h-[44px] justify-center"
          >
            <Text variant="caption" className="text-ink underline">
              Try again
            </Text>
          </SwissPressable>
        ) : null}
      </Stack>

      <SwissPressable
        accessibilityLabel="Copy listing to clipboard"
        onPress={handleSubmit(handleValidSubmit)}
        className="bg-signal py-4 mt-2"
        testID="listing-submit-button"
      >
        <Text variant="body" className="text-paper text-center font-semibold">
          Copy to Clipboard
        </Text>
      </SwissPressable>

      <Text variant="caption" className="text-ink-muted">
        Valuation reference: {valuationId}
      </Text>
    </Stack>
  );
}