import React, { useState } from 'react';
import { View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Feather from '@expo/vector-icons/Feather';
import { cssInterop } from 'nativewind';

import { SwissPressable, Text } from '@/components/primitives';
import { COLLAPSED_RAIL_WIDTH } from '@/constants/breakpoints';

// Story 6.11 Task 2: register Feather with NativeWind once at module scope so
// `className="text-ink"` / `"text-ink-muted"` drive icon color via the same
// light/dark tokens as everything else (global.css:20-27), instead of a
// hardcoded hex that would break dark mode.
cssInterop(Feather, {
  className: { target: 'style', nativeStyleToProp: { color: true } },
});

/**
 * SwissSidebarItem — presentational shape consumed by SwissSidebarNav.
 *
 * Decouples rail rendering from BottomTabBarProps so screens outside the
 * Tabs navigator (e.g. /appraisal, Story 6.10) can render the same rail
 * directly, without a real Tabs `state`/`descriptors`/`navigation` triple.
 */
export interface SwissSidebarItem {
  key: string;
  label: string;
  /**
   * Required (Story 6.11 AC3): the collapsed rail renders icon-only, so a
   * missing icon would ship a blank, unusable 60px column. Making this
   * required turns that failure mode into a compile error.
   */
  icon: React.ComponentProps<typeof Feather>['name'];
  accessibilityLabel?: string;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export type SwissSidebarNavSemantics = 'tabs' | 'navigation';

/**
 * SwissSidebarNav — Desktop left-side navigation rail (presentational).
 *
 * Extracted from SwissSidebar (Story 6.10 Task 2) so /appraisal's desktop
 * workstation can render the same rail without a Tabs navigator. Story 6.11
 * adds local collapse/expand state, a Feather icon per item, and a
 * collapse/expand toggle — still a single component, still no second rail
 * implementation (AC1).
 *
 * Swiss Minimalist design principles:
 * - Icon + label when expanded, icon-only when collapsed (AC3)
 * - Active item: icon `text-ink` + label `font-semibold` + 2px `border-l-2
 *   border-ink` — two independent cues, not color alone
 * - Single 1px right border as the sole rail-level structural separator
 * - No safe area padding — desktop-only component
 * - Width is provided by parent layout (responsive rail) when expanded, or
 *   `COLLAPSED_RAIL_WIDTH` when collapsed; flex: 1 height fills the
 *   navigator container
 *
 * The Tabs adapter uses tab semantics, while standalone routes use navigation
 * semantics so route changes are not exposed as an ARIA tab widget without
 * associated tab panels.
 *
 * ARIA restructuring (AC5): `role="tablist"` has `tab` as its *required
 * owned element* (https://www.w3.org/TR/wai-aria-1.2/#tablist) — a
 * `role="button"` toggle as a direct child would make the tablist invalid
 * and fail axe-core's `aria-required-children` rule. So the toggle and the
 * role-bearing container (`tablist` or `navigation`) are rendered as
 * siblings inside a plain (role-less) outer wrapper that owns the width,
 * padding, background, border, and transition; the inner wrapper carries
 * only the role and the mapped items. This split is applied uniformly to
 * both semantics modes (not just `tabs`) because `navigation` mode needs
 * the same "toggle is not part of the item list" structural guarantee that
 * this story's tests assert for both modes (see
 * `swiss-sidebar-collapse.story-6-11.test.tsx`).
 *
 * That move required retargeting `style.width` assertions off the
 * `tablist`/`navigation` node onto the new outer wrapper's `testID` in
 * three existing Story 6.10 test files: `swiss-sidebar-nav.story-6-10.test.tsx`
 * and `tab-navigation-surfaces.test.tsx` (named in this story's AC11) plus
 * `appraisal-workstation.story-6-10.test.tsx` (not named in AC11 — an
 * omission discovered during implementation; see Completion Notes).
 */
export function SwissSidebarNav({
  items,
  railWidth,
  semantics = 'tabs',
}: {
  items: SwissSidebarItem[];
  railWidth: number;
  semantics?: SwissSidebarNavSemantics;
}) {
  const usesTabSemantics = semantics === 'tabs';
  const [isCollapsed, setIsCollapsed] = useState(false);

  const railClassName = `bg-paper border-r border-divider py-8 transition-[width] duration-300 ${
    isCollapsed ? 'px-2' : 'px-6'
  }`;
  const railStyle = {
    width: isCollapsed ? COLLAPSED_RAIL_WIDTH : railWidth,
    alignSelf: 'stretch' as const,
  };

  const toggle = (
    <SwissPressable
      accessibilityRole="button"
      accessibilityLabel={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
      accessibilityState={{ expanded: !isCollapsed }}
      onPress={() => setIsCollapsed((prev) => !prev)}
      className="self-start px-3 py-3 min-w-[44px] min-h-[44px] items-center justify-center mb-4"
    >
      <Feather
        name={isCollapsed ? 'chevron-right' : 'chevron-left'}
        size={20}
        className="text-ink-muted"
      />
    </SwissPressable>
  );

  const renderedItems = items.map((item) => (
    <SwissPressable
      key={item.key}
      accessibilityRole={usesTabSemantics ? 'tab' : 'button'}
      accessibilityState={
        usesTabSemantics ? (item.isActive ? { selected: true } : {}) : undefined
      }
      accessibilityLabel={
        item.accessibilityLabel ?? (usesTabSemantics ? `${item.label} tab` : item.label)
      }
      onPress={item.onPress}
      onLongPress={item.onLongPress}
      className={`py-3 min-h-[44px] overflow-hidden border-l-2 ${
        item.isActive ? 'border-ink' : 'border-transparent'
      } ${
        isCollapsed
          ? 'items-center justify-center'
          : 'flex-row items-center justify-start gap-3'
      }`}
    >
      <Feather
        name={item.icon}
        size={20}
        className={item.isActive ? 'text-ink' : 'text-ink-muted'}
      />
      {!isCollapsed && (
        <Text
          variant="body"
          className={item.isActive ? 'text-ink font-semibold' : 'text-ink-muted'}
        >
          {item.label}
        </Text>
      )}
    </SwissPressable>
  ));

  return (
    <View testID="swiss-sidebar-rail" className={railClassName} style={railStyle}>
      {toggle}
      <View
        role={usesTabSemantics ? 'tablist' : 'navigation'}
        accessibilityRole={usesTabSemantics ? 'tablist' : undefined}
        accessibilityLabel={usesTabSemantics ? 'Primary tabs' : 'Primary navigation'}
      >
        {renderedItems}
      </View>
    </View>
  );
}

/**
 * Maps a Tabs route name to its Feather glyph for the desktop rail (Story
 * 6.11 Task 4). Route names come from `(tabs)/_layout.tsx`'s three
 * `Tabs.Screen` entries. `'list'` matches the clipboard glyph in the UX
 * spec's rail diagram (docs/ux-design-specification.md#L2194-2197);
 * unrecognized route names fall back to a neutral glyph rather than
 * crashing, since `RAIL_ICONS` is keyed by string, not the `icon`
 * field's stricter glyph-name union.
 */
const RAIL_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  camera: 'camera',
  history: 'list',
  settings: 'settings',
};

/**
 * SwissSidebar — Desktop left-side navigation panel (Tabs render-prop adapter)
 *
 * Renders at width >= BREAKPOINTS.desktop in place of SwissTabBar, as the
 * `tabBar` render-prop supplied to `<Tabs>`. Maps the Tabs navigator's
 * state/descriptors/navigation into SwissSidebarItem[] and delegates
 * presentation to SwissSidebarNav.
 */
export function SwissSidebar({
  state,
  descriptors,
  navigation,
  railWidth,
}: BottomTabBarProps & { railWidth: number }) {
  const items: SwissSidebarItem[] = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    return {
      key: route.key,
      label,
      icon: RAIL_ICONS[route.name] ?? 'circle',
      accessibilityLabel: options.tabBarAccessibilityLabel ?? `${label} tab`,
      isActive: isFocused,
      onPress,
      onLongPress,
    };
  });

  return <SwissSidebarNav items={items} railWidth={railWidth} semantics="tabs" />;
}

export default SwissSidebar;
