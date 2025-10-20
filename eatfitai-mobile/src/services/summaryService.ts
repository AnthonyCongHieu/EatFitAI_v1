import apiClient from "./apiClient";

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

const normalizeDay = (data: any): WeekDaySummary => ({
  date: data?.date ?? new Date().toISOString(),
  calories: toNumber(data?.calories),
  targetCalories: data?.targetCalories != null ? toNumber(data?.targetCalories) : null,
  protein: data?.protein != null ? toNumber(data?.protein) : null,
  carbs: data?.carbs != null ? toNumber(data?.carbs) : null,
  fat: data?.fat != null ? toNumber(data?.fat) : null,
});

const todayDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const normalizeServerDay = (data: any): WeekDaySummary => ({
  date: data?.mealDate ?? data?.date ?? new Date().toISOString(),
  calories: toNumber(data?.totalCaloriesKcal ?? data?.calories),
  targetCalories: data?.targetCalories != null ? toNumber(data?.targetCalories) : null,
  protein: data?.totalProteinGrams != null ? toNumber(data?.totalProteinGrams) : null,
  carbs: data?.totalCarbohydrateGrams != null ? toNumber(data?.totalCarbohydrateGrams) : null,
  fat: data?.totalFatGrams != null ? toNumber(data?.totalFatGrams) : null,
});

export const summaryService = {
  async getWeekSummary(): Promise<WeekSummary> {
    const date = todayDate();
    const response = await apiClient.get("/api/summary/week", { params: { date } });
    const raw = response.data;
    const days = Array.isArray(raw?.days)
      ? raw.days.map(normalizeServerDay)
      : Array.isArray(raw)
      ? raw.map(normalizeServerDay)
      : [];
    return { days };
  },
};
