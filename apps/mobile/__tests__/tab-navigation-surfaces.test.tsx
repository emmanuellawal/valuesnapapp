import React from 'react';
import { act, create } from 'react-test-renderer';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 8, left: 0 }),
  ),
}));

const { SwissSidebar } = require('@/components/organisms/swiss-sidebar');
const { SwissTabBar } = require('@/components/organisms/swiss-tab-bar');

function createTabBarProps(activeIndex: number): BottomTabBarProps {
  const state = {
    key: 'tabs-state',
    index: activeIndex,
    routeNames: ['camera', 'history', 'settings'],
    routes: [
      { key: 'camera-key', name: 'camera' },
      { key: 'history-key', name: 'history' },
      { key: 'settings-key', name: 'settings' },
    ],
    history: [],
    type: 'tab',
    stale: false,
  } as BottomTabBarProps['state'];

  const descriptors = {
    'camera-key': { options: { title: 'Camera', tabBarAccessibilityLabel: 'Camera tab' } },
    'history-key': { options: { title: 'History', tabBarAccessibilityLabel: 'History tab' } },
    'settings-key': { options: { title: 'Settings', tabBarAccessibilityLabel: 'Settings tab' } },
  } as BottomTabBarProps['descriptors'];

  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  } as unknown as BottomTabBarProps['navigation'];

  return {
    state,
    descriptors,
    navigation,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!Array.isArray(style)) {
    return (style ?? {}) as Record<string, unknown>;
  }

  return style.reduce(
    (acc, curr) => ({ ...acc, ...(curr as Record<string, unknown>) }),
    {},
  );
}

function renderNode(element: React.ReactElement) {
  let renderer: ReturnType<typeof create>;

  act(() => {
    renderer = create(element);
  });

  return renderer!;
}

describe('SwissSidebar real surface regression', () => {
  it('applies provided railWidth instead of fixed 240', () => {
    const renderer = renderNode(<SwissSidebar {...createTabBarProps(0)} railWidth={102} />);
    const tabList = renderer.root.findByProps({ accessibilityRole: 'tablist' });
    const style = flattenStyle(tabList.props.style);

    expect(style.width).toBe(102);
    expect(style.width).not.toBe(240);
    expect(style.flex).toBe(1);
  });

  it('marks active tab selected and applies active text class', () => {
    const renderer = renderNode(<SwissSidebar {...createTabBarProps(1)} railWidth={102} />);

    const historyTab = renderer.root.findByProps({ accessibilityLabel: 'History tab' });
    const cameraTab = renderer.root.findByProps({ accessibilityLabel: 'Camera tab' });

    expect(historyTab.props.accessibilityState).toEqual({ selected: true });
    expect(cameraTab.props.accessibilityState).toEqual({});

    const historyLabel = historyTab.find((node) => node.props?.children === 'History');
    const cameraLabel = cameraTab.find((node) => node.props?.children === 'Camera');

    expect(historyLabel.props.className).toContain('font-semibold');
    expect(cameraLabel.props.className).toContain('text-ink-muted');
  });

  it.each([102, 80])(
    'keeps Settings label rendered without truncation constraints at railWidth=%i',
    (railWidth) => {
      const renderer = renderNode(<SwissSidebar {...createTabBarProps(2)} railWidth={railWidth} />);
      const settingsLabel = renderer.root.find((node) => node.props?.children === 'Settings');

      expect(settingsLabel).toBeTruthy();
      expect(settingsLabel.props.numberOfLines).toBeUndefined();
      expect(settingsLabel.props.ellipsizeMode).toBeUndefined();
      expect(settingsLabel.props.className).not.toContain('truncate');
    },
  );
});

describe('SwissTabBar real surface regression', () => {
  it('marks active tab selected and uses active visual class', () => {
    const renderer = renderNode(<SwissTabBar {...createTabBarProps(2)} />);

    const settingsTab = renderer.root.findByProps({ accessibilityLabel: 'Settings tab' });
    const historyTab = renderer.root.findByProps({ accessibilityLabel: 'History tab' });

    expect(settingsTab.props.accessibilityState).toEqual({ selected: true });
    expect(historyTab.props.accessibilityState).toEqual({});

    const settingsLabel = settingsTab.find((node) => node.props?.children === 'Settings');
    const historyLabel = historyTab.find((node) => node.props?.children === 'History');

    expect(settingsLabel.props.className).toContain('font-bold');
    expect(historyLabel.props.className).toContain('text-ink-muted');
  });
});
