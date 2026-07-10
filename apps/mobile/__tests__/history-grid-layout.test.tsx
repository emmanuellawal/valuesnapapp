import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

import { HistoryGrid, type HistoryGridItem } from '@/components/organisms/history-grid';
import { HistoryGridSkeleton } from '@/components/molecules/history-grid-skeleton';

jest.mock('@/components/molecules/valuation-card', () => ({
  ValuationCard: (_props: unknown) => null,
}));

jest.mock('@/components/molecules/valuation-card-skeleton', () => ({
  ValuationCardSkeleton: () => null,
}));

jest.mock('@/components/primitives', () => {
  const ReactLocal = require('react');
  return {
    Box: ({ children, ...props }: any) => ReactLocal.createElement('Box', props, children),
  };
});

function makeItem(id: string): HistoryGridItem {
  return {
    id,
    itemDetails: {
      itemType: 'camera',
      brand: 'Canon',
      model: 'AE-1',
      visualCondition: 'used_good',
      conditionDetails: 'Minor wear',
      estimatedAge: '1970s',
      categoryHint: 'Cameras',
      description: '',
      searchKeywords: ['Canon AE-1'],
      identifiers: { upc: null, modelNumber: null, serialNumber: null },
    },
    marketData: {
      status: 'success',
      confidence: 'HIGH',
      totalFound: 12,
      pricesAnalyzed: 9,
      fairMarketValue: 220,
      priceRange: { min: 180, max: 260 },
      keywords: 'canon ae-1',
    },
    imageUri: 'https://example.com/item.jpg',
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getContainerNode(tree: ReactTestRenderer) {
  return tree.root.find((node) => node.type === 'Box' && node.props?.className === 'flex-row flex-wrap');
}

async function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(node);
  });
  return tree;
}

describe('HistoryGrid layout props', () => {
  it('applies custom gap and expected width formula', async () => {
    const tree = await render(
      <HistoryGrid items={[makeItem('a'), makeItem('b')]} numColumns={3} gap={24} />
    );

    const container = getContainerNode(tree);
    expect(container.props.style).toEqual({ gap: 24 });

    const itemWrappers = tree.root.findAll(
      (node) => isObject(node.props?.style) && 'width' in node.props.style
    );
    expect(itemWrappers.length).toBeGreaterThan(0);

    const expectedWidth = `${100 / 3}%`;
    expect(itemWrappers[0].props.style.width).toBe(expectedWidth);
  });

  it('falls back to 16px gap when gap prop omitted', async () => {
    const tree = await render(<HistoryGrid items={[makeItem('a')]} numColumns={2} />);
    const container = getContainerNode(tree);

    expect(container.props.style).toEqual({ gap: 16 });
  });
});

describe('HistoryGridSkeleton layout props', () => {
  it('applies custom gap and expected width formula', async () => {
    const tree = await render(<HistoryGridSkeleton count={2} numColumns={4} gap={32} />);
    const container = getContainerNode(tree);

    expect(container.props.style).toEqual({ gap: 32 });

    const itemWrappers = tree.root.findAll(
      (node) =>
        isObject(node.props?.style) &&
        'width' in node.props.style &&
        'flexShrink' in node.props.style
    );
    expect(itemWrappers.length).toBeGreaterThan(0);

    const expectedWidth = `${100 / 4}%`;
    expect(itemWrappers[0].props.style.width).toBe(expectedWidth);
  });
});
