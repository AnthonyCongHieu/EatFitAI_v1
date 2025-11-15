// Service lam viec voi API nhat ky an uong trong ngay
// Chu thich bang tieng Viet khong dau

import apiClient from './apiClient';
import type { MealDiaryDto, MealTypeId } from '../types';
import { MEAL_TYPE_LABELS } from '../types';

export type DiaryMealType = MealTypeId;

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
  createdAt?: string | null;
  updatedAt?: string | null;
  isDeleted?: boolean | null;
  sourceMethod?: string | null;
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

const normalizeEntry = (data: MealDiaryDto): DiaryEntry => ({
  id: String(data?.mealDiaryId ?? ''),
  mealType: (data?.mealTypeId as MealTypeId) ?? 1, // Default to breakfast if unknown
  foodName: data?.foodItemName ?? data?.userDishName ?? data?.recipeName ?? 'Mon an',
  note: data?.note ?? null,
  quantityText: data?.portionQuantity ? `${data.portionQuantity} ${data.servingUnitName ?? 'serving'}` : `${data.grams}g`,
  calories: data?.calories ?? null,
  protein: data?.protein ?? null,
  carbs: data?.carb ?? null,
  fat: data?.fat ?? null,
  recordedAt: data?.createdAt ?? null,
  createdAt: data?.createdAt ?? null,
  updatedAt: data?.updatedAt ?? null,
  isDeleted: data?.isDeleted ?? null,
  sourceMethod: data?.sourceMethod ?? null,
});

const normalizeMeal = (data: any): DiaryMealGroup => {
  const mealTypeId = data?.mealTypeId ?? data?.mealType ?? data?.meal ?? 'unknown';
  const mealType = typeof mealTypeId === 'number' ? (mealTypeId as MealTypeId) : 1; // Default to breakfast if unknown
  const title = data?.title ?? (typeof mealTypeId === 'number' ? MEAL_TYPE_LABELS[mealTypeId as MealTypeId] : data?.mealType ?? 'Bua an');

  return {
    mealType,
    title,
    totalCalories: toNumberOrNull(data?.totalCalories),
    protein: toNumberOrNull(data?.protein),
    carbs: toNumberOrNull(data?.carbs),
    fat: toNumberOrNull(data?.fat),
    entries: Array.isArray(data?.entries) ? data.entries.map(normalizeEntry) : [],
  };
};

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
  const map = new Map<MealTypeId, DiaryMealGroup>();
  for (const e of entries) {
    const key = typeof e.mealType === 'number' ? e.mealType : 1; // Default to breakfast
    const g = map.get(key) ?? { mealType: key, title: MEAL_TYPE_LABELS[key], totalCalories: 0, protein: 0, carbs: 0, fat: 0, entries: [] };
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

  // Lay tong quan nhat ky tuan
  async getWeekSummary(date: string): Promise<DaySummary> {
    const response = await apiClient.get('/api/summary/week', { params: { date } });
    return normalizeSummary(response.data);
  },

  async getEntriesByDate(date: string): Promise<DiaryEntry[]> {
    const response = await apiClient.get('/api/meal-diary', { params: { date } });
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.map(normalizeEntry);
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
    await apiClient.delete(`/api/meal-diary/${entryId}`);
  },

  // Cap nhat mot entry trong nhat ky
  async updateEntry(entryId: string, updates: { grams?: number; note?: string }): Promise<void> {
    await apiClient.put(`/api/meal-diary/${entryId}`, {
      grams: updates.grams,
      note: updates.note,
    });
  },
};
