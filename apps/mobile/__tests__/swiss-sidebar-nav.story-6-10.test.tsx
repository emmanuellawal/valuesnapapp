import React from 'react';
import { act, create } from 'react-test-renderer';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Same react-native mock shape as tab-navigation-surfaces.test.tsx — the
// react-native-css-interop JSX runtime (pulled in transitively via
// react-native-css-interop/jsx-runtime) reads Appearance/AppState/etc. at
// module-eval time, so those must be present even though swiss-sidebar.tsx
// itself only needs View/Pressable/Text as host string elements.
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
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 8, left: 0 })),
}));

// Story 6.11 AC11 permitted edit #1: swiss-sidebar.tsx now imports Feather at
// module scope; the react-native mock above has no processColor/NativeModules/
// TouchableHighlight, so importing the real Feather chain breaks without this.
jest.mock('@expo/vector-icons/Feather', () => 'Feather');

const { SwissSidebarNav, SwissSidebar } = require('@/components/organisms/swiss-sidebar');

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

function findHostPressableByLabel(renderer: ReturnType<typeof create>, accessibilityLabel: string) {
  const pressable = renderer.root
    .findAllByProps({ accessibilityLabel })
    .find((node) => node.type === 'Pressable');
  if (!pressable) {
    throw new Error(`Could not find Pressable host with label "${accessibilityLabel}"`);
  }
  return pressable;
}

describe('SwissSidebarNav (Story 6.10 Task 2 — decoupled from BottomTabBarProps)', () => {
  const items = [
    { key: 'camera', label: 'Camera', icon: 'camera', isActive: false, onPress: jest.fn() },
    { key: 'history', label: 'History', icon: 'list', isActive: true, onPress: jest.fn() },
    { key: 'settings', label: 'Settings', icon: 'settings', isActive: false, onPress: jest.fn() },
  ];

  beforeEach(() => {
    items.forEach((item) => (item.onPress as jest.Mock).mockClear());
  });

  it('renders every item label', () => {
    const renderer = renderNode(<SwissSidebarNav items={items} railWidth={102} />);

    for (const item of items) {
      const label = renderer.root.find((node) => node.props?.children === item.label);
      expect(label).toBeTruthy();
    }
  });

  it('applies active styling and accessibilityState={ selected: true } to the active item only', () => {
    const renderer = renderNode(<SwissSidebarNav items={items} railWidth={102} />);

    const historyTab = findHostPressableByLabel(renderer, 'History tab');
    const cameraTab = findHostPressableByLabel(renderer, 'Camera tab');

    expect(historyTab.props.accessibilityState).toEqual({ selected: true });
    expect(cameraTab.props.accessibilityState).toEqual({});

    const historyLabel = historyTab.find((node) => node.props?.children === 'History');
    const cameraLabel = cameraTab.find((node) => node.props?.children === 'Camera');

    expect(historyLabel.props.className).toContain('font-semibold');
    expect(cameraLabel.props.className).toContain('text-ink-muted');
  });

  it('fires the item-provided onPress when pressed', () => {
    const renderer = renderNode(<SwissSidebarNav items={items} railWidth={102} />);
    const cameraTab = findHostPressableByLabel(renderer, 'Camera tab');

    act(() => {
      cameraTab.props.onPress();
    });

    expect(items[0].onPress).toHaveBeenCalledTimes(1);
  });

  it('applies the provided railWidth to the rail container', () => {
    // Story 6.11 AC11 permitted edit #2: AC5's ARIA restructuring moved
    // `style.width` off the `accessibilityRole: 'tablist'` node (which now
    // owns only the tab items) onto the outer rail wrapper, identified here
    // by its stable testID rather than an ARIA role.
    const renderer = renderNode(<SwissSidebarNav items={items} railWidth={102} />);
    const rail = renderer.root.findByProps({ testID: 'swiss-sidebar-rail' });
    const style = flattenStyle(rail.props.style);

    expect(style.width).toBe(102);
    expect(style.alignSelf).toBe('stretch');
  });

  it('uses navigation semantics for standalone route navigation', () => {
    const renderer = renderNode(
      <SwissSidebarNav items={items} railWidth={102} semantics="navigation" />,
    );

    expect(renderer.root.findByProps({
      role: 'navigation',
      accessibilityLabel: 'Primary navigation',
    })).toBeTruthy();
    expect(renderer.root.findAllByProps({ accessibilityRole: 'tablist' })).toHaveLength(0);
    expect(findHostPressableByLabel(renderer, 'Camera').props.accessibilityRole).toBe('button');
  });
});

describe('SwissSidebar (Task 2.2 — still maps state/descriptors/navigation into SwissSidebarNav items)', () => {
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

    return { state, descriptors, navigation, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
  }

  it('emits tabPress and navigates when an inactive item is pressed', () => {
    const props = createTabBarProps(0);
    const renderer = renderNode(<SwissSidebar {...props} railWidth={102} />);
    const historyTab = findHostPressableByLabel(renderer, 'History tab');

    act(() => {
      historyTab.props.onPress();
    });

    expect(props.navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'history-key' }),
    );
    expect(props.navigation.navigate).toHaveBeenCalledWith('history');
  });

  it('emits tabLongPress on long-press (onLongPress must survive the refactor)', () => {
    const props = createTabBarProps(0);
    const renderer = renderNode(<SwissSidebar {...props} railWidth={102} />);
    const historyTab = findHostPressableByLabel(renderer, 'History tab');

    act(() => {
      historyTab.props.onLongPress();
    });

    expect(props.navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabLongPress', target: 'history-key' }),
    );
  });

  it('preserves a descriptor-provided tabBarAccessibilityLabel', () => {
    const props = createTabBarProps(0);
    props.descriptors['camera-key'].options.tabBarAccessibilityLabel = 'Capture item photo';

    const renderer = renderNode(<SwissSidebar {...props} railWidth={102} />);

    expect(findHostPressableByLabel(renderer, 'Capture item photo')).toBeTruthy();
  });
});
