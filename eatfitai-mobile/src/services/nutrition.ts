import apiClient from './apiClient';

export type NutritionSuggestRequest = {
  sex: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: number; // 1.2, 1.38, 1.55, 1.73, 1.9
  goal: 'cut' | 'maintain' | 'bulk';
};

export type NutritionSuggestResponse = {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

export async function suggestNutrition(payload: NutritionSuggestRequest) {
  const { data } = await apiClient.post<NutritionSuggestResponse>(
    '/api/ai/nutrition/suggest',
    payload
  );
  return data;
}

export async function applyNutrition(target: NutritionSuggestResponse, effectiveFrom: string | null = null) {
  await apiClient.post('/api/ai/nutrition/apply', {
    calories: target.calories,
    protein: target.protein,
    carb: target.carb,
    fat: target.fat,
    effectiveFrom,
  });
}

