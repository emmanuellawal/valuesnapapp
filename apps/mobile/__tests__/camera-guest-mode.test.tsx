import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/hooks', () => ({
  useProgressStages: jest.fn(),
  useOnlineStatus: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  appraise: jest.fn(),
  AppraiseError: Error,
}));

jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn(),
  getOrCreateGuestSessionId: jest.fn(),
  saveToLocalHistory: jest.fn(),
}));

jest.mock('@/types/transformers', () => ({
  transformValuationResponse: jest.fn(),
}));

jest.mock('@/components/organisms', () => require('../test-utils/mock-organisms'));

import CameraScreen from '@/app/(tabs)/index';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus, useProgressStages } from '@/lib/hooks';
import { appraise } from '@/lib/api';
import { getLocalHistory, getOrCreateGuestSessionId, saveToLocalHistory } from '@/lib/localHistory';
import { transformValuationResponse } from '@/types/transformers';

const mockUseRouter = useRouter as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;
const mockUseProgressStages = useProgressStages as jest.Mock;
const mockAppraise = appraise as jest.Mock;
const mockGetOrCreateGuestSessionId = getOrCreateGuestSessionId as jest.Mock;
const mockSaveToLocalHistory = saveToLocalHistory as jest.Mock;
const mockGetLocalHistory = getLocalHistory as jest.Mock;
const mockTransformValuationResponse = transformValuationResponse as jest.Mock;

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

function makeHistory(length: number) {
  return Array.from({ length }, (_, index) => ({ id: `v${index + 1}` }));
}

function mockValuationResponse() {
  return {
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
      fairMarketValue: 125,
      confidence: 'HIGH',
    },
    valuationId: 'valuation-1',
  };
}

describe('CameraScreen — Guest mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseProgressStages.mockReturnValue({
      stage: 'identifying',
      stageProgress: 50,
      isOvertime: false,
      complete: jest.fn(),
    });
    mockGetOrCreateGuestSessionId.mockResolvedValue('guest-session-1');
    mockAppraise.mockResolvedValue({});
    mockTransformValuationResponse.mockReturnValue(mockValuationResponse());
    mockSaveToLocalHistory.mockResolvedValue(undefined);
  });

  async function renderScreen() {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    return renderer!;
  }

  async function capturePhoto(renderer: ReactTestRenderer) {
    const button = renderer.root.findByProps({ testID: 'camera-capture' });

    await act(async () => {
      await button.props.onPress();
    });
  }

  it('shows the guest banner after a guest reaches three saved valuations', async () => {
    mockUseAuth.mockReturnValue(guestAuth());
    mockGetLocalHistory.mockResolvedValue(makeHistory(3));

    const renderer = await renderScreen();
    await capturePhoto(renderer);

    expect(renderer.root.findByProps({ testID: 'guest-banner' })).toBeTruthy();
    expect(mockGetLocalHistory).toHaveBeenCalledTimes(1);
  });

  it('does not show the guest banner before the third valuation', async () => {
    mockUseAuth.mockReturnValue(guestAuth());
    mockGetLocalHistory.mockResolvedValue(makeHistory(2));

    const renderer = await renderScreen();
    await capturePhoto(renderer);

    expect(renderer.root.findAllByProps({ testID: 'guest-banner' })).toHaveLength(0);
  });

  it('never shows the banner for authenticated users', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth());

    const renderer = await renderScreen();
    await capturePhoto(renderer);

    expect(renderer.root.findAllByProps({ testID: 'guest-banner' })).toHaveLength(0);
    expect(mockGetLocalHistory).not.toHaveBeenCalled();
  });

  it('still renders the valuation result when local history save fails', async () => {
    mockUseAuth.mockReturnValue(guestAuth());
    mockSaveToLocalHistory.mockRejectedValue(new Error('storage failure'));

    const renderer = await renderScreen();
    await capturePhoto(renderer);

    expect(renderer.root.findByProps({ children: 'Valuation complete' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'guest-banner' })).toHaveLength(0);
    expect(mockGetLocalHistory).not.toHaveBeenCalled();
  });
});