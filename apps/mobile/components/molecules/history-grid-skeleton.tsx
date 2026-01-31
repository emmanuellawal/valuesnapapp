import React from 'react';

import { Box } from '@/components/primitives';
import { ValuationCardSkeleton } from './valuation-card-skeleton';

export interface HistoryGridSkeletonProps {
  /** Number of cards to display (default: 6) */
  count?: number;
}

export function HistoryGridSkeleton({ count = 6 }: HistoryGridSkeletonProps) {
  // Use flex-wrap to approximate a responsive grid without relying on CSS grid.
  // Each card gets ~48% width to form two columns in most layouts.
  return (
    <Box className="flex-row flex-wrap gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Box key={`history-skeleton-${index}`} className="basis-[48%] grow-0 shrink-0">
          <ValuationCardSkeleton />
        </Box>
      ))}
    </Box>
  );
}
