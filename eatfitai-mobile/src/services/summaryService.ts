import apiClient from './apiClient';
import { loadWithOfflineFallback } from './offlineCache';
import type { NutritionSummaryDto } from '../types';
import { formatLocalDate } from '../utils/localDate';

const WEEK_SUMMARY_CACHE_PREFIX = '@eatfit_cache:summary:week:';
const NUTRITION_SUMMARY_CACHE_PREFIX = '@eatfit_cache:summary:nutrition:';
const WEEKLY_REVIEW_CACHE_KEY = '@eatfit_cache:analytics:weekly-review';

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

export type WeeklyReview = {
  status: string;
  message: string;
  confidence: number;
  dataQuality: number;
  suggestedActions?: {
    type?: string;
    newTargetCalories?: number | null;
    newMacros?: {
      protein?: number;
      carbs?: number;
      fat?: number;
    } | null;
    lifestyleChanges?: string[];
    trackingTips?: string[];
  } | null;
  insights: {
    weightTrend?: string;
    complianceScore?: number;
    energyLevel?: string;
    recommendations: string[];
  };
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

const normalizeWeekData = (
  data: NutritionSummaryDto,
  targetDate?: string,
): WeekDaySummary[] => {
  // Tính ngày đầu tuần (Thứ 2) từ targetDate hoặc ngày hiện tại
  const refDate = targetDate ? new Date(targetDate) : new Date();
  const dayOfWeek = refDate.getDay();
  // Chuyển về Thứ 2 (day=1), nếu là Chủ nhật (day=0) thì lùi 6 ngày
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + mondayOffset);

  // Tạo mảng 7 ngày trong tuần (T2 → CN) với calories = 0
  const weekDays: WeekDaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(d);
    weekDays.push(normalizeDay(dateStr, 0, undefined));
  }

  if (!data?.dailyCalories) {
    return weekDays;
  }

  // Parse data từ backend
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

  // Map data vào đúng ngày trong tuần
  for (const item of dailyCaloriesArray) {
    const idx = weekDays.findIndex((d) => d.date === item.date);
    if (idx !== -1) {
      weekDays[idx] = normalizeDay(item.date, item.calories, item.targetCalories);
    }
  }

  return weekDays;
};

const normalizeWeeklyReview = (data: any): WeeklyReview => ({
  status: String(data?.status ?? 'CONTINUE'),
  message: String(data?.message ?? 'Tiếp tục theo dõi tiến độ!'),
  confidence: toNumber(data?.confidence, 0),
  dataQuality: toNumber(data?.dataQuality, 0),
  suggestedActions: data?.suggestedActions
    ? {
        type: data.suggestedActions?.type,
        newTargetCalories: toNumber(data.suggestedActions?.newTargetCalories, 0),
        newMacros: data.suggestedActions?.newMacros
          ? {
              protein: toNumber(data.suggestedActions.newMacros?.protein, 0),
              carbs: toNumber(data.suggestedActions.newMacros?.carbs, 0),
              fat: toNumber(data.suggestedActions.newMacros?.fat, 0),
            }
          : null,
        lifestyleChanges: Array.isArray(data.suggestedActions?.lifestyleChanges)
          ? data.suggestedActions.lifestyleChanges.map((item: unknown) => String(item))
          : [],
        trackingTips: Array.isArray(data.suggestedActions?.trackingTips)
          ? data.suggestedActions.trackingTips.map((item: unknown) => String(item))
          : [],
      }
    : null,
  insights: {
    weightTrend:
      typeof data?.insights?.weightTrend === 'string'
        ? data.insights.weightTrend
        : undefined,
    complianceScore: toNumber(data?.insights?.complianceScore, 0),
    energyLevel:
      typeof data?.insights?.energyLevel === 'string'
        ? data.insights.energyLevel
        : undefined,
    recommendations: Array.isArray(data?.insights?.recommendations)
      ? data.insights.recommendations.map((item: unknown) => String(item))
      : [],
  },
});

export const summaryService = {
  async getWeekSummary(date?: string): Promise<WeekSummary> {
    const targetDate = date ?? formatLocalDate(new Date());
    return loadWithOfflineFallback(`${WEEK_SUMMARY_CACHE_PREFIX}${targetDate}`, async () => {
      const response = await apiClient.get('/api/summary/week', {
        params: { date: targetDate },
      });
      const raw = response.data as NutritionSummaryDto;
      const days = normalizeWeekData(raw, targetDate);
      return {
        days,
        totalProtein: toNumber(raw.totalProtein),
        totalCarbs: toNumber(raw.totalCarbs),
        totalFat: toNumber(raw.totalFat),
        totalCalories: toNumber(raw.totalCalories),
      };
    });
  },

  async getNutritionSummary(
    startDate: string,
    endDate?: string,
  ): Promise<NutritionSummaryDto> {
    const cacheKey = `${NUTRITION_SUMMARY_CACHE_PREFIX}${startDate}:${endDate ?? ''}`;
    return loadWithOfflineFallback(cacheKey, async () => {
      const response = await apiClient.get('/api/analytics/nutrition-summary', {
        params: { startDate, endDate },
      });
      return response.data as NutritionSummaryDto;
    });
  },

  async getWeeklyReview(): Promise<WeeklyReview> {
    return loadWithOfflineFallback(WEEKLY_REVIEW_CACHE_KEY, async () => {
      const response = await apiClient.get('/api/analytics/weekly-review');
      return normalizeWeeklyReview(response.data);
    });
  },
};
