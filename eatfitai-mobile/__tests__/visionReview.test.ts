import type { MappedFoodItem } from '../src/types/ai';
import {
  buildVisionReviewItems,
  calculateVisionReviewCalories,
  clampVisionGrams,
  getVisionReviewSaveBlocker,
} from '../src/utils/visionReview';

const makeMappedFood = (
  overrides: Partial<MappedFoodItem>,
): MappedFoodItem => ({
  label: overrides.label ?? 'Food',
  confidence: overrides.confidence ?? 0.9,
  foodItemId: overrides.foodItemId ?? null,
  foodName: overrides.foodName ?? null,
  caloriesPer100g: overrides.caloriesPer100g ?? null,
  proteinPer100g: overrides.proteinPer100g ?? null,
  fatPer100g: overrides.fatPer100g ?? null,
  carbPer100g: overrides.carbPer100g ?? null,
  thumbNail: overrides.thumbNail ?? null,
  isMatched: overrides.isMatched ?? false,
});

describe('visionReview', () => {
  it('selects matched items by default and leaves unresolved items unselected at 100 grams', () => {
    const matched = makeMappedFood({
      label: 'Chicken breast',
      foodItemId: 1,
      isMatched: true,
    });
    const unresolved = makeMappedFood({
      label: 'Unknown sauce',
      foodItemId: null,
      isMatched: false,
    });

    expect(buildVisionReviewItems([matched, unresolved])).toEqual([
      { item: matched, selected: true, grams: 100 },
      { item: unresolved, selected: false, grams: 100 },
    ]);
  });

  it('calculates selected-only calories from grams', () => {
    const items = buildVisionReviewItems([
      makeMappedFood({
        label: 'Rice',
        foodItemId: 1,
        caloriesPer100g: 130,
        isMatched: true,
      }),
      makeMappedFood({
        label: 'Fish',
        foodItemId: 2,
        caloriesPer100g: 200,
        isMatched: true,
      }),
      makeMappedFood({
        label: 'Sauce',
        caloriesPer100g: 500,
        isMatched: false,
      }),
    ]);

    const result = calculateVisionReviewCalories([
      { ...items[0]!, grams: 150 },
      { ...items[1]!, grams: 50 },
      { ...items[2]!, selected: false, grams: 100 },
    ]);

    expect(result).toBe(295);
  });

  it('returns a save blocker when a selected item lacks a positive food item id', () => {
    const items = buildVisionReviewItems([
      makeMappedFood({
        label: 'Mapped food',
        foodItemId: 1,
        isMatched: true,
      }),
      makeMappedFood({
        label: 'Unmapped food',
        foodItemId: null,
        isMatched: false,
      }),
    ]);

    const result = getVisionReviewSaveBlocker([
      items[0]!,
      { ...items[1]!, selected: true },
    ]);

    expect(result).toBe(
      'Hãy đổi món bằng Search hoặc bỏ chọn món chưa được map.',
    );
  });

  it('clamps vision grams between 25 and 1000', () => {
    expect(clampVisionGrams(10)).toBe(25);
    expect(clampVisionGrams(1200)).toBe(1000);
  });
});
