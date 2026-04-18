import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn(),
  deleteFromLocalHistory: jest.fn(),
}));

import AppraisalReportScreen from '@/app/appraisal';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getLocalHistory } from '@/lib/localHistory';
import { ValuationStatus } from '@/types/valuation';

const mockUseAuth = useAuth as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockGetLocalHistory = getLocalHistory as jest.Mock;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

function guestAuth() {
  return {
    session: null,
    user: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  };
}

function authenticatedAuth() {
  return {
    session: { access_token: 'token' },
    user: {
      id: 'user-1',
      email: 'user@example.com',
      createdAt: '2026-03-27T00:00:00.000Z',
      tier: 'FREE' as const,
      preferences: {},
    },
    isGuest: false,
    isLoading: false,
    signOut: jest.fn(),
  };
}

function makeDetailValuation() {
  return {
    id: 'valuation-1',
    createdAt: '2026-03-27T10:00:00.000Z',
    status: ValuationStatus.SUCCESS,
    request: {},
    response: {
      itemDetails: {
        itemType: 'camera',
        brand: 'Canon',
        model: 'AE-1',
        visualCondition: 'used_good',
        conditionDetails: '',
        estimatedAge: 'unknown',
        categoryHint: 'Cameras',
        searchKeywords: ['canon', 'camera'],
        identifiers: { upc: null, modelNumber: null, serialNumber: null },
      },
      marketData: {
        status: 'success',
        keywords: 'Canon AE-1',
        totalFound: 10,
        pricesAnalyzed: 10,
        priceRange: { min: 100, max: 150 },
        confidence: 'HIGH',
      },
    },
    imageUri: 'file://photo.jpg',
  };
}

describe('AppraisalReportScreen — guest listing gate', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseLocalSearchParams.mockReturnValue({ id: 'valuation-1' });
    mockGetLocalHistory.mockResolvedValue([makeDetailValuation()]);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  async function renderScreen() {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<AppraisalReportScreen />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    return renderer!;
  }

  it('redirects guests to register when List on eBay is pressed', async () => {
    mockUseAuth.mockReturnValue(guestAuth());

    const renderer = await renderScreen();
    const button = renderer.root.findByProps({ accessibilityLabel: 'List on eBay' });

    await act(async () => {
      button.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/register');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('routes authenticated users to the listing screen', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    const button = renderer.root.findByProps({ accessibilityLabel: 'List on eBay' });

    await act(async () => {
      button.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/listing/valuation-1');
    expect(alertSpy).not.toHaveBeenCalled();
  });
});