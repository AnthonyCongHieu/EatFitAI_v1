// Service xử lý tìm kiếm thực phẩm và thao tác nhật ký
// Chú thích bằng tiếng Việt không dấu

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
  // Tìm kiếm thực phẩm theo từ khóa
  async searchFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/search', { params: { q: query, limit } });
    const data = response.data as FoodItemDto[];
    const items = data.map(normalizeFoodItem);
    return { items, totalCount: data.length };
  },

  // Tìm kiếm tất cả (catalog + user food items)
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

  // Lấy chi tiết món ăn (tự động chọn endpoint dựa trên source)
  async getFoodDetail(foodId: string, source?: 'catalog' | 'user'): Promise<FoodDetail> {
    // Nếu source là 'user', gọi endpoint user-food-items
    if (source === 'user') {
      const response = await apiClient.get(`/api/user-food-items/${foodId}`);
      return normalizeUserFoodDetail(response.data);
    }
    // Mặc định là catalog - Backend trả về { foodItem, servings }
    const response = await apiClient.get(`/api/${foodId}`);
    // Unwrap foodItem từ response vì backend trả về dạng { foodItem, servings }
    const data = response.data?.foodItem ?? response.data;
    return normalizeFoodDetail(data as FoodItemDtoExtended);
  },

  // Thêm entry vào nhật ký từ catalog food
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

  // Thêm entry vào nhật ký từ user‑created food item
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

  // Tạo món ăn tự chế
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

  // Lấy danh sách user food items (có pagination)
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

  // Tạo user food item (multipart/form-data)
  async createUserFoodItem(payload: FormData): Promise<any> {
    const response = await apiClient.post('/api/user-food-items', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Cập nhật user food item
  async updateUserFoodItem(id: number, payload: FormData): Promise<any> {
    const response = await apiClient.put(`/api/user-food-items/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Xóa user food item
  async deleteUserFoodItem(id: number): Promise<void> {
    await apiClient.delete(`/api/user-food-items/${id}`);
  },

  // --- Favorites ---
  async getFavorites(): Promise<FoodItem[]> {
    const response = await apiClient.get('/api/favorites');
    // Defensive coding: Đảm bảo response.data là array
    const data = Array.isArray(response.data) ? response.data : [];
    console.log('[foodService] getFavorites response:', data.length, 'items');

    // Map từng item, log nếu có field thiếu
    return data.map((item: any) => {
      if (!item?.foodItemId && !item?.id) {
        console.warn('[foodService] Favorite item missing id:', item);
      }
      return {
        id: String(item?.foodItemId ?? item?.id ?? ''),
        name: item?.foodName ?? item?.name ?? 'Món ăn',
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
