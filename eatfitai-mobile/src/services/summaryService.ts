import apiClient from './apiClient';
import type { NutritionSummaryDto } from '../types';

export type WeekDaySummary = {
  date: string;
  calories: number;
  targetCalories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  caloriesByMealType?: Record<string, number> | null;
};

export type WeekSummary = {
  days: WeekDaySummary[];
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalCalories: number;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const normalizeDay = (
  date: string,
  calories: number,
  targetCalories?: number,
): WeekDaySummary => ({
  date,
  calories,
  targetCalories: targetCalories ?? null,
  protein: null,
  carbs: null,
  fat: null,
  totalProtein: null,
  totalCarbs: null,
  totalFat: null,
  caloriesByMealType: null,
});

const normalizeWeekData = (data: NutritionSummaryDto): WeekDaySummary[] => {
  if (!data?.dailyCalories) {
    return [];
  }

  // Handle dailyCalories as array or object for backward compatibility
  let dailyCaloriesArray: {
    date: string;
    calories: number;
    targetCalories?: number;
  }[] = [];

  if (Array.isArray(data.dailyCalories)) {
    // New format: array of objects
    dailyCaloriesArray = data.dailyCalories.map((item) => ({
      date: item.date,
      calories: toNumber(item.calories ?? 0),
      targetCalories: item.targetCalories ? toNumber(item.targetCalories) : undefined,
    }));
  } else {
    // Old format: object with date keys
    dailyCaloriesArray = Object.entries(data.dailyCalories).map(
      ([dateStr, calories]) => ({
        date: dateStr,
        calories: toNumber(calories ?? 0),
        targetCalories: undefined,
      }),
    );
  }

  // Sort by date chronologically
  dailyCaloriesArray.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return dailyCaloriesArray.map((item) =>
    normalizeDay(item.date, item.calories, item.targetCalories),
  );
};

export const summaryService = {
  async getWeekSummary(date?: string): Promise<WeekSummary> {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const response = await apiClient.get('/api/summary/week', {
      params: { date: targetDate },
    });
    const raw = response.data as NutritionSummaryDto;
    const days = normalizeWeekData(raw);
    return {
      days,
      totalProtein: toNumber(raw.totalProtein),
      totalCarbs: toNumber(raw.totalCarbs),
      totalFat: toNumber(raw.totalFat),
      totalCalories: toNumber(raw.totalCalories),
    };
  },

  async getNutritionSummary(
    startDate: string,
    endDate?: string,
  ): Promise<NutritionSummaryDto> {
    const response = await apiClient.get('/api/analytics/nutrition-summary', {
      params: { startDate, endDate },
    });
    return response.data as NutritionSummaryDto;
  },
};
