import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn(),
  getOrCreateGuestSessionId: jest.fn(),
  clearLocalHistory: jest.fn(),
}));

jest.mock('@/lib/migration', () => ({
  fetchServerHistory: jest.fn(),
  migrateGuestData: jest.fn(),
}));

// Story 6.12: mock the queue + probe modules so the component never touches the
// shared module-level AsyncStorage mock (it leaks across tests in one file).
// constants/migration.ts is deliberately NOT mocked: its helpers stay real.
jest.mock('@/lib/migrationQueue', () => ({
  getPendingMigration: jest.fn(),
  savePendingMigration: jest.fn(),
  clearPendingMigration: jest.fn(),
}));

jest.mock('@/lib/networkHealth', () => ({
  checkBackendHealth: jest.fn(),
}));

jest.mock('@/lib/hooks', () => ({
  useOnlineStatus: jest.fn(() => true),
  useGridColumns: jest.fn(() => ({ numColumns: 1, gap: 16 })),
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: false, apiUrl: 'http://localhost:8000' },
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn() })),
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  }),
}));

import HistoryScreen from '../app/(tabs)/history';
import { useAuth } from '@/contexts/AuthContext';
import { env } from '@/lib/env';
import {
  clearLocalHistory,
  getLocalHistory,
  getOrCreateGuestSessionId,
} from '@/lib/localHistory';
import { fetchServerHistory, migrateGuestData } from '@/lib/migration';
import {
  clearPendingMigration,
  getPendingMigration,
  savePendingMigration,
  type PendingMigration,
} from '@/lib/migrationQueue';
import { checkBackendHealth } from '@/lib/networkHealth';
import { useOnlineStatus } from '@/lib/hooks';
import { ValuationStatus, type Valuation } from '@/types/valuation';

const mockGetPendingMigration = getPendingMigration as jest.Mock;
const mockSavePendingMigration = savePendingMigration as jest.Mock;
const mockClearPendingMigration = clearPendingMigration as jest.Mock;
const mockCheckBackendHealth = checkBackendHealth as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockGetLocalHistory = getLocalHistory as jest.Mock;
const mockGetOrCreateGuestSessionId = getOrCreateGuestSessionId as jest.Mock;
const mockClearLocalHistory = clearLocalHistory as jest.Mock;
const mockFetchServerHistory = fetchServerHistory as jest.Mock;
const mockMigrateGuestData = migrateGuestData as jest.Mock;

function authenticatedAuth() {
  return {
    session: { access_token: 'tok' },
    user: {
      id: 'user-123',
      email: 'user@example.com',
      createdAt: '2026-04-01T00:00:00.000Z',
      tier: 'FREE' as const,
      preferences: {},
    },
    isGuest: false,
    isLoading: false,
    signOut: jest.fn(),
  };
}

function guestAuth() {
  return {
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  };
}

function makeValuation(overrides?: Partial<Valuation>): Valuation {
  return {
    id: 'local-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: ValuationStatus.SUCCESS,
    request: {},
    response: {
      itemDetails: {
        itemType: 'camera',
        brand: 'Canon',
        model: 'AE-1',
        visualCondition: 'used_good',
        conditionDetails: 'Minor wear',
        estimatedAge: '1970s',
        categoryHint: 'Cameras',
        searchKeywords: ['Canon AE-1', 'film camera'],
        identifiers: { upc: null, modelNumber: null, serialNumber: null },
      },
      marketData: {
        status: 'success',
        keywords: 'Canon AE-1 film camera',
        totalFound: 20,
        pricesAnalyzed: 15,
        priceRange: { min: 80, max: 200 },
        fairMarketValue: 130,
        confidence: 'HIGH',
      },
    },
    ...overrides,
  };
}

function makeServerItem(id = 'server-1') {
  return {
    id,
    itemDetails: {
      itemType: 'watch',
      brand: 'Seiko',
      model: 'SKX007',
      visualCondition: 'used_good',
      conditionDetails: 'Minor wear',
      estimatedAge: '2010s',
      categoryHint: 'Watches',
      searchKeywords: ['Seiko', 'SKX007'],
      identifiers: { upc: null, modelNumber: 'SKX007', serialNumber: null },
    },
    marketData: {
      status: 'success',
      keywords: 'seiko skx007',
      totalFound: 12,
      pricesAnalyzed: 8,
      priceRange: { min: 100, max: 200 },
      fairMarketValue: 150,
      confidence: 'HIGH',
    },
    imageUri: 'https://example.com/thumb.jpg',
  };
}

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

function getNodeText(node: ReactTestInstance): string {
  return node.children
    .map((child) => {
      if (typeof child === 'string') {
        return child;
      }

      return getNodeText(child);
    })
    .join('');
}

async function renderScreen() {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<HistoryScreen />);
  });
  await act(async () => {});

  return renderer!;
}

describe('HistoryScreen — migration flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.useMock = false;
    mockUseAuth.mockReturnValue(authenticatedAuth());
    mockGetLocalHistory.mockResolvedValue([]);
    mockGetOrCreateGuestSessionId.mockResolvedValue('guest-123');
    mockClearLocalHistory.mockResolvedValue(undefined);
    mockFetchServerHistory.mockResolvedValue([]);
    mockMigrateGuestData.mockResolvedValue({ migrated: 1 });
    mockGetPendingMigration.mockResolvedValue(null);
    mockSavePendingMigration.mockResolvedValue(undefined);
    mockClearPendingMigration.mockResolvedValue(undefined);
    mockCheckBackendHealth.mockResolvedValue(true);
    mockUseOnlineStatus.mockReturnValue(true);
  });

  it('shows migration banner when authenticated with local history', async () => {
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);

    const renderer = await renderScreen();
    const banner = findByTestId(renderer, 'migration-banner');

    expect(banner).toBeTruthy();
    expect(getNodeText(banner)).toContain('1 valuation');
  });

  it('does not show banner for guest users', async () => {
    mockUseAuth.mockReturnValue(guestAuth());
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);

    const renderer = await renderScreen();

    expect(renderer.root.findAll((node) => node.props?.testID === 'migration-banner')).toHaveLength(0);
    expect(mockFetchServerHistory).not.toHaveBeenCalled();
  });

  it('does not show banner when local history is empty', async () => {
    const renderer = await renderScreen();

    expect(renderer.root.findAll((node) => node.props?.testID === 'migration-banner')).toHaveLength(0);
  });

  it('falls back to local history when server fetch fails', async () => {
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);
    mockFetchServerHistory.mockRejectedValue(new Error('500'));

    const renderer = await renderScreen();

    expect(findByTestId(renderer, 'migration-banner')).toBeTruthy();
    expect(getNodeText(renderer.root)).toContain('1 items valued');
  });

  it('clears local history and refreshes server items after a successful import', async () => {
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);
    mockFetchServerHistory
      .mockResolvedValueOnce([])
      .mockResolvedValue([makeServerItem('server-1')]);

    const renderer = await renderScreen();

    await act(async () => {
      await findByTestId(renderer, 'migration-import-button').props.onPress();
    });

    expect(mockMigrateGuestData).toHaveBeenCalledWith('tok', 'guest-123');
    expect(mockClearLocalHistory).toHaveBeenCalledTimes(1);
    expect(mockFetchServerHistory.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(renderer.root.findAll((node) => node.props?.testID === 'migration-banner')).toHaveLength(0);
    expect(getNodeText(renderer.root)).toContain('1 items valued');
  });

  it('shows an error when migration fails and re-enables the import button', async () => {
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);
    mockMigrateGuestData.mockRejectedValue(new Error('500'));

    const renderer = await renderScreen();

    await act(async () => {
      await findByTestId(renderer, 'migration-import-button').props.onPress();
    });

    const errorNode = findByTestId(renderer, 'migration-error');
    expect(getNodeText(errorNode).toLowerCase()).toContain('migration failed');
    expect(mockClearLocalHistory).not.toHaveBeenCalled();
    expect(findByTestId(renderer, 'migration-import-button').props.disabled).toBe(false);
  });

  it('dismisses the banner without calling the migration API', async () => {
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);

    const renderer = await renderScreen();

    await act(async () => {
      findByTestId(renderer, 'migration-dismiss-button').props.onPress();
    });

    expect(renderer.root.findAll((node) => node.props?.testID === 'migration-banner')).toHaveLength(0);
    expect(mockMigrateGuestData).not.toHaveBeenCalled();
    expect(mockClearLocalHistory).not.toHaveBeenCalled();
  });

  it('skips server history and hides the banner in mock mode', async () => {
    env.useMock = true;
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);

    const renderer = await renderScreen();

    expect(mockFetchServerHistory).not.toHaveBeenCalled();
    expect(renderer.root.findAll((node) => node.props?.testID === 'migration-banner')).toHaveLength(0);
    expect(getNodeText(renderer.root)).toContain('1 items valued');
  });

  // ── Story 6.12: offline migration retry queue ────────────────────────────────

  const PENDING_COPY =
    "Your import is saved. We'll retry it when you refresh, come back to this screen, or reopen the app.";

  function makePending(overrides?: Partial<PendingMigration>): PendingMigration {
    return {
      userId: 'user-123',
      guestSessionId: 'guest-123',
      queuedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      attempts: 1,
      // Older than the 60s burst guard unless a test is about the cooldown.
      lastAttemptAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      lastError: 'Migration failed with status 503',
      ...overrides,
    };
  }

  function minutesAgo(minutes: number): string {
    return new Date(Date.now() - minutes * 60_000).toISOString();
  }

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  function queryByTestId(renderer: ReactTestRenderer, testID: string) {
    return renderer.root.findAll((node) => node.props?.testID === testID);
  }

  // findAll matches both the composite and its host node, so assert presence, not count.
  function hasTestId(renderer: ReactTestRenderer, testID: string): boolean {
    return queryByTestId(renderer, testID).length > 0;
  }

  describe('retry queue', () => {
    beforeEach(() => {
      mockGetLocalHistory.mockResolvedValue([makeValuation()]);
    });

    it('writes a pending record and shows pending copy after a transient 503 (offline/transient failure)', async () => {
      mockMigrateGuestData.mockRejectedValue(new Error('Migration failed with status 503'));

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockSavePendingMigration).toHaveBeenCalledTimes(1);
      expect(mockSavePendingMigration).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          guestSessionId: 'guest-123',
          attempts: 1,
        }),
      );
      expect(getNodeText(findByTestId(renderer, 'migration-pending'))).toBe(PENDING_COPY);
      expect(queryByTestId(renderer, 'migration-error')).toHaveLength(0);
      expect(mockClearLocalHistory).not.toHaveBeenCalled();
      expect(findByTestId(renderer, 'migration-import-button').props.disabled).toBe(false);
    });

    it('treats a fetch TypeError as retryable', async () => {
      mockMigrateGuestData.mockRejectedValue(new TypeError('Failed to fetch'));

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockSavePendingMigration).toHaveBeenCalledTimes(1);
      expect(hasTestId(renderer, 'migration-pending')).toBe(true);
    });

    it('does not queue a non-retryable failure (422) and shows the one-shot error only', async () => {
      mockMigrateGuestData.mockRejectedValue(new Error('Migration failed with status 422'));

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockSavePendingMigration).not.toHaveBeenCalled();
      expect(queryByTestId(renderer, 'migration-pending')).toHaveLength(0);
      expect(getNodeText(findByTestId(renderer, 'migration-error')).toLowerCase()).toContain(
        'migration failed',
      );
    });

    it('increments attempts on the same session and keeps the original queuedAt', async () => {
      const existing = makePending({ attempts: 2, queuedAt: '2026-11-01T00:00:00.000Z' });
      // Auto-retry would fire on mount for this record; make the probe fail so only the
      // manual tap's POST decides the outcome, and keep the cooldown closed for auto.
      mockGetPendingMigration.mockResolvedValue({ ...existing, lastAttemptAt: minutesAgo(0) });
      mockMigrateGuestData.mockRejectedValue(new Error('Migration failed with status 500'));

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockSavePendingMigration).toHaveBeenCalledWith(
        expect.objectContaining({
          guestSessionId: 'guest-123',
          attempts: 3,
          queuedAt: '2026-11-01T00:00:00.000Z',
        }),
      );
    });

    it('records a probe failure on a manual tap: pending shown, migrateGuestData not called', async () => {
      mockCheckBackendHealth.mockResolvedValue(false);

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockMigrateGuestData).not.toHaveBeenCalled();
      expect(mockSavePendingMigration).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123', guestSessionId: 'guest-123', attempts: 1 }),
      );
      expect(getNodeText(findByTestId(renderer, 'migration-pending'))).toBe(PENDING_COPY);
      expect(findByTestId(renderer, 'migration-import-button').props.disabled).toBe(false);
    });

    it('pending node is a polite live region styled as status (text-ink, not text-signal)', async () => {
      mockCheckBackendHealth.mockResolvedValue(false);

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      const pending = findByTestId(renderer, 'migration-pending');
      expect(pending.props.accessibilityLiveRegion).toBe('polite');
      const textNode = pending.find((node) => node.props?.variant === 'body-sm');
      expect(textNode.props.className).toContain('text-ink');
      expect(textNode.props.className).not.toContain('text-signal');
    });

    it('shows pending copy from a stored record on mount for the signed-in user', async () => {
      // Burst guard closed so auto-retry does not run: this isolates the mount read.
      mockGetPendingMigration.mockResolvedValue(makePending({ lastAttemptAt: minutesAgo(0) }));

      const renderer = await renderScreen();

      expect(getNodeText(findByTestId(renderer, 'migration-pending'))).toBe(PENDING_COPY);
      expect(mockMigrateGuestData).not.toHaveBeenCalled();
    });

    it('retries automatically on mount with the stored guestSessionId, then clears the record (queued retry + flush)', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending({ guestSessionId: 'guest-stored' }));
      mockFetchServerHistory
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([makeServerItem('server-1')]);

      const renderer = await renderScreen();

      expect(mockCheckBackendHealth).toHaveBeenCalledTimes(1);
      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);
      expect(mockMigrateGuestData).toHaveBeenCalledWith('tok', 'guest-stored');
      expect(mockGetOrCreateGuestSessionId).not.toHaveBeenCalled();
      expect(mockClearPendingMigration).toHaveBeenCalledTimes(1);
      expect(mockClearLocalHistory).toHaveBeenCalledTimes(1);
      // Successful flush: banner gone, no pending or error messaging left.
      expect(queryByTestId(renderer, 'migration-banner')).toHaveLength(0);
      expect(queryByTestId(renderer, 'migration-pending')).toHaveLength(0);
      expect(queryByTestId(renderer, 'migration-error')).toHaveLength(0);
    });

    it('does not call migrateGuestData when the health probe fails on an automatic retry', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending());
      mockCheckBackendHealth.mockResolvedValue(false);

      const renderer = await renderScreen();

      expect(mockCheckBackendHealth).toHaveBeenCalledTimes(1);
      expect(mockMigrateGuestData).not.toHaveBeenCalled();
      // Probe failure is a failed attempt: bumps attempts so the cooldown applies.
      expect(mockSavePendingMigration).toHaveBeenCalledWith(
        expect.objectContaining({ guestSessionId: 'guest-123', attempts: 2 }),
      );
      expect(hasTestId(renderer, 'migration-pending')).toBe(true);
    });

    it('reuses the identical guestSessionId from a failed manual attempt on the next automatic retry', async () => {
      mockMigrateGuestData.mockRejectedValueOnce(new Error('Migration failed with status 503'));

      const first = await renderScreen();
      await act(async () => {
        await findByTestId(first, 'migration-import-button').props.onPress();
      });
      const saved = mockSavePendingMigration.mock.calls[0][0] as PendingMigration;
      act(() => first.unmount());

      // Prove the id is read from the stored record, never re-generated.
      mockGetOrCreateGuestSessionId.mockResolvedValue('regenerated-should-not-be-used');
      mockGetPendingMigration.mockResolvedValue({ ...saved, lastAttemptAt: minutesAgo(10) });
      mockMigrateGuestData.mockResolvedValue({ migrated: 1 });
      await renderScreen();

      expect(mockMigrateGuestData).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = mockMigrateGuestData.mock.calls;
      expect(firstCall[1]).toBe('guest-123');
      expect(secondCall[1]).toBe(firstCall[1]);
    });

    it('does not auto-retry a record that belongs to a different user, and hides its pending copy', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending({ userId: 'someone-else' }));

      const renderer = await renderScreen();

      expect(mockCheckBackendHealth).not.toHaveBeenCalled();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();
      expect(queryByTestId(renderer, 'migration-pending')).toHaveLength(0);
      // Falls back to today's manual prompt.
      expect(hasTestId(renderer, 'migration-import-button')).toBe(true);
    });

    it('rewrites a mismatched record under the new user on a failed manual tap', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending({ userId: 'someone-else' }));
      mockMigrateGuestData.mockRejectedValue(new Error('Migration failed with status 503'));

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockSavePendingMigration).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
      );
    });

    it('does not auto-retry inside the 60s burst guard', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending({ lastAttemptAt: minutesAgo(0) }));

      await renderScreen();

      expect(mockCheckBackendHealth).not.toHaveBeenCalled();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();
    });

    it('waits 15 minutes after a 429: no auto-retry at 2 minutes, retries at 16 minutes', async () => {
      mockGetPendingMigration.mockResolvedValue(
        makePending({
          lastError: 'Migration failed with status 429',
          lastAttemptAt: minutesAgo(2),
        }),
      );
      await renderScreen();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();

      mockGetPendingMigration.mockResolvedValue(
        makePending({
          lastError: 'Migration failed with status 429',
          lastAttemptAt: minutesAgo(16),
        }),
      );
      await renderScreen();
      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);
    });

    it('manual taps are exempt from the burst guard', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending({ lastAttemptAt: minutesAgo(0) }));

      const renderer = await renderScreen();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();

      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);
    });

    it('never probes or POSTs in mock mode, even with a matching pending record', async () => {
      env.useMock = true;
      mockGetPendingMigration.mockResolvedValue(makePending());

      await renderScreen();

      expect(mockCheckBackendHealth).not.toHaveBeenCalled();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();
    });

    it('never auto-retries for a guest', async () => {
      mockUseAuth.mockReturnValue(guestAuth());
      mockGetPendingMigration.mockResolvedValue(makePending());

      await renderScreen();

      expect(mockCheckBackendHealth).not.toHaveBeenCalled();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();
    });

    it('keeps the local snapshot when the post-import refresh fails (Canon AE-1, not Seiko SKX007)', async () => {
      mockFetchServerHistory.mockImplementation(async () => {
        if (mockMigrateGuestData.mock.calls.length > 0) {
          throw new Error('500');
        }
        return [];
      });

      const renderer = await renderScreen();
      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      const text = getNodeText(renderer.root);
      expect(text).toContain('Canon AE-1');
      expect(text).not.toContain('Seiko SKX007');
      expect(queryByTestId(renderer, 'migration-banner')).toHaveLength(0);
    });

    it('a mount-time fetch that was already in flight cannot overwrite the import result', async () => {
      type HistoryItems = ReturnType<typeof makeServerItem>[];
      const staleFetches: Array<ReturnType<typeof deferred<HistoryItems>>> = [];

      mockGetPendingMigration.mockResolvedValue(makePending());
      mockFetchServerHistory.mockImplementation(() => {
        if (mockMigrateGuestData.mock.calls.length === 0) {
          // The focus fetch and the activeSession fetch both start before the import resolves.
          const d = deferred<HistoryItems>();
          staleFetches.push(d);
          return d.promise;
        }
        return Promise.resolve([makeServerItem('server-1')]);
      });

      const renderer = await renderScreen();

      expect(staleFetches.length).toBeGreaterThanOrEqual(2);
      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);

      await act(async () => {
        staleFetches.forEach((d) => d.resolve([]));
      });
      await act(async () => {});

      expect(getNodeText(renderer.root)).toContain('Seiko SKX007');
      expect(getNodeText(renderer.root)).toContain('1 items valued');
    });

    it('single-flight: a manual tap during an in-flight automatic retry produces exactly one POST', async () => {
      const probe = deferred<boolean>();
      mockGetPendingMigration.mockResolvedValue(makePending());
      mockCheckBackendHealth.mockReturnValue(probe.promise);

      const renderer = await renderScreen();
      // Auto-retry is now blocked on the probe and holds the shared in-flight flag.
      expect(mockCheckBackendHealth).toHaveBeenCalledTimes(1);

      await act(async () => {
        // Called directly like the other tests: this ignores `disabled`, so it still
        // reaches attemptMigration and proves the shared ref (not the button) blocks it.
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });
      expect(mockCheckBackendHealth).toHaveBeenCalledTimes(1);

      await act(async () => {
        probe.resolve(true);
      });
      await act(async () => {});

      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);
    });

    it('retries when the app returns to the foreground (AppState → active)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppState } = require('react-native');
      let onChange: ((state: string) => void) | undefined;
      const remove = jest.fn();
      const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((
        _type: string,
        handler: (state: string) => void,
      ) => {
        onChange = handler;
        return { remove };
      }) as never);

      try {
        // No record at mount, so the focus trigger does nothing.
        const renderer = await renderScreen();
        expect(mockMigrateGuestData).not.toHaveBeenCalled();
        expect(onChange).toBeDefined();

        mockGetPendingMigration.mockResolvedValue(makePending());
        await act(async () => {
          onChange!('active');
        });
        await act(async () => {});

        expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);

        await act(async () => {
          renderer.unmount();
        });
        expect(remove).toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('ignores AppState changes other than active', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppState } = require('react-native');
      let onChange: ((state: string) => void) | undefined;
      const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((
        _type: string,
        handler: (state: string) => void,
      ) => {
        onChange = handler;
        return { remove: jest.fn() };
      }) as never);

      try {
        await renderScreen();
        mockGetPendingMigration.mockResolvedValue(makePending());
        await act(async () => {
          onChange!('background');
        });
        await act(async () => {});

        expect(mockMigrateGuestData).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('retries on a web reconnect (isOnline false → true) but not on the initial online render', async () => {
      mockUseOnlineStatus.mockReturnValue(false);
      const renderer = await renderScreen();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();

      mockGetPendingMigration.mockResolvedValue(makePending());
      mockUseOnlineStatus.mockReturnValue(true);
      await act(async () => {
        renderer.update(<HistoryScreen />);
      });
      await act(async () => {});

      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);
    });

    it('retries after a pull-to-refresh', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RefreshControl } = require('react-native');
      const renderer = await renderScreen();
      expect(mockMigrateGuestData).not.toHaveBeenCalled();

      mockGetPendingMigration.mockResolvedValue(makePending());
      await act(async () => {
        await renderer.root.findByType(RefreshControl).props.onRefresh();
      });
      await act(async () => {});

      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);
    });

    it('dismissing the banner does not clear the pending record', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending({ lastAttemptAt: minutesAgo(0) }));

      const renderer = await renderScreen();
      await act(async () => {
        findByTestId(renderer, 'migration-dismiss-button').props.onPress();
      });

      expect(queryByTestId(renderer, 'migration-banner')).toHaveLength(0);
      expect(mockClearPendingMigration).not.toHaveBeenCalled();
    });

    it('purges a prior pending record when a later attempt fails with a non-retryable error (422)', async () => {
      mockGetPendingMigration.mockResolvedValue(makePending({ lastAttemptAt: minutesAgo(0) }));
      mockMigrateGuestData.mockRejectedValue(new Error('Migration failed with status 422'));

      const renderer = await renderScreen();
      expect(hasTestId(renderer, 'migration-pending')).toBe(true);

      await act(async () => {
        await findByTestId(renderer, 'migration-import-button').props.onPress();
      });

      expect(mockClearPendingMigration).toHaveBeenCalledTimes(1);
      expect(queryByTestId(renderer, 'migration-pending')).toHaveLength(0);
      expect(hasTestId(renderer, 'migration-error')).toBe(true);
    });

    it('never leaks pending copy or server items to User B if User A switches accounts mid-flight', async () => {
      const probe = deferred<boolean>();
      mockGetPendingMigration.mockResolvedValue(makePending({ userId: 'user-123' }));
      mockCheckBackendHealth.mockReturnValue(probe.promise);

      const renderer = await renderScreen();
      expect(mockCheckBackendHealth).toHaveBeenCalledTimes(1);

      // User A signs out and User B signs in while User A's health probe is still in flight.
      mockUseAuth.mockReturnValue({
        session: { access_token: 'tok-b' },
        user: {
          id: 'user-b',
          email: 'b@example.com',
          createdAt: '2026-04-01T00:00:00.000Z',
          tier: 'FREE' as const,
          preferences: {},
        },
        isGuest: false,
        isLoading: false,
        signOut: jest.fn(),
      });
      await act(async () => {
        renderer.update(<HistoryScreen />);
      });

      // User A's in-flight probe fails; recordFailure writes user-123 to storage, NOT to User B's UI.
      await act(async () => {
        probe.resolve(false);
      });
      await act(async () => {});

      expect(queryByTestId(renderer, 'migration-pending')).toHaveLength(0);
      expect(hasTestId(renderer, 'migration-import-button')).toBe(true);
    });

    it('does not flash an empty grid if an earlier fetch resolves while post-import refresh is in flight', async () => {
      type HistoryItems = ReturnType<typeof makeServerItem>[];
      const mountFetches: Array<ReturnType<typeof deferred<HistoryItems>>> = [];
      const postImportRefresh = deferred<HistoryItems>();

      mockFetchServerHistory.mockImplementation(() => {
        if (mockMigrateGuestData.mock.calls.length === 0) {
          const d = deferred<HistoryItems>();
          mountFetches.push(d);
          return d.promise;
        }
        return postImportRefresh.promise;
      });

      const renderer = await renderScreen();
      // First mount fetch populates an existing server item + local history so the banner renders;
      // second mount fetch stays in flight across the import.
      await act(async () => {
        mountFetches[0].resolve([makeServerItem('existing-1')]);
      });
      await act(async () => {});
      expect(getNodeText(renderer.root)).toContain('Seiko SKX007');

      // Trigger manual import: migrateGuestData resolves, postImportRefresh stays pending.
      let importDone = false;
      act(() => {
        void findByTestId(renderer, 'migration-import-button')
          .props.onPress()
          .then(() => {
            importDone = true;
          });
      });
      await act(async () => {});
      expect(mockMigrateGuestData).toHaveBeenCalledTimes(1);
      expect(importDone).toBe(false);

      // Now local history in storage has been cleared; the stale second mount fetch resolving []
      // must be discarded by the post-migrateGuestData epoch bump instead of blanking the grid.
      mockGetLocalHistory.mockResolvedValue([]);
      await act(async () => {
        mountFetches.slice(1).forEach((d) => d.resolve([]));
      });
      await act(async () => {});

      expect(getNodeText(renderer.root)).not.toContain('No valuations yet');
      expect(getNodeText(renderer.root)).toContain('Seiko SKX007');

      await act(async () => {
        postImportRefresh.resolve([
          makeServerItem('existing-1'),
          {
            ...makeServerItem('migrated-2'),
            itemDetails: { ...makeServerItem('migrated-2').itemDetails, brand: 'Canon', model: 'AE-1' },
          },
        ]);
      });
      await act(async () => {});

      expect(getNodeText(renderer.root)).toContain('2 items valued');
    });
  });
});