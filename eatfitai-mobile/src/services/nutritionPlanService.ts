import apiClient from './apiClient';
import { loadWithOfflineFallback } from './offlineCache';

const FLEXIBLE_PLAN_CACHE_PREFIX = '@eatfit_cache:nutrition:flexible-plan:';

export type FlexibleNutritionPlanParams = {
  goal?: string;
  preference?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
};

export type NutritionTargetPlan = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealTemplate = {
  mealKey: string;
  label: string;
  minCalories: number;
  maxCalories: number;
  structure: string;
};

export type PlanWeek = {
  weekNumber: number;
  focusKey: string;
  title: string;
  actions: string[];
};

export type FlexibleNutritionPlan = {
  goal: string;
  preference: string;
  durationWeeks: number;
  isFixedMenu: boolean;
  dailyTarget: NutritionTargetPlan;
  mealTemplates: MealTemplate[];
  weeks: PlanWeek[];
  preferenceTips: string[];
};

const readField = (source: any, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (source?.[key] != null) return source[key];
  }
  return undefined;
};

const toNumberOr = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
};

const toString = (value: unknown, fallback = ''): string =>
  value == null ? fallback : String(value);

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

const normalizeTarget = (value: unknown): NutritionTargetPlan => {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    calories: toNumberOr(readField(data, 'calories', 'Calories')),
    protein: toNumberOr(readField(data, 'protein', 'Protein')),
    carbs: toNumberOr(readField(data, 'carbs', 'Carbs')),
    fat: toNumberOr(readField(data, 'fat', 'Fat')),
  };
};

const normalizeMealTemplate = (value: unknown): MealTemplate => {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    mealKey: toString(readField(data, 'mealKey', 'MealKey')),
    label: toString(readField(data, 'label', 'Label')),
    minCalories: toNumberOr(readField(data, 'minCalories', 'MinCalories')),
    maxCalories: toNumberOr(readField(data, 'maxCalories', 'MaxCalories')),
    structure: toString(readField(data, 'structure', 'Structure')),
  };
};

const normalizeWeek = (value: unknown): PlanWeek => {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    weekNumber: toNumberOr(readField(data, 'weekNumber', 'WeekNumber')),
    focusKey: toString(readField(data, 'focusKey', 'FocusKey')),
    title: toString(readField(data, 'title', 'Title')),
    actions: toStringArray(readField(data, 'actions', 'Actions')),
  };
};

export const normalizeFlexibleNutritionPlan = (value: unknown): FlexibleNutritionPlan => {
  const data = (value ?? {}) as Record<string, unknown>;
  const rawTemplates = readField(data, 'mealTemplates', 'MealTemplates');
  const rawWeeks = readField(data, 'weeks', 'Weeks');

  return {
    goal: toString(readField(data, 'goal', 'Goal'), 'maintain'),
    preference: toString(readField(data, 'preference', 'Preference'), 'home_meals'),
    durationWeeks: toNumberOr(readField(data, 'durationWeeks', 'DurationWeeks'), 4),
    isFixedMenu: toBoolean(readField(data, 'isFixedMenu', 'IsFixedMenu')),
    dailyTarget: normalizeTarget(readField(data, 'dailyTarget', 'DailyTarget')),
    mealTemplates: Array.isArray(rawTemplates) ? rawTemplates.map(normalizeMealTemplate) : [],
    weeks: Array.isArray(rawWeeks) ? rawWeeks.map(normalizeWeek) : [],
    preferenceTips: toStringArray(readField(data, 'preferenceTips', 'PreferenceTips')),
  };
};

const buildParams = (params: FlexibleNutritionPlanParams) => {
  const result: Record<string, string | number> = {};
  if (params.goal) result.goal = params.goal;
  if (params.preference) result.preference = params.preference;
  if (params.targetCalories != null) result.targetCalories = params.targetCalories;
  if (params.targetProtein != null) result.targetProtein = params.targetProtein;
  if (params.targetCarbs != null) result.targetCarbs = params.targetCarbs;
  if (params.targetFat != null) result.targetFat = params.targetFat;
  return result;
};

export const nutritionPlanService = {
  async getFlexiblePlan(params: FlexibleNutritionPlanParams = {}): Promise<FlexibleNutritionPlan> {
    const queryParams = buildParams(params);
    const cacheKey = `${FLEXIBLE_PLAN_CACHE_PREFIX}${JSON.stringify(queryParams)}`;

    return loadWithOfflineFallback(cacheKey, async () => {
      const response = await apiClient.get('/api/nutrition/flexible-plan', {
        params: queryParams,
      });
      return normalizeFlexibleNutritionPlan(response.data);
    });
  },
};
