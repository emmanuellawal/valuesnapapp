import type { ItemDetails } from '@/types';
import { LISTING_TITLE_MAX_LENGTH } from '@/types/listing';

export function buildAiListingTitle(itemDetails: ItemDetails): string {
  const parts = [itemDetails.brand, itemDetails.model, itemDetails.itemType]
    .map((part) => part.trim())
    .filter((part) => part !== '' && part.toLowerCase() !== 'unknown');

  const fullTitle = parts.join(' ');

  if (fullTitle.length <= LISTING_TITLE_MAX_LENGTH) {
    return fullTitle;
  }

  const truncatedTitle = fullTitle.slice(0, LISTING_TITLE_MAX_LENGTH);
  const lastSpaceIndex = truncatedTitle.lastIndexOf(' ');

  if (lastSpaceIndex > 0) {
    return truncatedTitle.slice(0, lastSpaceIndex);
  }

  return truncatedTitle;
}