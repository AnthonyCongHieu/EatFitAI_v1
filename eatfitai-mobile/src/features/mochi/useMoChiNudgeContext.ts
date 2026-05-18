import { useMemo } from 'react';

import { useSmartReminders } from '../../hooks/useSmartReminders';
import { getMoChiExperience } from './mochiExperienceCatalog';
import type { MoChiPetEventType } from './mochiPetEngine';
import type { MoChiSurface } from './mochiNudgePolicy';

export interface MoChiNudgeCandidate {
  eventType: MoChiPetEventType;
  routeName: string;
  preferredSurface: Exclude<MoChiSurface, 'none'>;
  hasStrongTiming: boolean;
  title: string;
  message: string;
  ctaLabel?: string;
}

const MEAL_ROUTE_NAMES = new Set(['MealDiary']);

const buildReminderMessage = (label: string): string =>
  `Bạn chưa ghi ${label.toLowerCase()}. Thêm nhanh để nhật ký hôm nay liền mạch.`;

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
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      title: experience.title,
      message:
        reminder.type === 'meal'
          ? buildReminderMessage(reminder.label)
          : reminder.message,
      ctaLabel: experience.ctaLabel,
    };
  }, [currentRouteName, reminders]);
};
