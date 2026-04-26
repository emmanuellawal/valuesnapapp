import React from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Stack, Text, SwissPressable } from '@/components/primitives';
import { buildEbaySoldSearchUrl } from '@/lib/utils';
import type { ConfidenceLevel } from '@/types';

export interface ConfidenceWarningProps {
  /**
   * The confidence level from the valuation.
   * Warning only shows for LOW confidence.
   */
  confidence: ConfidenceLevel;
  
  /**
   * Optional item type for eBay search pre-fill.
   */
  itemType?: string;
  
  /**
   * Optional brand for better eBay search.
   */
  brand?: string;
  
  /**
   * Optional model for better eBay search.
   */
  model?: string;
}

/**
 * Opens a URL in the appropriate browser/app.
 *
 * Native uses `WebBrowser.openBrowserAsync` (Safari View Controller on iOS,
 * Chrome Custom Tab on Android) instead of `Linking.openURL`, which has
 * known edge cases in Expo Go where `openURL` rejects even after
 * `canOpenURL` resolves true. See Story 5.5-9.
 *
 * Internally catches its own rejections so a system-level failure surfaces
 * as a `console.warn`, never as an unhandled promise rejection.
 */
async function openUrl(url: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      await WebBrowser.openBrowserAsync(url);
    }
  } catch (error) {
    console.warn('openUrl failed:', error);
  }
}

/**
 * Build search query from item details.
 * Filters out "Unknown" values to improve eBay search quality.
 */
function buildSearchQuery(
  itemType?: string,
  brand?: string,
  model?: string
): string {
  const parts = [brand, model, itemType]
    .filter(v => v && v.toLowerCase() !== 'unknown');
  return parts.join(' ').trim() || 'sold items';
}

/**
 * ConfidenceWarning - LOW Confidence Guidance
 * 
 * Displays a warning message when market data is limited,
 * with an optional link to verify prices on eBay.
 * 
 * **Swiss Design Principles:**
 * - Typography-driven (no icons)
 * - Signal color (#E53935) for caution emphasis
 * - Flush-left text alignment
 * - No backgrounds or decorative elements
 * 
 * **When Displayed:**
 * - LOW confidence only
 * - HIGH/MEDIUM: Returns null (no warning)
 * 
 * @example
 * ```tsx
 * <ConfidenceWarning
 *   confidence="LOW"
 *   itemType="vintage camera"
 *   brand="Canon"
 *   model="AE-1"
 * />
 * ```
 */
export function ConfidenceWarning({
  confidence,
  itemType,
  brand,
  model,
}: ConfidenceWarningProps) {
  // Only show warning for LOW confidence
  if (confidence !== 'LOW') {
    return null;
  }
  
  const searchQuery = buildSearchQuery(itemType, brand, model);
  const ebayUrl = buildEbaySoldSearchUrl(searchQuery);
  
  return (
    <Stack gap={2} className="w-full mt-4">
      {/* Warning message - Signal color for emphasis */}
      <Text 
        variant="body" 
        className="text-signal"
        accessibilityRole="alert"
      >
        Limited market data. Consider manual verification.
      </Text>
      
      {/* Verification link */}
      <SwissPressable 
        onPress={() => {
          openUrl(ebayUrl).catch((e) => console.warn('confidence-warning onPress', e));
        }}
        accessibilityLabel="Verify sold prices on eBay (opens in new tab)"
        accessibilityRole="link"
      >
        <Text variant="body" className="text-ink underline">
          Verify on eBay
        </Text>
      </SwissPressable>
    </Stack>
  );
}
