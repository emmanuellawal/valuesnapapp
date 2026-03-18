import React from 'react';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';

/**
 * SettingsRow - Swiss Minimalist Design
 * 
 * Flush-left layout with value and chevron pushed right.
 * Touch target >= 48px per WCAG 2.1 AA.
 */
function SettingsRow({
  label,
  value,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  return (
    <SwissPressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress ?? (() => {})}
      className="py-4 bg-paper border-b border-divider"
    >
      <Stack direction="horizontal" gap={4}>
        <Text variant="body">{label}</Text>
        <Stack direction="horizontal" gap={2} className="ml-auto items-center">
          <Text variant="body-sm" className="text-ink-muted">
            {value}
          </Text>
          <Text variant="body" className="text-ink-muted">
            ›
          </Text>
        </Stack>
      </Stack>
    </SwissPressable>
  );
}

/**
 * Settings Screen — Swiss Minimalist Design
 */
export default function SettingsScreen() {
  return (
    <ScreenContainer>
      {/* Header */}
      <Text variant="caption" className="text-ink-muted uppercase tracking-wide">
        Settings
      </Text>
      <Text variant="display" className="text-ink mt-2">
        Your account
      </Text>

      {/* Account section */}
      <Box className="mt-12">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          Account
        </Text>
        <SettingsRow
          label="Plan"
          value="Free"
          accessibilityLabel="View plan details"
        />
        <SettingsRow
          label="Email"
          value="Not signed in"
          accessibilityLabel="View account email"
        />
      </Box>

      {/* Preferences section */}
      <Box className="mt-8">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          Preferences
        </Text>
        <SettingsRow
          label="Theme"
          value="System"
          accessibilityLabel="Change theme preference"
        />
        <SettingsRow
          label="Notifications"
          value="Off"
          accessibilityLabel="Change notifications preference"
        />
        <SettingsRow
          label="Currency"
          value="USD"
          accessibilityLabel="Change currency"
        />
      </Box>

      {/* About section */}
      <Box className="mt-8">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          About
        </Text>
        <SettingsRow
          label="Version"
          value="1.0.0"
          accessibilityLabel="App version"
        />
        <SettingsRow
          label="Privacy Policy"
          value=""
          accessibilityLabel="View privacy policy"
        />
        <SettingsRow
          label="Terms of Service"
          value=""
          accessibilityLabel="View terms of service"
        />
      </Box>
    </ScreenContainer>
  );
}
