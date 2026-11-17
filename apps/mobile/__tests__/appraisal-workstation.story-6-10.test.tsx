import React from 'react';
import { act, create } from 'react-test-renderer';

// Same react-native + safe-area-context mock shape as
// swiss-sidebar-nav.story-6-10.test.tsx / tab-navigation-surfaces.test.tsx.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
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

// Story 6.11 AC11 permitted edit #1: "any existing test file that renders
// the rail" needs this mock — AppraisalWorkstation renders SwissSidebarNav,
// which now imports Feather at module scope; the react-native mock above
// has no NativeModules/processColor/TouchableHighlight, so the real Feather
// import chain (createIconSet -> expo-font -> expo-asset -> expo-constants)
// breaks without it.
jest.mock('@expo/vector-icons/Feather', () => 'Feather');

const { Text } = require('react-native');
const { AppraisalWorkstation } = require('@/components/organisms/appraisal-workstation');

function renderNode(element: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(element);
  });
  return renderer!;
}

describe('AppraisalWorkstation (Story 6.10 Task 3 — AC #1, #2, #3)', () => {
  const navItems = [
    { key: 'camera', label: 'Camera', icon: 'camera', isActive: false, onPress: jest.fn() },
    { key: 'history', label: 'History', icon: 'list', isActive: false, onPress: jest.fn() },
    { key: 'settings', label: 'Settings', icon: 'settings', isActive: false, onPress: jest.fn() },
  ];

  it('renders the rail, image pane, and data pane as three distinct regions', () => {
    const renderer = renderNode(
      <AppraisalWorkstation
        railWidth={102}
        navItems={navItems}
        imagePane={<Text testID="image-pane-content">photo</Text>}
      >
        <Text testID="data-pane-content">data</Text>
      </AppraisalWorkstation>,
    );

    expect(renderer.root.findByProps({ testID: 'appraisal-workstation' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'appraisal-image-pane' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'appraisal-pane-divider' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'appraisal-data-pane' })).toBeTruthy();
  });

  it('renders the caller-provided imagePane node inside the image pane', () => {
    const renderer = renderNode(
      <AppraisalWorkstation
        railWidth={102}
        navItems={navItems}
        imagePane={<Text testID="image-pane-content">photo</Text>}
      >
        <Text testID="data-pane-content">data</Text>
      </AppraisalWorkstation>,
    );

    const imagePane = renderer.root.findByProps({ testID: 'appraisal-image-pane' });
    expect(imagePane.findByProps({ testID: 'image-pane-content' })).toBeTruthy();
    // The image content must not also land in the data pane.
    expect(() => imagePane.findByProps({ testID: 'data-pane-content' })).toThrow();
  });

  it('renders children inside the data pane, not the image pane', () => {
    const renderer = renderNode(
      <AppraisalWorkstation
        railWidth={102}
        navItems={navItems}
        imagePane={<Text testID="image-pane-content">photo</Text>}
      >
        <Text testID="data-pane-content">data</Text>
      </AppraisalWorkstation>,
    );

    const dataPane = renderer.root.findByProps({ testID: 'appraisal-data-pane' });
    expect(dataPane.findByProps({ testID: 'data-pane-content' })).toBeTruthy();
    expect(() => dataPane.findByProps({ testID: 'image-pane-content' })).toThrow();
  });

  it('renders the standalone navigation rail with the provided navItems and railWidth', () => {
    const renderer = renderNode(
      <AppraisalWorkstation
        railWidth={102}
        navItems={navItems}
        imagePane={<Text>photo</Text>}
      >
        <Text>data</Text>
      </AppraisalWorkstation>,
    );

    // Story 6.11 AC11 permitted edit #2 (extended to this file — not named
    // in AC11's list, but the same fix for the same reason: AC5's ARIA
    // restructuring moved `style.width` off the `role: 'navigation'` node,
    // which now owns only the mapped items, onto the new outer rail
    // wrapper identified by testID). See swiss-sidebar-nav.story-6-10.test.tsx
    // for the sibling case this mirrors.
    const rail = renderer.root.findByProps({ testID: 'swiss-sidebar-rail' });
    const style = Array.isArray(rail.props.style)
      ? rail.props.style.reduce((acc: any, curr: any) => ({ ...acc, ...curr }), {})
      : rail.props.style;
    expect(style.width).toBe(102);

    for (const item of navItems) {
      expect(renderer.root.findAllByProps({ accessibilityLabel: item.label }).length).toBeGreaterThan(0);
    }
  });

  it('keeps padding off the flex item so image and data panes receive equal flex space', () => {
    const renderer = renderNode(
      <AppraisalWorkstation
        railWidth={102}
        navItems={navItems}
        imagePane={<Text>photo</Text>}
      >
        <Text>data</Text>
      </AppraisalWorkstation>,
    );

    const imagePane = renderer.root.findByProps({ testID: 'appraisal-image-pane' });
    const dataPane = renderer.root.findByProps({ testID: 'appraisal-data-pane' });

    expect(imagePane.props.className).toContain('flex-1');
    expect(imagePane.props.className).not.toContain('p-8');
    expect(dataPane.props.style).toEqual(expect.objectContaining({ flex: 1 }));
  });
});
