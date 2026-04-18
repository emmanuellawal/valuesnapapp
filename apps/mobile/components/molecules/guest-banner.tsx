import React from 'react';
import { router } from 'expo-router';

import { Box, Stack, SwissPressable, Text } from '@/components/primitives';

interface GuestBannerProps {
  visible: boolean;
}

export function GuestBanner({ visible }: GuestBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <Box
      className="bg-paper border-t border-divider py-4 mt-8"
      testID="guest-banner"
      accessibilityLabel="Create a free account to save unlimited history"
    >
      <Text variant="body" className="text-ink mb-3">
        Save unlimited history — create a free account.
      </Text>
      <Stack direction="horizontal" gap={3}>
        <SwissPressable
          accessibilityLabel="Create a free account"
          onPress={() => router.push('/auth/register')}
          className="border border-ink bg-ink px-4 py-3 min-h-[44px] justify-center"
          testID="guest-banner-register"
        >
          <Text variant="body" className="text-paper font-semibold">
            Create account
          </Text>
        </SwissPressable>
        <SwissPressable
          accessibilityLabel="Sign in to your account"
          onPress={() => router.push('/auth/sign-in')}
          className="px-4 py-3 min-h-[44px] justify-center"
          testID="guest-banner-signin"
        >
          <Text variant="body" className="text-ink">
            Sign in
          </Text>
        </SwissPressable>
      </Stack>
    </Box>
  );
}