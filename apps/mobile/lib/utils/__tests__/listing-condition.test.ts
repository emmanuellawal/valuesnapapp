import { mapVisualConditionToListingCondition } from '../listing-condition';

describe('mapVisualConditionToListingCondition', () => {
  it('maps "new" to "new"', () => {
    expect(mapVisualConditionToListingCondition('new')).toBe('new');
  });

  it('maps "used_excellent" to "like_new"', () => {
    expect(mapVisualConditionToListingCondition('used_excellent')).toBe('like_new');
  });

  it('maps "used_good" to "good"', () => {
    expect(mapVisualConditionToListingCondition('used_good')).toBe('good');
  });

  it('maps "used_fair" to "acceptable"', () => {
    expect(mapVisualConditionToListingCondition('used_fair')).toBe('acceptable');
  });

  it('returns undefined for "damaged"', () => {
    expect(mapVisualConditionToListingCondition('damaged')).toBeUndefined();
  });
});