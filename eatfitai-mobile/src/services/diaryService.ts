// Service lam viec voi API nhat ky an uong trong ngay
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';

export type DiaryMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;

export type DiaryEntry = {
  id: string;
  mealType: DiaryMealType;
  foodName: string;
  note?: string | null;
  quantityText?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  recordedAt?: string | null;
};

export type DiaryMealGroup = {
  mealType: DiaryMealType;
  title: string;
  totalCalories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  entries: DiaryEntry[];
};

export type DaySummary = {
  date: string;
  totalCalories?: number | null;
  targetCalories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  meals: DiaryMealGroup[];
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const normalizeEntry = (data: any): DiaryEntry => ({
  id: String(data?.id ?? ''),
  mealType: data?.mealType ?? data?.meal ?? 'unknown',
  foodName: data?.foodName ?? data?.name ?? 'Mon an',
  note: data?.note ?? data?.description ?? null,
  quantityText: data?.quantityText ?? data?.serving ?? data?.portion ?? null,
  calories: toNumberOrNull(data?.calories),
  protein: toNumberOrNull(data?.protein),
  carbs: toNumberOrNull(data?.carbs),
  fat: toNumberOrNull(data?.fat),
  recordedAt: data?.recordedAt ?? data?.createdAt ?? null,
});

const normalizeMeal = (data: any): DiaryMealGroup => ({
  mealType: data?.mealType ?? data?.meal ?? 'unknown',
  title: data?.title ?? data?.mealType ?? 'Bua an',
  totalCalories: toNumberOrNull(data?.totalCalories),
  protein: toNumberOrNull(data?.protein),
  carbs: toNumberOrNull(data?.carbs),
  fat: toNumberOrNull(data?.fat),
  entries: Array.isArray(data?.entries) ? data.entries.map(normalizeEntry) : [],
});

const normalizeSummary = (data: any): DaySummary => ({
  date: data?.date ?? new Date().toISOString(),
  totalCalories: toNumberOrNull(data?.totalCalories),
  targetCalories: toNumberOrNull(data?.targetCalories),
  protein: toNumberOrNull(data?.protein),
  carbs: toNumberOrNull(data?.carbs),
  fat: toNumberOrNull(data?.fat),
  meals: Array.isArray(data?.meals) ? data.meals.map(normalizeMeal) : [],
});

export const diaryService = {
  // Lay tong quan nhat ky ngay hom nay
  async getTodaySummary(): Promise<DaySummary> {
    const response = await apiClient.get('/api/summary/day');
    return normalizeSummary(response.data);
  },

  // Xoa mot entry khoi nhat ky
  async deleteEntry(entryId: string): Promise<void> {
    await apiClient.delete(`/api/diary/${entryId}`);
  },
};
