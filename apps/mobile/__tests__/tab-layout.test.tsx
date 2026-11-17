import React from 'react';
import { act, create } from 'react-test-renderer';

const mockUseWindowDimensions = jest.fn();
const mockSwissSidebar = jest.fn();
const mockSwissTabBar = jest.fn();

jest.mock('react-native', () => ({
  View: 'View',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  useWindowDimensions: (...args: unknown[]) => mockUseWindowDimensions(...args),
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    setColorScheme: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(),
  },
  Platform: {
    OS: 'web',
    select: (value: Record<string, unknown>) => value.web ?? value.default,
    constants: { reactNativeVersion: { minor: 82 } },
  },
  PixelRatio: {
    get: jest.fn(() => 1),
    getFontScale: jest.fn(() => 1),
    roundToNearestPixel: jest.fn((value: number) => value),
  },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (styles: unknown) => styles,
    hairlineWidth: 1,
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 1024, height: 900, scale: 1, fontScale: 1 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-router', () => {
  const ReactLocal = require('react');

  const Tabs = ({ screenOptions, tabBar, children }: any) => {
    const state = {
      index: 0,
      routes: [
        { key: 'camera-key', name: 'camera' },
        { key: 'history-key', name: 'history' },
        { key: 'settings-key', name: 'settings' },
      ],
    };

    const descriptors = {
      'camera-key': { options: { title: 'Camera' } },
      'history-key': { options: { title: 'History' } },
      'settings-key': { options: { title: 'Settings' } },
    };

    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    };

    return ReactLocal.createElement(
      ReactLocal.Fragment,
      null,
      ReactLocal.createElement('mock-tabs', { screenOptions }),
      tabBar({ state, descriptors, navigation }),
      children,
    );
  };

  Tabs.Screen = (props: any) => ReactLocal.createElement('mock-screen', props);
  return { Tabs };
});

jest.mock('@/components/organisms/swiss-sidebar', () => ({
  SwissSidebar: (() => {
    const ReactLocal = require('react');
    return (props: any) => {
      mockSwissSidebar(props);
      return ReactLocal.createElement('mock-sidebar', props);
    };
  })(),
}));

jest.mock('@/components/organisms/swiss-tab-bar', () => ({
  SwissTabBar: (() => {
    const ReactLocal = require('react');
    return (props: any) => {
      mockSwissTabBar(props);
      return ReactLocal.createElement('mock-tabbar', props);
    };
  })(),
}));

const TabLayout = require('../app/(tabs)/_layout').default;
const { computeRailWidth } = require('@/constants/breakpoints');
const MOCK_TABS = 'mock-tabs' as React.ElementType;
const MOCK_SCREEN = 'mock-screen' as React.ElementType;
const MOCK_TAB_BAR = 'mock-tabbar' as React.ElementType;
const MOCK_SCROLL_VIEW = 'ScrollView' as React.ElementType;

function renderLayout() {
  let renderer: ReturnType<typeof create>;

  act(() => {
    renderer = create(<TabLayout />);
  });

  return renderer!;
}

describe('TabLayout (Story 6-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses SwissTabBar below desktop breakpoint', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 800, height: 900, scale: 1, fontScale: 1 });
    const renderer = renderLayout();
    const tabs = renderer.root.findByType(MOCK_TABS);
    const screens = renderer.root.findAllByType(MOCK_SCREEN);

    expect(tabs.props.screenOptions.headerShown).toBe(false);
    expect(tabs.props.screenOptions.tabBarPosition).toBe('bottom');
    expect(screens).toHaveLength(3);
    expect(mockSwissTabBar).toHaveBeenCalledTimes(1);
    expect(mockSwissSidebar).not.toHaveBeenCalled();
  });

  it('renders SwissTabBar via the tabBar render-prop and not nested inside a ScrollView (AC #2 regression guard)', () => {
    // Guards against a future regression where someone wraps the tabBar
    // render-prop output (or its children) in a ScrollView — which would
    // let the tab bar scroll away with content instead of staying pinned.
    mockUseWindowDimensions.mockReturnValue({ width: 800, height: 900, scale: 1, fontScale: 1 });
    const renderer = renderLayout();
    const tabBarInstance = renderer.root.findByType(MOCK_TAB_BAR);
    const scrollViews = renderer.root.findAllByType(MOCK_SCROLL_VIEW);

    expect(tabBarInstance).toBeTruthy();
    for (const scrollView of scrollViews) {
      expect(scrollView.findAllByType(MOCK_TAB_BAR)).toHaveLength(0);
    }
  });

  it('uses SwissSidebar at desktop width and passes railWidth', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 1024, height: 900, scale: 1, fontScale: 1 });
    const renderer = renderLayout();
    const tabs = renderer.root.findByType(MOCK_TABS);

    expect(tabs.props.screenOptions.headerShown).toBe(false);
    expect(tabs.props.screenOptions.tabBarPosition).toBe('left');
    expect(mockSwissSidebar).toHaveBeenCalledTimes(1);
    expect(mockSwissSidebar.mock.calls[0][0].railWidth).toBe(102);
    expect(mockSwissTabBar).not.toHaveBeenCalled();
  });
});

describe('computeRailWidth', () => {
  it('returns 102 at desktop width 1024', () => {
    expect(computeRailWidth(1024)).toBe(102);
  });

  it('returns 144 at large desktop width 1440', () => {
    expect(computeRailWidth(1440)).toBe(144);
  });

  it('caps at 144 on wider viewport widths', () => {
    expect(computeRailWidth(2000)).toBe(144);
  });

  it('floors at 80 for smaller viewport widths', () => {
    expect(computeRailWidth(800)).toBe(80);
  });
});
