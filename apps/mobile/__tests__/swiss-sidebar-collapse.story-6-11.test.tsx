import React from 'react';
import { act, create } from 'react-test-renderer';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Same react-native mock shape as swiss-sidebar-nav.story-6-10.test.tsx —
// the react-native-css-interop JSX runtime (pulled in transitively via
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

// Mandatory per AC11 — see swiss-sidebar.tsx's Feather import and Dev Notes
// "Why the Feather mock is mandatory in tests".
jest.mock('@expo/vector-icons/Feather', () => 'Feather');

const { SwissSidebarNav, SwissSidebar } = require('@/components/organisms/swiss-sidebar');
const { COLLAPSED_RAIL_WIDTH } = require('@/constants/breakpoints');

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!Array.isArray(style)) {
    return (style ?? {}) as Record<string, unknown>;
  }
  return style.reduce((acc, curr) => ({ ...acc, ...(curr as Record<string, unknown>) }), {});
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

function findAllHostPressablesByLabel(renderer: ReturnType<typeof create>, accessibilityLabel: string) {
  return renderer.root
    .findAllByProps({ accessibilityLabel })
    .filter((node) => node.type === 'Pressable');
}

const items = [
  { key: 'camera', label: 'Camera', icon: 'camera', isActive: false, onPress: jest.fn() },
  { key: 'history', label: 'History', icon: 'list', isActive: true, onPress: jest.fn() },
  { key: 'settings', label: 'Settings', icon: 'settings', isActive: false, onPress: jest.fn() },
];

describe.each(['tabs' as const, 'navigation' as const])(
  'SwissSidebarNav collapse (Story 6.11) — semantics=%s',
  (semantics) => {
  beforeEach(() => {
    items.forEach((item) => (item.onPress as jest.Mock).mockClear());
  });

  function renderRail() {
    return renderNode(<SwissSidebarNav items={items} railWidth={102} semantics={semantics} />);
  }

  it('defaults to expanded: toggle label is "Collapse navigation" with accessibilityState={ expanded: true }', () => {
    const renderer = renderRail();
    const toggle = findHostPressableByLabel(renderer, 'Collapse navigation');
    expect(toggle.props.accessibilityState).toEqual({ expanded: true });

    const rail = renderer.root.findByProps({ testID: 'swiss-sidebar-rail' });
    expect(flattenStyle(rail.props.style).width).toBe(102);
  });

  it('pressing the toggle flips to "Expand navigation" / { expanded: false } and collapses the rail width', () => {
    const renderer = renderRail();
    const toggle = findHostPressableByLabel(renderer, 'Collapse navigation');

    act(() => {
      toggle.props.onPress();
    });

    const expandedToggle = findHostPressableByLabel(renderer, 'Expand navigation');
    expect(expandedToggle.props.accessibilityState).toEqual({ expanded: false });
    expect(() => findHostPressableByLabel(renderer, 'Collapse navigation')).toThrow();

    const rail = renderer.root.findByProps({ testID: 'swiss-sidebar-rail' });
    expect(flattenStyle(rail.props.style).width).toBe(COLLAPSED_RAIL_WIDTH);
  });

  it('collapsed className drops px-6 for px-2; expanded keeps px-6; both carry transition-[width] duration-300, never transition-all', () => {
    const renderer = renderRail();
    const rail = renderer.root.findByProps({ testID: 'swiss-sidebar-rail' });

    expect(rail.props.className).toContain('px-6');
    expect(rail.props.className).not.toContain('px-2');
    expect(rail.props.className).toContain('transition-[width]');
    expect(rail.props.className).toContain('duration-300');
    expect(rail.props.className).not.toContain('transition-all');

    act(() => {
      findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
    });

    const collapsedRail = renderer.root.findByProps({ testID: 'swiss-sidebar-rail' });
    expect(collapsedRail.props.className).toContain('px-2');
    expect(collapsedRail.props.className).not.toContain('px-6');
    expect(collapsedRail.props.className).toContain('transition-[width]');
    expect(collapsedRail.props.className).toContain('duration-300');
    expect(collapsedRail.props.className).not.toContain('transition-all');
  });

  it('toggle exposes min-w-[44px] and min-h-[44px] in its className', () => {
    const renderer = renderRail();
    const toggle = findHostPressableByLabel(renderer, 'Collapse navigation');

    expect(toggle.props.className).toContain('min-w-[44px]');
    expect(toggle.props.className).toContain('min-h-[44px]');
  });

  it('clips item contents and keeps icons inside the rail throughout expansion', () => {
    const renderer = renderRail();
    const expandedItem = findHostPressableByLabel(
      renderer,
      semantics === 'tabs' ? 'History tab' : 'History',
    );

    expect(expandedItem.props.className).toContain('overflow-hidden');
    expect(expandedItem.props.className).toContain('justify-start');
    expect(expandedItem.props.className).not.toContain('justify-center');

    act(() => {
      findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
    });

    const collapsedItem = findHostPressableByLabel(
      renderer,
      semantics === 'tabs' ? 'History tab' : 'History',
    );
    expect(collapsedItem.props.className).toContain('overflow-hidden');
    expect(collapsedItem.props.className).toContain('justify-center');
    expect(collapsedItem.props.className).not.toContain('justify-start');
  });

  it('AC5: the role-bearing node has no descendant Pressable carrying the toggle label; toggle is found outside it', () => {
    const renderer = renderRail();
    const roleNode = renderer.root.findByProps(
      semantics === 'tabs' ? { accessibilityRole: 'tablist' } : { role: 'navigation' },
    );

    expect(
      roleNode.findAllByProps({ accessibilityLabel: 'Collapse navigation' }).length,
    ).toBe(0);
    expect(
      roleNode.findAllByProps({ accessibilityLabel: 'Expand navigation' }).length,
    ).toBe(0);

    // The toggle exists in the tree overall, just not inside the role node.
    expect(findHostPressableByLabel(renderer, 'Collapse navigation')).toBeTruthy();
  });

  it('collapsed items keep their full accessibilityLabel and onPress still fires', () => {
    const renderer = renderRail();

    act(() => {
      findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
    });

    const expectedLabel = semantics === 'tabs' ? 'History tab' : 'History';
    const historyItem = findHostPressableByLabel(renderer, expectedLabel);

    act(() => {
      historyItem.props.onPress();
    });

    expect(items[1].onPress).toHaveBeenCalledTimes(1);
  });

  it('collapsed state renders no label Text nodes but renders one Feather node per item', () => {
    const renderer = renderRail();

    act(() => {
      findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
    });

    for (const item of items) {
      expect(renderer.root.findAll((node) => node.props?.children === item.label)).toHaveLength(0);
    }

    const featherNodes = renderer.root.findAllByType('Feather' as unknown as React.ElementType);
    // One per item, plus the toggle's own chevron icon.
    expect(featherNodes.length).toBe(items.length + 1);

    for (const item of items) {
      expect(featherNodes.some((node) => node.props.name === item.icon)).toBe(true);
    }
  });

  it.each([false, true])(
    'active vs inactive: item Pressable className carries the border-l-2 left-rule cue, and each item keeps its own Feather icon (collapsed=%s)',
    (collapsed) => {
      // Note on the icon-colour cue (AC3 cue #1, `text-ink` vs `text-ink-muted`
      // on <Feather>): verified NOT observable at this test layer. Feather is
      // registered via `cssInterop(Feather, { className: { target: 'style' } })`,
      // and react-native-css-interop's *native* runtime resolves `className`
      // against a stylesheet populated by Metro's real CSS/Tailwind bundling —
      // which does not exist under Jest (confirmed empirically: the rendered
      // Feather node's `className` prop is stripped to `undefined` with no
      // resulting `style`, for both active and inactive icons alike). This is
      // exactly the fallback scenario Task 2 flags ("if it does not drive the
      // icon color … record the … limitation in Completion Notes") — except
      // discovered one layer down, in the unit-test harness rather than the
      // browser. Task 6's real `expo export -p web` check is the actual gate
      // for cue #1. This test instead exercises cue #2 (the `border-l-2`
      // structural rule), which is fully observable here and is, by the
      // party-mode 2026-09-18 decision, the cue that must not depend on a
      // rendering engine to be correct.
      const renderer = renderRail();
      if (collapsed) {
        act(() => {
          findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
        });
      }

      const activeLabel = semantics === 'tabs' ? 'History tab' : 'History';
      const inactiveLabel = semantics === 'tabs' ? 'Camera tab' : 'Camera';

      const activeItem = findHostPressableByLabel(renderer, activeLabel);
      const inactiveItem = findHostPressableByLabel(renderer, inactiveLabel);

      expect(activeItem.props.className).toContain('border-ink');
      expect(activeItem.props.className).not.toContain('border-transparent');
      expect(inactiveItem.props.className).toContain('border-transparent');
      expect(inactiveItem.props.className).not.toContain('border-ink');

      const activeIcon = activeItem.findByType('Feather' as unknown as React.ElementType);
      const inactiveIcon = inactiveItem.findByType('Feather' as unknown as React.ElementType);

      expect(activeIcon.props.name).toBe('list');
      expect(inactiveIcon.props.name).toBe('camera');
    },
  );

  it('pressing the toggle does not fire any item onPress', () => {
    const renderer = renderRail();

    act(() => {
      findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
    });

    for (const item of items) {
      expect(item.onPress).not.toHaveBeenCalled();
    }
  });

  it('toggle host Pressable exposes onFocus/onBlur handlers', () => {
    const renderer = renderRail();
    const toggle = findHostPressableByLabel(renderer, 'Collapse navigation');

    expect(typeof toggle.props.onFocus).toBe('function');
    expect(typeof toggle.props.onBlur).toBe('function');
  });

  it('the role container carries the expected role/accessibilityRole/accessibilityLabel', () => {
    const renderer = renderRail();
    if (semantics === 'tabs') {
      expect(
        renderer.root.findByProps({ accessibilityRole: 'tablist', accessibilityLabel: 'Primary tabs' }),
      ).toBeTruthy();
    } else {
      expect(
        renderer.root.findByProps({ role: 'navigation', accessibilityLabel: 'Primary navigation' }),
      ).toBeTruthy();
      expect(renderer.root.findAllByProps({ accessibilityRole: 'tablist' })).toHaveLength(0);
    }
  });
  },
);

describe('SwissSidebar adapter (Story 6.11) — toggle does not touch navigation', () => {
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

  it('pressing the collapse toggle never calls navigation.emit or navigation.navigate', () => {
    const props = createTabBarProps(0);
    const renderer = renderNode(<SwissSidebar {...props} railWidth={102} />);

    act(() => {
      findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
    });

    expect(props.navigation.emit).not.toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('supplies a RAIL_ICONS-mapped icon per route without a consumer edit', () => {
    const props = createTabBarProps(0);
    const renderer = renderNode(<SwissSidebar {...props} railWidth={102} />);

    const cameraTab = findHostPressableByLabel(renderer, 'Camera tab');
    const historyTab = findHostPressableByLabel(renderer, 'History tab');
    const settingsTab = findHostPressableByLabel(renderer, 'Settings tab');

    expect(cameraTab.findByType('Feather' as unknown as React.ElementType).props.name).toBe('camera');
    expect(historyTab.findByType('Feather' as unknown as React.ElementType).props.name).toBe('list');
    expect(settingsTab.findByType('Feather' as unknown as React.ElementType).props.name).toBe('settings');
  });

  it('renders exactly one expand toggle after the rail is collapsed', () => {
    const props = createTabBarProps(0);
    const renderer = renderNode(<SwissSidebar {...props} railWidth={102} />);

    act(() => {
      findHostPressableByLabel(renderer, 'Collapse navigation').props.onPress();
    });

    expect(findAllHostPressablesByLabel(renderer, 'Expand navigation')).toHaveLength(1);
    expect(findAllHostPressablesByLabel(renderer, 'Collapse navigation')).toHaveLength(0);
  });
});
