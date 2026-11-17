import React from 'react';
import { act, create } from 'react-test-renderer';

// This suite intentionally mocks each dependency individually rather than
// wholesale-mocking 'react-native' (see Dev Notes / Task 7.4 in
// docs/sprint-artifacts/6-9-implement-mobile-ux-patterns.md) — app/_layout.tsx
// pulls in far more surface area (Linking, Reanimated, FontAwesome,
// @react-navigation/native, AuthContext, ErrorBoundary, TestHarnessBoundary,
// authRecovery) than any other screen in this codebase, and each import
// below fails module evaluation if left unmocked.

// CRITICAL: global.css is required with a literal `require("../global.css")`
// by the babel transform; no moduleNameMapper entry exists for .css, so an
// untransformed require throws a SyntaxError.
jest.mock('../global.css', () => ({}), { virtual: true });

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Bare side-effect import at _layout.tsx:9 — no Reanimated Jest setup exists
// in this repo (no setupFiles, jest-expo ships no Reanimated mock).
jest.mock('react-native-reanimated', () => ({}));

// FontAwesome.font is read inside useFonts() even when expo-font is mocked.
jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: { font: {} },
}));

// DefaultTheme.colors is spread at module scope (_layout.tsx:46).
jest.mock('@react-navigation/native', () => ({
  ThemeProvider: ({ children }: any) => children,
  DefaultTheme: {
    colors: { background: '#fff', card: '#fff', text: '#000', border: '#ccc', primary: '#000', notification: '#000' },
  },
  DarkTheme: { colors: {} },
}));

jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

// expo-font's useFonts MUST return [true, null] — _layout.tsx:86-88 returns
// null when !loaded, so a bare jest.fn() renders nothing and RootLayoutNav
// (and the Stack we want to assert on) never mounts.
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('@/components/organisms/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => children,
}));

jest.mock('@/components/TestHarnessBoundary', () => ({
  TestHarnessBoundary: () => null,
}));

jest.mock('@/lib/authRecovery', () => ({
  handleIncomingAuthRedirect: jest.fn().mockResolvedValue({ handled: false }),
}));

jest.mock('@/lib/env', () => ({
  validateEnv: jest.fn(),
}));

const mockStackCapture = jest.fn();

// expo-router's ErrorBoundary re-export (`export { ErrorBoundary } from
// 'expo-router';` at _layout.tsx:56-59) must exist alongside Stack/useRouter.
jest.mock('expo-router', () => {
  const ReactLocal = require('react');

  function Stack({ children, screenOptions }: any) {
    mockStackCapture(screenOptions);
    return ReactLocal.createElement(
      ReactLocal.Fragment,
      null,
      ReactLocal.createElement('mock-stack', { screenOptions }),
      children,
    );
  }
  Stack.Screen = (props: any) => ReactLocal.createElement('mock-screen', props);

  return {
    Stack,
    useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn() })),
    ErrorBoundary: () => null,
  };
});

import RootLayout from '../app/_layout';

const MOCK_SCREEN = 'mock-screen' as React.ElementType;
const MOCK_STACK = 'mock-stack' as React.ElementType;

function renderLayout() {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(<RootLayout />);
  });
  return renderer!;
}

describe('Root layout — camera-tab-only swipe-back gate (Story 6.9, AC #6) + appraisal header suppression (Story 6.10, AC #4/#5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets gestureEnabled: false on the (tabs) Stack.Screen only', () => {
    const renderer = renderLayout();
    const screens = renderer.root.findAllByType(MOCK_SCREEN);

    const tabsScreen = screens.find((screen) => screen.props.name === '(tabs)');
    expect(tabsScreen).toBeTruthy();
    expect(tabsScreen!.props.options.gestureEnabled).toBe(false);
  });

  it('does not set gestureEnabled on the modal, auth, account, or appraisal screens (spec-required gestures preserved)', () => {
    const renderer = renderLayout();
    const screens = renderer.root.findAllByType(MOCK_SCREEN);

    for (const name of ['modal', 'auth', 'account', 'appraisal']) {
      const screen = screens.find((s) => s.props.name === name);
      expect(screen).toBeTruthy();
      expect(screen!.props.options?.gestureEnabled).toBeUndefined();
    }
  });

  it('does not set screenOptions.gestureEnabled on the root Stack (guards against an over-broad future "fix")', () => {
    const renderer = renderLayout();
    const rootStack = renderer.root.findByType(MOCK_STACK);

    expect(rootStack.props.screenOptions?.gestureEnabled).toBeUndefined();
    expect(mockStackCapture).toHaveBeenCalled();
  });

  it('registers exactly the five expected top-level screens', () => {
    const renderer = renderLayout();
    const screens = renderer.root.findAllByType(MOCK_SCREEN);

    expect(screens.map((s) => s.props.name).sort()).toEqual(['(tabs)', 'account', 'appraisal', 'auth', 'modal']);
  });

  it('sets headerShown: false statically on the appraisal Stack.Screen (Story 6.10 AC #4/#5 — fixes header-flash in static export)', () => {
    const renderer = renderLayout();
    const screens = renderer.root.findAllByType(MOCK_SCREEN);

    const appraisalScreen = screens.find((screen) => screen.props.name === 'appraisal');
    expect(appraisalScreen).toBeTruthy();
    expect(appraisalScreen!.props.options?.headerShown).toBe(false);
  });
});
