// Service lam viec voi API meals (them bua an tu AI Vision, lay danh sach bua an)
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { AddMealItemsPayload, MealItemInput } from '../types/meals';

const todayDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export async function addMealItems(date: string, mealType: number, items: MealItemInput[]): Promise<void> {
  const payload: AddMealItemsPayload = { date, mealType, items };
  await apiClient.post('/api/meals', payload);
}

export const mealService = {
  async addMealItems(date: string, mealType: number, items: MealItemInput[]): Promise<void> {
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

