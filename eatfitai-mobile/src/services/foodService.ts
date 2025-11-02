// Service xu ly tim kiem thuc pham va thao tac them vao nhat ky
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { FoodItemDto } from '../types';

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
  brand?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
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
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  totalCount?: number;
  offset?: number;
  limit?: number;
};

const normalizeFoodItem = (data: FoodItemDto): FoodItem => ({
  id: String(data?.foodItemId ?? ''),
  name: data?.foodName ?? 'Mon an',
  brand: null,
  calories: data?.caloriesPer100g ?? null,
  protein: data?.proteinPer100g ?? null,
  carbs: data?.carbPer100g ?? null,
  fat: data?.fatPer100g ?? null,
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

export const foodService = {
  // Tim kiem thuc pham theo tu khoa va phan trang
  async searchFoods(query: string, page: number, pageSize = 20): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/food/search', {
      params: {
        q: query,
        limit: pageSize,
      },
    });

    const data = response.data as FoodItemDto[];
    const normalizedItems = data.map(normalizeFoodItem);

    return {
      items: normalizedItems,
      page: 1,
      pageSize: data.length,
      total: data.length,
      hasMore: false,
      totalCount: data.length,
      offset: 0,
      limit: pageSize,
    };
  },

  // Lay chi tiet mot thuc pham
  async getFoodDetail(foodId: string): Promise<FoodDetail> {
    const response = await apiClient.get(`/api/food/${foodId}`);
    return normalizeFoodDetail(response.data ?? {});
  },

  // Them mot entry vao nhat ky tu mot thuc pham co san
  async addDiaryEntry(payload: {
    foodId: string;
    grams: number;
    mealType: string; // breakfast/lunch/dinner/snack
    note?: string;
  }): Promise<void> {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const eatenDate = `${y}-${m}-${day}`;

    await apiClient.post('/api/meal-diary', {
      eatenDate,
      mealTypeId: payload.mealType === 'breakfast' ? 1 : payload.mealType === 'lunch' ? 2 : payload.mealType === 'dinner' ? 3 : 4,
      foodItemId: parseInt(payload.foodId),
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  // Tao mon an thu cong
  async createCustomDish(payload: {
    // Placeholder: existing UI likely uses a different flow; keeping method for compatibility
    name: string;
    description?: string | null;
    servingSizeGram: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }): Promise<void> {
    await apiClient.post('/api/custom-dishes', {
      name: payload.name,
      description: payload.description ?? null,
      ingredients: [
        {
          foodId: null,
          name: 'Custom',
          quantityGrams: payload.servingSizeGram,
          caloriesKcal: payload.calories,
          proteinGrams: payload.protein,
          carbohydrateGrams: payload.carbs,
          fatGrams: payload.fat,
        },
      ],
    });
  },
};
