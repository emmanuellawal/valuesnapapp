import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
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
  AppraiseError: class AppraiseError extends Error {
    errorType: string;

    retryAfterSeconds?: number;

    constructor(errorType: string, message: string, retryAfterSeconds?: number) {
      super(message);
      this.errorType = errorType;
      this.retryAfterSeconds = retryAfterSeconds;
      this.name = 'AppraiseError';
    }
  },
}));

jest.mock('@/lib/localHistory', () => ({
  getLocalHistory: jest.fn().mockResolvedValue([]),
  getOrCreateGuestSessionId: jest.fn().mockResolvedValue('guest-session-1'),
  saveToLocalHistory: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/types/transformers', () => ({
  transformValuationResponse: jest.fn((value) => value),
}));

jest.mock('@/components/organisms', () => require('../test-utils/mock-organisms'));

import CameraScreen from '@/app/(tabs)/camera';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus, useProgressStages } from '@/lib/hooks';
import { appraise, AppraiseError } from '@/lib/api';

const mockUseRouter = useRouter as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;
const mockUseProgressStages = useProgressStages as jest.Mock;
const mockAppraise = appraise as jest.Mock;

describe('Story 6.8 rate limit handling', () => {
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
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      isGuest: false,
      isLoading: false,
      signOut: jest.fn(),
    });
  });

  it('shows rate limit error with retry time for authenticated user', async () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      user: { id: 'user-1' },
      isGuest: false,
      isLoading: false,
      signOut: jest.fn(),
    });
    mockAppraise.mockRejectedValue(
      new AppraiseError('RATE_LIMIT', 'Too many requests', 2700),
    );

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    expect(renderer!.root.findByProps({ children: "You've reached your limit" })).toBeTruthy();
    expect(renderer!.root.findByProps({ children: 'Try again in 45 minutes' })).toBeTruthy();
    expect(
      renderer!.root.findAllByProps({ accessibilityLabel: 'Try again to identify item' }).length,
    ).toBe(0);
    expect(renderer!.root.findAllByProps({ children: 'Create a free account' }).length).toBe(0);
  });

  it('shows upgrade CTA for guest users', async () => {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      isGuest: true,
      isLoading: false,
      signOut: jest.fn(),
    });
    mockAppraise.mockRejectedValue(
      new AppraiseError('RATE_LIMIT', 'Too many requests', 1800),
    );

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    expect(renderer!.root.findByProps({ children: 'Try again in 30 minutes' })).toBeTruthy();
    expect(renderer!.root.findByProps({ children: 'Create a free account' })).toBeTruthy();
  });

  it('shows fallback time when Retry-After uses default', async () => {
    mockAppraise.mockRejectedValue(
      new AppraiseError('RATE_LIMIT', 'Too many requests', 60),
    );

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    expect(renderer!.root.findByProps({ children: 'Try again in 1 minute' })).toBeTruthy();
  });

  it('dismiss button clears error state', async () => {
    mockAppraise.mockRejectedValue(
      new AppraiseError('RATE_LIMIT', 'Too many requests', 60),
    );

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    const dismissButton = renderer!.root.findByProps({ accessibilityLabel: 'Dismiss error message' });
    await act(async () => {
      dismissButton.props.onPress();
    });

    expect(renderer!.root.findByProps({ testID: 'camera-capture' })).toBeTruthy();
    expect(renderer!.root.findAllByProps({ children: "You've reached your limit" }).length).toBe(0);
  });
});
