import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useDiaryStore } from '../../store/useDiaryStore';
import { waterService, type WaterIntakeData } from '../../services/waterService';
import {
  useMoChiNotificationInboxStore,
  type MoChiNotificationItem,
} from './mochiNotificationInbox';

export type MoChiReminderSettings = {
  enabled: boolean;
  breakfastEnabled: boolean;
  breakfastTime: string;
  lunchEnabled: boolean;
  lunchTime: string;
  dinnerEnabled: boolean;
  dinnerTime: string;
  snackEnabled: boolean;
  snackTime: string;
  waterReminderEnabled: boolean;
  weeklyReviewEnabled: boolean;
  streakRiskEnabled: boolean;
  aiRecipeSuggestionsEnabled: boolean;
  aiNutritionTipsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursFrom: string;
  quietHoursTo: string;
};

export type MoChiReminderCandidate = MoChiNotificationItem;

type BuildMoChiReminderCandidatesInput = {
  now: Date;
  settings: MoChiReminderSettings;
  loggedMealTypes: number[];
  waterAmountMl: number;
  waterTargetMl: number;
  includePassiveTips?: boolean;
};

type OverlayDecision = {
  shouldShow: boolean;
  reason: string;
};

type SystemNotificationBehavior = {
  shouldSchedule: boolean;
  androidPriority: 'DEFAULT' | 'HIGH';
};

const APP_TIME_ZONE = 'Asia/Bangkok';
const MEAL_GRACE_MINUTES = 30;
const RETRY_READY_GRACE_MS = 5 * 60 * 1000;
const NOTIFICATIONS_SETTINGS_KEY = '@eatfitai_notifications';
const MINUTE_MS = 60 * 1000;

const DEFAULT_REMINDER_SETTINGS: MoChiReminderSettings = {
  enabled: true,
  breakfastEnabled: true,
  breakfastTime: '07:30',
  lunchEnabled: true,
  lunchTime: '12:00',
  dinnerEnabled: true,
  dinnerTime: '19:00',
  snackEnabled: false,
  snackTime: '15:30',
  waterReminderEnabled: true,
  weeklyReviewEnabled: true,
  streakRiskEnabled: true,
  aiRecipeSuggestionsEnabled: false,
  aiNutritionTipsEnabled: true,
  quietHoursEnabled: true,
  quietHoursFrom: '22:00',
  quietHoursTo: '07:00',
};

const reminderSettingsListeners = new Set<() => void>();

export const notifyMoChiReminderSettingsChanged = (): void => {
  reminderSettingsListeners.forEach((listener) => listener());
};

const subscribeMoChiReminderSettingsChanged = (listener: () => void): (() => void) => {
  reminderSettingsListeners.add(listener);
  return () => reminderSettingsListeners.delete(listener);
};

const MEAL_CONFIG = [
  {
    mealTypeId: 1,
    enabledKey: 'breakfastEnabled',
    timeKey: 'breakfastTime',
    label: 'Bữa sáng',
  },
  {
    mealTypeId: 2,
    enabledKey: 'lunchEnabled',
    timeKey: 'lunchTime',
    label: 'Bữa trưa',
  },
  {
    mealTypeId: 3,
    enabledKey: 'dinnerEnabled',
    timeKey: 'dinnerTime',
    label: 'Bữa tối',
  },
  {
    mealTypeId: 4,
    enabledKey: 'snackEnabled',
    timeKey: 'snackTime',
    label: 'Bữa phụ',
  },
] as const;

const readBangkokParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
};

const toDateKey = (date: Date): string => {
  const { year, month, day } = readBangkokParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const parseTimeToMinutes = (value: string): number => {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }

  return hour * 60 + minute;
};

const addLocalDays = (
  parts: ReturnType<typeof readBangkokParts>,
  days: number,
): ReturnType<typeof readBangkokParts> => {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  return readBangkokParts(utc);
};

const toBangkokDateIso = ({
  year,
  month,
  day,
  minutes,
}: {
  year: number;
  month: number;
  day: number;
  minutes: number;
}): string => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute)).toISOString();
};

const isInQuietHours = (nowMinutes: number, fromMinutes: number, toMinutes: number): boolean => {
  if (fromMinutes === toMinutes) {
    return false;
  }

  if (fromMinutes < toMinutes) {
    return nowMinutes >= fromMinutes && nowMinutes < toMinutes;
  }

  return nowMinutes >= fromMinutes || nowMinutes < toMinutes;
};

const getQuietRetryAfter = (
  now: Date,
  settings: MoChiReminderSettings,
): string | undefined => {
  if (!settings.quietHoursEnabled) {
    return undefined;
  }

  const nowParts = readBangkokParts(now);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const fromMinutes = parseTimeToMinutes(settings.quietHoursFrom);
  const toMinutes = parseTimeToMinutes(settings.quietHoursTo);

  if (!isInQuietHours(nowMinutes, fromMinutes, toMinutes)) {
    return undefined;
  }

  const endDay = fromMinutes > toMinutes && nowMinutes >= fromMinutes
    ? addLocalDays(nowParts, 1)
    : nowParts;

  return toBangkokDateIso({
    year: endDay.year,
    month: endDay.month,
    day: endDay.day,
    minutes: toMinutes,
  });
};

export const buildMoChiReminderCandidates = ({
  now,
  settings,
  loggedMealTypes,
  waterAmountMl,
  waterTargetMl,
  includePassiveTips = false,
}: BuildMoChiReminderCandidatesInput): MoChiReminderCandidate[] => {
  if (!settings.enabled) {
    return [];
  }

  const candidates: MoChiReminderCandidate[] = [];
  const nowParts = readBangkokParts(now);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const dateKey = toDateKey(now);
  const quietRetryAfter = getQuietRetryAfter(now, settings);
  const loggedMeals = new Set(loggedMealTypes);

  MEAL_CONFIG.forEach((meal) => {
    const isEnabled = Boolean(settings[meal.enabledKey]);
    if (!isEnabled || loggedMeals.has(meal.mealTypeId)) {
      return;
    }

    const mealMinutes = parseTimeToMinutes(settings[meal.timeKey]);
    if (nowMinutes <= mealMinutes + MEAL_GRACE_MINUTES) {
      return;
    }

    candidates.push({
      id: `meal_reminder-${meal.mealTypeId}-${dateKey}`,
      eventType: 'meal_reminder',
      category: 'reminder',
      severity: 'active',
      source: 'orchestrator',
      title: `${meal.label} còn trống`,
      body: 'Nếu bạn đã ăn rồi, thêm nhanh bữa gần nhất để nhật ký liền mạch hơn.',
      ctaLabel: 'Ghi bữa',
      action: 'addMeal',
      mealTypeId: meal.mealTypeId,
      dueAt: toBangkokDateIso({
        year: nowParts.year,
        month: nowParts.month,
        day: nowParts.day,
        minutes: mealMinutes,
      }),
      createdAt: now.toISOString(),
      retryAfter: quietRetryAfter,
    });
  });

  if (
    settings.waterReminderEnabled
    && waterTargetMl > 0
    && waterAmountMl < waterTargetMl * 0.6
  ) {
    candidates.push({
      id: `water_reminder-${dateKey}`,
      eventType: 'water_reminder',
      category: 'reminder',
      severity: 'active',
      source: 'orchestrator',
      title: 'Nhắc uống nước',
      body: 'Ghi thêm một ly nước nếu bạn vừa uống xong.',
      ctaLabel: 'Ghi nước',
      action: 'addWater',
      dueAt: now.toISOString(),
      createdAt: now.toISOString(),
      retryAfter: quietRetryAfter,
    });
  }

  if (includePassiveTips && settings.aiNutritionTipsEnabled) {
    candidates.push({
      id: `ai-tip-${dateKey}`,
      eventType: 'nutrition_targets',
      category: 'tip',
      severity: 'passive',
      source: 'orchestrator',
      title: 'Gợi ý nhỏ từ MoChi',
      body: 'Khi có thêm dữ liệu, MoChi sẽ gom gợi ý nhẹ nhàng trong hộp thông báo.',
      ctaLabel: 'Mở thông báo',
      action: 'openNotifications',
      dueAt: now.toISOString(),
      createdAt: now.toISOString(),
      retryAfter: undefined,
    });
  }

  return candidates;
};

export const canShowMoChiTopOverlay = (
  item: MoChiReminderCandidate,
  routeName: string,
  now: Date = new Date(),
): OverlayDecision => {
  if (item.category === 'tip' || item.severity === 'passive') {
    return { shouldShow: false, reason: 'passive-inbox-only' };
  }

  if (routeName === 'MealDiary' && item.eventType === 'meal_reminder') {
    return { shouldShow: false, reason: 'visible-target-inline' };
  }

  if (item.retryAfter && new Date(item.retryAfter).getTime() - now.getTime() > RETRY_READY_GRACE_MS) {
    return { shouldShow: false, reason: 'retry-window' };
  }

  return { shouldShow: true, reason: 'important-ready' };
};

export const resolveMoChiSystemNotificationBehavior = (
  eventType: string,
): SystemNotificationBehavior => {
  if (eventType === 'nutrition_targets' || eventType === 'recipe_success') {
    return { shouldSchedule: false, androidPriority: 'DEFAULT' };
  }

  if (eventType === 'streak_unlocked') {
    return { shouldSchedule: true, androidPriority: 'HIGH' };
  }

  return { shouldSchedule: true, androidPriority: 'DEFAULT' };
};

const readReminderSettings = async (): Promise<MoChiReminderSettings> => {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_SETTINGS_KEY);
  if (!stored) {
    return DEFAULT_REMINDER_SETTINGS;
  }

  return {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(JSON.parse(stored) as Partial<MoChiReminderSettings>),
  };
};

const getLoggedMealTypes = (summary: ReturnType<typeof useDiaryStore.getState>['summary']): number[] => {
  if (!summary?.meals) {
    return [];
  }

  return summary.meals
    .filter((meal) => meal.entries.length > 0 && meal.mealType != null)
    .map((meal) => Number(meal.mealType));
};

export const useMoChiReminderOrchestrator = (enabled = true): void => {
  const summary = useDiaryStore((state) => state.summary);
  const isLoadingDiary = useDiaryStore((state) => state.isLoading);
  const fetchSummary = useDiaryStore((state) => state.fetchSummary);
  const upsertItem = useMoChiNotificationInboxStore((state) => state.upsertItem);
  const resolveMatching = useMoChiNotificationInboxStore((state) => state.resolveMatching);
  const prune = useMoChiNotificationInboxStore((state) => state.prune);
  const [settings, setSettings] = useState<MoChiReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [minuteTick, setMinuteTick] = useState(0);
  const { data: waterData, refetch: refetchWater } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    enabled,
    staleTime: 2 * MINUTE_MS,
  });

  const reloadSettings = useCallback(async () => {
    try {
      setSettings(await readReminderSettings());
    } catch {
      setSettings(DEFAULT_REMINDER_SETTINGS);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void reloadSettings();
    return subscribeMoChiReminderSettingsChanged(() => {
      void reloadSettings();
    });
  }, [enabled, reloadSettings]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setInterval(() => {
      setMinuteTick((value) => value + 1);
    }, MINUTE_MS);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      setMinuteTick((value) => value + 1);
      void reloadSettings();
      void refetchWater();
      void fetchSummary().catch(() => {});
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [enabled, fetchSummary, refetchWater, reloadSettings]);

  useEffect(() => {
    if (!enabled || summary || isLoadingDiary) {
      return;
    }

    void fetchSummary().catch(() => {});
  }, [enabled, fetchSummary, isLoadingDiary, summary]);

  const loggedMealTypes = useMemo(() => getLoggedMealTypes(summary), [summary]);
  const now = useMemo(() => new Date(), [minuteTick]);
  const candidates = useMemo(
    () =>
      buildMoChiReminderCandidates({
        now,
        settings,
        loggedMealTypes,
        waterAmountMl: waterData?.amountMl ?? 0,
        waterTargetMl: waterData?.targetMl ?? 2000,
      }),
    [
      loggedMealTypes,
      now,
      settings,
      waterData?.amountMl,
      waterData?.targetMl,
    ],
  );

  useEffect(() => {
    if (!enabled || !waterData) {
      return;
    }

    prune(now);
    candidates.forEach((candidate) => upsertItem(candidate, now));
    resolveMatching(
      (item) =>
        (item.eventType === 'meal_reminder'
          && item.mealTypeId != null
          && loggedMealTypes.includes(item.mealTypeId))
        || (item.eventType === 'water_reminder'
          && waterData.targetMl > 0
          && waterData.amountMl >= waterData.targetMl * 0.6),
      now,
    );
  }, [
    candidates,
    enabled,
    loggedMealTypes,
    now,
    prune,
    resolveMatching,
    upsertItem,
    waterData,
  ]);
};
