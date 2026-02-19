import React from 'react';
import { Linking, Platform } from 'react-native';

import { Box, Stack, Text, SwissPressable } from '@/components/primitives';

/**
 * Error type codes matching backend error responses.
 */
export type ErrorType = 
  | 'AI_IDENTIFICATION_FAILED'
  | 'AI_TIMEOUT'
  | 'INVALID_IMAGE'
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT'
  | 'GENERIC_ERROR';

/**
 * Error message configuration for each error type.
 */
const ERROR_CONFIG: Record<ErrorType, { title: string; suggestions: string[] }> = {
  AI_IDENTIFICATION_FAILED: {
    title: 'Unable to identify item',
    suggestions: [
      'Try a clearer photo with better lighting',
      'Include brand name or model number in frame',
      'Position item against a plain background',
    ],
  },
  AI_TIMEOUT: {
    title: 'Request took too long',
    suggestions: [
      'Check your internet connection',
      'Try again in a moment',
    ],
  },
  INVALID_IMAGE: {
    title: 'Unable to process image',
    suggestions: [
      'Try a different photo',
      'Ensure the image is clear and in focus',
    ],
  },
  NETWORK_ERROR: {
    title: 'Connection problem',
    suggestions: [
      'Check your internet connection',
      'Try again when you have a stable connection',
    ],
  },
  RATE_LIMIT: {
    title: 'Too many requests',
    suggestions: [
      'Please wait a moment before trying again',
      'Try again in a few minutes',
    ],
  },
  GENERIC_ERROR: {
    title: 'Something went wrong',
    suggestions: [
      'Please try again',
      'If the issue persists, contact support',
    ],
  },
};

export interface ErrorStateProps {
  /**
   * Error type code for message lookup.
   * Uses predefined messages based on error type.
   */
  errorType?: ErrorType;
  
  /**
   * Custom title override.
   * If provided, overrides the default title for errorType.
   */
  title?: string;
  
  /**
   * Custom suggestions override.
   * If provided, overrides the default suggestions for errorType.
   */
  suggestions?: string[];
  
  /**
   * Callback when retry button is pressed.
   * If not provided, retry button is hidden.
   */
  onRetry?: () => void;
  
  /**
   * Fallback link configuration.
   * If not provided, fallback link is hidden.
   */
  fallbackLink?: {
    text: string;
    href: string;
  };
}

/**
 * Opens a URL in the appropriate browser/app.
 */
async function openUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  }
}

/**
 * ErrorState - Swiss-Designed Error Feedback Component
 * 
 * Displays error messages with actionable suggestions and recovery options.
 * Follows Swiss Minimalist design principles:
 * 
 * **Maintained Swiss Principles:**
 * - Typography hierarchy (h3 bold title, body regular suggestions)
 * - Flush-left text alignment (no centering)
 * - No red backgrounds or error icons
 * - No shadows or rounded corners
 * - Black and white only
 * 
 * **Design Philosophy:**
 * - Errors are guidance, not punishment
 * - Always provide a path forward (retry + fallback)
 * - Clear, factual messaging without blame
 * 
 * @example
 * ```tsx
 * <ErrorState
 *   errorType="AI_IDENTIFICATION_FAILED"
 *   onRetry={() => retryValuation()}
 *   fallbackLink={{
 *     text: "Search eBay manually",
 *     href: "https://www.ebay.com/sch/"
 *   }}
 * />
 * ```
 */
export function ErrorState({
  errorType = 'GENERIC_ERROR',
  title,
  suggestions,
  onRetry,
  fallbackLink,
}: ErrorStateProps) {
  const config = ERROR_CONFIG[errorType];
  const displayTitle = title ?? config.title;
  const displaySuggestions = suggestions ?? config.suggestions;
  
  return (
    <Stack gap={4} className="py-8 w-full max-w-sm">
      {/* Error title - Swiss typography, bold for emphasis */}
      <Text 
        variant="h3" 
        className="font-bold text-ink"
        accessibilityRole="alert"
      >
        {displayTitle}
      </Text>
      
      {/* Suggestions list - flush-left, not centered */}
      {displaySuggestions && displaySuggestions.length > 0 && (
        <Stack gap={2} className="w-full">
          {displaySuggestions.map((suggestion, index) => (
            <Stack key={index} direction="horizontal" gap={2} className="items-start">
              <Text variant="body" className="text-ink-light">
                •
              </Text>
              <Text variant="body" className="text-ink-light flex-1">
                {suggestion}
              </Text>
            </Stack>
          ))}
        </Stack>
      )}
      
      {/* Action buttons */}
      <Stack gap={3} className="w-full mt-2">
        {/* Retry button - primary action */}
        {onRetry && (
          <SwissPressable 
            onPress={onRetry}
            accessibilityLabel="Try again to identify item"
            accessibilityRole="button"
          >
            <Box className="border border-ink p-3 bg-paper">
              <Text variant="body" className="font-semibold text-ink text-center">
                Try again
              </Text>
            </Box>
          </SwissPressable>
        )}
        
        {/* Fallback link - secondary action */}
        {fallbackLink && (
          <SwissPressable 
            onPress={() => openUrl(fallbackLink.href)}
            accessibilityLabel={`${fallbackLink.text} (opens in new tab)`}
            accessibilityRole="link"
          >
            <Text variant="body" className="text-ink underline text-center">
              {fallbackLink.text}
            </Text>
          </SwissPressable>
        )}
      </Stack>
    </Stack>
  );
}

/**
 * Re-export types for external usage.
 */
export type { ErrorType as ErrorStateType };
