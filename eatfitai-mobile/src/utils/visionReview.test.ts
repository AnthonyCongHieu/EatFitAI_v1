import type { MappedFoodItem } from '../types/ai';
import {
  buildVisionReviewItems,
  getVisionReviewSaveBlocker,
  hasUsableVisionNutrition,
} from './visionReview';

const makeItem = (overrides: Partial<MappedFoodItem> = {}): MappedFoodItem => ({
  label: 'beef',
  confidence: 0.9,
  foodItemId: 1,
  foodName: 'Beef',
  caloriesPer100g: 187,
  proteinPer100g: 20,
  carbPer100g: 0,
  fatPer100g: 12,
  isMatched: true,
  ...overrides,
});

describe('visionReview', () => {
  it('selects only matched items with usable nutrition by default', () => {
    const items = buildVisionReviewItems([
      makeItem(),
      makeItem({
        foodItemId: 2,
        caloriesPer100g: 0,
        proteinPer100g: 0,
        carbPer100g: 0,
        fatPer100g: 0,
      }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]!.selected).toBe(true);
    expect(items[1]!.selected).toBe(false);
  });

  it('blocks save when a selected item has no usable nutrition', () => {
    const blocker = getVisionReviewSaveBlocker([
      {
        item: makeItem({
          caloriesPer100g: 0,
          proteinPer100g: 0,
          carbPer100g: 0,
          fatPer100g: 0,
        }),
        selected: true,
        grams: 100,
      },
    ]);

    expect(blocker).toBeTruthy();
  });

  it('accepts catalog-mapped items with calories and at least one macro', () => {
    expect(hasUsableVisionNutrition(makeItem())).toBe(true);
  });
});
