import apiClient from './apiClient';
import { loadWithOfflineFallback, offlineCache } from './offlineCache';
import type { MealDiaryDto, MealTypeId } from '../types';
import { MEAL_TYPE_LABELS } from '../types';
import logger from '../utils/logger';

const DAY_SUMMARY_CACHE_PREFIX = '@eatfit_cache:diary:summary:';
const DAY_COMBINED_CACHE_PREFIX = '@eatfit_cache:diary:combined:';
const DAY_ENTRIES_CACHE_PREFIX = '@eatfit_cache:diary:entries:';
const WEEK_SUMMARY_CACHE_PREFIX = '@eatfit_cache:diary:week:';

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
  photoUrl?: string | null;
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
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  meals: DiaryMealGroup[];
};

export type WeekSummary = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  dailyCalories: Record<string, number>;
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
  mealType: (data?.mealTypeId as MealTypeId) ?? 1,
  foodName: data?.foodItemName ?? data?.userDishName ?? data?.recipeName ?? 'Món ăn',
  note: data?.note ?? null,
  quantityText: data?.portionQuantity
    ? `${data.portionQuantity} ${data.servingUnitName ?? 'serving'}`
    : `${data.grams}g`,
  calories: data?.calories ?? null,
  protein: data?.protein ?? null,
  carbs: data?.carb ?? null,
  fat: data?.fat ?? null,
  recordedAt: data?.createdAt ?? null,
  createdAt: data?.createdAt ?? null,
  updatedAt: data?.updatedAt ?? null,
  isDeleted: data?.isDeleted ?? null,
  sourceMethod: data?.sourceMethod ?? null,
  photoUrl: data?.photoUrl ?? null,
});

const normalizeMeal = (data: any): DiaryMealGroup => {
  const mealTypeId = data?.mealTypeId ?? data?.mealType ?? data?.meal ?? 'unknown';
  const mealType = typeof mealTypeId === 'number' ? (mealTypeId as MealTypeId) : 1;
  const title =
    data?.title ??
    (typeof mealTypeId === 'number'
      ? MEAL_TYPE_LABELS[mealTypeId as MealTypeId]
      : 'Bữa ăn');

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
  protein: toNumberOrNull(data?.totalProtein ?? data?.protein),
  carbs: toNumberOrNull(data?.totalCarbs ?? data?.carbs),
  fat: toNumberOrNull(data?.totalFat ?? data?.fat),
  targetProtein: toNumberOrNull(data?.targetProtein),
  targetCarbs: toNumberOrNull(data?.targetCarbs),
  targetFat: toNumberOrNull(data?.targetFat),
  meals: Array.isArray(data?.meals) ? data.meals.map(normalizeMeal) : [],
});

const normalizeWeekSummary = (data: any): WeekSummary => {
  logger.debug('[diaryService] Raw week summary:', JSON.stringify(data));

  return {
    totalCalories: toNumberOrNull(data?.totalCalories ?? data?.TotalCalories) ?? 0,
    totalProtein: toNumberOrNull(data?.totalProtein ?? data?.TotalProtein) ?? 0,
    totalCarbs: toNumberOrNull(data?.totalCarbs ?? data?.TotalCarbs) ?? 0,
    totalFat: toNumberOrNull(data?.totalFat ?? data?.TotalFat) ?? 0,
    dailyCalories: data?.dailyCalories ?? data?.DailyCalories ?? {},
  };
};

const todayDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const groupByMeal = (entries: DiaryEntry[]): DiaryMealGroup[] => {
  const map = new Map<MealTypeId, DiaryMealGroup>();

  for (const entry of entries) {
    const key = typeof entry.mealType === 'number' ? entry.mealType : 1;
    const group = map.get(key) ?? {
      mealType: key,
      title: MEAL_TYPE_LABELS[key],
      totalCalories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      entries: [],
    };

    group.entries.push(entry);
    group.totalCalories = (group.totalCalories ?? 0) + (entry.calories ?? 0);
    group.protein = (group.protein ?? 0) + (entry.protein ?? 0);
    group.carbs = (group.carbs ?? 0) + (entry.carbs ?? 0);
    group.fat = (group.fat ?? 0) + (entry.fat ?? 0);
    map.set(key, group);
  }

  return Array.from(map.values());
};

export const diaryService = {
  async getTodaySummary(): Promise<DaySummary> {
    const date = todayDate();
    return loadWithOfflineFallback(`${DAY_SUMMARY_CACHE_PREFIX}${date}`, async () => {
      const response = await apiClient.get('/api/summary/day', { params: { date } });
      logger.debug('[EatFitAI DEBUG] Raw API response:', JSON.stringify(response.data));
      const normalized = normalizeSummary(response.data);
      logger.debug('[EatFitAI DEBUG] Normalized summary:', JSON.stringify(normalized));
      return normalized;
    });
  },

  async getWeekSummary(date: string): Promise<WeekSummary> {
    return loadWithOfflineFallback(`${WEEK_SUMMARY_CACHE_PREFIX}${date}`, async () => {
      const response = await apiClient.get('/api/summary/week', { params: { date } });
      return normalizeWeekSummary(response.data);
    });
  },

  async getEntriesByDate(date: string): Promise<DiaryEntry[]> {
    return loadWithOfflineFallback(`${DAY_ENTRIES_CACHE_PREFIX}${date}`, async () => {
      const response = await apiClient.get('/api/meal-diary', { params: { date } });
      const rows = Array.isArray(response.data) ? response.data : [];
      return rows.map(normalizeEntry);
    });
  },

  async getTodayCombined(): Promise<DaySummary> {
    return this.getDayCombined(todayDate());
  },

  async getDayCombined(date: string): Promise<DaySummary> {
    return loadWithOfflineFallback(`${DAY_COMBINED_CACHE_PREFIX}${date}`, async () => {
      const [summaryResp, entries] = await Promise.all([
        apiClient.get('/api/summary/day', { params: { date } }),
        this.getEntriesByDate(date),
      ]);
      const summary = normalizeSummary(summaryResp.data);
      const meals = groupByMeal(entries);
      const combined = { ...summary, meals };
      await offlineCache.set(`${DAY_SUMMARY_CACHE_PREFIX}${date}`, summary);
      return combined;
    });
  },

  async copyPreviousDay(date: string, mealTypeId?: MealTypeId): Promise<DiaryEntry[]> {
    const payload: { targetDate: string; mealTypeId?: MealTypeId } = {
      targetDate: date,
    };

    if (mealTypeId != null) {
      payload.mealTypeId = mealTypeId;
    }

    const response = await apiClient.post('/api/meal-diary/copy-previous-day', payload);
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.map(normalizeEntry);
  },

  async deleteEntry(entryId: string): Promise<void> {
    await apiClient.delete(`/api/meal-diary/${entryId}`);
  },

  async updateEntry(
    entryId: string,
    updates: { grams?: number; note?: string },
  ): Promise<void> {
    await apiClient.put(`/api/meal-diary/${entryId}`, {
      grams: updates.grams,
      note: updates.note,
    });
  },
};
