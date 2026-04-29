import type { MappedFoodItem } from '../types/ai';

export type VisionReviewItem = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
};

export const hasUsableVisionNutrition = (item: MappedFoodItem): boolean =>
  (item.foodItemId ?? 0) > 0 &&
  (item.caloriesPer100g ?? 0) > 0 &&
  (item.proteinPer100g ?? 0) >= 0 &&
  (item.carbPer100g ?? 0) >= 0 &&
  (item.fatPer100g ?? 0) >= 0 &&
  ((item.proteinPer100g ?? 0) > 0 ||
    (item.carbPer100g ?? 0) > 0 ||
    (item.fatPer100g ?? 0) > 0);

export const buildVisionReviewItems = (
  items: MappedFoodItem[],
): VisionReviewItem[] =>
  items.map((item) => ({
    item,
    selected: item.isMatched && hasUsableVisionNutrition(item),
    grams: 100,
  }));

export const clampVisionGrams = (grams: number): number =>
  Math.min(1000, Math.max(25, grams));

export const calculateVisionReviewCalories = (
  items: VisionReviewItem[],
): number =>
  items.reduce((total, reviewItem) => {
    if (!reviewItem.selected) {
      return total;
    }

    return (
      total +
      ((reviewItem.item.caloriesPer100g ?? 0) * reviewItem.grams) / 100
    );
  }, 0);

export const getVisionReviewSaveBlocker = (
  items: VisionReviewItem[],
): string | null => {
  const hasUnmappedSelectedItem = items.some(
    (reviewItem) =>
      reviewItem.selected && (reviewItem.item.foodItemId ?? 0) <= 0,
  );

  if (hasUnmappedSelectedItem) {
    return 'Hãy đổi món bằng Search hoặc bỏ chọn món chưa được map.';
  }

  const hasInvalidNutrition = items.some(
    (reviewItem) =>
      reviewItem.selected && !hasUsableVisionNutrition(reviewItem.item),
  );

  if (hasInvalidNutrition) {
    return 'M\u00f3n \u0111\u00e3 ch\u1ecdn ch\u01b0a c\u00f3 d\u1eef li\u1ec7u dinh d\u01b0\u1ee1ng h\u1ee3p l\u1ec7. H\u00e3y \u0111\u1ed5i m\u00f3n b\u1eb1ng Search.';
  }

  return null;
};
