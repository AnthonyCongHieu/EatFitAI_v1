// Service lam viec voi API meals (them bua an tu AI Vision, lay danh sach bua an)
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { MealItemInput } from '../types/meals';

const todayDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export async function addMealItems(
  date: string,
  mealType: number,
  items: MealItemInput[],
): Promise<void> {
  // Backend does not support batch insert (/api/meals), so we loop and insert individually
  const promises = items.map((item) => {
    return apiClient.post('/api/meal-diary', {
      eatenDate: date,
      mealTypeId: mealType,
      foodItemId: item.foodItemId,
      grams: item.grams,
      note: null,
    });
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

  // Lay danh sach bua an theo ngay (neu backend ho tro /api/meals)
  async getMeals(date: string): Promise<any> {
    const response = await apiClient.get('/api/meals', { params: { date } });
    return response.data;
  },
};
