import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

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
import { getLocalHistory } from '@/lib/localHistory';
import { fetchServerHistory } from '@/lib/migration';

const mockUseAuth = useAuth as jest.Mock;
const mockGetLocalHistory = getLocalHistory as jest.Mock;
const mockFetchServerHistory = fetchServerHistory as jest.Mock;

function guestAuth() {
  return { session: null, user: null, isGuest: true, isLoading: false, signOut: jest.fn() };
}

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

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.find((node) => node.props?.testID === testID);
}

async function renderScreen() {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(<HistoryScreen />);
  });
  await act(async () => {});

  return renderer!;
}

describe('HistoryScreen — pull-to-refresh (Story 6.9, AC #5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.useMock = false;
    mockUseAuth.mockReturnValue(guestAuth());
    mockGetLocalHistory.mockResolvedValue([]);
    mockFetchServerHistory.mockResolvedValue([]);
  });

  it('wires RefreshControl onto the ScreenContainer with the ink design token', async () => {
    const renderer = await renderScreen();
    const screenContainer = findByTestId(renderer, 'screen-container');

    expect(screenContainer.props.refreshControl).toBeTruthy();
    expect(screenContainer.props.refreshControl.props.refreshing).toBe(false);
    expect(typeof screenContainer.props.refreshControl.props.onRefresh).toBe('function');
    expect(screenContainer.props.refreshControl.props.tintColor).toBe('#000000');
    expect(screenContainer.props.refreshControl.props.colors).toEqual(['#000000']);
  });

  it('re-fetches guest history and settles isRefreshing back to false when pulled', async () => {
    const renderer = await renderScreen();
    const callsBefore = mockGetLocalHistory.mock.calls.length;

    const screenContainer = findByTestId(renderer, 'screen-container');
    await act(async () => {
      await screenContainer.props.refreshControl.props.onRefresh();
    });

    expect(mockGetLocalHistory.mock.calls.length).toBeGreaterThan(callsBefore);

    const refreshedContainer = findByTestId(renderer, 'screen-container');
    expect(refreshedContainer.props.refreshControl.props.refreshing).toBe(false);
  });

  it('re-fetches server history for authenticated users when pulled', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const callsBefore = mockFetchServerHistory.mock.calls.length;

    const screenContainer = findByTestId(renderer, 'screen-container');
    await act(async () => {
      await screenContainer.props.refreshControl.props.onRefresh();
    });

    expect(mockFetchServerHistory.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('leaves isRefreshing false even if the underlying fetch rejects (finally branch)', async () => {
    const renderer = await renderScreen();
    mockGetLocalHistory.mockRejectedValueOnce(new Error('network down'));

    const screenContainer = findByTestId(renderer, 'screen-container');
    await act(async () => {
      await screenContainer.props.refreshControl.props.onRefresh().catch(() => undefined);
    });

    const refreshedContainer = findByTestId(renderer, 'screen-container');
    expect(refreshedContainer.props.refreshControl.props.refreshing).toBe(false);
  });
});
