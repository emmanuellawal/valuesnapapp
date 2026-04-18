import { createMockItemDetails } from '@/types/mocks';
import { LISTING_TITLE_MAX_LENGTH } from '@/types/listing';

import { buildAiListingTitle } from '../listing-title';

describe('buildAiListingTitle', () => {
  it('builds a title from brand, model, and item type', () => {
    const itemDetails = createMockItemDetails({
      brand: 'Canon',
      model: 'AE-1',
      itemType: '35mm Film Camera',
    });

    expect(buildAiListingTitle(itemDetails)).toBe('Canon AE-1 35mm Film Camera');
  });

  it('filters unknown tokens case-insensitively', () => {
    const itemDetails = createMockItemDetails({
      brand: 'Canon',
      model: 'unknown',
      itemType: '35mm Film Camera',
    });

    expect(buildAiListingTitle(itemDetails)).toBe('Canon 35mm Film Camera');
  });

  it('truncates at a word boundary when the title exceeds the eBay limit', () => {
    const itemDetails = createMockItemDetails({
      brand: 'Canon',
      model: 'AE-1 Program',
      itemType: '35mm Film Camera With Original Lens Strap Case Manual Flash Bundle',
    });

    const title = buildAiListingTitle(itemDetails);

    expect(title.length).toBeLessThanOrEqual(LISTING_TITLE_MAX_LENGTH);
    expect(title.endsWith(' ')).toBe(false);
    expect(title).toBe(
      'Canon AE-1 Program 35mm Film Camera With Original Lens Strap Case Manual Flash',
    );
  });

  it('hard-truncates when no word boundary exists within the limit', () => {
    const longSingleToken = 'X'.repeat(LISTING_TITLE_MAX_LENGTH + 10);
    const itemDetails = createMockItemDetails({
      brand: longSingleToken,
      model: 'unknown',
      itemType: 'unknown',
    });

    const title = buildAiListingTitle(itemDetails);

    expect(title).toBe('X'.repeat(LISTING_TITLE_MAX_LENGTH));
  });

  it('returns an empty string when all title tokens are unknown', () => {
    const itemDetails = createMockItemDetails({
      brand: 'unknown',
      model: 'unknown',
      itemType: 'unknown',
    });

    expect(buildAiListingTitle(itemDetails)).toBe('');
  });

  it('trims whitespace before composing the title', () => {
    const itemDetails = createMockItemDetails({
      brand: '  Canon  ',
      model: ' AE-1 ',
      itemType: ' 35mm Film Camera ',
    });

    expect(buildAiListingTitle(itemDetails)).toBe('Canon AE-1 35mm Film Camera');
  });
});