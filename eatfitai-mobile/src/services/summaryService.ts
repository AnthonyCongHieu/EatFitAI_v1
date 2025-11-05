import apiClient from "./apiClient";
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
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const normalizeDay = (date: string, calories: number, targetCalories?: number): WeekDaySummary => ({
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
  let dailyCaloriesArray: Array<{ date: string; calories: number; targetCalories?: number }> = [];

  if (Array.isArray(data.dailyCalories)) {
    // New format: array of objects
    dailyCaloriesArray = data.dailyCalories.map(item => ({
      date: item.date,
      calories: toNumber(item.calories ?? 0),
      targetCalories: item.targetCalories ? toNumber(item.targetCalories) : undefined
    }));
  } else {
    // Old format: object with date keys
    dailyCaloriesArray = Object.entries(data.dailyCalories).map(([dateStr, calories]) => ({
      date: dateStr,
      calories: toNumber(calories ?? 0),
      targetCalories: undefined
    }));
  }

  // Sort by date chronologically
  dailyCaloriesArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return dailyCaloriesArray.map(item => normalizeDay(item.date, item.calories, item.targetCalories));
};

const getWeekDateRange = (): { startDate: string; endDate: string } => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start of week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday as end of week

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    startDate: formatDate(startOfWeek),
    endDate: formatDate(endOfWeek),
  };
};

export const summaryService = {
  async getWeekSummary(): Promise<WeekSummary> {
    const { startDate, endDate } = getWeekDateRange();
    const response = await apiClient.get("/api/analytics/nutrition-summary", {
      params: { startDate, endDate }
    });
    const raw = response.data as NutritionSummaryDto;
    const days = normalizeWeekData(raw);
    return { days };
  },
};
