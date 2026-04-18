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

jest.mock('@/lib/hooks', () => ({
  useOnlineStatus: jest.fn(() => true),
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
import { ValuationStatus, type Valuation } from '@/types/valuation';

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
});