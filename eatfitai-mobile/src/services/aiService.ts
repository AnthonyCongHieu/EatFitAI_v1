// Service lam viec voi cac API AI (vision, recipe, nutrition)
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';

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

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const aiService = {
  // Gui anh (base64) de nhan dien nguyen lieu
  async detectIngredients(imageBase64: string): Promise<IngredientItem[]> {
    const response = await apiClient.post('/api/ai/vision/ingredients', {
      imageBase64,
    });

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
    const response = await apiClient.post('/api/ai/recipes/suggest', {
      ingredients,
    });

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
      ingredients: Array.isArray(item?.ingredients)
        ? item.ingredients.map((ing: any) => String(ing))
        : undefined,
    }));
  },

  // Lay target dinh duong hien tai (neu backend ho tro)
  async getCurrentNutritionTarget(): Promise<NutritionTarget | null> {
    const response = await apiClient.get('/api/nutrition-targets/me');
    const data = response.data ?? {};
    const calories = toNumber(data?.calories);
    const protein = toNumber(data?.protein);
    const carbs = toNumber(data?.carbs);
    const fat = toNumber(data?.fat);

    if (calories == null || protein == null || carbs == null || fat == null) {
      return null;
    }

    return {
      calories,
      protein,
      carbs,
      fat,
    };
  },

  // Goi AI tinh lai target
  async recalculateNutritionTarget(): Promise<NutritionTarget> {
    const response = await apiClient.post('/api/ai/nutrition/recalculate');
    const data = response.data ?? {};
    return {
      calories: Number(data?.calories ?? 0),
      protein: Number(data?.protein ?? 0),
      carbs: Number(data?.carbs ?? 0),
      fat: Number(data?.fat ?? 0),
    };
  },

  // Ap dung target moi
  async applyNutritionTarget(target: NutritionTarget): Promise<void> {
    await apiClient.post('/api/nutrition-targets', target);
  },
};

