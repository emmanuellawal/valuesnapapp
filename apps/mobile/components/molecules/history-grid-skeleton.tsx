import React from 'react';

import { Box } from '@/components/primitives';
import { ValuationCardSkeleton } from './valuation-card-skeleton';

export interface HistoryGridSkeletonProps {
  /** Number of cards to display (default: 6) */
  count?: number;
  /** Number of columns for the grid layout (1–4). Defaults to 2. */
  numColumns?: number;
}

export function HistoryGridSkeleton({ count = 6, numColumns = 2 }: HistoryGridSkeletonProps) {
  const gap = 16;
  const columnWidth =
    numColumns === 1
      ? ('100%' as const)
      : (`calc(${100 / numColumns}% - ${(gap * (numColumns - 1)) / numColumns}px)` as any);

  return (
    <Box className="flex-row flex-wrap" style={{ gap }}>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={`history-skeleton-${index}`}
          style={{ width: columnWidth, flexShrink: 0, flexGrow: 0 }}
        >
          <ValuationCardSkeleton />
        </Box>
      ))}
    </Box>
  );
}
