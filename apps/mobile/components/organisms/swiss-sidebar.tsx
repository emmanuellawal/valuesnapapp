import React from 'react';
import { View, Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Text } from '@/components/primitives';

/**
 * SwissSidebar — Desktop left-side navigation panel
 *
 * Renders at width >= 1024px in place of SwissTabBar.
 *
 * Swiss Minimalist design principles:
 * - Text-only labels (no icons)
 * - Active item: font-semibold weight only — no color shift, no background fill
 * - Single 1px right border as the sole structural separator
 * - No safe area padding — desktop-only component
 * - Fixed 240px width; flex: 1 height fills the navigator container
 */
export function SwissSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      className="bg-paper border-r border-divider py-8 px-6"
      style={{ width: 240, flex: 1 }}
    >
      {state.routes.map((route, index) => {
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

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? `${label} tab`}
            onPress={onPress}
            onLongPress={onLongPress}
            className="py-3 min-h-[44px] justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              variant="body"
              className={isFocused ? 'text-ink font-semibold' : 'text-ink-muted'}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default SwissSidebar;
