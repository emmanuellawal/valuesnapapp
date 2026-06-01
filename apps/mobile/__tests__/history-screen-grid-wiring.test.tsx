import React from 'react';
import { act, create } from 'react-test-renderer';

const mockHistoryGrid = jest.fn();
const mockHistoryGridSkeleton = jest.fn();

jest.mock('@/components/organisms/history-grid', () => ({
  HistoryGrid: (props: unknown) => {
    mockHistoryGrid(props);
    return null;
  },
}));

jest.mock('@/components/molecules', () => ({
  HistoryGridSkeleton: (props: unknown) => {
    mockHistoryGridSkeleton(props);
    return null;
  },
}));

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
  useGridColumns: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  env: { useMock: true, apiUrl: 'http://localhost:8000' },
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn() })),
  useFocusEffect: jest.fn((callback) => {
    const ReactLocal = require('react');
    ReactLocal.useEffect(() => callback(), [callback]);
  }),
}));

import HistoryScreen from '../app/(tabs)/history';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalHistory } from '@/lib/localHistory';
import { useGridColumns } from '@/lib/hooks';
import { ValuationStatus } from '@/types/valuation';

const mockUseAuth = useAuth as jest.Mock;
const mockGetLocalHistory = getLocalHistory as jest.Mock;
const mockUseGridColumns = useGridColumns as jest.Mock;

function guestAuth() {
  return {
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  };
}

function makeValuation() {
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
        searchKeywords: ['Canon AE-1'],
        identifiers: { upc: null, modelNumber: null, serialNumber: null },
      },
      marketData: {
        status: 'success',
        confidence: 'HIGH',
        totalFound: 12,
        pricesAnalyzed: 9,
        fairMarketValue: 220,
        priceRange: { min: 180, max: 260 },
        keywords: 'canon ae-1',
      },
    },
    imageUri: 'https://example.com/item.jpg',
  };
}

describe('HistoryScreen grid wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(guestAuth());
    mockUseGridColumns.mockReturnValue({ numColumns: 4, gap: 32 });
  });

  it('passes numColumns/gap from useGridColumns to HistoryGridSkeleton while loading', async () => {
    mockGetLocalHistory.mockImplementation(
      () => new Promise(() => undefined) // keep loading state pending
    );

    await act(async () => {
      create(<HistoryScreen />);
    });

    expect(mockHistoryGridSkeleton).toHaveBeenCalled();
    const skeletonProps = mockHistoryGridSkeleton.mock.calls[0][0];
    expect(skeletonProps).toMatchObject({ numColumns: 4, gap: 32 });
  });

  it('passes numColumns/gap from useGridColumns to HistoryGrid after load', async () => {
    mockGetLocalHistory.mockResolvedValue([makeValuation()]);

    await act(async () => {
      create(<HistoryScreen />);
    });
    await act(async () => {});

    expect(mockHistoryGrid).toHaveBeenCalled();
    const gridProps = mockHistoryGrid.mock.calls[0][0];
    expect(gridProps).toMatchObject({ numColumns: 4, gap: 32 });
  });
});
