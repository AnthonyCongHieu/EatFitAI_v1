import apiClient from './apiClient';
import { loadWithOfflineFallback } from './offlineCache';
import { formatBusinessDate } from '../utils/businessDate';

const DAILY_LOOP_CACHE_PREFIX = '@eatfit_cache:nutrition:daily-loop:';

export type DayLoopStatus =
  | 'no_log'
  | 'partial'
  | 'rough'
  | 'complete'
  | 'skipped'
  | 'low_confidence'
  | string;

export type DailyLoopAction = {
  action: string;
  label: string;
  deepLink: string;
};

export type DayMealState = {
  mealKey: string;
  mealTypeId: number | null;
  status: string;
  calories: number;
  isSkipped: boolean;
  isRough: boolean;
  confidenceScore: number | null;
};

export type DayState = {
  date: string;
  status: DayLoopStatus;
  isComplete: boolean;
  score: number;
  mealCount: number;
  mainMealCount: number;
  snackOnly: boolean;
  totalCalories: number;
  confidenceScore: number;
  nutritionStatus: string;
  nextAction: DailyLoopAction | null;
  requiredMainMeals: number;
  minimumCalories: number;
  missingMealTypes: string[];
  mealStates: DayMealState[];
};

export type MealBudget = {
  mealTypeId: number;
  mealKey: string;
  label: string;
  targetCalories: number;
  minCalories: number;
  maxCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
};

export type RemainingNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionStatus = {
  status: string;
  deltaCalories: number;
  message: string;
};

export type RecoverySuggestion = {
  tier: string;
  action: string;
  message: string;
  deepLink: string;
};

export type DailyNutritionLoop = {
  date: string;
  dayState: DayState;
  mealBudgets: MealBudget[];
  remaining: RemainingNutrition;
  nutritionStatus: NutritionStatus;
  recoverySuggestion: RecoverySuggestion | null;
  weeklyBalanceNote: string;
  oneJobToday: DailyLoopAction;
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

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = toNumberOr(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
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

const normalizeAction = (value: unknown): DailyLoopAction | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  return {
    action: toString(readField(data, 'action', 'Action')),
    label: toString(readField(data, 'label', 'Label')),
    deepLink: toString(readField(data, 'deepLink', 'DeepLink'), '/diary/add'),
  };
};

const normalizeMealState = (value: unknown): DayMealState => {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    mealKey: toString(readField(data, 'mealKey', 'MealKey')),
    mealTypeId: toNumberOrNull(readField(data, 'mealTypeId', 'MealTypeId')),
    status: toString(readField(data, 'status', 'Status'), 'missing'),
    calories: toNumberOr(readField(data, 'calories', 'Calories')),
    isSkipped: toBoolean(readField(data, 'isSkipped', 'IsSkipped')),
    isRough: toBoolean(readField(data, 'isRough', 'IsRough')),
    confidenceScore: toNumberOrNull(
      readField(data, 'confidenceScore', 'ConfidenceScore'),
    ),
  };
};

const normalizeDayState = (value: unknown, fallbackDate: string): DayState => {
  const data = (value ?? {}) as Record<string, unknown>;
  const rawMealStates = readField(data, 'mealStates', 'MealStates');
  return {
    date: toString(readField(data, 'date', 'Date'), fallbackDate),
    status: toString(readField(data, 'status', 'Status'), 'no_log'),
    isComplete: toBoolean(readField(data, 'isComplete', 'IsComplete')),
    score: toNumberOr(readField(data, 'score', 'Score')),
    mealCount: toNumberOr(readField(data, 'mealCount', 'MealCount')),
    mainMealCount: toNumberOr(readField(data, 'mainMealCount', 'MainMealCount')),
    snackOnly: toBoolean(readField(data, 'snackOnly', 'SnackOnly')),
    totalCalories: toNumberOr(readField(data, 'totalCalories', 'TotalCalories')),
    confidenceScore: toNumberOr(
      readField(data, 'confidenceScore', 'ConfidenceScore'),
      100,
    ),
    nutritionStatus: toString(
      readField(data, 'nutritionStatus', 'NutritionStatus'),
      'unknown',
    ),
    nextAction: normalizeAction(readField(data, 'nextAction', 'NextAction')),
    requiredMainMeals: toNumberOr(
      readField(data, 'requiredMainMeals', 'RequiredMainMeals'),
      2,
    ),
    minimumCalories: toNumberOr(
      readField(data, 'minimumCalories', 'MinimumCalories'),
      800,
    ),
    missingMealTypes: toStringArray(
      readField(data, 'missingMealTypes', 'MissingMealTypes'),
    ),
    mealStates: Array.isArray(rawMealStates) ? rawMealStates.map(normalizeMealState) : [],
  };
};

const normalizeMealBudget = (value: unknown): MealBudget => {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    mealTypeId: toNumberOr(readField(data, 'mealTypeId', 'MealTypeId')),
    mealKey: toString(readField(data, 'mealKey', 'MealKey')),
    label: toString(readField(data, 'label', 'Label')),
    targetCalories: toNumberOr(readField(data, 'targetCalories', 'TargetCalories')),
    minCalories: toNumberOr(readField(data, 'minCalories', 'MinCalories')),
    maxCalories: toNumberOr(readField(data, 'maxCalories', 'MaxCalories')),
    targetProtein: toNumberOr(readField(data, 'targetProtein', 'TargetProtein')),
    targetCarbs: toNumberOr(readField(data, 'targetCarbs', 'TargetCarbs')),
    targetFat: toNumberOr(readField(data, 'targetFat', 'TargetFat')),
  };
};

const normalizeRemaining = (value: unknown): RemainingNutrition => {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    calories: toNumberOr(readField(data, 'calories', 'Calories')),
    protein: toNumberOr(readField(data, 'protein', 'Protein')),
    carbs: toNumberOr(readField(data, 'carbs', 'Carbs')),
    fat: toNumberOr(readField(data, 'fat', 'Fat')),
  };
};

const normalizeNutritionStatus = (value: unknown): NutritionStatus => {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    status: toString(readField(data, 'status', 'Status'), 'unknown'),
    deltaCalories: toNumberOr(readField(data, 'deltaCalories', 'DeltaCalories')),
    message: toString(readField(data, 'message', 'Message')),
  };
};

const normalizeRecoverySuggestion = (value: unknown): RecoverySuggestion | null => {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  return {
    tier: toString(readField(data, 'tier', 'Tier')),
    action: toString(readField(data, 'action', 'Action')),
    message: toString(readField(data, 'message', 'Message')),
    deepLink: toString(readField(data, 'deepLink', 'DeepLink'), '/diary/add'),
  };
};

export const normalizeDailyNutritionLoop = (value: unknown): DailyNutritionLoop => {
  const data = (value ?? {}) as Record<string, unknown>;
  const date = toString(readField(data, 'date', 'Date'), formatBusinessDate());
  const rawBudgets = readField(data, 'mealBudgets', 'MealBudgets');
  return {
    date,
    dayState: normalizeDayState(readField(data, 'dayState', 'DayState'), date),
    mealBudgets: Array.isArray(rawBudgets) ? rawBudgets.map(normalizeMealBudget) : [],
    remaining: normalizeRemaining(readField(data, 'remaining', 'Remaining')),
    nutritionStatus: normalizeNutritionStatus(
      readField(data, 'nutritionStatus', 'NutritionStatus'),
    ),
    recoverySuggestion: normalizeRecoverySuggestion(
      readField(data, 'recoverySuggestion', 'RecoverySuggestion'),
    ),
    weeklyBalanceNote: toString(
      readField(data, 'weeklyBalanceNote', 'WeeklyBalanceNote'),
    ),
    oneJobToday: normalizeAction(readField(data, 'oneJobToday', 'OneJobToday')) ?? {
      action: 'log_next_meal',
      label: 'Log next meal',
      deepLink: '/diary/add',
    },
  };
};

export const dailyLoopService = {
  async getDailyLoop(date = formatBusinessDate()): Promise<DailyNutritionLoop> {
    return loadWithOfflineFallback(`${DAILY_LOOP_CACHE_PREFIX}${date}`, async () => {
      const response = await apiClient.get('/api/nutrition/daily-loop', {
        params: { date },
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });
      if (response.status === 404) {
        return normalizeDailyNutritionLoop({ date });
      }

      return normalizeDailyNutritionLoop(response.data);
    });
  },
};
