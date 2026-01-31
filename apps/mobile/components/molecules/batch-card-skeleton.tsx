import React from 'react';

import { Box, Stack } from '@/components/primitives';

export function BatchCardSkeleton() {
  return (
    <Box className="bg-paper border-2 border-divider p-4">
      <Stack gap={3}>
        <Box className="h-2 w-full bg-divider animate-pulse" />
        <Box className="h-5 w-1/3 bg-divider animate-pulse" />
        <Box className="h-4 w-1/4 bg-divider animate-pulse" />
      </Stack>
    </Box>
  );
}
