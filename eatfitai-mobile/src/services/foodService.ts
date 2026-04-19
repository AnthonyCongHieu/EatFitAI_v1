// Food service for searching foods and writing diary entries
// Comments kept ASCII-safe to avoid mojibake in this environment

import apiClient from './apiClient';
import type { FoodItemDto, MealTypeId } from '../types';
import type { FoodItemDtoExtended } from '../types/food';
import type {
  ApiFoodSearchItem,
  ApiUserFoodDetail,
  ApiSearchResponse,
} from '../types/api';
import { sanitizeFoodImageUrl } from '../utils/imageHelpers';

// Helper to convert unknown to number or null
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

// Exported types
export type FoodItem = {
  id: string;
  name: string;
  nameEn?: string | null;
  brand?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  thumbnail?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  source?: 'catalog' | 'user';
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

const getDefaultEatenDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Normalizers
const normalizeFoodItem = (data: FoodItemDtoExtended): FoodItem => ({
  id: String(data?.foodItemId ?? ''),
  name: data?.foodName ?? 'Món ăn',
  nameEn: data?.foodNameEn ?? null,
  brand: null,
  calories: data?.caloriesPer100g ?? null,
  protein: data?.proteinPer100g ?? null,
  carbs: data?.carbPer100g ?? null,
  fat: data?.fatPer100g ?? null,
  thumbnail: sanitizeFoodImageUrl(data?.thumbNail),
  isActive: data?.isActive ?? null,
  createdAt: data?.createdAt ?? null,
  updatedAt: data?.updatedAt ?? null,
  source: 'catalog',
});

const normalizeFoodDetail = (data: FoodItemDtoExtended): FoodDetail => ({
  ...normalizeFoodItem(data),
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
  thumbnail: sanitizeFoodImageUrl(data?.thumbnailUrl),
});

export const foodService = {
  // Search catalog foods by keyword
  async searchFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/search', { params: { q: query, limit } });
    const data = response.data as FoodItemDto[];
    const items = data.map(normalizeFoodItem);
    return { items, totalCount: data.length };
  },

  // Search across both catalog and user-created foods
  async searchAllFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/food/search-all', {
      params: { q: query, limit },
    });
    const rows = Array.isArray(response.data) ? response.data : [];
    const items: FoodItem[] = rows.map((x: ApiFoodSearchItem) => ({
      id: String(x?.id ?? ''),
      name: x?.foodName ?? 'Món ăn',
      brand: null,
      calories: toNumber(x?.caloriesPer100),
      protein: toNumber(x?.proteinPer100),
      carbs: toNumber(x?.carbPer100),
      fat: toNumber(x?.fatPer100),
      thumbnail: sanitizeFoodImageUrl(x?.thumbnailUrl),
      isActive: null,
      createdAt: null,
      updatedAt: null,
      source: x?.source === 'user' ? 'user' : 'catalog',
    }));
    return { items, totalCount: rows.length };
  },

  // Get food details and choose endpoint based on source
  async getFoodDetail(foodId: string, source?: 'catalog' | 'user'): Promise<FoodDetail> {
    // If source is user, call the user-food-items endpoint
    if (source === 'user') {
      const response = await apiClient.get(`/api/user-food-items/${foodId}`);
      return normalizeUserFoodDetail(response.data);
    }
    // Default to catalog; backend returns { foodItem, servings }
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

  // Add a diary entry from a catalog food
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

  // Add a diary entry from a user-created food item
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

  // Create a custom dish
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

  // Get paginated user food items
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

  // Create a user food item (multipart/form-data)
  async createUserFoodItem(payload: FormData): Promise<any> {
    const response = await apiClient.post('/api/user-food-items', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Update a user food item
  async updateUserFoodItem(id: number, payload: FormData): Promise<any> {
    const response = await apiClient.put(`/api/user-food-items/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Delete a user food item
  async deleteUserFoodItem(id: number): Promise<void> {
    await apiClient.delete(`/api/user-food-items/${id}`);
  },

  // --- Favorites ---
  async getFavorites(): Promise<FoodItem[]> {
    const response = await apiClient.get('/api/favorites');
    // Defensive coding: ensure response.data is an array
    const data = Array.isArray(response.data) ? response.data : [];

    // Map each favorite item into the shared FoodItem shape
    return data.map((item: any) => {
      return {
        id: String(item?.foodItemId ?? item?.id ?? ''),
        name: item?.foodName ?? item?.name ?? 'Món ăn',
        nameEn: item?.foodNameEn ?? null,
        brand: null,
        calories: item?.caloriesPer100g ?? item?.calories ?? null,
        protein: item?.proteinPer100g ?? item?.protein ?? null,
        carbs: item?.carbPer100g ?? item?.carbs ?? null,
        fat: item?.fatPer100g ?? item?.fat ?? null,
        thumbnail: sanitizeFoodImageUrl(item?.thumbNail ?? item?.thumbnail ?? null),
        isActive: item?.isActive ?? null,
        createdAt: item?.createdAt ?? null,
        updatedAt: item?.updatedAt ?? null,
        source: 'catalog' as const,
      };
    });
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
