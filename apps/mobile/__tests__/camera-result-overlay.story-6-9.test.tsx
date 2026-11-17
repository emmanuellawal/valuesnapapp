import React from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
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
import { appraise } from '@/lib/api';
import {
  getWebFocusWrapTarget,
  shouldDismissOverlayGesture,
} from '@/components/molecules/valuation-result-overlay';

const mockUseRouter = useRouter as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;
const mockUseProgressStages = useProgressStages as jest.Mock;
const mockAppraise = appraise as jest.Mock;

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

async function renderScreenAndCapture() {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<CameraScreen />);
  });

  const triggerCapture = renderer!.root.findByProps({ testID: 'camera-capture' });
  await act(async () => {
    await triggerCapture.props.onPress();
  });

  return renderer!;
}

describe('CameraScreen — valuation result overlay (Story 6.9, AC #4 / #7)', () => {
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
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
      accessToken: null,
      isGuest: false,
      isLoading: false,
      signOut: jest.fn(),
    });
    mockAppraise.mockResolvedValue(mockValuationResponse());
    // Auto-complete animations synchronously and deterministically instead
    // of waiting on real 150ms timers — we still assert on the *config*
    // (duration/easing/toValue) the component passed in via mock.calls.
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation((value: any, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        value.setValue(config.toValue);
        cb?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });

  afterEach(() => {
    timingSpy.mockRestore();
  });

  it('renders the overlay and scrim after a successful appraisal', async () => {
    const renderer = await renderScreenAndCapture();

    expect(renderer.root.findByProps({ testID: 'valuation-result-overlay' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'valuation-result-scrim' })).toBeTruthy();
  });

  it('keeps the result card off-screen until its height is measured', async () => {
    const renderer = await renderScreenAndCapture();
    const animatedCard = renderer.root.findByProps({ testID: 'valuation-result-card' });
    const translateY = animatedCard.props.style.transform[0].translateY;

    expect(translateY.__getValue()).toBeGreaterThan(0);
    expect(timingSpy).not.toHaveBeenCalled();
  });

  it('carries the required modal accessibility props (AC #7)', async () => {
    const renderer = await renderScreenAndCapture();
    const overlay = renderer.root.findByProps({ testID: 'valuation-result-overlay' });
    const background = renderer.root.findByProps({ testID: 'screen-container' });

    expect(overlay.props.accessibilityLiveRegion).toBe('polite');
    expect(overlay.props.accessibilityViewIsModal).toBe(true);
    expect(background.props.accessibilityElementsHidden).toBe(true);
    expect(background.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('clears the result when the scrim is pressed', async () => {
    const renderer = await renderScreenAndCapture();
    const scrim = renderer.root.findByProps({ testID: 'valuation-result-scrim' });

    await act(async () => {
      scrim.props.onPress();
    });

    expect(renderer.root.findAllByProps({ testID: 'valuation-result-overlay' })).toHaveLength(0);
  });

  it('animates in using the mandated 150ms linear Swiss motion token', async () => {
    const renderer = await renderScreenAndCapture();
    const animatedCard = renderer.root.findByProps({ testID: 'valuation-result-card' });

    await act(async () => {
      animatedCard.props.onLayout({ nativeEvent: { layout: { height: 300, width: 350, x: 0, y: 0 } } });
    });

    const slideInCall = timingSpy.mock.calls.find(([, config]) => config.toValue === 0);
    expect(slideInCall).toBeTruthy();
    expect(slideInCall![1]).toMatchObject({ toValue: 0, duration: 150 });
  });

  it('uses duration 0 when reduced motion is enabled', async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(true);

    const renderer = await renderScreenAndCapture();
    // Flush the isReduceMotionEnabled() promise inside the overlay's effect.
    await act(async () => {
      await Promise.resolve();
    });

    const animatedCard = renderer.root.findByProps({ testID: 'valuation-result-card' });

    await act(async () => {
      animatedCard.props.onLayout({ nativeEvent: { layout: { height: 300, width: 350, x: 0, y: 0 } } });
    });

    const slideInCall = timingSpy.mock.calls.find(([, config]) => config.toValue === 0);
    expect(slideInCall).toBeTruthy();
    expect(slideInCall![1]).toMatchObject({ toValue: 0, duration: 0 });
  });

  it('waits for the reduced-motion preference before starting the entrance animation', async () => {
    let resolvePreference!: (enabled: boolean) => void;
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockReturnValueOnce(new Promise<boolean>((resolve) => {
        resolvePreference = resolve;
      }));

    const renderer = await renderScreenAndCapture();
    const animatedCard = renderer.root.findByProps({ testID: 'valuation-result-card' });

    await act(async () => {
      animatedCard.props.onLayout({ nativeEvent: { layout: { height: 300, width: 350, x: 0, y: 0 } } });
    });
    expect(timingSpy.mock.calls.find(([, config]) => config.toValue === 0)).toBeUndefined();

    await act(async () => {
      resolvePreference(true);
      await Promise.resolve();
    });

    const slideInCall = timingSpy.mock.calls.find(([, config]) => config.toValue === 0);
    expect(slideInCall![1]).toMatchObject({ duration: 0 });
  });

  it('uses 25% of measured height or fast velocity as the swipe-dismiss threshold', () => {
    expect(shouldDismissOverlayGesture(20, 0, 300)).toBe(false);
    expect(shouldDismissOverlayGesture(80, 0, 300)).toBe(true);
    expect(shouldDismissOverlayGesture(20, 1.6, 300)).toBe(true);
  });

  it('wraps Tab and Shift+Tab at the web modal boundaries', () => {
    const first = { id: 'first' };
    const middle = { id: 'middle' };
    const last = { id: 'last' };
    const focusable = [first, middle, last];

    expect(getWebFocusWrapTarget(focusable, last, false, true)).toBe(first);
    expect(getWebFocusWrapTarget(focusable, first, true, true)).toBe(last);
    expect(getWebFocusWrapTarget(focusable, middle, false, true)).toBeNull();
    expect(getWebFocusWrapTarget(focusable, null, false, false)).toBe(first);
  });

  it('resets the native camera control and returns accessibility focus after dismissal', async () => {
    const focusSpy = jest
      .spyOn(AccessibilityInfo, 'sendAccessibilityEvent')
      .mockImplementation(() => undefined);
    const animationFrameSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

    const renderer = await renderScreenAndCapture();
    focusSpy.mockClear();
    const scrim = renderer.root.findByProps({ testID: 'valuation-result-scrim' });

    await act(async () => {
      scrim.props.onPress();
    });

    const capture = renderer.root.findByProps({ testID: 'camera-capture' });
    expect(capture.props.captureState).toBe('idle');
    expect(focusSpy).toHaveBeenCalledWith(expect.any(Object), 'focus');

    animationFrameSpy.mockRestore();
    focusSpy.mockRestore();
  });
});
