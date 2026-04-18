import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { HistoryGridSkeleton } from '@/components/molecules';
import { HistoryGrid, type HistoryGridItem } from '@/components/organisms/history-grid';
import { BREAKPOINTS } from '@/constants/breakpoints';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import { fetchServerHistory, migrateGuestData } from '@/lib/migration';
import {
  clearLocalHistory,
  getLocalHistory,
  getOrCreateGuestSessionId,
} from '@/lib/localHistory';
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
  const { session, isGuest, isLoading: isAuthLoading } = useAuth();
  const activeSession = session;
  const activeIsGuest = isGuest;
  const { width } = useWindowDimensions();
  const isOnline = useOnlineStatus();
  const [history, setHistory] = useState<Valuation[]>([]);
  const [serverItems, setServerItems] = useState<HistoryGridItem[] | null>(null);
  const [migrationBanner, setMigrationBanner] = useState<{ count: number } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const numColumns =
    width < BREAKPOINTS.tablet ? 1 :
    width < BREAKPOINTS.desktop ? 2 :
    width < BREAKPOINTS.largeDesktop ? 3 :
    4;

  const bannerDismissed = useRef(false);

  const fetchHistory = useCallback(async () => {
    setMigrationError(null);

    if (env.useMock) {
      const data = await getLocalHistory();
      setHistory(data);
      setServerItems(null);
      setMigrationBanner(null);
      return;
    }

    if (!activeIsGuest && activeSession) {
      try {
        const items = await fetchServerHistory(activeSession.access_token);
        setServerItems(items);
      } catch {
        setServerItems(null);
      }

      const local = await getLocalHistory();
      setHistory(local);
      if (local.length > 0 && !bannerDismissed.current) {
        setMigrationBanner({ count: local.length });
      } else {
        setMigrationBanner(null);
      }
      return;
    }

    const data = await getLocalHistory();
    setHistory(data);
    setServerItems(null);
    setMigrationBanner(null);
  }, [activeIsGuest, activeSession]);

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

  useEffect(() => {
    if (isAuthLoading || isInitialLoad.current || !activeSession) {
      return;
    }

    void fetchHistory();
  }, [activeSession, fetchHistory, isAuthLoading]);

  useEffect(() => {
    if (env.useMock || !activeSession || bannerDismissed.current) {
      return;
    }

    if (history.length > 0) {
      setMigrationBanner({ count: history.length });
      return;
    }

    setMigrationBanner(null);
  }, [activeSession, history]);

  const handleImport = async () => {
    if (!activeSession) return;

    const localSnapshot = history;
    setIsMigrating(true);
    setMigrationError(null);

    try {
      const guestSessionId = await getOrCreateGuestSessionId();
      await migrateGuestData(activeSession.access_token, guestSessionId);
      await clearLocalHistory();
      setMigrationBanner(null);
      bannerDismissed.current = true;

      try {
        const items = await fetchServerHistory(activeSession.access_token);
        setServerItems(items);
        setHistory([]);
      } catch {
        setServerItems(null);
        setHistory(localSnapshot);
      }
    } catch {
      setMigrationError('Account migration failed. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    bannerDismissed.current = true;
    setMigrationBanner(null);
    setMigrationError(null);
  };

  const visibleMigrationBanner = migrationBanner ?? (
    !env.useMock && activeSession && history.length > 0 && !bannerDismissed.current
      ? { count: history.length }
      : null
  );

  const historyItems = serverItems ?? mapValuationsToGridItems(history);
  const itemCount = historyItems.length;
  const totalValue = historyItems.reduce(
    (sum, item) => sum + (item.marketData.fairMarketValue ?? 0),
    0
  );

  return (
    <ScreenContainer>
      {visibleMigrationBanner ? (
        <View testID="migration-banner" className="mb-6">
          <Text variant="body" className="text-ink mb-4">
            {`You have ${visibleMigrationBanner.count} ${
              visibleMigrationBanner.count === 1 ? 'valuation' : 'valuations'
            } from your guest session.`}
          </Text>

          {migrationError ? (
            <View accessibilityLiveRegion="polite" testID="migration-error">
              <Text variant="body-sm" className="text-signal mb-3">
                {migrationError}
              </Text>
            </View>
          ) : null}

          <SwissPressable
            onPress={handleImport}
            disabled={isMigrating}
            testID="migration-import-button"
            accessibilityLabel="Import guest valuations to account"
            className="py-4 border-b border-divider"
          >
            <Text variant="body" className="text-signal">
              {isMigrating ? 'Importing…' : 'Import to account'}
            </Text>
          </SwissPressable>

          <SwissPressable
            onPress={handleDismiss}
            testID="migration-dismiss-button"
            accessibilityLabel="Dismiss migration prompt"
            className="py-4 border-b border-divider"
          >
            <Text variant="body" className="text-ink">
              Dismiss
            </Text>
          </SwissPressable>
        </View>
      ) : null}

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
