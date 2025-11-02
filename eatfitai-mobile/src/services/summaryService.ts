import apiClient from "./apiClient";
import type { NutritionSummaryDto } from '../types';

export type WeekDaySummary = {
  date: string;
  calories: number;
  targetCalories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
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

const normalizeDay = (data: NutritionSummaryDto): WeekDaySummary => ({
  date: new Date().toISOString(),
  calories: toNumber(data?.totalCalories),
  targetCalories: null,
  protein: toNumber(data?.totalProtein),
  carbs: toNumber(data?.totalCarbs),
  fat: toNumber(data?.totalFat),
});

const todayDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const summaryService = {
  async getWeekSummary(): Promise<WeekSummary> {
    const date = todayDate();
    const response = await apiClient.get("/api/analytics/nutrition-summary", { params: { startDate: date } });
    const raw = response.data as NutritionSummaryDto;
    const days = [normalizeDay(raw)];
    return { days };
  },
};
