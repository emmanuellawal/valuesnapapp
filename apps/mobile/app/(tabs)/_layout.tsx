import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';

import { BREAKPOINTS } from '@/constants/breakpoints';
import { SwissTabBar } from '@/components/organisms/swiss-tab-bar';
import { SwissSidebar } from '@/components/organisms/swiss-sidebar';

/**
 * Tab Layout - Swiss Minimalist Design
 *
 * Responsive navigation:
 * - width >= BREAKPOINTS.desktop → SwissSidebar (left-side column, desktop)
 * - width < BREAKPOINTS.desktop  → SwissTabBar (bottom bar, mobile/tablet)
 *
 * Uses custom SwissTabBar with:
 * - Text-only labels (no icons)
 * - Line indicator above active tab
 * - Subtle press animations
 */
export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINTS.desktop;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
      }}
      tabBar={(props) =>
        isDesktop ? <SwissSidebar {...props} /> : <SwissTabBar {...props} />
      }
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
