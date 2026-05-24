import type { MappedFoodItem } from '../types/ai';
import {
  calculateVisionDefaultMacroTotals,
  buildVisionReviewItems,
  getDistinctVisionResultItems,
  getVisionQuickPortions,
  getVisionReviewSaveBlocker,
  hasUsableVisionNutrition,
  hasVisionNutritionEstimate,
  isDisplayableVisionResultItem,
  shouldAllowVisionQuickSave,
  shouldForceVisionReview,
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

  it('accepts user food items with nutrition for review saves', () => {
    const userItem = makeItem({
      source: 'user',
      foodItemId: null,
      userFoodItemId: 15,
    });

    expect(hasUsableVisionNutrition(userItem)).toBe(true);
    expect(
      getVisionReviewSaveBlocker([
        {
          item: userItem,
          selected: true,
          grams: 120,
        },
      ]),
    ).toBeNull();
  });

  it('shows detected-label-only items without treating them as usable nutrition', () => {
    const detectedOnly = makeItem({
      label: 'pho',
      detectedLabelVi: 'Phở',
      foodItemId: null,
      foodName: null,
      caloriesPer100g: null,
      proteinPer100g: null,
      carbPer100g: null,
      fatPer100g: null,
      isMatched: false,
    });

    expect(isDisplayableVisionResultItem(detectedOnly)).toBe(true);
    expect(hasUsableVisionNutrition(detectedOnly)).toBe(false);
    expect(buildVisionReviewItems([detectedOnly])[0]!.selected).toBe(false);
    expect(shouldAllowVisionQuickSave({ items: [detectedOnly], unmappedLabels: ['pho'] })).toBe(
      false,
    );
  });

  it('uses seed nutrition estimates for display without allowing quick save', () => {
    const seedEstimate = makeItem({
      label: 'com_tam',
      detectedLabelVi: 'Cơm tấm',
      foodItemId: null,
      foodName: 'Cơm tấm',
      caloriesPer100g: 165,
      proteinPer100g: 7,
      carbPer100g: 22,
      fatPer100g: 5,
      defaultGrams: 420,
      isMatched: false,
    });

    expect(isDisplayableVisionResultItem(seedEstimate)).toBe(true);
    expect(hasVisionNutritionEstimate(seedEstimate)).toBe(true);
    expect(hasUsableVisionNutrition(seedEstimate)).toBe(false);
    expect(buildVisionReviewItems([seedEstimate])[0]!.selected).toBe(false);

    const totals = calculateVisionDefaultMacroTotals([seedEstimate]);

    expect(Math.round(totals.calories)).toBe(693);
    expect(Math.round(totals.protein)).toBe(29);
    expect(Math.round(totals.carb)).toBe(92);
    expect(Math.round(totals.fat)).toBe(21);
    expect(
      getVisionReviewSaveBlocker([
        {
          item: seedEstimate,
          selected: true,
          grams: 420,
        },
      ]),
    ).toBe('Hãy đổi món bằng Search hoặc bỏ chọn món chưa được map.');
  });

  it('uses valid default grams when building review items', () => {
    const items = buildVisionReviewItems([
      makeItem({ defaultGrams: 180 }),
      makeItem({ foodItemId: 2, defaultGrams: 0 }),
    ]);

    expect(items[0]!.grams).toBe(180);
    expect(items[1]!.grams).toBe(100);
  });

  it('keeps distinct vision result items sorted by confidence', () => {
    const items = getDistinctVisionResultItems([
      makeItem({ label: 'pho', foodItemId: 1, confidence: 0.72 }),
      makeItem({ label: 'rice', foodItemId: 2, confidence: 0.91 }),
      makeItem({ label: 'pho', foodItemId: 1, confidence: 0.84 }),
      makeItem({ label: 'egg', foodItemId: null, foodName: null, confidence: 0.67, isMatched: false }),
    ]);

    expect(items.map((item) => item.label)).toEqual(['rice', 'pho', 'egg']);
    expect(items.find((item) => item.label === 'pho')?.confidence).toBe(0.84);
  });

  it('builds quick portions around the item default grams', () => {
    expect(getVisionQuickPortions(makeItem({ defaultGrams: 150 }))).toEqual([
      { label: 'Ít', grams: 75 },
      { label: 'Vừa', grams: 150 },
      { label: 'Nhiều', grams: 225 },
    ]);
  });

  it('calculates default macro totals for a multi-item meal scan', () => {
    const totals = calculateVisionDefaultMacroTotals([
      makeItem({
        label: 'rice',
        foodItemId: 1,
        caloriesPer100g: 130,
        proteinPer100g: 2.7,
        carbPer100g: 28,
        fatPer100g: 0.3,
        defaultGrams: 150,
      }),
      makeItem({
        label: 'chicken',
        foodItemId: 2,
        caloriesPer100g: 165,
        proteinPer100g: 31,
        carbPer100g: 0,
        fatPer100g: 3.6,
        defaultGrams: 100,
      }),
      makeItem({
        label: 'unknown',
        foodItemId: null,
        foodName: null,
        detectedLabelVi: null,
        caloriesPer100g: 500,
        proteinPer100g: null,
        carbPer100g: null,
        fatPer100g: null,
        defaultGrams: 50,
        isMatched: false,
      }),
    ]);

    expect(Math.round(totals.calories)).toBe(360);
    expect(Math.round(totals.protein)).toBe(35);
    expect(Math.round(totals.carb)).toBe(42);
    expect(Math.round(totals.fat)).toBe(4);
  });

  it('forces review for ambiguous or incomplete vision results', () => {
    expect(
      shouldForceVisionReview({
        items: [makeItem(), makeItem({ foodItemId: 2, confidence: 0.82 })],
        unmappedLabels: [],
      }),
    ).toBe(true);

    expect(
      shouldForceVisionReview({
        items: [makeItem({ confidence: 0.74 })],
        unmappedLabels: [],
      }),
    ).toBe(true);

    expect(
      shouldForceVisionReview({
        items: [makeItem(), makeItem({ foodItemId: 2, confidence: 0.8 })],
        unmappedLabels: [],
      }),
    ).toBe(true);

    expect(
      shouldForceVisionReview({
        items: [makeItem()],
        unmappedLabels: ['unknown'],
      }),
    ).toBe(true);

    expect(
      shouldForceVisionReview({
        items: [makeItem({ caloriesPer100g: 0, proteinPer100g: 0 })],
        unmappedLabels: [],
      }),
    ).toBe(true);
  });

  it('allows quick save only for a single confident usable match', () => {
    expect(
      shouldAllowVisionQuickSave({
        items: [makeItem({ confidence: 0.9 })],
        unmappedLabels: [],
      }),
    ).toBe(true);

    expect(
      shouldAllowVisionQuickSave({
        items: [makeItem({ confidence: 0.74 })],
        unmappedLabels: [],
      }),
    ).toBe(false);
  });
});
