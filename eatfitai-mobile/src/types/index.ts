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
export type NutritionSummaryDto = import('./api.d').components['schemas']['NutritionSummaryDto'];