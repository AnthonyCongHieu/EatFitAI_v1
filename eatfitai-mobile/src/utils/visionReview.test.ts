import type { MappedFoodItem } from '../types/ai';
import {
  buildVisionReviewItems,
  getVisionQuickPortions,
  getVisionReviewSaveBlocker,
  hasUsableVisionNutrition,
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

  it('uses valid default grams when building review items', () => {
    const items = buildVisionReviewItems([
      makeItem({ defaultGrams: 180 }),
      makeItem({ foodItemId: 2, defaultGrams: 0 }),
    ]);

    expect(items[0]!.grams).toBe(180);
    expect(items[1]!.grams).toBe(100);
  });

  it('builds quick portions around the item default grams', () => {
    expect(getVisionQuickPortions(makeItem({ defaultGrams: 150 }))).toEqual([
      { label: 'Ít', grams: 75 },
      { label: 'Vừa', grams: 150 },
      { label: 'Nhiều', grams: 225 },
    ]);
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
