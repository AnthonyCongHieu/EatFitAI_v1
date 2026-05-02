import type { MappedFoodItem } from '../types/ai';

export type VisionReviewItem = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
};

const hasVisionFoodSource = (item: MappedFoodItem): boolean =>
  (item.foodItemId ?? 0) > 0 || (item.userFoodItemId ?? 0) > 0;

export const hasUsableVisionNutrition = (item: MappedFoodItem): boolean =>
  hasVisionFoodSource(item) &&
  (item.caloriesPer100g ?? 0) > 0 &&
  (item.proteinPer100g ?? 0) >= 0 &&
  (item.carbPer100g ?? 0) >= 0 &&
  (item.fatPer100g ?? 0) >= 0 &&
  ((item.proteinPer100g ?? 0) > 0 ||
    (item.carbPer100g ?? 0) > 0 ||
    (item.fatPer100g ?? 0) > 0);

export const clampVisionGrams = (grams: number): number =>
  Math.min(1000, Math.max(25, grams));

export const getDefaultVisionGrams = (item?: MappedFoodItem | null): number => {
  const defaultGrams = Number(item?.defaultGrams);
  if (Number.isFinite(defaultGrams) && defaultGrams > 0) {
    return clampVisionGrams(Math.round(defaultGrams));
  }

  return 100;
};

export const buildVisionReviewItems = (
  items: MappedFoodItem[],
): VisionReviewItem[] =>
  items.map((item) => ({
    item,
    selected: item.isMatched && hasUsableVisionNutrition(item),
    grams: getDefaultVisionGrams(item),
  }));

export type VisionQuickPortion = {
  label: 'Ít' | 'Vừa' | 'Nhiều';
  grams: number;
};

export const getVisionQuickPortions = (
  item?: MappedFoodItem | null,
): VisionQuickPortion[] => {
  const base = getDefaultVisionGrams(item);
  const portions: VisionQuickPortion[] = [
    { label: 'Ít', grams: clampVisionGrams(Math.round(base * 0.5)) },
    { label: 'Vừa', grams: base },
    { label: 'Nhiều', grams: clampVisionGrams(Math.round(base * 1.5)) },
  ];

  const seen = new Set<number>();
  return portions.filter((portion) => {
    if (seen.has(portion.grams)) {
      return false;
    }
    seen.add(portion.grams);
    return true;
  });
};

export const shouldForceVisionReview = (result: {
  items: MappedFoodItem[];
  unmappedLabels?: string[] | null;
}): boolean => {
  const items = result.items ?? [];
  const sortedItems = [...items].sort((a, b) => b.confidence - a.confidence);
  const usableItems = items.filter(hasUsableVisionNutrition);
  const hasMissingNutrition = items.some(
    (item) =>
      Boolean(
        item.isMatched ||
          item.foodItemId ||
          item.userFoodItemId ||
          item.foodName ||
          item.source,
      ) &&
      !hasUsableVisionNutrition(item),
  );

  if (usableItems.length !== 1) {
    return true;
  }

  if ((result.unmappedLabels ?? []).length > 0) {
    return true;
  }

  if ((sortedItems[0]?.confidence ?? 0) < 0.75) {
    return true;
  }

  if (
    sortedItems.length > 1 &&
    (sortedItems[0]!.confidence ?? 0) - (sortedItems[1]!.confidence ?? 0) < 0.15
  ) {
    return true;
  }

  return hasMissingNutrition;
};

export const shouldAllowVisionQuickSave = (result: {
  items: MappedFoodItem[];
  unmappedLabels?: string[] | null;
}): boolean => !shouldForceVisionReview(result);

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
      reviewItem.selected && !hasVisionFoodSource(reviewItem.item),
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
