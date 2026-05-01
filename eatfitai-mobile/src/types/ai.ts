export interface MappedFoodItem {
  label: string;
  confidence: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;

  foodItemId?: number | null;
  userFoodItemId?: number | null;
  foodName?: string | null;
  source?: 'catalog' | 'user' | null;
  defaultGrams?: number | null;
  servingSizeGram?: number | null;
  servingUnit?: string | null;
  defaultServingUnitId?: number | null;
  defaultServingUnitName?: string | null;
  defaultServingUnitSymbol?: string | null;
  defaultPortionQuantity?: number | null;

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
  carb?: number | null; // Backend DTO dùng "Carb" không có 's'
  fat?: number | null;
  explanation?: string | null; // Lý do gợi ý từ AI
  source?: string | null;
  offlineMode?: boolean | null;
  message?: string | null;
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
  source?: string | null;
  offlineMode?: boolean | null;
  explanation?: string | null;
}

export type AiHealthState = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export interface AiHealthStatus {
  state: AiHealthState;
  providerUrl: string;
  lastCheckedAt?: string | null;
  lastHealthyAt?: string | null;
  consecutiveFailures: number;
  modelLoaded: boolean;
  geminiConfigured: boolean;
  message?: string | null;
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
