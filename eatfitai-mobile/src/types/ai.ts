export interface MappedFoodItem {
  label: string;
  confidence: number;

  foodItemId?: number | null;
  foodName?: string | null;

  caloriesPer100g?: number | null;
  proteinPer100g?: number | null;
  fatPer100g?: number | null;
  carbPer100g?: number | null;

  isMatched: boolean;
}

export interface VisionDetectResult {
  items: MappedFoodItem[];
  unmappedLabels: string[];
}

