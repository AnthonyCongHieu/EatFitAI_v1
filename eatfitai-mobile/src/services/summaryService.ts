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

export const summaryService = {
  async getWeekSummary(): Promise<WeekSummary> {
    const response = await apiClient.get("/api/summary/week");
    const days = Array.isArray(response.data?.days)
      ? response.data.days.map(normalizeDay)
      : Array.isArray(response.data)
      ? response.data.map(normalizeDay)
      : [];
    return { days };
  },
};
