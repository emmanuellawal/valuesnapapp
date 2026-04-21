import React from 'react';
import { View, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/primitives';

/**
 * SwissTabBar — Minimalist tab bar with line indicator
 * 
 * Swiss design principles:
 * - Text-only labels (no icons)
 * - 3px line indicator ABOVE active tab (full width)
 * - Black/gray color contrast only
 * - Subtle press feedback (opacity 0.6)
 * - Safe area padding for iOS home indicator
 * - Body-size labels for readability
 */
export function SwissTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Ensure minimum bottom padding of 8px, or use safe area inset
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View 
      className="flex-row bg-paper border-t border-divider"
      style={{ paddingBottom: bottomPadding }}
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
            className="flex-1 items-center pt-4 pb-3"
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {/* Line indicator — 3px, full width, positioned at top */}
            <View 
              className={`absolute top-0 left-0 right-0 ${
                isFocused ? 'bg-ink' : 'bg-transparent'
              }`}
              style={{ height: 3 }}
            />
            
            {/* Tab label — body size for proper readability */}
            <Text 
              variant="body"
              className={isFocused ? 'text-ink font-bold' : 'text-ink-muted'}
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
