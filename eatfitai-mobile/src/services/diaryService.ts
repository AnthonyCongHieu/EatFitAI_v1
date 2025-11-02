// Service lam viec voi API nhat ky an uong trong ngay
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { MealDiaryDto } from '../types';

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
  date: data?.date ?? data?.mealDate ?? new Date().toISOString(),
  totalCalories: toNumberOrNull(data?.totalCalories),
  targetCalories: toNumberOrNull(data?.targetCalories),
  protein: toNumberOrNull(data?.protein),
  carbs: toNumberOrNull(data?.carbs),
  fat: toNumberOrNull(data?.fat),
  meals: Array.isArray(data?.meals) ? data.meals.map(normalizeMeal) : [],
});

const todayDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const groupByMeal = (entries: DiaryEntry[]): DiaryMealGroup[] => {
  const map = new Map<string, DiaryMealGroup>();
  for (const e of entries) {
    const key = e.mealType || 'unknown';
    const g = map.get(key) ?? { mealType: key, title: key, totalCalories: 0, protein: 0, carbs: 0, fat: 0, entries: [] };
    g.entries.push(e);
    g.totalCalories = (g.totalCalories ?? 0) + (e.calories ?? 0);
    g.protein = (g.protein ?? 0) + (e.protein ?? 0);
    g.carbs = (g.carbs ?? 0) + (e.carbs ?? 0);
    g.fat = (g.fat ?? 0) + (e.fat ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values());
};

export const diaryService = {
  // Lay tong quan nhat ky ngay (mặc định hôm nay)
  async getTodaySummary(): Promise<DaySummary> {
    const date = todayDate();
    const response = await apiClient.get('/api/summary/day', { params: { date } });
    return normalizeSummary(response.data);
  },

  async getEntriesByDate(date: string): Promise<DiaryEntry[]> {
    const response = await apiClient.get('/api/diary', { params: { date } });
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.map((r: any) => ({
      id: String(r?.id ?? ''),
      mealType: (r?.mealCode as string) ?? 'unknown',
      foodName: (r?.foodName as string) ?? (r?.name as string) ?? 'Món ăn',
      note: r?.notes ?? null,
      quantityText: typeof r?.quantityGrams === 'number' ? `${Math.round(r.quantityGrams)} g` : null,
      calories: toNumberOrNull(r?.caloriesKcal),
      protein: toNumberOrNull(r?.proteinGrams),
      carbs: toNumberOrNull(r?.carbohydrateGrams),
      fat: toNumberOrNull(r?.fatGrams),
      recordedAt: r?.createdAt ?? null,
    }));
  },

  async getTodayCombined(): Promise<DaySummary> {
    const date = todayDate();
    const [summary, entries] = await Promise.all([
      this.getTodaySummary(),
      this.getEntriesByDate(date),
    ]);
    const meals = groupByMeal(entries);
    return { ...summary, meals };
  },

  // Xoa mot entry khoi nhat ky
  async deleteEntry(entryId: string): Promise<void> {
    await apiClient.delete(`/api/diary/${entryId}`);
  },

  // Cap nhat mot entry trong nhat ky
  async updateEntry(entryId: string, updates: { quantityGrams?: number; notes?: string }): Promise<void> {
    await apiClient.put(`/api/diary/${entryId}`, updates);
  },
};
