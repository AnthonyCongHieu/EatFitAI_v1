// Service lam viec voi API meals (them bua an tu AI Vision, lay danh sach bua an)
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { MealItemInput } from '../types/meals';
import { formatLocalDate } from '../utils/localDate';

const todayDate = (): string => {
  return formatLocalDate(new Date());
};

const buildDiaryPayload = (date: string, mealType: number, item: MealItemInput) => {
  const source = item.source ?? (item.userFoodItemId != null ? 'user' : 'catalog');

  if (source === 'user') {
    if (item.userFoodItemId == null) {
      throw new Error('userFoodItemId is required for user food items');
    }

    return {
      eatenDate: date,
      mealTypeId: mealType,
      userFoodItemId: item.userFoodItemId,
      grams: item.grams,
      note: null,
    };
  }

  if (item.foodItemId == null) {
    throw new Error('foodItemId is required for catalog food items');
  }

  return {
    eatenDate: date,
    mealTypeId: mealType,
    foodItemId: item.foodItemId,
    grams: item.grams,
    note: null,
  };
};

export async function addMealItems(
  date: string,
  mealType: number,
  items: MealItemInput[],
): Promise<void> {
  // Backend does not support batch insert (/api/meals), so we loop and insert individually
  const promises = items.map((item) => {
    return apiClient.post('/api/meal-diary', buildDiaryPayload(date, mealType, item));
  });

  await Promise.all(promises);
}

export const mealService = {
  async addMealItems(
    date: string,
    mealType: number,
    items: MealItemInput[],
  ): Promise<void> {
    return addMealItems(date, mealType, items);
  },

  async addMealItemsToday(mealType: number, items: MealItemInput[]): Promise<void> {
    const date = todayDate();
    return addMealItems(date, mealType, items);
  },

  // Lay danh sach bua an theo ngay tu backend diary contract
  async getMeals(date: string): Promise<any> {
    const response = await apiClient.get('/api/meal-diary', { params: { date } });
    return response.data;
  },
};
