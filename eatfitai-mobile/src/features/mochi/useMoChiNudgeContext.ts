import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSmartReminders } from '../../hooks/useSmartReminders';
import { dailyLoopService, type DailyNutritionLoop } from '../../services/dailyLoopService';
import { formatBusinessDate } from '../../utils/businessDate';
import { getMoChiExperience } from './mochiExperienceCatalog';
import type {
  MoChiNotificationAction,
  MoChiNotificationCategory,
  MoChiNotificationSeverity,
} from './mochiNotificationInbox';
import type { MoChiPetEventType } from './mochiPetEngine';
import type { MoChiSurface } from './mochiNudgePolicy';

export interface MoChiNudgeCandidate {
  eventType: MoChiPetEventType;
  routeName: string;
  preferredSurface: Exclude<MoChiSurface, 'none'>;
  hasStrongTiming: boolean;
  isCollisionSafe: boolean;
  placement?: 'top' | 'inline';
  inboxItemId?: string;
  notificationAction?: MoChiNotificationAction;
  notificationCategory?: MoChiNotificationCategory;
  notificationSeverity?: MoChiNotificationSeverity;
  mealTypeId?: number;
  bypassOverlayCooldown?: boolean;
  title: string;
  message: string;
  ctaLabel?: string;
}

const MEAL_ROUTE_NAMES = new Set(['MealDiary']);
const HOME_ROUTE_NAMES = new Set(['HomeTab']);
const DAILY_LOOP_STALE_MS = 60 * 1000;

const getDailyLoopMessage = (dailyLoop: DailyNutritionLoop): string =>
  dailyLoop.recoverySuggestion?.message
  || dailyLoop.nutritionStatus?.message
  || dailyLoop.weeklyBalanceNote
  || dailyLoop.dayState.nextAction?.label
  || dailyLoop.oneJobToday?.label
  || 'Ghi nhanh một bữa để MoChi hiểu nhịp hôm nay của bạn rõ hơn.';

export const buildDailyLoopMoChiCandidate = (
  dailyLoop: DailyNutritionLoop | undefined,
  currentRouteName?: string | null,
): MoChiNudgeCandidate | null => {
  if (!dailyLoop || !currentRouteName || !HOME_ROUTE_NAMES.has(currentRouteName)) {
    return null;
  }

  if (dailyLoop.dayState.isComplete || dailyLoop.dayState.status === 'complete') {
    return null;
  }

  const message = getDailyLoopMessage(dailyLoop).trim();
  if (!message) {
    return null;
  }

  return {
    eventType: dailyLoop.dayState.status === 'no_log' ? 'diary_empty_today' : 'diary_review',
    routeName: currentRouteName,
    preferredSurface: 'overlay',
    hasStrongTiming: true,
    isCollisionSafe: true,
    notificationAction: 'addMeal',
    notificationCategory: 'reminder',
    notificationSeverity: 'active',
    title: dailyLoop.oneJobToday?.label || 'Quay lại nhịp hôm nay',
    message,
    ctaLabel: 'Mở nhật ký',
  };
};

export const MEAL_DIARY_INLINE_NUDGE_COPY = {
  title: 'Bữa này còn trống',
  message: 'Thêm bữa gần nhất để nhật ký hôm nay liền mạch hơn.',
  ctaLabel: 'Ghi bữa',
} as const;

export const useMoChiNudgeContext = (
  currentRouteName?: string | null,
): MoChiNudgeCandidate | null => {
  const dailyLoopDate = formatBusinessDate();
  const { data: dailyLoop } = useQuery<DailyNutritionLoop>({
    queryKey: ['daily-loop', dailyLoopDate],
    queryFn: () => dailyLoopService.getDailyLoop(dailyLoopDate),
    enabled: Boolean(currentRouteName && HOME_ROUTE_NAMES.has(currentRouteName)),
    staleTime: DAILY_LOOP_STALE_MS,
  });
  const { reminders } = useSmartReminders({
    enabled: Boolean(currentRouteName && !currentRouteName.includes('Auth')),
  });

  return useMemo(() => {
    const dailyLoopCandidate = buildDailyLoopMoChiCandidate(dailyLoop, currentRouteName);
    if (dailyLoopCandidate) {
      return dailyLoopCandidate;
    }

    if (!currentRouteName || !MEAL_ROUTE_NAMES.has(currentRouteName)) {
      return null;
    }

    const reminder = reminders[0];
    if (!reminder) {
      return null;
    }

    const eventType: MoChiPetEventType =
      reminder.type === 'water' ? 'water_reminder' : 'meal_reminder';
    const experience = getMoChiExperience(eventType);

    return {
      eventType,
      routeName: currentRouteName,
      preferredSurface: 'inline',
      hasStrongTiming: false,
      isCollisionSafe: false,
      title:
        reminder.type === 'meal'
          ? MEAL_DIARY_INLINE_NUDGE_COPY.title
          : experience.title,
      message:
        reminder.type === 'meal'
          ? MEAL_DIARY_INLINE_NUDGE_COPY.message
          : reminder.message,
      ctaLabel:
        reminder.type === 'meal'
          ? MEAL_DIARY_INLINE_NUDGE_COPY.ctaLabel
          : experience.ctaLabel,
    };
  }, [currentRouteName, dailyLoop, reminders]);
};
