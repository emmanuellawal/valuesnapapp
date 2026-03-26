import React, { useRef, useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { HistoryGridSkeleton } from '@/components/molecules';
import { HistoryGrid, type HistoryGridItem } from '@/components/organisms/history-grid';
import { getLocalHistory } from '@/lib/localHistory';
import { type Valuation, ValuationStatus } from '@/types/valuation';
import { useOnlineStatus } from '@/lib/hooks';

/**
 * Map raw Valuation[] from storage to HistoryGridItem[] for display.
 * Filters out non-SUCCESS and null-response valuations.
 * Pure function — no side effects, no React, no hooks.
 */
export function mapValuationsToGridItems(valuations: Valuation[]): HistoryGridItem[] {
  return valuations
    .filter((v) => v.status === ValuationStatus.SUCCESS && v.response != null)
    .map((v) => ({
      id: v.id ?? v.createdAt,
      itemDetails: v.response!.itemDetails,
      marketData: v.response!.marketData,
      imageUri: v.imageUri,
    }));
}

/**
 * History Screen — Swiss Minimalist Design
 *
 * Collection overview with portfolio metrics.
 * Reads real local guest history from AsyncStorage.
 */
export default function HistoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isOnline = useOnlineStatus();
  const [history, setHistory] = useState<Valuation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const numColumns =
    width < 600 ? 1 :
    width < 1024 ? 2 :
    width < 1440 ? 3 :
    4;

  const fetchHistory = useCallback(async () => {
    const data = await getLocalHistory();
    setHistory(data);
  }, []);

  const isInitialLoad = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        fetchHistory().finally(() => setIsLoading(false));
      } else {
        fetchHistory();
      }
    }, [fetchHistory])
  );

  const historyItems = mapValuationsToGridItems(history);
  const itemCount = historyItems.length;
  const totalValue = historyItems.reduce(
    (sum, item) => sum + (item.marketData.fairMarketValue ?? 0),
    0
  );

  return (
    <ScreenContainer>
      {/* Hero stats */}
      <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
        Your collection
      </Text>
      <Text variant="display" className="text-ink mt-2">
        ${totalValue.toLocaleString()}
      </Text>
      <Text variant="body" className="text-ink-light mt-2">
        {itemCount} items valued
      </Text>

      {/* Offline banner — shown when device has no network */}
      {!isOnline && (
        <Box className="mt-6 px-3 py-2 bg-paper border border-divider">
          <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
            Offline — showing cached valuations
          </Text>
        </Box>
      )}

      {/* Items section */}
      <Box className="mt-12">
        <Stack gap={1} className="mb-6">
          <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
            All items
          </Text>
          <Text variant="h2" className="text-ink">
            Recent valuations
          </Text>
        </Stack>

        {isLoading ? (
          <HistoryGridSkeleton count={6} numColumns={numColumns} />
        ) : itemCount === 0 ? (
          <Box className="py-16 items-center">
            <Text variant="h3" className="text-ink-muted">
              No valuations yet
            </Text>
            <Text variant="body" className="text-ink-muted mt-2 text-center">
              Tap the Camera tab to snap your first item
            </Text>
            <Box className="mt-6">
              <SwissPressable onPress={() => router.push('/')} accessibilityLabel="Start valuing items">
                <Text variant="body" className="font-semibold">
                  Start Valuing
                </Text>
              </SwissPressable>
            </Box>
          </Box>
        ) : (
          <HistoryGrid
            items={historyItems}
            numColumns={numColumns}
            onItemPress={(item) => router.push(`/appraisal?id=${item.id}`)}
          />
        )}
      </Box>
    </ScreenContainer>
  );
}
