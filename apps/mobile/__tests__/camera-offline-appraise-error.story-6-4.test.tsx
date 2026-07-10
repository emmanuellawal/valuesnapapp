import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
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

    constructor(errorType: string, message: string) {
      super(message);
      this.errorType = errorType;
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

describe('Story 6.4 appraisal error mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      isGuest: true,
      isLoading: false,
      signOut: jest.fn(),
    });
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseProgressStages.mockReturnValue({
      stage: 'identifying',
      stageProgress: 50,
      isOvertime: false,
      complete: jest.fn(),
    });
  });

  it('shows Connection failed when appraise fails with NETWORK_ERROR', async () => {
    mockAppraise.mockRejectedValue(
      new AppraiseError('NETWORK_ERROR', 'Unable to reach the server'),
    );

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });

    await act(async () => {
      await triggerCapture.props.onPress();
    });

    expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();
  });

  it('shows offline screen when a non-network error is active and device goes offline', async () => {
    mockAppraise.mockRejectedValue(
      new AppraiseError('AI_IDENTIFICATION_FAILED', 'Cannot identify'),
    );
    mockUseOnlineStatus.mockReturnValue(true);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    // AI error is showing — now simulate Wi-Fi dropping
    mockUseOnlineStatus.mockReturnValue(false);
    await act(async () => {
      renderer!.update(<CameraScreen />);
    });

    // Offline gate wins for non-NETWORK_ERROR — offline screen replaces the error
    expect(
      renderer!.root.findByProps({ children: 'Connect to the internet to value items.' }),
    ).toBeTruthy();
  });

  it('keeps error screen + NetworkBanner when NETWORK_ERROR is active and device goes offline', async () => {
    mockAppraise.mockRejectedValue(
      new AppraiseError('NETWORK_ERROR', 'Unable to reach server'),
    );
    mockUseOnlineStatus.mockReturnValue(true);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    // Simulate Wi-Fi dropping AFTER the NETWORK_ERROR was set
    mockUseOnlineStatus.mockReturnValue(false);
    await act(async () => {
      renderer!.update(<CameraScreen />);
    });

    // NETWORK_ERROR exception: error screen stays visible
    expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();
    // NetworkBanner switches to offline message
    expect(renderer!.root.findByProps({ children: 'Offline \u2014 request queued' })).toBeTruthy();
  });

  it('auto-retries when isOnline transitions from false to true while NETWORK_ERROR is active', async () => {
    mockAppraise.mockRejectedValue(
      new AppraiseError('NETWORK_ERROR', 'Unable to reach server'),
    );
    mockUseOnlineStatus.mockReturnValue(true);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    // First attempt failed and set NETWORK_ERROR
    expect(mockAppraise).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();

    // Simulate Wi-Fi dropping
    mockUseOnlineStatus.mockReturnValue(false);
    await act(async () => {
      renderer!.update(<CameraScreen />);
    });

    // Simulate Wi-Fi restoring, which triggers auto-retry
    mockUseOnlineStatus.mockReturnValue(true);
    await act(async () => {
      renderer!.update(<CameraScreen />);
    });

    expect(mockAppraise).toHaveBeenCalledTimes(2);
    expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();
  });

  it('does not double-submit when online restores and user taps Retry immediately', async () => {
    mockAppraise.mockRejectedValue(
      new AppraiseError('NETWORK_ERROR', 'Unable to reach server'),
    );
    mockUseOnlineStatus.mockReturnValue(true);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CameraScreen />);
    });

    const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
    await act(async () => {
      await triggerCapture.props.onPress();
    });

    // First attempt failed and set NETWORK_ERROR
    expect(mockAppraise).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();

    // Simulate Wi-Fi dropping
    mockUseOnlineStatus.mockReturnValue(false);
    await act(async () => {
      renderer!.update(<CameraScreen />);
    });

    // Simulate Wi-Fi restoring and user tapping Retry before passive effects flush.
    await act(async () => {
      mockUseOnlineStatus.mockReturnValue(true);
      renderer!.update(<CameraScreen />);
      const retryButton = renderer!.root.findByProps({
        accessibilityLabel: 'Try again to identify item',
      });
      await retryButton.props.onPress();
    });

    // Initial failure + one manual retry only (no extra auto-retry duplicate)
    expect(mockAppraise).toHaveBeenCalledTimes(2);
    expect(renderer!.root.findByProps({ children: 'Connection failed' })).toBeTruthy();
  });
});
