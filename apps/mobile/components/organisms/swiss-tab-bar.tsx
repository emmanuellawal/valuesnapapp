import React from 'react';
import { View, Pressable, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Text } from '@/components/primitives';

/**
 * SwissTabBar - Minimalist tab bar with line indicator
 * 
 * Swiss design principles:
 * - Text-only labels (no icons)
 * - 2px line indicator ABOVE active tab
 * - Black/gray color contrast only
 * - Subtle press feedback with scale animation
 * 
 * @see Swiss Wireframe: docs/excalidraw-diagrams/swiss-wireframe-valuesnap.excalidraw
 */
export function SwissTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View 
      className="flex-row bg-paper border-t border-divider"
      accessibilityRole="tablist"
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
            className="flex-1 items-center pt-3 pb-4"
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            {/* Line indicator - positioned at top */}
            <View 
              className={`absolute top-0 left-4 right-4 h-0.5 ${
                isFocused ? 'bg-ink' : 'bg-transparent'
              }`}
            />
            
            {/* Tab label */}
            <Text 
              variant="caption"
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

export default SwissTabBar;
