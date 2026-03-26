import React from 'react';

import { Box } from '@/components/primitives';
import { ValuationCard, type ValuationCardProps } from '@/components/molecules/valuation-card';

export interface HistoryGridItem extends Omit<ValuationCardProps, 'onPress'> {
  id: string;
}

export interface HistoryGridProps {
  items: HistoryGridItem[];
  onItemPress?: (item: HistoryGridItem) => void;
  /** Number of columns for the responsive grid layout (1–4). Defaults to 2. */
  numColumns?: number;
}

export function HistoryGrid({ items, onItemPress, numColumns = 2 }: HistoryGridProps) {
  const gap = 16;
  const columnWidth =
    numColumns === 1
      ? ('100%' as const)
      : (`calc(${100 / numColumns}% - ${(gap * (numColumns - 1)) / numColumns}px)` as any);

  return (
    <Box className="flex-row flex-wrap" style={{ gap }}>
      {items.map((item) => (
        <Box key={item.id} style={{ width: columnWidth }}>
          <ValuationCard
            itemDetails={item.itemDetails}
            marketData={item.marketData}
            imageUri={item.imageUri}
            onPress={onItemPress ? () => onItemPress(item) : undefined}
          />
        </Box>
      ))}
    </Box>
  );
}
