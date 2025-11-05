// Re-export all API types for convenience
export * from './api.d';

// Type aliases for commonly used schemas
export type AuthResponse = import('./api.d').components['schemas']['AuthResponse'];
export type LoginRequest = import('./api.d').components['schemas']['LoginRequest'];
export type RegisterRequest = import('./api.d').components['schemas']['RegisterRequest'];
export type UserDto = import('./api.d').components['schemas']['UserDto'];
export type FoodItemDto = import('./api.d').components['schemas']['FoodItemDto'];
export type FoodServingDto = import('./api.d').components['schemas']['FoodServingDto'];
export type MealDiaryDto = import('./api.d').components['schemas']['MealDiaryDto'];
export type CreateMealDiaryRequest = import('./api.d').components['schemas']['CreateMealDiaryRequest'];
export type UpdateMealDiaryRequest = import('./api.d').components['schemas']['UpdateMealDiaryRequest'];
// Meal type constants matching backend IDs
export const MEAL_TYPES = {
  BREAKFAST: 1,
  LUNCH: 2,
  DINNER: 3,
  SNACK: 4,
} as const;

export type MealTypeId = typeof MEAL_TYPES[keyof typeof MEAL_TYPES];

export const MEAL_TYPE_LABELS: Record<MealTypeId, string> = {
  [MEAL_TYPES.BREAKFAST]: 'Bữa sáng',
  [MEAL_TYPES.LUNCH]: 'Bữa trưa',
  [MEAL_TYPES.DINNER]: 'Bữa tối',
  [MEAL_TYPES.SNACK]: 'Ăn vặt',
} as const;

export const MEAL_TYPE_NAMES: Record<MealTypeId, string> = {
  [MEAL_TYPES.BREAKFAST]: 'breakfast',
  [MEAL_TYPES.LUNCH]: 'lunch',
  [MEAL_TYPES.DINNER]: 'dinner',
  [MEAL_TYPES.SNACK]: 'snack',
} as const;
export type NutritionSummaryDto = import('./api.d').components['schemas']['NutritionSummaryDto'];