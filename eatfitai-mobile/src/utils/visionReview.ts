import type { MappedFoodItem } from '../types/ai';

export type VisionReviewItem = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
};

export type CompactVisionMealBasket = {
  mainItems: VisionReviewItem[];
  needsReviewItems: VisionReviewItem[];
  hiddenItemCount: number;
};

const hasVisionFoodSource = (item: MappedFoodItem): boolean =>
  (item.foodItemId ?? 0) > 0 || (item.userFoodItemId ?? 0) > 0;

const hasRecognizedVisionFood = (item: MappedFoodItem): boolean =>
  hasVisionFoodSource(item) ||
  Boolean(item.isMatched || item.foodName || item.detectedLabelVi);

const hasTrustedVisionNutrition = (item: MappedFoodItem): boolean =>
  !item.trustSummary?.needsReview &&
  !((item.missingNutrients ?? []).length > 0) &&
  (item.nutrientCompletenessScore ?? 100) >= 100;

export const hasVisionNutritionEstimate = (item: MappedFoodItem): boolean =>
  hasRecognizedVisionFood(item) &&
  (item.caloriesPer100g ?? 0) > 0 &&
  (item.proteinPer100g ?? 0) >= 0 &&
  (item.carbPer100g ?? 0) >= 0 &&
  (item.fatPer100g ?? 0) >= 0 &&
  ((item.proteinPer100g ?? 0) > 0 ||
    (item.carbPer100g ?? 0) > 0 ||
    (item.fatPer100g ?? 0) > 0);

export const hasUsableVisionNutrition = (item: MappedFoodItem): boolean =>
  hasVisionFoodSource(item) &&
  hasTrustedVisionNutrition(item) &&
  hasVisionNutritionEstimate(item);

export const isDisplayableVisionResultItem = (item: MappedFoodItem): boolean =>
  hasVisionNutritionEstimate(item) ||
  Boolean(
    item.isMatched ||
      item.foodItemId ||
      item.userFoodItemId ||
      item.foodName ||
      item.detectedLabelVi,
  ) ||
  (item.confidence ?? 0) > 0.4;

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

const getVisionResultIdentity = (item: MappedFoodItem): string => {
  const userFoodItemId = Number(item.userFoodItemId);
  if (Number.isFinite(userFoodItemId) && userFoodItemId > 0) {
    return `user:${userFoodItemId}`;
  }

  const foodItemId = Number(item.foodItemId);
  if (Number.isFinite(foodItemId) && foodItemId > 0) {
    return `catalog:${foodItemId}`;
  }

  return `label:${String(item.label ?? '').trim().toLowerCase()}`;
};

export const getDistinctVisionResultItems = (
  items: MappedFoodItem[],
): MappedFoodItem[] => {
  const bestByIdentity = new Map<string, MappedFoodItem>();

  for (const item of items) {
    const identity = getVisionResultIdentity(item);
    const existing = bestByIdentity.get(identity);
    if (!existing || (item.confidence ?? 0) > (existing.confidence ?? 0)) {
      bestByIdentity.set(identity, item);
    }
  }

  return [...bestByIdentity.values()].sort(
    (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
  );
};

export const buildCompactVisionMealBasket = (
  items: MappedFoodItem[],
  maxMainItems = 3,
): CompactVisionMealBasket => {
  const reviewItems = buildVisionReviewItems(
    [...items].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)),
  );
  const mainItems = reviewItems
    .filter((reviewItem) => reviewItem.selected && !reviewItem.item.trustSummary?.needsReview)
    .slice(0, maxMainItems);
  const mainKeys = new Set(
    mainItems.map((reviewItem) => `${reviewItem.item.foodItemId ?? reviewItem.item.label}`),
  );
  const needsReviewItems = reviewItems.filter((reviewItem) => {
    const key = `${reviewItem.item.foodItemId ?? reviewItem.item.label}`;
    return !mainKeys.has(key);
  });

  return {
    mainItems,
    needsReviewItems,
    hiddenItemCount: Math.max(0, reviewItems.length - mainItems.length - needsReviewItems.length),
  };
};

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

export type VisionMacroTotals = {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

const hasVisionMacroEstimate = (item: MappedFoodItem): boolean =>
  hasVisionNutritionEstimate(item);

export const calculateVisionDefaultMacroTotals = (
  items: MappedFoodItem[],
): VisionMacroTotals =>
  items.reduce<VisionMacroTotals>(
    (total, item) => {
      if (!hasVisionMacroEstimate(item)) {
        return total;
      }

      const ratio = getDefaultVisionGrams(item) / 100;
      return {
        calories: total.calories + (item.caloriesPer100g ?? 0) * ratio,
        protein: total.protein + (item.proteinPer100g ?? 0) * ratio,
        carb: total.carb + (item.carbPer100g ?? 0) * ratio,
        fat: total.fat + (item.fatPer100g ?? 0) * ratio,
      };
    },
    { calories: 0, protein: 0, carb: 0, fat: 0 },
  );

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
    return 'Món đã chọn chưa có dữ liệu dinh dưỡng đủ tin cậy. Hãy đổi món bằng Search hoặc bỏ chọn món đó.';
  }

  return null;
};
