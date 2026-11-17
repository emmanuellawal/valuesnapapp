import React, { useRef, useCallback, useEffect, useState } from 'react';
import { AppState, RefreshControl, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { HistoryGridSkeleton } from '@/components/molecules';
import { HistoryGrid, type HistoryGridItem } from '@/components/organisms/history-grid';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import { fetchServerHistory, migrateGuestData } from '@/lib/migration';
import {
  clearLocalHistory,
  getLocalHistory,
  getOrCreateGuestSessionId,
} from '@/lib/localHistory';
import {
  clearPendingMigration,
  getPendingMigration,
  savePendingMigration,
  type PendingMigration,
} from '@/lib/migrationQueue';
import { checkBackendHealth } from '@/lib/networkHealth';
import { automaticRetryDelayMs, isRetryableMigrationError } from '@/constants/migration';
import { type Valuation, ValuationStatus } from '@/types/valuation';
import { useOnlineStatus, useGridColumns } from '@/lib/hooks';

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
  const { session, user, isGuest, isLoading: isAuthLoading } = useAuth();
  const activeSession = session;
  const accessToken = activeSession?.access_token ?? null;
  const activeIsGuest = isGuest;
  const isOnline = useOnlineStatus();
  const { numColumns, gap } = useGridColumns();
  const [history, setHistory] = useState<Valuation[]>([]);
  const [serverItems, setServerItems] = useState<HistoryGridItem[] | null>(null);
  const [migrationBanner, setMigrationBanner] = useState<{ count: number } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Separate from isLoading — isLoading renders the full HistoryGridSkeleton,
  // which would flash a full skeleton on every pull-to-refresh (wrong UX).
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Story 6.12: persisted retry record, mirrored in state only so the banner can render it.
  const [pendingMigration, setPendingMigration] = useState<PendingMigration | null>(null);

  const bannerDismissed = useRef(false);
  // Single shared in-flight flag for manual taps AND every automatic trigger (AC3).
  const migrationInFlightRef = useRef(false);
  const inFlightUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(user?.id ?? null);
  currentUserIdRef.current = user?.id ?? null;
  // Bumped as soon as migrateGuestData succeeds and again before post-import state writes (AC4).
  // fetchHistory captures it at entry and drops its writes if it moved, so a fetch already in
  // flight (mount starts two) cannot paint over the post-import result or flash an empty grid.
  const historyFetchEpoch = useRef(0);
  // Latest `history`, as the snapshot source for the post-import refresh fallback.
  const historyRef = useRef<Valuation[]>([]);
  historyRef.current = history;
  // Latest automatic-retry runner. Every trigger goes through this ref so the focus
  // callback's deps stay `[fetchHistory]` (no refocus loop) and no trigger bypasses the guards.
  const tryQueuedRetryRef = useRef<() => Promise<void>>(async () => {});
  const prevIsOnlineRef = useRef(isOnline);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    const epoch = historyFetchEpoch.current;
    const isStale = () => historyFetchEpoch.current !== epoch;

    if (!migrationInFlightRef.current) {
      setMigrationError(null);
    }

    if (env.useMock) {
      const data = await getLocalHistory();
      if (isStale()) return;
      setHistory(data);
      setServerItems(null);
      setMigrationBanner(null);
      return;
    }

    if (!activeIsGuest && accessToken) {
      let items: HistoryGridItem[] | null;
      try {
        items = await fetchServerHistory(accessToken);
      } catch {
        items = null;
      }
      if (isStale()) return;
      setServerItems(items);

      const local = await getLocalHistory();
      if (isStale()) return;
      setHistory(local);
      if (local.length > 0 && !bannerDismissed.current) {
        setMigrationBanner({ count: local.length });
      } else {
        setMigrationBanner(null);
      }
      return;
    }

    const data = await getLocalHistory();
    if (isStale()) return;
    setHistory(data);
    setServerItems(null);
    setMigrationBanner(null);
  }, [activeIsGuest, accessToken]);

  const isInitialLoad = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        fetchHistory().finally(() => setIsLoading(false));
      } else {
        fetchHistory();
      }
      // Sync on purpose: expo-router treats a returned Promise as a mistake. The ref keeps
      // this callback's identity stable.
      void tryQueuedRetryRef.current();
    }, [fetchHistory])
  );

  useEffect(() => {
    if (isAuthLoading || isInitialLoad.current || !accessToken) {
      return;
    }

    void fetchHistory();
  }, [accessToken, fetchHistory, isAuthLoading]);

  useEffect(() => {
    if (env.useMock || !accessToken || bannerDismissed.current) {
      return;
    }

    if (history.length > 0) {
      setMigrationBanner({ count: history.length });
      return;
    }

    setMigrationBanner(null);
  }, [accessToken, history]);

  /**
   * The ONE migration entry point: the manual button and every automatic trigger both
   * land here, so the guards cannot drift apart between call sites.
   *
   * Idempotency note: /api/migrate-guest is an UPDATE guarded by `user_id IS NULL`, so a
   * repeat call for the same `guestSessionId` migrates 0 rows. Retries therefore must reuse
   * the stored `guestSessionId` (never regenerate it) for that server guard to apply.
   */
  const attemptMigration = useCallback(
    async (guestSessionId: string) => {
      if (env.useMock || migrationInFlightRef.current || !accessToken || !user) return;

      const startedUserId = user.id;
      const startedToken = accessToken;
      const isSameActiveUser = () =>
        isMountedRef.current && currentUserIdRef.current === startedUserId;

      // Set before the first await so no other trigger can interleave.
      //
      // The epoch is deliberately NOT bumped before migration succeeds: bumping prior to a
      // failed attempt (probe down, 503) would discard mount-time fetches and leave an empty
      // grid with no banner. Instead, it bumps immediately after migrateGuestData resolves
      // and again before post-import state writes.
      migrationInFlightRef.current = true;
      inFlightUserIdRef.current = startedUserId;
      setIsMigrating(true);
      setMigrationError(null);

      const recordFailure = async (reason: string) => {
        const existing = await getPendingMigration();
        const sameSession =
          existing?.guestSessionId === guestSessionId && existing.userId === startedUserId;
        const now = new Date().toISOString();
        const record: PendingMigration = {
          userId: startedUserId,
          guestSessionId,
          queuedAt: sameSession ? existing.queuedAt : now,
          attempts: (sameSession ? existing.attempts : 0) + 1,
          lastAttemptAt: now,
          lastError: reason,
        };
        await savePendingMigration(record);
        if (isSameActiveUser()) {
          setPendingMigration(record);
        }
      };

      try {
        // Prefer what is on screen; an automatic retry can start before the first fetch has
        // populated `history`, so fall back to storage rather than snapshotting nothing.
        const localSnapshot =
          historyRef.current.length > 0 ? historyRef.current : await getLocalHistory();

        if (!(await checkBackendHealth())) {
          await recordFailure('Health check failed');
          return;
        }

        await migrateGuestData(startedToken, guestSessionId);
        historyFetchEpoch.current += 1;
        await clearPendingMigration();
        await clearLocalHistory();

        if (!isSameActiveUser()) {
          return;
        }

        setPendingMigration(null);
        setMigrationBanner(null);
        bannerDismissed.current = true;

        try {
          const items = await fetchServerHistory(startedToken);
          if (!isSameActiveUser()) return;
          historyFetchEpoch.current += 1;
          setServerItems(items);
          setHistory([]);
        } catch {
          if (!isSameActiveUser()) return;
          historyFetchEpoch.current += 1;
          setServerItems(null);
          setHistory(localSnapshot);
        }
      } catch (err) {
        if (isRetryableMigrationError(err)) {
          await recordFailure(err instanceof Error ? err.message : 'Unknown error');
        } else {
          // Permanent failure (e.g. 422): purge any prior queued record so an invalid
          // request is never retried in the background forever (AC1).
          await clearPendingMigration();
          if (isSameActiveUser()) {
            setPendingMigration(null);
            setMigrationError('Account migration failed. Please try again.');
          }
        }
      } finally {
        migrationInFlightRef.current = false;
        inFlightUserIdRef.current = null;
        if (isMountedRef.current) {
          setIsMigrating(false);
        }
      }
    },
    [accessToken, user]
  );

  const handleImport = async () => {
    if (!accessToken) return;
    await attemptMigration(await getOrCreateGuestSessionId());
  };

  // Reassigned every render so triggers always see the latest `attemptMigration`.
  // Reads the record from storage (not state) so it is never stale.
  tryQueuedRetryRef.current = async () => {
    if (env.useMock || migrationInFlightRef.current || !user) return;

    const record = await getPendingMigration();
    if (!record || record.userId !== user.id) return;
    if (env.useMock || migrationInFlightRef.current) return;

    const lastAttemptMs = Date.parse(record.lastAttemptAt);
    const elapsedMs = Number.isNaN(lastAttemptMs) ? Infinity : Date.now() - lastAttemptMs;
    if (elapsedMs < automaticRetryDelayMs(record.lastError)) return;

    await attemptMigration(record.guestSessionId);
  };

  // Show the pending copy before any trigger fires. Only for the signed-in user's own record.
  useEffect(() => {
    let cancelled = false;
    const activeUserId = user?.id ?? null;

    setPendingMigration((prev) => (prev && prev.userId === activeUserId ? prev : null));
    setMigrationError(null);

    void getPendingMigration().then((record) => {
      // Only yield to a running attempt when that attempt belongs to the current user.
      if (
        cancelled ||
        (migrationInFlightRef.current && inFlightUserIdRef.current === activeUserId)
      ) {
        return;
      }
      setPendingMigration(record && record.userId === activeUserId ? record : null);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // App resume (native + web). Tab screens stay mounted after first visit, so this covers
  // background -> foreground without the user switching tabs.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void tryQueuedRetryRef.current();
      }
    });

    return () => subscription.remove();
  }, []);

  // Web reconnect: false -> true only. Native useOnlineStatus() is always true.
  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current;
    prevIsOnlineRef.current = isOnline;

    if (isOnline && wasOffline) {
      void tryQueuedRetryRef.current();
    }
  }, [isOnline]);

  const handleDismiss = () => {
    bannerDismissed.current = true;
    setMigrationBanner(null);
    setMigrationError(null);
  };

  /**
   * AC #5: pull-to-refresh. Native (iOS/Android) only — react-native-web's
   * RefreshControl is a stub that discards onRefresh/refreshing/tintColor/
   * colors and renders a bare View (node_modules/react-native-web/dist/
   * exports/RefreshControl/index.js:15-28), so this is a silent no-op on
   * web. This app ships as a static-exported PWA; AC #5 is not verified on
   * web by this story.
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchHistory();
    } finally {
      setIsRefreshing(false);
    }
    // After the refresh, not inside the try: the spinner must not wait on a retry's POST.
    // The epoch guard drops this refresh's writes if the retry wins the race.
    void tryQueuedRetryRef.current();
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
    <ScreenContainer
      wide
      // Native-only (see handleRefresh) — no-op on web, per platform limitation above.
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#000000"
          colors={['#000000']}
        />
      }
    >
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
          ) : pendingMigration && pendingMigration.userId === user?.id ? (
            // Status, not an error: text-ink, and no claim about connectivity.
            <View accessibilityLiveRegion="polite" testID="migration-pending">
              <Text variant="body-sm" className="text-ink mb-3">
                Your import is saved. We&apos;ll retry it when you refresh, come back to this
                screen, or reopen the app.
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
          <HistoryGridSkeleton count={6} numColumns={numColumns} gap={gap} />
        ) : itemCount === 0 ? (
          <Box className="py-16 items-center">
            <Text variant="h3" className="text-ink-muted">
              No valuations yet
            </Text>
            <Text variant="body" className="text-ink-muted mt-2 text-center">
              Tap the Camera tab to snap your first item
            </Text>
            <Box className="mt-6">
              <SwissPressable onPress={() => router.push('/camera')} accessibilityLabel="Start valuing items">
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
            gap={gap}
            onItemPress={(item) => router.push(`/appraisal?id=${item.id}`)}
          />
        )}
      </Box>
    </ScreenContainer>
  );
}
