import React from 'react';

import { Box } from '@/components/primitives';
import { ValuationCard, type ValuationCardProps } from '@/components/molecules/valuation-card';

export interface HistoryGridItem extends Omit<ValuationCardProps, 'onPress'> {
  id: string;
}

export interface HistoryGridProps {
  items: HistoryGridItem[];
  onItemPress?: (item: HistoryGridItem) => void;
}

export function HistoryGrid({ items, onItemPress }: HistoryGridProps) {
  return (
    <Box className="flex-row flex-wrap gap-4">
      {items.map((item) => (
        <Box key={item.id} className="w-44 shrink-0">
          <ValuationCard
            itemDetails={item.itemDetails}
            marketData={item.marketData}
            onPress={onItemPress ? () => onItemPress(item) : undefined}
          />
        </Box>
      ))}
    </Box>
  );
}
