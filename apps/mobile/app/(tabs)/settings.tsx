import React from 'react';
import { ScrollView, Alert } from 'react-native';

import { Box, Stack, Text, SwissPressable } from '@/components/primitives';

/**
 * SettingsRow - Swiss Minimalist Design
 * 
 * Flush-left layout with value pushed right via ml-auto
 * No justify-between centering - maintains asymmetric tension
 */
function SettingsRow({
  label,
  value,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <SwissPressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="py-3 bg-paper border-b border-divider"
    >
      <Stack direction="horizontal" gap={4}>
        <Text variant="body">{label}</Text>
        <Text variant="caption" className="text-ink-light ml-auto">
          {value}
        </Text>
      </Stack>
    </SwissPressable>
  );
}

/**
 * Settings Screen - Swiss Minimalist Design
 * 
 * Applies Swiss design PATTERNS matching Camera screen (Story 0.9):
 * - Asymmetric layout (flush-left, heavy right margin)
 * - Typography as primary visual element
 * - Active negative space with offset dividers
 * - No centered content
 * 
 * @see Story 0.10: Polish History and Settings Tabs
 * @see docs/SWISS-MINIMALIST.md
 */
export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-paper">
      {/* Balanced padding for mobile screens - consistent with Camera and History tabs */}
      <Box className="px-6 pt-12 pb-8">
        {/* Warm, personalized heading */}
        <Text variant="h1">Your account</Text>
        
        {/* Friendly guidance */}
        <Text variant="body" className="text-ink-light mt-2">
          Manage your preferences
        </Text>

        {/* Full-width divider for mobile balance */}
        <Box className="h-px bg-divider mt-6" />

        <Stack gap={2} className="mt-6">
          {/* Section heading - h2 for clear hierarchy */}
          <Text variant="h2" className="mb-2">Account</Text>
          <SettingsRow
            label="Plan"
            value="Free"
            accessibilityLabel="View plan"
            onPress={() => Alert.alert('Plan', 'Account features will be added in a later epic.')}
          />
          <SettingsRow
            label="Email"
            value="Not signed in"
            accessibilityLabel="View account email"
            onPress={() => Alert.alert('Account', 'Authentication will be implemented in Epic 4.')}
          />
        </Stack>

        {/* Full-width divider for mobile balance */}
        <Box className="h-px bg-divider mt-6" />

        <Stack gap={2} className="mt-6 mb-8">
          {/* Section heading - h2 for clear hierarchy */}
          <Text variant="h2" className="mb-2">Preferences</Text>
          <SettingsRow
            label="Theme"
            value="System"
            accessibilityLabel="View theme preference"
            onPress={() => Alert.alert('Theme', 'This app currently follows system light/dark mode on web.')}
          />
          <SettingsRow
            label="Notifications"
            value="Off"
            accessibilityLabel="View notifications preference"
            onPress={() => Alert.alert('Notifications', 'Preferences will be implemented in a later story.')}
          />
        </Stack>
      </Box>
    </ScrollView>
  );
}
