import apiClient from './apiClient';
import type { FoodItemDto, MealTypeId } from '../types';
import type { FoodItemDtoExtended } from '../types/food';
import type {
  ApiImageVariants,
  ApiFoodSearchItem,
  ApiSearchResponse,
  ApiUserFoodDetail,
} from '../types/api';
import { sanitizeFoodImageUrl } from '../utils/imageHelpers';

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

export type FoodItem = {
  id: string;
  name: string;
  nameEn?: string | null;
  brand?: string | null;
  barcode?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  thumbnail?: string | null;
  imageVariants?: ApiImageVariants | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  source?: 'catalog' | 'user';
};

type ImageVariantSource = {
  imageVariants?: ApiImageVariants | null;
  thumbnailUrl?: string | null;
  thumbNail?: string | null;
  thumbnail?: string | null;
};

const selectFoodImageUrl = (
  data: ImageVariantSource,
  size: 'thumb' | 'medium',
): string | null => {
  const variantUrl =
    size === 'thumb'
      ? data?.imageVariants?.thumbUrl
      : data?.imageVariants?.mediumUrl ?? data?.imageVariants?.thumbUrl;

  return (
    sanitizeFoodImageUrl(
      variantUrl ?? data?.thumbnailUrl ?? data?.thumbNail ?? data?.thumbnail ?? null,
      size,
    ) ?? null
  );
};

export type FoodDetail = FoodItem & {
  description?: string | null;
  servingSizeGram?: number | null;
  servingUnit?: string | null;
  perServingCalories?: number | null;
  perServingProtein?: number | null;
  perServingCarbs?: number | null;
  perServingFat?: number | null;
};

export type SearchFoodsResult = {
  items: FoodItem[];
  totalCount?: number;
};

export type CommonMealTemplate = {
  id: string;
  name: string;
  description?: string | null;
  ingredientCount: number;
  defaultGrams: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CommonMealIngredient = {
  foodItemId: number;
  foodName: string;
  grams: number;
  caloriesPer100g?: number | null;
  proteinPer100g?: number | null;
  carbPer100g?: number | null;
  fatPer100g?: number | null;
  thumbnail?: string | null;
};

export type CommonMealTemplateDetail = CommonMealTemplate & {
  ingredients: CommonMealIngredient[];
};

const getDefaultEatenDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const normalizeFoodItem = (data: FoodItemDtoExtended): FoodItem => ({
  id: String(data?.foodItemId ?? ''),
  name: data?.foodName ?? 'Món ăn',
  nameEn: data?.foodNameEn ?? null,
  brand: null,
  barcode: (data as FoodItemDtoExtended & { barcode?: string | null })?.barcode ?? null,
  calories: data?.caloriesPer100g ?? null,
  protein: data?.proteinPer100g ?? null,
  carbs: data?.carbPer100g ?? null,
  fat: data?.fatPer100g ?? null,
  thumbnail: selectFoodImageUrl(data as ImageVariantSource, 'thumb'),
  imageVariants: (data as ImageVariantSource)?.imageVariants ?? null,
  isActive: data?.isActive ?? null,
  createdAt: data?.createdAt ?? null,
  updatedAt: data?.updatedAt ?? null,
  source: 'catalog',
});

const normalizeFoodDetail = (data: FoodItemDtoExtended): FoodDetail => ({
  ...normalizeFoodItem(data),
  thumbnail: selectFoodImageUrl(data as ImageVariantSource, 'medium'),
  description: null,
  servingSizeGram: 100,
  servingUnit: 'gram',
  perServingCalories: data?.caloriesPer100g ?? null,
  perServingProtein: data?.proteinPer100g ?? null,
  perServingCarbs: data?.carbPer100g ?? null,
  perServingFat: data?.fatPer100g ?? null,
});

const normalizeUserFoodDetail = (data: ApiUserFoodDetail): FoodDetail => ({
  id: String(data?.userFoodItemId ?? data?.id ?? ''),
  name: data?.foodName ?? 'Món ăn',
  brand: null,
  calories: data?.caloriesPer100 ?? null,
  protein: data?.proteinPer100 ?? null,
  carbs: data?.carbPer100 ?? null,
  fat: data?.fatPer100 ?? null,
  isActive: true,
  createdAt: data?.createdAt ?? null,
  updatedAt: data?.updatedAt ?? null,
  source: 'user',
  description: data?.description ?? null,
  servingSizeGram: 100,
  servingUnit: data?.unitType ?? 'g',
  perServingCalories: data?.caloriesPer100 ?? null,
  perServingProtein: data?.proteinPer100 ?? null,
  perServingCarbs: data?.carbPer100 ?? null,
  perServingFat: data?.fatPer100 ?? null,
  thumbnail: selectFoodImageUrl(data, 'medium'),
  imageVariants: data?.imageVariants ?? null,
});

const normalizeSearchFoodItem = (data: ApiFoodSearchItem): FoodItem => ({
  id: String(data?.id ?? ''),
  name: data?.foodName ?? 'Món ăn',
  brand: null,
  barcode: null,
  calories: toNumber(data?.caloriesPer100),
  protein: toNumber(data?.proteinPer100),
  carbs: toNumber(data?.carbPer100),
  fat: toNumber(data?.fatPer100),
  thumbnail: selectFoodImageUrl(data, 'thumb'),
  imageVariants: data?.imageVariants ?? null,
  isActive: null,
  createdAt: null,
  updatedAt: null,
  source: data?.source === 'user' ? 'user' : 'catalog',
});

const normalizeCommonMealTemplate = (data: any): CommonMealTemplate => ({
  id: String(data?.userDishId ?? ''),
  name: data?.dishName ?? 'Món thường dùng',
  description: data?.description ?? null,
  ingredientCount: Number.isFinite(data?.ingredientCount) ? data.ingredientCount : 0,
  defaultGrams: toNumber(data?.defaultGrams) ?? 0,
  calories: toNumber(data?.calories),
  protein: toNumber(data?.protein),
  carbs: toNumber(data?.carb),
  fat: toNumber(data?.fat),
  createdAt: data?.createdAt ?? null,
  updatedAt: data?.updatedAt ?? null,
});

const normalizeCommonMealTemplateDetail = (data: any): CommonMealTemplateDetail => ({
  ...normalizeCommonMealTemplate(data),
  ingredients: Array.isArray(data?.ingredients)
    ? data.ingredients.map((ingredient: any) => ({
        foodItemId: Number(ingredient?.foodItemId ?? 0),
        foodName: ingredient?.foodName ?? 'Món ăn',
        grams: toNumber(ingredient?.grams) ?? 0,
        caloriesPer100g: toNumber(ingredient?.caloriesPer100g),
        proteinPer100g: toNumber(ingredient?.proteinPer100g),
        carbPer100g: toNumber(ingredient?.carbPer100g),
        fatPer100g: toNumber(ingredient?.fatPer100g),
        thumbnail: selectFoodImageUrl(ingredient, 'thumb'),
      }))
    : [],
});

export const foodService = {
  async searchFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/search', { params: { q: query, limit } });
    const data = response.data as FoodItemDto[];
    const items = data.map(normalizeFoodItem);
    return { items, totalCount: data.length };
  },

  async searchAllFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/food/search-all', {
      params: { q: query, limit },
    });
    const rows = Array.isArray(response.data) ? response.data : [];
    const items = rows.map((row: ApiFoodSearchItem) => normalizeSearchFoodItem(row));
    return { items, totalCount: rows.length };
  },

  async getRecentFoods(limit = 10): Promise<FoodItem[]> {
    const response = await apiClient.get('/api/food/recent', {
      params: { limit },
    });
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.map((row: ApiFoodSearchItem) => normalizeSearchFoodItem(row));
  },

  async getCommonMeals(): Promise<CommonMealTemplate[]> {
    const response = await apiClient.get('/api/custom-dishes');
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.map((row: any) => normalizeCommonMealTemplate(row));
  },

  async getCommonMealDetail(customDishId: string): Promise<CommonMealTemplateDetail> {
    const response = await apiClient.get(`/api/custom-dishes/${customDishId}`);
    return normalizeCommonMealTemplateDetail(response.data);
  },

  async applyCommonMeal(payload: {
    customDishId: string;
    targetDate: string;
    mealTypeId: MealTypeId;
    grams?: number;
    note?: string;
  }): Promise<void> {
    await apiClient.post(`/api/custom-dishes/${payload.customDishId}/apply`, {
      targetDate: payload.targetDate,
      mealTypeId: payload.mealTypeId,
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  async updateCommonMeal(
    customDishId: string,
    payload: {
      dishName: string;
      description?: string | null;
      ingredients: { foodItemId: number; grams: number }[];
    },
  ): Promise<void> {
    await apiClient.put(`/api/custom-dishes/${customDishId}`, {
      dishName: payload.dishName,
      description: payload.description ?? null,
      ingredients: payload.ingredients,
    });
  },

  async deleteCommonMeal(customDishId: string): Promise<void> {
    await apiClient.delete(`/api/custom-dishes/${customDishId}`);
  },

  async getFoodDetail(foodId: string, source?: 'catalog' | 'user'): Promise<FoodDetail> {
    if (source === 'user') {
      const response = await apiClient.get(`/api/user-food-items/${foodId}`);
      return normalizeUserFoodDetail(response.data);
    }

    try {
      const response = await apiClient.get(`/api/food/${foodId}`);
      const data = response.data?.foodItem ?? response.data;
      return normalizeFoodDetail(data as FoodItemDtoExtended);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error;
      }

      const response = await apiClient.get(`/api/${foodId}`);
      const data = response.data?.foodItem ?? response.data;
      return normalizeFoodDetail(data as FoodItemDtoExtended);
    }
  },

  async addDiaryEntry(payload: {
    mealTypeId: MealTypeId;
    foodId: string;
    grams: number;
    note?: string;
    eatenDate?: string;
  }): Promise<void> {
    await apiClient.post('/api/meal-diary', {
      eatenDate: payload.eatenDate ?? getDefaultEatenDate(),
      mealTypeId: payload.mealTypeId,
      foodItemId: parseInt(payload.foodId, 10),
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  async addDiaryEntryFromUserFoodItem(payload: {
    mealTypeId: MealTypeId;
    userFoodItemId: string;
    grams: number;
    note?: string;
    eatenDate?: string;
  }): Promise<void> {
    await apiClient.post('/api/meal-diary', {
      eatenDate: payload.eatenDate ?? getDefaultEatenDate(),
      mealTypeId: payload.mealTypeId,
      userFoodItemId: parseInt(payload.userFoodItemId, 10),
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  async lookupByBarcode(barcode: string): Promise<FoodDetail | null> {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) {
      return null;
    }

    const response = await apiClient.get(`/api/food/barcode/${encodeURIComponent(trimmedBarcode)}`);
    const data = response.data;
    const foodItem = data?.foodItem ?? data?.FoodItem ?? data;
    if (!foodItem) {
      return null;
    }

    const detail = normalizeFoodDetail(foodItem as FoodItemDtoExtended);
    // Preserve barcode + source info from backend response
    detail.barcode = trimmedBarcode;
    if (data?.source === 'provider') {
      detail.source = 'catalog'; // Provider results are saved to catalog
      (detail as any)._fromProvider = true;
      (detail as any)._providerName = data?.providerName;
    }
    return detail;
  },

  async createCustomDish(payload: {
    dishName: string;
    description?: string | null;
    ingredients: { foodItemId: number; grams: number }[];
  }): Promise<void> {
    await apiClient.post('/api/custom-dishes', {
      dishName: payload.dishName,
      description: payload.description ?? null,
      ingredients: payload.ingredients,
    });
  },

  async getUserFoodItems(
    query?: string,
    page = 1,
    pageSize = 20,
  ): Promise<ApiSearchResponse<ApiUserFoodDetail>> {
    const response = await apiClient.get('/api/user-food-items', {
      params: { q: query, page, pageSize },
    });
    return response.data as ApiSearchResponse<ApiUserFoodDetail>;
  },

  async createUserFoodItem(payload: FormData): Promise<any> {
    const response = await apiClient.post('/api/user-food-items', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updateUserFoodItem(id: number, payload: FormData): Promise<any> {
    const response = await apiClient.put(`/api/user-food-items/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteUserFoodItem(id: number): Promise<void> {
    await apiClient.delete(`/api/user-food-items/${id}`);
  },

  async getFavorites(): Promise<FoodItem[]> {
    const response = await apiClient.get('/api/favorites');
    const data = Array.isArray(response.data) ? response.data : [];

    return data.map((item: any) => ({
      id: String(item?.foodItemId ?? item?.id ?? ''),
      name: item?.foodName ?? item?.name ?? 'Món ăn',
      nameEn: item?.foodNameEn ?? null,
      brand: null,
      barcode: item?.barcode ?? null,
      calories: item?.caloriesPer100g ?? item?.calories ?? null,
      protein: item?.proteinPer100g ?? item?.protein ?? null,
      carbs: item?.carbPer100g ?? item?.carbs ?? null,
      fat: item?.fatPer100g ?? item?.fat ?? null,
      thumbnail: selectFoodImageUrl(item, 'thumb'),
      imageVariants: item?.imageVariants ?? null,
      isActive: item?.isActive ?? null,
      createdAt: item?.createdAt ?? null,
      updatedAt: item?.updatedAt ?? null,
      source: 'catalog' as const,
    }));
  },

  async toggleFavorite(foodItemId: number): Promise<{ isFavorite: boolean }> {
    const response = await apiClient.post('/api/favorites', { foodItemId });
    return response.data;
  },

  async checkIsFavorite(foodItemId: number): Promise<boolean> {
    const response = await apiClient.get(`/api/favorites/check/${foodItemId}`);
    return response.data.isFavorite;
  },
};
