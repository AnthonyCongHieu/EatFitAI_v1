/**
 * useMealReminders – Task A2.1
 *
 * Kiểm tra nhật ký bữa ăn hôm nay và trả về danh sách nhắc nhở
 * (thiếu bữa sáng/trưa/tối dựa theo giờ hiện tại).
 *
 * Sử dụng dữ liệu từ useDiaryStore (đã có sẵn cache từ HomeScreen).
 */
import { useMemo } from 'react';
import { useDiaryStore } from '../store/useDiaryStore';
import { MEAL_TYPES, type MealTypeId } from '../types';

export interface MealReminder {
  mealTypeId: MealTypeId;
  label: string;
  emoji: string;
  message: string;
}

/**
 * Quy tắc thời gian:
 * - Từ 09:00 trở đi mà chưa có Bữa sáng → nhắc
 * - Từ 13:00 trở đi mà chưa có Bữa trưa → nhắc
 * - Từ 19:00 trở đi mà chưa có Bữa tối → nhắc
 *
 * Ý nghĩa: Chỉ nhắc sau khi "đã quá giờ ăn" một khoảng hợp lý,
 * tránh nhắc quá sớm (ví dụ 6h sáng hỏi "bạn ăn chưa" thì vô nghĩa).
 */
const MEAL_REMINDER_RULES: {
  mealTypeId: MealTypeId;
  label: string;
  emoji: string;
  afterHour: number; // Bắt đầu nhắc từ giờ này
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

export function useMealReminders(): {
  reminders: MealReminder[];
  hasReminders: boolean;
  /** Dòng text ngắn gọn cho bong bóng chat Mascot (ưu tiên nhắc bữa đầu tiên) */
  bubbleText: string | null;
} {
  const summary = useDiaryStore((s) => s.summary);

  return useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    // Lấy danh sách mealTypeId đã có trong nhật ký hôm nay
    const loggedMealTypes = new Set<number>();
    if (summary?.meals) {
      for (const mealGroup of summary.meals) {
        if (mealGroup.entries.length > 0 && mealGroup.mealType != null) {
          loggedMealTypes.add(Number(mealGroup.mealType));
        }
      }
    }

    const reminders: MealReminder[] = [];

    for (const rule of MEAL_REMINDER_RULES) {
      // Chỉ nhắc nếu đã quá giờ ăn VÀ chưa có dữ liệu bữa đó
      if (currentHour >= rule.afterHour && !loggedMealTypes.has(rule.mealTypeId)) {
        reminders.push({
          mealTypeId: rule.mealTypeId,
          label: rule.label,
          emoji: rule.emoji,
          message: rule.message,
        });
      }
    }

    const hasReminders = reminders.length > 0;
    const bubbleText = hasReminders ? reminders[0]!.message : null;

    return { reminders, hasReminders, bubbleText };
  }, [summary]);
}
