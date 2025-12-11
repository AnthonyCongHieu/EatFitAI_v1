// Service lam viec voi cac API AI (vision, recipe, nutrition)
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type {
  NutritionTargetDto,
  RecipeSuggestionApiItem,
  VisionDetectResult,
} from '../types/ai';

import { API_BASE_URL } from '../config/env';
import { getAccessTokenMem } from './authTokens';
import { tokenStorage } from './secureStore';

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
  explanation?: string;
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
  } as unknown as Blob);

  // Use fetch instead of axios for FormData to avoid boundary issues in React Native
  const token = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
  const url = `${API_BASE_URL}/api/ai/vision/detect`;

  // Only log in development mode
  if (__DEV__) {
    console.log('[aiService] detectFoodByImage calling:', url);
    console.log('[aiService] using token length:', token?.length);
    console.log('[aiService] imageUri:', imageUri);
  }

  const response = await fetch(`${API_BASE_URL}/api/ai/vision/detect`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      // DO NOT set Content-Type, let fetch/FormData handle boundary
    },
  });

  if (!response.ok) {
    const text = await response.text();
    if (__DEV__) {
      console.error('[aiService] detectFoodByImage failed:', response.status, text);
    }
    throw new Error(`Vision API failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data;
}

export async function teachLabel(req: TeachLabelRequest): Promise<void> {
  await apiClient.post('/api/ai/labels/teach', req);
}

export const aiService = {
  // DEPRECATED: Use detectFoodByImage instead
  // This method is kept for backward compatibility but should not be used
  async detectIngredients(_imageBase64: string): Promise<IngredientItem[]> {
    console.warn(
      'detectIngredients is deprecated. Use detectFoodByImage with imageUri instead.',
    );
    return [];
  },

  // Goi y cong thuc tu danh sach nguyen lieu
  async suggestRecipes(ingredients: string[]): Promise<SuggestedRecipe[]> {
    // Backend expects 'availableIngredients' not 'ingredients'
    const response = await apiClient.post<
      { recipes?: RecipeSuggestionApiItem[] } | RecipeSuggestionApiItem[]
    >('/api/ai/recipes/suggest', { availableIngredients: ingredients });
    const payload = response.data;
    const results = Array.isArray(
      (payload as { recipes?: RecipeSuggestionApiItem[] }).recipes,
    )
      ? (payload as { recipes: RecipeSuggestionApiItem[] }).recipes
      : Array.isArray(payload)
        ? payload
        : [];
    return results.map((item) => ({
      id: String(
        item?.id ?? item?.slug ?? item?.title ?? Math.random().toString(36).slice(2),
      ),
      title: item?.title ?? item?.name ?? 'Cong thuc',
      description: item?.description ?? item?.summary ?? null,
      calories: toNumber(item?.calories),
      protein: toNumber(item?.protein),
      carbs: toNumber(item?.carbs),
      fat: toNumber(item?.fat),
      ingredients: Array.isArray(item?.ingredients)
        ? item.ingredients.map((ing) => String(ing))
        : undefined,
    }));
  },

  // Lay target dinh duong hien tai (thu endpoint moi, fallback endpoint cu)
  async getCurrentNutritionTarget(): Promise<NutritionTarget | null> {
    try {
      const response = await apiClient.get<NutritionTargetDto>(
        '/api/ai/nutrition/current',
      );
      const data = response.data ?? {};
      const calories = toNumber(data.calories);
      const protein = toNumber(data.protein);
      const carbs = toNumber(data.carbs);
      const fat = toNumber(data.fat);
      if (calories == null || protein == null || carbs == null || fat == null)
        return null;
      return { calories, protein, carbs, fat };
    } catch {
      const resp = await apiClient.get<NutritionTargetDto>(
        '/api/ai/nutrition-targets/current',
      );
      const data = resp.data ?? {};
      const calories = toNumber(data.caloriesKcal ?? data.calories);
      const protein = toNumber(data.proteinGrams ?? data.protein);
      const carbs = toNumber(data.carbohydrateGrams ?? data.carbs);
      const fat = toNumber(data.fatGrams ?? data.fat);
      if (calories == null || protein == null || carbs == null || fat == null)
        return null;
      return { calories, protein, carbs, fat };
    }
  },

  // Tinh lai dựa trên profile user hiện tại
  async recalculateNutritionTarget(): Promise<NutritionTarget> {
    try {
      // Lấy profile user từ API - API giờ đã trả về đầy đủ fields
      const profileResponse = await apiClient.get<{
        currentHeightCm?: number;
        currentWeightKg?: number;
        gender?: string;
        age?: number;
        activityFactor?: number;
        goal?: string;
      }>('/api/profile');

      const profile = profileResponse.data ?? {};
      console.log('[EatFitAI] Profile for nutrition:', profile);

      // Gửi thông tin cơ thể đến AI để tính toán
      const payload = {
        sex: profile.gender || 'male',
        age: profile.age || 25,
        heightCm: profile.currentHeightCm || 170,
        weightKg: profile.currentWeightKg || 65,
        activityLevel: profile.activityFactor || 1.38,
        goal: profile.goal || 'maintain',
      };

      console.log('[EatFitAI] Nutrition suggest payload:', payload);

      const response = await apiClient.post<NutritionTargetDto>(
        '/api/ai/nutrition/suggest',
        payload,
      );
      const data = response.data ?? {};
      return {
        calories: Number(data.calories ?? 0),
        protein: Number(data.protein ?? 0),
        carbs: Number(data.carbs ?? data.carb ?? 0),
        fat: Number(data.fat ?? 0),
        explanation: data.explanation ?? undefined,
      };
    } catch (error) {
      console.log('[EatFitAI] Error in recalculateNutritionTarget:', error);
      // Fallback với giá trị mặc định
      const payload = {
        sex: 'male',
        age: 25,
        heightCm: 170,
        weightKg: 65,
        activityLevel: 1.38,
        goal: 'maintain',
      } as const;
      const response = await apiClient.post<NutritionTargetDto>(
        '/api/ai/nutrition/suggest',
        payload,
      );
      const data = response.data ?? {};
      return {
        calories: Number(data.calories ?? 0),
        protein: Number(data.protein ?? 0),
        carbs: Number(data.carbs ?? data.carb ?? 0),
        fat: Number(data.fat ?? 0),
        explanation: data.explanation ?? undefined,
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

  // ============ RECIPE SUGGESTIONS ============
  async suggestRecipesEnhanced(
    request: import('../types/aiEnhanced').RecipeSuggestionRequest,
  ): Promise<import('../types/aiEnhanced').RecipeSuggestion[]> {
    const response = await apiClient.post('/api/ai/recipes/suggest', request);
    return response.data;
  },

  async getRecipeDetail(
    recipeId: number,
  ): Promise<import('../types/aiEnhanced').RecipeDetail> {
    const response = await apiClient.get(`/api/ai/recipes/${recipeId}`);
    return response.data;
  },

  // ============ NUTRITION INSIGHTS ============
  async getNutritionInsights(
    request: import('../types/aiEnhanced').NutritionInsightRequest = {},
  ): Promise<import('../types/aiEnhanced').NutritionInsight> {
    const response = await apiClient.post('/api/ai/nutrition/insights', {
      analysisDays: request.analysisDays ?? 30,
      includeMealTiming: request.includeMealTiming ?? true,
      includeMacroAnalysis: request.includeMacroAnalysis ?? true,
    });
    return response.data;
  },

  async getAdaptiveTarget(
    request: import('../types/aiEnhanced').AdaptiveTargetRequest = {},
  ): Promise<import('../types/aiEnhanced').AdaptiveTarget> {
    const response = await apiClient.post('/api/ai/nutrition/adaptive-target', {
      analysisDays: request.analysisDays ?? 14,
      autoApply: request.autoApply ?? false,
    });
    return response.data;
  },

  async applyAdaptiveTarget(
    target: import('../types/aiEnhanced').NutritionTargetDto,
  ): Promise<void> {
    await apiClient.post('/api/ai/nutrition/apply-target', target);
  },

  // ============ VISION DETECTION ENHANCEMENTS ============
  async getDetectionHistory(
    request: import('../types/aiEnhanced').DetectionHistoryRequest = {},
  ): Promise<import('../types/aiEnhanced').DetectionHistory[]> {
    const response = await apiClient.post('/api/ai/vision/history', {
      days: request.days ?? 30,
      maxResults: request.maxResults ?? 50,
      onlyUnmapped: request.onlyUnmapped ?? false,
    });
    return response.data;
  },

  async getUnmappedLabelsStats(
    days: number = 30,
  ): Promise<import('../types/aiEnhanced').UnmappedLabelsStats> {
    const response = await apiClient.get(`/api/ai/vision/unmapped-stats?days=${days}`);
    return response.data;
  },

  async suggestFoodItemsForLabel(
    label: string,
  ): Promise<import('../types/aiEnhanced').FoodItemSuggestion[]> {
    const response = await apiClient.get(
      `/api/ai/vision/suggest-mapping/${encodeURIComponent(label)}`,
    );
    return response.data;
  },

  async teachLabelEnhanced(
    request: import('../types/aiEnhanced').EnhancedTeachLabelRequest,
  ): Promise<void> {
    await apiClient.post('/api/ai/labels/teach', request);
  },

  // ============ COOKING INSTRUCTIONS (AI GENERATED) ============
  async getCookingInstructions(
    recipeName: string,
    ingredients: { foodName: string; grams: number }[],
    description?: string,
  ): Promise<{ steps: string[]; cookingTime?: string; difficulty?: string }> {
    // Gọi AI provider trực tiếp (port 5050)
    const response = await fetch('http://10.0.2.2:5050/cooking-instructions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeName,
        ingredients,
        description: description || '',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Không thể tạo hướng dẫn nấu: ${text}`);
    }

    const data = await response.json();
    return {
      steps: data.steps || [],
      cookingTime: data.cookingTime,
      difficulty: data.difficulty,
    };
  },
};
