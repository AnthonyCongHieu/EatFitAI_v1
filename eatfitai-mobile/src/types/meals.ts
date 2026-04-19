// Types cho tac vu them bua an tu AI Vision va cac API meals
// Chu thich bang tieng Viet khong dau

export interface MealItemInput {
  source?: 'catalog' | 'user';
  foodItemId?: number;
  userFoodItemId?: number;
  grams: number;
}

export interface AddMealItemsPayload {
  date: string;
  mealType: number;
  items: MealItemInput[];
}
