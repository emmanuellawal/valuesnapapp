import type { VisualCondition } from '@/types/item';
import type { ListingCondition } from '@/types/listing';

const CONDITION_MAP: Partial<Record<VisualCondition, ListingCondition>> = {
  new: 'new',
  used_excellent: 'like_new',
  used_good: 'good',
  used_fair: 'acceptable',
};

export function mapVisualConditionToListingCondition(
  visual: VisualCondition,
): ListingCondition | undefined {
  return CONDITION_MAP[visual];
}