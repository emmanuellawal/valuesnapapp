import React from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Box, Stack, Text, SwissPressable, ScreenContainer } from '@/components/primitives';
import { useAuth } from '@/contexts/AuthContext';

/**
 * SettingsRow - Swiss Minimalist Design
 * 
 * Flush-left layout with value and chevron pushed right.
 * Touch target >= 48px per WCAG 2.1 AA.
 */
function SettingsRow({
  label,
  value = '',
  onPress,
  accessibilityLabel,
  destructive = false,
  showChevron = true,
  testID,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  destructive?: boolean;
  showChevron?: boolean;
  testID?: string;
}) {
  const content = (
    <Stack direction="horizontal" gap={4}>
      <Text variant="body" className={destructive ? 'text-signal' : 'text-ink'}>
        {label}
      </Text>
      {value ? (
        <Text variant="body-sm" className="text-ink-muted ml-auto">
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? (
        <Text variant="body" className="text-ink-muted">
          ›
        </Text>
      ) : null}
    </Stack>
  );

  if (!onPress) {
    return (
      <Box
        accessibilityLabel={accessibilityLabel}
        className="py-4 bg-paper border-b border-divider"
        testID={testID}
      >
        {content}
      </Box>
    );
  }

  return (
    <SwissPressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="py-4 bg-paper border-b border-divider"
      testID={testID}
    >
      {content}
    </SwissPressable>
  );
}

/**
 * Settings Screen — Swiss Minimalist Design
 */
export default function SettingsScreen() {
  const { isGuest, user, session, signOut } = useAuth();
  const signInMethod = session?.user?.app_metadata?.provider === 'google' ? 'Google' : 'Email';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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
        {isGuest ? (
          <>
            <Text variant="body" className="text-ink-muted pb-4 border-b border-divider">
              Not signed in
            </Text>
            <SettingsRow
              label="Create account"
              onPress={() => router.push('/auth/register')}
              accessibilityLabel="Create a free account"
              testID="settings-create-account-button"
            />
            <SettingsRow
              label="Sign in"
              onPress={() => router.push('/auth/sign-in')}
              accessibilityLabel="Sign in to your account"
              testID="settings-sign-in-button"
            />
          </>
        ) : (
          <>
            <SettingsRow
              label="Plan"
              value="Free"
              accessibilityLabel="Current plan"
              showChevron={false}
            />
            <SettingsRow
              label="Email"
              value={user?.email ?? ''}
              accessibilityLabel="Account email address"
              showChevron={false}
            />
            <SettingsRow
              label="Sign-in method"
              value={signInMethod}
              accessibilityLabel="Sign-in method"
              showChevron={false}
              testID="settings-sign-in-method"
            />
            <SettingsRow
              label="Sign out"
              onPress={signOut}
              accessibilityLabel="Sign out of your account"
              destructive
              showChevron={false}
              testID="settings-signout-button"
            />
            <SettingsRow
              label="Delete Account"
              onPress={() => router.push('/account/delete-confirm')}
              accessibilityLabel="Delete your account permanently"
              destructive
              showChevron={false}
              testID="settings-delete-account-button"
            />
          </>
        )}
      </Box>

      {/* Preferences section */}
      <Box className="mt-8">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          Preferences
        </Text>
        <SettingsRow
          label="Theme"
          value="System"
          accessibilityLabel="Theme preference"
          showChevron={false}
        />
        <SettingsRow
          label="Notifications"
          value="Off"
          accessibilityLabel="Notification preference"
          showChevron={false}
        />
        <SettingsRow
          label="Currency"
          value="USD"
          accessibilityLabel="Currency preference"
          showChevron={false}
        />
      </Box>

      {/* About section */}
      <Box className="mt-8">
        <Text variant="caption" className="text-ink-muted uppercase tracking-wide mb-4">
          About
        </Text>
        <SettingsRow
          label="Version"
          value={appVersion}
          accessibilityLabel="App version"
          showChevron={false}
          testID="settings-version"
        />
        <SettingsRow
          label="Help & Support"
          onPress={() => Linking.openURL('mailto:support@valuesnap.app')}
          accessibilityLabel="Get help and support"
          testID="settings-help-button"
        />
        <SettingsRow
          label="Privacy Policy"
          accessibilityLabel="View privacy policy"
          showChevron={false}
        />
        <SettingsRow
          label="Terms of Service"
          accessibilityLabel="View terms of service"
          showChevron={false}
        />
      </Box>
    </ScreenContainer>
  );
}
