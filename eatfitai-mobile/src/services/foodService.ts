// Service xá»­ lÃ½ tÃ¬m kiáº¿m thá»±c pháº©m vÃ  thao tÃ¡c nháº­t kÃ½
// ChÃº thÃ­ch báº±ng tiáº¿ng Viá»‡t khÃ´ng dáº¥u

import apiClient from './apiClient';
import type { FoodItemDto, MealTypeId } from '../types';
import type { FoodItemDtoExtended } from '../types/food';
import type {
  ApiFoodSearchItem,
  ApiUserFoodDetail,
  ApiSearchResponse,
} from '../types/api';

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

// Normalizers
const normalizeFoodItem = (data: FoodItemDtoExtended): FoodItem => ({
  id: String(data?.foodItemId ?? ''),
  name: data?.foodName ?? 'Mon an',
  nameEn: data?.foodNameEn ?? null,
  brand: null,
  calories: data?.caloriesPer100g ?? null,
  protein: data?.proteinPer100g ?? null,
  carbs: data?.carbPer100g ?? null,
  fat: data?.fatPer100g ?? null,
  thumbnail: data?.thumbNail ?? null,
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
  name: data?.foodName ?? 'Mon an',
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
  thumbnail: data?.thumbnailUrl ?? null,
});

export const foodService = {
  // TÃ¬m kiáº¿m thá»±c pháº©m theo tá»« khÃ³a
  async searchFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/search', { params: { q: query, limit } });
    const data = response.data as FoodItemDto[];
    const items = data.map(normalizeFoodItem);
    return { items, totalCount: data.length };
  },

  // TÃ¬m kiáº¿m táº¥t cáº£ (catalog + user food items)
  async searchAllFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/food/search-all', {
      params: { q: query, limit },
    });
    const rows = Array.isArray(response.data) ? response.data : [];
    const items: FoodItem[] = rows.map((x: ApiFoodSearchItem) => ({
      id: String(x?.id ?? ''),
      name: x?.foodName ?? 'Mon an',
      brand: null,
      calories: toNumber(x?.caloriesPer100),
      protein: toNumber(x?.proteinPer100),
      carbs: toNumber(x?.carbPer100),
      fat: toNumber(x?.fatPer100),
      thumbnail: x?.thumbnailUrl ?? null,
      isActive: null,
      createdAt: null,
      updatedAt: null,
      source: x?.source === 'user' ? 'user' : 'catalog',
    }));
    return { items, totalCount: rows.length };
  },

  // Láº¥y chi tiáº¿t mÃ³n Äƒn (tá»± Ä‘á»™ng chá»n endpoint dá»±a trÃªn source)
  async getFoodDetail(foodId: string, source?: 'catalog' | 'user'): Promise<FoodDetail> {
    // Náº¿u source lÃ  'user', gá»i endpoint user-food-items
    if (source === 'user') {
      const response = await apiClient.get(`/api/user-food-items/${foodId}`);
      return normalizeUserFoodDetail(response.data);
    }
    // Máº·c Ä‘á»‹nh lÃ  catalog - Backend tráº£ vá» { foodItem, servings }
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

  // ThÃªm entry vÃ o nháº­t kÃ½ tá»« catalog food
  async addDiaryEntry(payload: {
    mealTypeId: MealTypeId;
    foodId: string;
    grams: number;
    note?: string;
  }): Promise<void> {
    const d = new Date();
    const eatenDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await apiClient.post('/api/meal-diary', {
      eatenDate,
      mealTypeId: payload.mealTypeId,
      foodItemId: parseInt(payload.foodId, 10),
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  // ThÃªm entry vÃ o nháº­t kÃ½ tá»« userâ€‘created food item
  async addDiaryEntryFromUserFoodItem(payload: {
    mealTypeId: MealTypeId;
    userFoodItemId: string;
    grams: number;
    calories: number;
    protein: number;
    carb: number;
    fat: number;
    note?: string;
  }): Promise<void> {
    const d = new Date();
    const eatenDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await apiClient.post('/api/meal-diary', {
      eatenDate,
      mealTypeId: payload.mealTypeId,
      userFoodItemId: parseInt(payload.userFoodItemId, 10),
      grams: payload.grams,
      calories: payload.calories,
      protein: payload.protein,
      carb: payload.carb,
      fat: payload.fat,
      note: payload.note ?? null,
    });
  },

  // Táº¡o mÃ³n Äƒn tá»± cháº¿
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

  // Láº¥y danh sÃ¡ch user food items (cÃ³ pagination)
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

  // Táº¡o user food item (multipart/form-data)
  async createUserFoodItem(payload: FormData): Promise<any> {
    const response = await apiClient.post('/api/user-food-items', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Cáº­p nháº­t user food item
  async updateUserFoodItem(id: number, payload: FormData): Promise<any> {
    const response = await apiClient.put(`/api/user-food-items/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // XÃ³a user food item
  async deleteUserFoodItem(id: number): Promise<void> {
    await apiClient.delete(`/api/user-food-items/${id}`);
  },

  // --- Favorites ---
  async getFavorites(): Promise<FoodItem[]> {
    const response = await apiClient.get('/api/favorites');
    // Defensive coding: Äáº£m báº£o response.data lÃ  array
    const data = Array.isArray(response.data) ? response.data : [];

    // Map tá»«ng item
    return data.map((item: any) => {
      return {
        id: String(item?.foodItemId ?? item?.id ?? ''),
        name: item?.foodName ?? item?.name ?? 'MÃ³n Äƒn',
        nameEn: item?.foodNameEn ?? null,
        brand: null,
        calories: item?.caloriesPer100g ?? item?.calories ?? null,
        protein: item?.proteinPer100g ?? item?.protein ?? null,
        carbs: item?.carbPer100g ?? item?.carbs ?? null,
        fat: item?.fatPer100g ?? item?.fat ?? null,
        thumbnail: item?.thumbNail ?? item?.thumbnail ?? null,
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

