// Service xu ly tim kiem thuc pham va thao tac them vao nhat ky
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { FoodItemDto, MealTypeId, MEAL_TYPES } from '../types';

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
  totalCount?: number;
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
  // Tim kiem thuc pham theo tu khoa
  async searchFoods(query: string, limit = 50): Promise<SearchFoodsResult> {
    const response = await apiClient.get('/api/search', {
      params: {
        q: query,
        limit,
      },
    });

    const data = response.data as FoodItemDto[];
    const normalizedItems = data.map(normalizeFoodItem);

    return {
      items: normalizedItems,
      totalCount: data.length,
    };
  },

  // Lay chi tiet mot thuc pham
  async getFoodDetail(foodId: string): Promise<FoodDetail> {
    const response = await apiClient.get(`/api/${foodId}`);
    return normalizeFoodDetail(response.data ?? {});
  },

  // Them mot entry vao nhat ky tu mot thuc pham co san
  async addDiaryEntry(payload: {
    foodId: string;
    grams: number;
    mealTypeId: MealTypeId;
    note?: string;
  }): Promise<void> {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const eatenDate = `${y}-${m}-${day}`;

    await apiClient.post('/api/meal-diary', {
      eatenDate,
      mealTypeId: payload.mealTypeId,
      foodItemId: parseInt(payload.foodId),
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  // Them mot entry vao nhat ky tu UserFoodItem (mon nguoi dung tu tao)
  async addDiaryEntryFromUserFoodItem(payload: {
    userFoodItemId: string;
    grams: number;
    mealTypeId: MealTypeId;
    note?: string;
  }): Promise<void> {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const eatenDate = `${y}-${m}-${day}`;

    await apiClient.post('/api/meal-diary', {
      eatenDate,
      mealTypeId: payload.mealTypeId,
      userFoodItemId: parseInt(payload.userFoodItemId),
      grams: payload.grams,
      note: payload.note ?? null,
    });
  },

  // Tao mon an thu cong
  async createCustomDish(payload: {
    dishName: string;
    description?: string | null;
    ingredients: Array<{
      foodItemId: number;
      grams: number;
    }>;
  }): Promise<void> {
    await apiClient.post('/api/custom-dishes', {
      dishName: payload.dishName,
      description: payload.description ?? null,
      ingredients: payload.ingredients,
    });
  },
};
