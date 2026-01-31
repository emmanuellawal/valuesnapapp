import React from 'react';
import { Tabs } from 'expo-router';

import { SwissTabBar } from '@/components/organisms/swiss-tab-bar';

/**
 * Tab Layout - Swiss Minimalist Design
 * 
 * Uses custom SwissTabBar with:
 * - Text-only labels (no icons)
 * - Line indicator above active tab
 * - Subtle press animations
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <SwissTabBar {...props} />}
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
