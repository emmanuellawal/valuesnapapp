import React from 'react';

import { Box, Stack } from '@/components/primitives';

export interface FormFieldSkeletonProps {
  /** Height in pixels for the input placeholder (default: 48) */
  height?: number;
}

export function FormFieldSkeleton({ height = 48 }: FormFieldSkeletonProps) {
  return (
    <Stack gap={2} className="w-full">
      <Box className="h-4 w-1/4 bg-divider animate-pulse" />
      <Box className="w-full bg-divider animate-pulse" style={{ height }} />
    </Stack>
  );
}
