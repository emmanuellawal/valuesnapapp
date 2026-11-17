import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// Spy on the real react-native module's useWindowDimensions rather than
// jest.mock('react-native', ...) — a wholesale factory-replace forces
// requireActual, which re-triggers native TurboModule registration
// (DevMenu, etc.) outside jest-expo's own mocked setup and crashes the
// suite. Everything else in react-native (Animated, PanResponder,
// Platform) stays real and untouched.
//
// Uses a raw require() (not `import * as ReactNative`) because Babel's
// namespace-import interop returns a *copied* object for `import * as X`,
// which is a different object than the one camera.tsx's named import reads
// from — spying on the copy silently does nothing to the real module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactNative = require('react-native');
const mockUseWindowDimensions = jest.spyOn(ReactNative, 'useWindowDimensions');

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
import { appraise, AppraiseError } from '@/lib/api';

const mockUseRouter = useRouter as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;
const mockUseProgressStages = useProgressStages as jest.Mock;
const mockAppraise = appraise as jest.Mock;

function guestAuth() {
  return {
    session: null,
    user: null,
    accessToken: null,
    isGuest: true,
    isLoading: false,
    signOut: jest.fn(),
  };
}

async function renderScreen() {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(<CameraScreen />);
  });
  return renderer!;
}

describe('CameraScreen — full-bleed capture surface (Story 6.9, AC #3)', () => {
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
    mockUseAuth.mockReturnValue(guestAuth());
  });

  it('renders a full-bleed wrapper with no ScreenContainer below the tablet breakpoint', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 400, height: 800, scale: 1, fontScale: 1 });

    const renderer = await renderScreen();
    const fullBleed = renderer.root.findByProps({ testID: 'camera-fullbleed-surface' });

    expect(fullBleed).toBeTruthy();
    expect(fullBleed.props.className).toContain('flex-1');
    expect(fullBleed.props.className).toContain('w-full');
    expect(renderer.root.findAllByProps({ testID: 'screen-container' })).toHaveLength(0);
  });

  it('keeps ScreenContainer and does not render the full-bleed wrapper at tablet width and above', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 768, height: 1024, scale: 1, fontScale: 1 });

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ testID: 'screen-container' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'camera-fullbleed-surface' })).toHaveLength(0);
  });

  it('keeps ScreenContainer at exactly BREAKPOINTS.tablet (600) — the boundary belongs to tablet+', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 600, height: 900, scale: 1, fontScale: 1 });

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ testID: 'screen-container' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'camera-fullbleed-surface' })).toHaveLength(0);
  });

  it('preserves the camera-capture testID inside the full-bleed wrapper', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 400, height: 800, scale: 1, fontScale: 1 });

    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ testID: 'camera-capture' })).toBeTruthy();
  });

  it('falls back to ScreenContainer at mobile width while an error is active (AC #3 gate is width AND state)', async () => {
    mockUseWindowDimensions.mockReturnValue({ width: 400, height: 800, scale: 1, fontScale: 1 });
    mockAppraise.mockRejectedValue(new AppraiseError('GENERIC_ERROR', 'boom'));

    const renderer = await renderScreen();
    const triggerCapture = renderer.root.findByProps({ testID: 'camera-capture' });

    await act(async () => {
      await triggerCapture.props.onPress();
    });

    expect(renderer.root.findByProps({ testID: 'screen-container' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'camera-fullbleed-surface' })).toHaveLength(0);
  });
});
