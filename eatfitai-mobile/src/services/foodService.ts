// Service xử lý tìm kiếm thực phẩm và thao tác nhật ký
// Chú thích bằng tiếng Việt không dấu

import apiClient from './apiClient';
import type { FoodItemDto, MealTypeId } from '../types';

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
const normalizeFoodItem = (data: FoodItemDto): FoodItem => ({
  id: String(data?.foodItemId ?? ''),
  name: data?.foodName ?? 'Mon an',
  nameEn: (data as any)?.foodNameEn ?? null,
  brand: null,
  calories: data?.caloriesPer100g ?? null,
  protein: data?.proteinPer100g ?? null,
  carbs: data?.carbPer100g ?? null,
  fat: data?.fatPer100g ?? null,
  thumbnail: (data as any)?.thumbNail ?? null,
  isActive: data?.isActive ?? null,
  createdAt: data?.createdAt ?? null,
  updatedAt: data?.updatedAt ?? null,
  source: 'catalog',
});

const normalizeFoodDetail = (data: FoodItemDto): FoodDetail => ({
  ...normalizeFoodItem(data),
  description: null,
  servingSizeGram: 100,
  servingUnit: 'gram',
  perServingCalories: data?.caloriesPer100g ?? null,
  perServingProtein: data?.proteinPer100g ?? null,
  perServingCarbs: data?.carbPer100g ?? null,
  perServingFat: data?.fatPer100g ?? null,
});

const normalizeUserFoodDetail = (data: any): FoodDetail => ({
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
    const response = await apiClient.get('/api/food/search-all', { params: { q: query, limit } });
    const rows = Array.isArray(response.data) ? response.data : [];
    const items: FoodItem[] = rows.map((x: any) => ({
      id: String(x?.id ?? ''),
      name: x?.foodName ?? 'Mon an',
      brand: null,
      calories: toNumber(x?.caloriesPer100),
      protein: toNumber(x?.proteinPer100),
      carbs: toNumber(x?.carbPer100),
      fat: toNumber(x?.fatPer100),
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
    // Mặc định là catalog
    const response = await apiClient.get(`/api/${foodId}`);
    const data = response.data as FoodItemDto;
    return normalizeFoodDetail(data);
  },


  // Thêm entry vào nhật ký từ catalog food
  async addDiaryEntry(payload: { mealTypeId: MealTypeId; foodId: string; grams: number; note?: string }): Promise<void> {
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
  async addDiaryEntryFromUserFoodItem(payload: { mealTypeId: MealTypeId; userFoodItemId: string; grams: number; note?: string }): Promise<void> {
    const d = new Date();
    const eatenDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await apiClient.post('/api/meal-diary', {
      eatenDate,
      mealTypeId: payload.mealTypeId,
      userFoodItemId: parseInt(payload.userFoodItemId, 10),
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  // Tạo món ăn tự chế
  async createCustomDish(payload: { dishName: string; description?: string | null; ingredients: Array<{ foodItemId: number; grams: number }> }): Promise<void> {
    await apiClient.post('/api/custom-dishes', {
      dishName: payload.dishName,
      description: payload.description ?? null,
      ingredients: payload.ingredients,
    });
  },

  // Lấy danh sách user food items (có pagination)
  async getUserFoodItems(query?: string, page = 1, pageSize = 20): Promise<{ items: any[]; total: number }> {
    const response = await apiClient.get('/api/user-food-items', { params: { q: query, page, pageSize } });
    return response.data as { items: any[]; total: number };
  },

  // Tạo user food item (multipart/form-data)
  async createUserFoodItem(payload: FormData): Promise<any> {
    const response = await apiClient.post('/api/user-food-items', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  // Cập nhật user food item
  async updateUserFoodItem(id: number, payload: FormData): Promise<any> {
    const response = await apiClient.put(`/api/user-food-items/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  // Xóa user food item
  async deleteUserFoodItem(id: number): Promise<void> {
    await apiClient.delete(`/api/user-food-items/${id}`);
  },
};
