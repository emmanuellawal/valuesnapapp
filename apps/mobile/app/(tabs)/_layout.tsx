import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';

import { SwissTabBar } from '@/components/organisms/swiss-tab-bar';
import { SwissSidebar } from '@/components/organisms/swiss-sidebar';

/**
 * Tab Layout - Swiss Minimalist Design
 *
 * Responsive navigation:
 * - width >= 1024px → SwissSidebar (left-side column, desktop)
 * - width < 1024px  → SwissTabBar (bottom bar, mobile/tablet)
 *
 * Uses custom SwissTabBar with:
 * - Text-only labels (no icons)
 * - Line indicator above active tab
 * - Subtle press animations
 */
export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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
