/**
 * useSmartReminders – Task A2.1 (Mở rộng)
 *
 * Kiểm tra nhật ký bữa ăn hôm nay & lượng nước để trả về nhắc nhở thông minh.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDiaryStore } from '../store/useDiaryStore';
import { MEAL_TYPES, type MealTypeId } from '../types';
import { waterService, type WaterIntakeData } from '../services/waterService';

export interface SmartReminder {
  id: string;
  type: 'meal' | 'water';
  label: string;
  emoji: string;
  message: string;
}

const MEAL_REMINDER_RULES: {
  mealTypeId: MealTypeId;
  label: string;
  emoji: string;
  afterHour: number;
  message: string;
}[] = [
  {
    mealTypeId: MEAL_TYPES.BREAKFAST,
    label: 'Bữa sáng',
    emoji: '🌅',
    afterHour: 9,
    message: 'Sáng nay bạn ăn gì rồi? Ghi lại nhé!',
  },
  {
    mealTypeId: MEAL_TYPES.LUNCH,
    label: 'Bữa trưa',
    emoji: '☀️',
    afterHour: 13,
    message: 'Trưa nay bạn ăn gì? Ghi nhanh nhé!',
  },
  {
    mealTypeId: MEAL_TYPES.DINNER,
    label: 'Bữa tối',
    emoji: '🌙',
    afterHour: 19,
    message: 'Tối nay bạn ăn gì? Đừng quên ghi nhé!',
  },
];

export function useSmartReminders(): {
  reminders: SmartReminder[];
  hasReminders: boolean;
  bubbleText: string | null;
} {
  const summary = useDiaryStore((s) => s.summary);

  const { data: waterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    staleTime: 2 * 60 * 1000,
  });

  return useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const reminders: SmartReminder[] = [];

    // --- 1. NHẮC NHỞ BỮA ĂN ---
    const loggedMealTypes = new Set<number>();
    if (summary?.meals) {
      for (const mealGroup of summary.meals) {
        if (mealGroup.entries.length > 0 && mealGroup.mealType != null) {
          loggedMealTypes.add(Number(mealGroup.mealType));
        }
      }
    }

    for (const rule of MEAL_REMINDER_RULES) {
      if (currentHour >= rule.afterHour && !loggedMealTypes.has(rule.mealTypeId)) {
        reminders.push({
          id: `meal-${rule.mealTypeId}`,
          type: 'meal',
          label: rule.label,
          emoji: rule.emoji,
          message: rule.message,
        });
      }
    }

    // --- 2. NHẮC NHỞ UỐNG NƯỚC THÔNG MINH ---
    const waterAmount = waterData?.amountMl ?? 0;
    const waterTarget = waterData?.targetMl ?? 2000;

    if (currentHour >= 20 && waterAmount < waterTarget * 0.75) {
      reminders.push({
        id: 'water-evening',
        type: 'water',
        label: 'Nước (Tối)',
        emoji: '💧',
        message: 'Gần hết ngày rồi, ráng uống thêm xíu nước nha!',
      });
    } else if (currentHour >= 15 && currentHour < 20 && waterAmount < waterTarget * 0.4) {
      reminders.push({
        id: 'water-afternoon',
        type: 'water',
        label: 'Nước (Chiều)',
        emoji: '💧',
        message: 'Bạn uống hơi ít nước rồi, bổ sung ngay nhé!',
      });
    }

    const hasReminders = reminders.length > 0;
    const bubbleText = hasReminders ? reminders[0]!.message : null;

    return { reminders, hasReminders, bubbleText };
  }, [summary, waterData]);
}
