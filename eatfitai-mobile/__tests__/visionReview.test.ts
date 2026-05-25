import type { MappedFoodItem } from '../src/types/ai';
import {
  buildCompactVisionMealBasket,
  buildVisionReviewItems,
  calculateVisionReviewCalories,
  clampVisionGrams,
  getVisionReviewSaveBlocker,
  shouldAllowVisionQuickSave,
} from '../src/utils/visionReview';

const makeMappedFood = (
  overrides: Partial<MappedFoodItem>,
): MappedFoodItem => ({
  label: overrides.label ?? 'Food',
  confidence: overrides.confidence ?? 0.9,
  detectedLabelVi: overrides.detectedLabelVi ?? null,
  foodItemId: overrides.foodItemId ?? null,
  foodName: overrides.foodName ?? null,
  caloriesPer100g: overrides.caloriesPer100g ?? null,
  proteinPer100g: overrides.proteinPer100g ?? null,
  fatPer100g: overrides.fatPer100g ?? null,
  carbPer100g: overrides.carbPer100g ?? null,
  thumbNail: overrides.thumbNail ?? null,
  missingNutrients: overrides.missingNutrients ?? null,
  nutrientCompletenessScore: overrides.nutrientCompletenessScore ?? null,
  trustSummary: overrides.trustSummary ?? null,
  isMatched: overrides.isMatched ?? false,
});

describe('visionReview', () => {
  it('selects matched items by default and leaves unresolved items unselected at 100 grams', () => {
    const matched = makeMappedFood({
      label: 'Chicken breast',
      foodItemId: 1,
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbPer100g: 0,
      fatPer100g: 3.6,
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
        proteinPer100g: 2.7,
        carbPer100g: 28,
        fatPer100g: 0.3,
        isMatched: true,
      }),
      makeMappedFood({
        label: 'Fish',
        foodItemId: 2,
        caloriesPer100g: 200,
        proteinPer100g: 20,
        carbPer100g: 0,
        fatPer100g: 12,
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
        caloriesPer100g: 165,
        proteinPer100g: 31,
        carbPer100g: 0,
        fatPer100g: 3.6,
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
      'Cậu dùng "Tìm kiếm món" hoặc bỏ chọn món chưa rõ nha! 💚',
    );
  });

  it('clamps vision grams between 25 and 1000', () => {
    expect(clampVisionGrams(10)).toBe(25);
    expect(clampVisionGrams(1200)).toBe(1000);
  });

  it('keeps AI scan basket compact with at most three main items', () => {
    const items = [
      makeMappedFood({
        label: 'Rice',
        foodItemId: 1,
        caloriesPer100g: 130,
        proteinPer100g: 2.7,
        carbPer100g: 28,
        fatPer100g: 0.3,
        confidence: 0.96,
        isMatched: true,
      }),
      makeMappedFood({
        label: 'Chicken',
        foodItemId: 2,
        caloriesPer100g: 165,
        proteinPer100g: 31,
        carbPer100g: 0,
        fatPer100g: 3.6,
        confidence: 0.94,
        isMatched: true,
      }),
      makeMappedFood({
        label: 'Egg',
        foodItemId: 3,
        caloriesPer100g: 155,
        proteinPer100g: 13,
        carbPer100g: 1,
        fatPer100g: 11,
        confidence: 0.91,
        isMatched: true,
      }),
      makeMappedFood({
        label: 'Sauce',
        foodItemId: 4,
        caloriesPer100g: 80,
        proteinPer100g: 0,
        carbPer100g: 12,
        fatPer100g: 0,
        confidence: 0.8,
        isMatched: true,
        trustSummary: {
          status: 'needs_review',
          label: 'Cần kiểm tra',
          score: 50,
          needsReview: true,
          missingNutrients: ['protein', 'fat'],
        },
      }),
    ];

    const basket = buildCompactVisionMealBasket(items);

    expect(basket.mainItems).toHaveLength(3);
    expect(basket.needsReviewItems.map((entry) => entry.item.label)).toContain('Sauce');
  });

  it('requires review and blocks quick save for generic estimated scan items', () => {
    const item = makeMappedFood({
      label: 'canh',
      detectedLabelVi: 'Canh',
      foodItemId: 5,
      foodName: 'Canh',
      caloriesPer100g: 35,
      proteinPer100g: 1.5,
      carbPer100g: 5,
      fatPer100g: 1,
      confidence: 0.9,
      isMatched: true,
      trustSummary: {
        status: 'low_confidence',
        label: 'Ước tính',
        score: 50,
        needsReview: true,
        missingNutrients: [],
      },
    });

    expect(buildVisionReviewItems([item])[0]?.selected).toBe(true);
    expect(shouldAllowVisionQuickSave({ items: [item], unmappedLabels: [] })).toBe(false);
  });

  it('allows saving selected items with missing nutrients', () => {
    const item = makeMappedFood({
      label: 'rice',
      foodItemId: 6,
      foodName: 'Cơm trắng',
      caloriesPer100g: 130,
      proteinPer100g: 0,
      carbPer100g: 28,
      fatPer100g: 0.3,
      confidence: 0.94,
      isMatched: true,
      missingNutrients: ['protein'],
      nutrientCompletenessScore: 75,
      trustSummary: {
        status: 'needs_review',
        label: 'Cần kiểm tra',
        score: 65,
        needsReview: true,
        missingNutrients: ['protein'],
      },
    });

    const blocker = getVisionReviewSaveBlocker([{ item, selected: true, grams: 150 }]);

    expect(blocker).toBeNull();
  });
});
