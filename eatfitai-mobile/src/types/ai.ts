export interface MappedFoodItem {
  label: string;
  confidence: number;

  foodItemId?: number | null;
  foodName?: string | null;

  caloriesPer100g?: number | null;
  proteinPer100g?: number | null;
  fatPer100g?: number | null;
  carbPer100g?: number | null;
  thumbNail?: string | null;

  isMatched: boolean;
}

export interface VisionDetectResult {
  items: MappedFoodItem[];
  unmappedLabels: string[];
}

export interface NutritionTargetDto {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  caloriesKcal?: number | null;
  proteinGrams?: number | null;
  carbohydrateGrams?: number | null;
  fatGrams?: number | null;
}

export interface NutritionTargetResponse {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface RecipeSuggestionApiItem {
  id?: string | number;
  slug?: string;
  title?: string;
  name?: string;
  description?: string | null;
  summary?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  ingredients?: (string | number)[];
}
