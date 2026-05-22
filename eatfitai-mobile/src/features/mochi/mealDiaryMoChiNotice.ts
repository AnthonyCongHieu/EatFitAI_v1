import type { MoChiPoseKey } from '../../assets/mascot/mochi/mochiAssets';
import type { MealTypeId } from '../../types';
import type { MoChiPetEventType } from './mochiPetEngine';

export type MealDiaryMoChiNotice = {
  mochiEvent: MoChiPetEventType;
  title: string;
  message: string;
  ctaLabel: string;
  poseKey?: MoChiPoseKey;
  isOverdue: boolean;
};

type ResolveMealDiaryMoChiNoticeInput = {
  mealType: MealTypeId;
  entryCount: number;
  selectedDate?: Date;
  now?: Date;
};

const MEAL_LABELS: Record<MealTypeId, string> = {
  1: 'Bữa sáng',
  2: 'Bữa trưa',
  3: 'Bữa tối',
  4: 'Bữa phụ',
};

const MEAL_SEQUENCE: MealTypeId[] = [1, 2, 3, 4];

const MEAL_WINDOW_START_HOURS: Record<MealTypeId, number> = {
  1: 0,
  2: 11,
  3: 17,
  4: 20,
};

export const MEAL_DIARY_EMPTY_MEAL_COPY = {
  title: 'Bữa này đang đợi bạn đó! 🍽️',
  message: 'Ghi nhanh món cho bữa này để nhật ký dinh dưỡng rõ ràng hơn nha!',
  ctaLabel: 'Ghi bữa',
} as const;

const getLocalDayStart = (date: Date): number => {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate.getTime();
};

const getCurrentMealType = (now: Date): MealTypeId => {
  const currentHour = now.getHours();

  for (let index = MEAL_SEQUENCE.length - 1; index >= 0; index -= 1) {
    const mealType = MEAL_SEQUENCE[index] as MealTypeId;
    if (currentHour >= MEAL_WINDOW_START_HOURS[mealType]) {
      return mealType;
    }
  }

  return 1;
};

const getMealIndex = (mealType: MealTypeId): number => MEAL_SEQUENCE.indexOf(mealType);

const getMealTiming = (
  mealType: MealTypeId,
  selectedDate: Date,
  now: Date,
): { shouldShow: boolean; isOverdue: boolean } => {
  const selectedDay = getLocalDayStart(selectedDate);
  const currentDay = getLocalDayStart(now);

  if (selectedDay > currentDay) {
    return { shouldShow: false, isOverdue: false };
  }

  if (selectedDay < currentDay) {
    return { shouldShow: true, isOverdue: true };
  }

  const currentMealType = getCurrentMealType(now);
  const mealIndex = getMealIndex(mealType);
  const currentMealIndex = getMealIndex(currentMealType);

  return {
    shouldShow: mealIndex <= currentMealIndex,
    isOverdue: mealIndex < currentMealIndex,
  };
};

export const resolveMealDiaryMoChiNotice = ({
  mealType,
  entryCount,
  now = new Date(),
  selectedDate = now,
}: ResolveMealDiaryMoChiNoticeInput): MealDiaryMoChiNotice | null => {
  if (entryCount > 0) {
    return null;
  }

  const mealLabel = MEAL_LABELS[mealType];
  const { shouldShow, isOverdue } = getMealTiming(mealType, selectedDate, now);

  if (!shouldShow) {
    return null;
  }

  if (!isOverdue) {
    return {
      mochiEvent: 'meal_reminder',
      ...MEAL_DIARY_EMPTY_MEAL_COPY,
      isOverdue: false,
    };
  }

  return {
    mochiEvent: 'meal_reminder',
    title: `${mealLabel} trễ hẹn rồi đó nha! 😤`,
    message: `Tớ vẫn chưa thấy ${mealLabel.toLowerCase()} trong nhật ký. Ghi nhanh một món để MoChi khỏi sốt ruột nha!`,
    ctaLabel: 'Ghi ngay',
    poseKey: 'angry',
    isOverdue: true,
  };
};
