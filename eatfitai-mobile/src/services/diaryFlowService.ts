import type { QueryClient } from '@tanstack/react-query';

import { MEAL_TYPES, type MealTypeId } from '../types';
import type { MealItemInput } from '../types/meals';
import { mealService } from './mealService';

export const DIARY_QUERY_KEYS = {
  diaryEntries: ['diary-entries'] as const,
  homeSummary: ['home-summary'] as const,
};

export const getTodayDate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSuggestedMealType = (date = new Date()): MealTypeId => {
  const hour = date.getHours();

  if (hour < 10) {
    return MEAL_TYPES.BREAKFAST;
  }

  if (hour > 15) {
    return MEAL_TYPES.DINNER;
  }

  return MEAL_TYPES.LUNCH;
};

export const addItemsToTodayDiary = async (
  items: MealItemInput[],
  options?: {
    date?: string;
    mealTypeId?: MealTypeId;
    now?: Date;
  },
): Promise<void> => {
  const now = options?.now ?? new Date();
  const date = options?.date ?? getTodayDate(now);
  const mealTypeId = options?.mealTypeId ?? getSuggestedMealType(now);

  await mealService.addMealItems(date, mealTypeId, items);
};

export const invalidateDiaryQueries = async (
  queryClient: Pick<QueryClient, 'invalidateQueries'>,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEYS.homeSummary }),
    queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEYS.diaryEntries }),
  ]);
};
