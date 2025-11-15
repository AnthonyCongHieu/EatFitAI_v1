// Service lam viec voi cac API AI (vision, recipe, nutrition)
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { VisionDetectResult } from '../types/ai';

export type IngredientItem = {
  name: string;
  confidence?: number | null;
};

export type SuggestedRecipe = {
  id: string;
  title: string;
  description?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  ingredients?: string[];
};

export type NutritionTarget = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export interface TeachLabelRequest {
  label: string;
  foodItemId: number;
  minConfidence?: number;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export async function detectFoodByImage(imageUri: string): Promise<VisionDetectResult> {
  const formData = new FormData();

  formData.append('file', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any);

  const response = await apiClient.post<VisionDetectResult>('/api/ai/vision/detect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function teachLabel(req: TeachLabelRequest): Promise<void> {
  await apiClient.post('/api/ai/labels/teach', req);
}

export const aiService = {
  // Gui anh (base64) de nhan dien nguyen lieu
  async detectIngredients(imageBase64: string): Promise<IngredientItem[]> {
    const response = await apiClient.post('/api/ai/vision/ingredients', { imageBase64 });
    const results = Array.isArray(response.data?.ingredients)
      ? response.data.ingredients
      : Array.isArray(response.data)
      ? response.data
      : [];
    return results.map((item: any) => ({
      name: String(item?.name ?? item ?? 'Unknown'),
      confidence: toNumber(item?.confidence ?? item?.score),
    }));
  },

  // Goi y cong thuc tu danh sach nguyen lieu
  async suggestRecipes(ingredients: string[]): Promise<SuggestedRecipe[]> {
    const response = await apiClient.post('/api/ai/recipes/suggest', { ingredients });
    const results = Array.isArray(response.data?.recipes)
      ? response.data.recipes
      : Array.isArray(response.data)
      ? response.data
      : [];
    return results.map((item: any) => ({
      id: String(item?.id ?? item?.slug ?? item?.title ?? Math.random().toString(36).slice(2)),
      title: item?.title ?? item?.name ?? 'Cong thuc',
      description: item?.description ?? item?.summary ?? null,
      calories: toNumber(item?.calories),
      protein: toNumber(item?.protein),
      carbs: toNumber(item?.carbs),
      fat: toNumber(item?.fat),
      ingredients: Array.isArray(item?.ingredients) ? item.ingredients.map((ing: any) => String(ing)) : undefined,
    }));
  },

  // Lay target dinh duong hien tai (thu endpoint moi, fallback endpoint cu)
  async getCurrentNutritionTarget(): Promise<NutritionTarget | null> {
    try {
      const response = await apiClient.get('/api/ai/nutrition/current');
      const data = response.data ?? {};
      const calories = toNumber((data as any)?.calories);
      const protein = toNumber((data as any)?.protein);
      const carbs = toNumber((data as any)?.carbs);
      const fat = toNumber((data as any)?.fat);
      if (calories == null || protein == null || carbs == null || fat == null) return null;
      return { calories, protein, carbs, fat };
    } catch {
      const resp = await apiClient.get('/api/ai/nutrition-targets/current');
      const data = resp.data ?? ({} as any);
      const calories = toNumber((data as any)?.caloriesKcal ?? (data as any)?.calories);
      const protein = toNumber((data as any)?.proteinGrams ?? (data as any)?.protein);
      const carbs = toNumber((data as any)?.carbohydrateGrams ?? (data as any)?.carbs);
      const fat = toNumber((data as any)?.fatGrams ?? (data as any)?.fat);
      if (calories == null || protein == null || carbs == null || fat == null) return null;
      return { calories, protein, carbs, fat };
    }
  },

  // Tinh lai nhanh: POST {} tranh 415, fallback sang suggest default
  async recalculateNutritionTarget(): Promise<NutritionTarget> {
    try {
      const response = await apiClient.post('/api/ai/nutrition/recalculate', {});
      const data = response.data ?? {};
      return {
        calories: Number((data as any)?.calories ?? 0),
        protein: Number((data as any)?.protein ?? 0),
        carbs: Number((data as any)?.carbs ?? (data as any)?.carb ?? 0),
        fat: Number((data as any)?.fat ?? 0),
      };
    } catch {
      const payload = { sex: 'male', age: 25, heightCm: 170, weightKg: 65, activityLevel: 1.38, goal: 'maintain' } as const;
      const response = await apiClient.post('/api/ai/nutrition/suggest', payload);
      const data = response.data ?? {};
      return {
        calories: Number((data as any)?.calories ?? 0),
        protein: Number((data as any)?.protein ?? 0),
        carbs: Number((data as any)?.carbs ?? (data as any)?.carb ?? 0),
        fat: Number((data as any)?.fat ?? 0),
      };
    }
  },

  // Ap dung target moi (thu route moi, fallback route cu)
  async applyNutritionTarget(target: NutritionTarget): Promise<void> {
    try {
      await apiClient.post('/api/ai/nutrition/apply', {
        calories: target.calories,
        protein: target.protein,
        carb: target.carbs,
        fat: target.fat,
        effectiveFrom: null,
      });
    } catch {
      await apiClient.post('/api/ai/nutrition-targets', {
        caloriesKcal: target.calories,
        proteinGrams: target.protein,
        carbohydrateGrams: target.carbs,
        fatGrams: target.fat,
      });
    }
  },

  async detectFoodByImage(imageUri: string): Promise<VisionDetectResult> {
    return detectFoodByImage(imageUri);
  },

  async teachLabel(req: TeachLabelRequest): Promise<void> {
    await teachLabel(req);
  },
};


