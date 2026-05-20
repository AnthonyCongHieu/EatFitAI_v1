// Types cho tac vu them bua an tu AI Vision va cac API meals
// Chu thich bang tieng Viet khong dau

export interface MealItemInput {
  source?: 'catalog' | 'user';
  foodItemId?: number;
  userFoodItemId?: number;
  grams: number;
  sourceMethod?: string | null;
  inputMethod?: string | null;
  isRoughLog?: boolean | null;
  userConfirmed?: boolean | null;
  confidenceScore?: number | null;
  trustSource?: string | null;
  diaryMissingNutrients?: string[] | null;
}

export interface AddMealItemsPayload {
  date: string;
  mealType: number;
  items: MealItemInput[];
}
