import React from 'react';
import { Stack } from 'expo-router';

import { Box, Stack as SwissStack, Text, ScreenContainer } from '@/components/primitives';
import { ProgressIndicator, ValuationCardSkeleton } from '@/components/molecules';

/**
 * Demo route for capturing a static loading-state screenshot.
 * Renders the 1px Swiss progress bar at a fixed 55% (identifying stage).
 * Only used by Playwright screenshot tests — not linked from any UI.
 * URL: /demo-loading
 */
export default function DemoLoadingScreen() {
  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />

      <Text variant="h2" className="text-ink">
        What are you selling?
      </Text>
      <Text variant="body" className="text-ink-light mt-1">
        Snap a photo and we'll find its value
      </Text>

      <Box className="h-px bg-divider mt-8" />

      <SwissStack gap={6} className="py-8">
        <ProgressIndicator
          stage="identifying"
          stageProgress={55}
          isOvertime={false}
        />
        <Box className="w-full">
          <ValuationCardSkeleton />
        </Box>
      </SwissStack>
    </ScreenContainer>
  );
}
