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

const hasBusinessErrorPayload = (data: unknown): boolean => {
  if (!data) {
    return false;
  }

  if (typeof data === 'string') {
    return data.trim().length > 0;
  }

  if (typeof data !== 'object') {
    return true;
  }

  return ['message', 'title', 'detail', 'error', 'errors', 'requestId', 'type', 'status'].some(
    (key) => Object.prototype.hasOwnProperty.call(data, key),
  );
};

const isBulkEndpointUnsupportedError = (error: unknown): boolean => {
  const response = (error as { response?: { status?: number; data?: unknown } } | null)
    ?.response;
  const status = Number(response?.status ?? 0);

  if (status === 405) {
    return true;
  }

  return status === 404 && !hasBusinessErrorPayload(response?.data);
};

export async function addMealItems(
  date: string,
  mealType: number,
  items: MealItemInput[],
): Promise<void> {
  const payloads = items.map((item) => buildDiaryPayload(date, mealType, item));

  if (payloads.length === 0) {
    return;
  }

  if (payloads.length === 1) {
    await apiClient.post('/api/meal-diary', payloads[0]);
    return;
  }

  try {
    await apiClient.post('/api/meal-diary/bulk', { items: payloads });
    return;
  } catch (error) {
    if (!isBulkEndpointUnsupportedError(error)) {
      throw error;
    }
  }

  for (const payload of payloads) {
    await apiClient.post('/api/meal-diary', payload);
  }
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
