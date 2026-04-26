import type { MappedFoodItem } from '../types/ai';

export type VisionReviewItem = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
};

export const buildVisionReviewItems = (
  items: MappedFoodItem[],
): VisionReviewItem[] =>
  items.map((item) => ({
    item,
    selected: item.isMatched,
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

  return null;
};
