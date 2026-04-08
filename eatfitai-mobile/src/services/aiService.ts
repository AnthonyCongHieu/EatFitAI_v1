import apiClient, { aiApiClient, getCurrentApiUrl } from './apiClient';
import type {
  AiHealthStatus,
  MappedFoodItem,
  NutritionTargetDto,
  RecipeSuggestionApiItem,
  VisionDetectResult,
} from '../types/ai';
import type { AdaptiveTarget, NutritionInsight } from '../types/aiEnhanced';

import { API_BASE_URL, assertBackendApiBaseUrl } from '../config/env';
import { getAccessTokenMem } from './authTokens';
import { tokenStorage } from './secureStore';
import { sanitizeFoodImageUrl } from '../utils/imageHelpers';

const getApiBaseUrl = (): string => {
  const baseUrl = getCurrentApiUrl() ?? API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL before using AI services.',
    );
  }

  return assertBackendApiBaseUrl(baseUrl, 'AI API base URL');
};

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
  detectedConfidence?: number;
  selectedFoodName?: string;
  source?: string;
  clientTimestamp?: string;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const toNumberOr = (value: unknown, fallback: number): number => toNumber(value) ?? fallback;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

type AiOfflineError = Error & {
  isAiOffline?: boolean;
  status?: number;
};

const isHttpError = (
  error: unknown,
): error is { response?: { status?: number; data?: unknown } } =>
  typeof error === 'object' && error !== null && 'response' in error;

const isOfflineMessage = (message: string | undefined): boolean => {
  if (!message) return false;

  const normalized = message.toLowerCase();
  return [
    'network error',
    'network request failed',
    'failed to fetch',
    'service unavailable',
    'connection refused',
    'timeout',
    'vision api failed: 502',
    'vision api failed: 503',
    'vision api failed: 504',
  ].some((keyword) => normalized.includes(keyword));
};

export const isAiOfflineError = (error: unknown): boolean => {
  const directStatus = Number((error as { status?: number } | null)?.status ?? 0);
  const status = isHttpError(error)
    ? Number(error.response?.status ?? directStatus)
    : directStatus;

  if ([502, 503, 504].includes(status)) return true;

  if (status === 500) {
    const errorBody = isHttpError(error) ? JSON.stringify(error.response?.data ?? '') : '';
    const normalizedBody = errorBody.toLowerCase();
    if (
      normalizedBody.includes('ai provider') ||
      normalizedBody.includes('ollama') ||
      normalizedBody.includes('openai') ||
      normalizedBody.includes('connection refused') ||
      normalizedBody.includes('service unavailable')
    ) {
      return true;
    }
  }

  const maybeError = error as { message?: string; isAiOffline?: boolean } | null;
  return Boolean(maybeError?.isAiOffline) || isOfflineMessage(maybeError?.message);
};

const toAiOfflineError = (error: unknown, message: string): AiOfflineError => {
  if (error instanceof Error) {
    const tagged = error as AiOfflineError;
    tagged.isAiOffline = true;
    tagged.message = message;
    if (isHttpError(error)) {
      tagged.status = Number(error.response?.status ?? 0);
    }
    return tagged;
  }

  const tagged = new Error(message) as AiOfflineError;
  tagged.isAiOffline = true;
  if (isHttpError(error)) {
    tagged.status = Number(error.response?.status ?? 0);
  }
  return tagged;
};

const normalizeMappedFoodItem = (item: any): MappedFoodItem => ({
  label: String(item?.label ?? 'unknown'),
  confidence: clamp(toNumber(item?.confidence) ?? 0, 0, 1),
  foodItemId: toNumber(item?.foodItemId),
  foodName: item?.foodName ? String(item.foodName) : null,
  caloriesPer100g: toNumber(item?.caloriesPer100g),
  proteinPer100g: toNumber(item?.proteinPer100g),
  fatPer100g: toNumber(item?.fatPer100g),
  carbPer100g: toNumber(item?.carbPer100g),
  thumbNail: sanitizeFoodImageUrl(item?.thumbNail ? String(item.thumbNail) : null),
  isMatched: Boolean(item?.isMatched ?? item?.foodItemId ?? item?.foodName),
});

const normalizeVisionResult = (data: any): VisionDetectResult => ({
  items: Array.isArray(data?.items) ? data.items.map(normalizeMappedFoodItem) : [],
  unmappedLabels: Array.isArray(data?.unmappedLabels)
    ? data.unmappedLabels.map((label: unknown) => String(label))
    : [],
});

const normalizeNutritionInsight = (data: any): NutritionInsight => ({
  adherenceScore: clamp(toNumberOr(data?.adherenceScore, 0), 0, 100),
  averageDailyCalories: toNumberOr(data?.averageDailyCalories, 0),
  averageDailyProtein: toNumberOr(data?.averageDailyProtein, 0),
  averageDailyCarbs: toNumberOr(data?.averageDailyCarbs, 0),
  averageDailyFat: toNumberOr(data?.averageDailyFat, 0),
  currentTarget: {
    targetCalories: toNumberOr(data?.currentTarget?.targetCalories, 2000),
    targetProtein: toNumberOr(data?.currentTarget?.targetProtein, 150),
    targetCarbs: toNumberOr(data?.currentTarget?.targetCarbs, 200),
    targetFat: toNumberOr(data?.currentTarget?.targetFat, 60),
  },
  recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
  mealTimingInsight: data?.mealTimingInsight,
  macroDistributionInsight: data?.macroDistributionInsight,
  progressTrend:
    data?.progressTrend === 'improving' ||
    data?.progressTrend === 'stable' ||
    data?.progressTrend === 'declining' ||
    data?.progressTrend === 'insufficient_data'
      ? data.progressTrend
      : 'insufficient_data',
  daysAnalyzed: toNumberOr(data?.daysAnalyzed, 0),
});

const normalizeAdaptiveTarget = (data: any): AdaptiveTarget => ({
  currentTarget: {
    targetCalories: toNumberOr(data?.currentTarget?.targetCalories, 2000),
    targetProtein: toNumberOr(data?.currentTarget?.targetProtein, 150),
    targetCarbs: toNumberOr(data?.currentTarget?.targetCarbs, 200),
    targetFat: toNumberOr(data?.currentTarget?.targetFat, 60),
  },
  suggestedTarget: {
    targetCalories: toNumberOr(data?.suggestedTarget?.targetCalories, 2000),
    targetProtein: toNumberOr(data?.suggestedTarget?.targetProtein, 150),
    targetCarbs: toNumberOr(data?.suggestedTarget?.targetCarbs, 200),
    targetFat: toNumberOr(data?.suggestedTarget?.targetFat, 60),
  },
  adjustmentReasons: Array.isArray(data?.adjustmentReasons)
    ? data.adjustmentReasons.map((reason: unknown) => String(reason))
    : [],
  confidenceScore: clamp(toNumberOr(data?.confidenceScore, 0), 0, 100),
  applied: Boolean(data?.applied),
});

const normalizeAiHealthStatus = (data: any): AiHealthStatus => {
  const rawState =
    typeof data?.state === 'string' ? data.state.toUpperCase() : 'DEGRADED';
  const state: AiHealthStatus['state'] =
    rawState === 'HEALTHY' || rawState === 'DOWN' || rawState === 'DEGRADED'
      ? rawState
      : 'DEGRADED';

  return {
    state,
    providerUrl: typeof data?.providerUrl === 'string' ? data.providerUrl : '',
    lastCheckedAt:
      typeof data?.lastCheckedAt === 'string' ? data.lastCheckedAt : null,
    lastHealthyAt:
      typeof data?.lastHealthyAt === 'string' ? data.lastHealthyAt : null,
    consecutiveFailures: toNumberOr(data?.consecutiveFailures, 0),
    modelLoaded: Boolean(data?.modelLoaded),
    geminiConfigured: Boolean(data?.geminiConfigured),
    message: typeof data?.message === 'string' ? data.message : null,
  };
};

const buildNutritionPayload = (profile: {
  currentHeightCm?: number;
  currentWeightKg?: number;
  gender?: string;
  age?: number;
  activityFactor?: number;
  goal?: string;
}) => ({
  sex: profile.gender || 'male',
  age: profile.age || 25,
  heightCm: profile.currentHeightCm || 170,
  weightKg: profile.currentWeightKg || 65,
  activityLevel: profile.activityFactor || 1.38,
  goal: profile.goal || 'maintain',
});

const buildLocalNutritionTarget = (
  payload: ReturnType<typeof buildNutritionPayload>,
): NutritionTarget => {
  const isFemale = String(payload.sex).toLowerCase() === 'female';
  const baseBmr =
    10 * payload.weightKg + 6.25 * payload.heightCm - 5 * payload.age + (isFemale ? -161 : 5);
  const maintenanceCalories = baseBmr * payload.activityLevel;
  const goalAdjustment =
    payload.goal === 'lose' || payload.goal === 'lose_weight'
      ? -300
      : payload.goal === 'gain' || payload.goal === 'gain_muscle'
        ? 250
        : 0;
  const calories = Math.max(1200, Math.round(maintenanceCalories + goalAdjustment));
  const proteinMultiplier =
    payload.goal === 'gain' || payload.goal === 'gain_muscle'
      ? 2
      : payload.goal === 'lose' || payload.goal === 'lose_weight'
        ? 1.8
        : 1.6;
  const protein = Math.max(60, Math.round(payload.weightKg * proteinMultiplier));
  const fat = Math.max(40, Math.round(payload.weightKg * 0.8));
  const remainingCalories = Math.max(200, calories - protein * 4 - fat * 9);
  const carbs = Math.max(80, Math.round(remainingCalories / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    explanation:
      'AI tạm offline. Đây là mục tiêu ước tính từ profile hiện tại, bạn có thể sửa thủ công nếu cần.',
  };
};

const buildFallbackCookingInstructions = (
  recipeName: string,
  ingredients: { foodName: string; grams: number }[],
): { steps: string[]; cookingTime?: string; difficulty?: string } => {
  const ingredientNames = ingredients
    .map((item) => item.foodName)
    .filter(Boolean)
    .slice(0, 4);
  const ingredientText =
    ingredientNames.length > 0 ? ingredientNames.join(', ') : 'các nguyên liệu đã chuẩn bị';

  return {
    steps: [
      `Sơ chế và cân định lượng ${ingredientText}.`,
      `Làm nóng chảo hoặc nồi, sau đó cho nguyên liệu vào theo thứ tự để nấu món ${recipeName}.`,
      'Nếm lại vừa ăn, đảo đều đến khi món ăn đạt độ chín mong muốn.',
      'Trình bày ra đĩa và thưởng thức khi còn nóng.',
    ],
    cookingTime: '15-20 phút',
    difficulty: 'Dễ',
  };
};

export async function detectFoodByImage(imageUri: string): Promise<VisionDetectResult> {
  try {
    const formData = new FormData();

    formData.append('file', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    const token = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/ai/vision/detect`;

    if (__DEV__) {
      console.log('[aiService] detectFoodByImage calling:', url);
      console.log('[aiService] using token length:', token?.length);
      console.log('[aiService] imageUri:', imageUri);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      if (__DEV__) {
        console.error('[aiService] detectFoodByImage failed:', response.status, text);
      }

      const httpError = new Error(`Vision API failed: ${response.status} ${text}`) as AiOfflineError;
      httpError.status = response.status;
      if ([502, 503, 504].includes(response.status)) {
        throw toAiOfflineError(
          httpError,
          'AI tạm offline. Bạn có thể thử lại hoặc tìm món thủ công.',
        );
      }
      throw httpError;
    }

    const data = await response.json();
    return normalizeVisionResult(data);
  } catch (error) {
    if (isAiOfflineError(error)) {
      throw toAiOfflineError(
        error,
        'AI tạm offline. Bạn có thể thử lại hoặc tìm món thủ công.',
      );
    }

    throw error;
  }
}

export async function teachLabel(req: TeachLabelRequest): Promise<void> {
  await apiClient.post('/api/ai/labels/teach', req);
}

export const aiService = {
  async getAiStatus(): Promise<AiHealthStatus> {
    try {
      const response = await apiClient.get('/api/ai/status');
      return normalizeAiHealthStatus(response.data);
    } catch (error) {
      console.log('[EatFitAI] Error fetching AI status:', error);
      return {
        state: 'DOWN',
        providerUrl: '',
        lastCheckedAt: null,
        lastHealthyAt: null,
        consecutiveFailures: 0,
        modelLoaded: false,
        geminiConfigured: false,
        message: 'Không thể kiểm tra trạng thái AI.',
      };
    }
  },

  async detectIngredients(_imageBase64: string): Promise<IngredientItem[]> {
    console.warn(
      'detectIngredients is deprecated. Use detectFoodByImage with imageUri instead.',
    );
    return [];
  },

  async suggestRecipes(ingredients: string[]): Promise<SuggestedRecipe[]> {
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
      title: item?.title ?? item?.name ?? 'Công thức',
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

  async getCurrentNutritionTarget(): Promise<NutritionTarget> {
    const defaults: NutritionTarget = { calories: 2000, protein: 50, carbs: 250, fat: 65 };
    try {
      const response = await apiClient.get<NutritionTargetDto>('/api/ai/nutrition-targets/current');
      const data = response.data ?? {};

      const calories = toNumber(data.caloriesKcal ?? data.calories);
      const protein = toNumber(data.proteinGrams ?? data.protein);
      const carbs = toNumber(data.carbohydrateGrams ?? data.carbs);
      const fat = toNumber(data.fatGrams ?? data.fat);

      if (calories == null || protein == null || carbs == null || fat == null) {
        console.warn('[EatFitAI] Nutrition target has null values, using defaults:', data);
        return defaults;
      }
      return { calories, protein, carbs, fat };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          console.log('[EatFitAI] No nutrition target found for user (404), using defaults');
          return defaults;
        }
      }
      console.error('[EatFitAI] Error fetching nutrition target, using defaults:', error);
      return defaults;
    }
  },

  async recalculateNutritionTarget(): Promise<NutritionTarget> {
    let profile: {
      currentHeightCm?: number;
      currentWeightKg?: number;
      gender?: string;
      age?: number;
      activityFactor?: number;
      goal?: string;
    } = {};

    try {
      const profileResponse = await apiClient.get<typeof profile>('/api/profile');
      profile = profileResponse.data ?? {};
      console.log('[EatFitAI] Profile for nutrition:', profile);
    } catch (profileError) {
      console.log('[EatFitAI] Error loading profile for nutrition:', profileError);
    }

    const payload = buildNutritionPayload(profile);

    try {
      console.log('[EatFitAI] Nutrition suggest payload:', payload);
      const response = await aiApiClient.post<NutritionTargetDto>(
        '/api/ai/nutrition/recalculate',
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
      return buildLocalNutritionTarget(payload);
    }
  },

  async applyNutritionTarget(target: NutritionTarget): Promise<void> {
    try {
      await apiClient.post('/api/ai/nutrition/apply-target', {
        targetCalories: target.calories,
        targetProtein: target.protein,
        targetCarbs: target.carbs,
        targetFat: target.fat,
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

  async getNutritionInsights(
    request: import('../types/aiEnhanced').NutritionInsightRequest = {},
  ): Promise<import('../types/aiEnhanced').NutritionInsight> {
    try {
      const response = await apiClient.post('/api/ai/nutrition/insights', {
        analysisDays: request.analysisDays ?? 30,
        includeMealTiming: request.includeMealTiming ?? true,
        includeMacroAnalysis: request.includeMacroAnalysis ?? true,
      });
      return normalizeNutritionInsight(response.data);
    } catch (error) {
      if (isAiOfflineError(error)) {
        throw toAiOfflineError(error, 'Tính năng phân tích AI tạm không khả dụng.');
      }
      throw error;
    }
  },

  async getAdaptiveTarget(
    request: import('../types/aiEnhanced').AdaptiveTargetRequest = {},
  ): Promise<import('../types/aiEnhanced').AdaptiveTarget> {
    try {
      const response = await apiClient.post('/api/ai/nutrition/adaptive-target', {
        analysisDays: request.analysisDays ?? 14,
        autoApply: request.autoApply ?? false,
      });
      return normalizeAdaptiveTarget(response.data);
    } catch (error) {
      if (isAiOfflineError(error)) {
        throw toAiOfflineError(error, 'AI adaptive target tạm không khả dụng.');
      }
      throw error;
    }
  },

  async applyAdaptiveTarget(
    target: import('../types/aiEnhanced').NutritionTargetDto,
  ): Promise<void> {
    await apiClient.post('/api/ai/nutrition/apply-target', target);
  },

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

  async getCookingInstructions(
    recipeName: string,
    ingredients: { foodName: string; grams: number }[],
    description?: string,
  ): Promise<{ steps: string[]; cookingTime?: string; difficulty?: string }> {
    try {
      const token = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/ai/cooking-instructions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipeName,
          ingredients,
          description: description || '',
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        if ([500, 502, 503, 504].includes(response.status)) {
          return buildFallbackCookingInstructions(recipeName, ingredients);
        }

        const httpError = new Error(`Không thể tạo hướng dẫn nấu: ${text}`) as AiOfflineError;
        httpError.status = response.status;
        throw httpError;
      }

      const data = await response.json();
      return {
        steps: Array.isArray(data.steps) ? data.steps : [],
        cookingTime: data.cookingTime,
        difficulty: data.difficulty,
      };
    } catch (error) {
      if (isAiOfflineError(error)) {
        return buildFallbackCookingInstructions(recipeName, ingredients);
      }
      throw error;
    }
  },
};
