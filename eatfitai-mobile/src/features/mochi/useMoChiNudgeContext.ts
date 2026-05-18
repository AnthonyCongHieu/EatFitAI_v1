import { useMemo } from 'react';

import { useSmartReminders } from '../../hooks/useSmartReminders';
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

export const MEAL_DIARY_INLINE_NUDGE_COPY = {
  title: 'Bữa này còn trống',
  message: 'Thêm bữa gần nhất để nhật ký hôm nay liền mạch hơn.',
  ctaLabel: 'Ghi bữa',
} as const;

export const useMoChiNudgeContext = (
  currentRouteName?: string | null,
): MoChiNudgeCandidate | null => {
  const { reminders } = useSmartReminders({
    enabled: Boolean(currentRouteName && !currentRouteName.includes('Auth')),
  });

  return useMemo(() => {
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
  }, [currentRouteName, reminders]);
};
