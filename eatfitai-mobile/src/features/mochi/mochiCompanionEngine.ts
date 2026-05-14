import type { SmartReminder } from '../../hooks/useSmartReminders';

export type MochiMood =
  | 'idle'
  | 'hungry_nudge'
  | 'thirsty'
  | 'calorie_caution'
  | 'streak_flex';

export type MochiAnimation =
  | 'idle'
  | 'wave'
  | 'happy'
  | 'thinking'
  | 'surprised'
  | 'reminder'
  | 'drinkWater'
  | 'celebrate';

export type MochiPrimaryAction =
  | 'scanFood'
  | 'addMeal'
  | 'water'
  | 'viewProgress';

export type MochiAccessoryId =
  | 'water_bottle'
  | 'medal'
  | 'trophy'
  | 'streak_badge';

export type MochiCompanionInput = {
  reminders: SmartReminder[];
  totalCalories?: number | null;
  targetCalories?: number | null;
  waterAmountMl?: number | null;
  waterTargetMl?: number | null;
  currentStreak: number;
  totalXP: number;
  unlockedAchievementIds: string[];
};

export type MochiCompanionState = {
  mood: MochiMood;
  animation: MochiAnimation;
  dialogue: string;
  primaryAction: MochiPrimaryAction;
  activeAccessoryIds: MochiAccessoryId[];
};

export const BODY_SHAMING_MARKERS = [
  'béo',
  'mập',
  'xấu',
  'ốm quá',
  'body',
  'cân nặng của bạn tệ',
];

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

const getProgressAccessories = (
  input: MochiCompanionInput,
): MochiAccessoryId[] => {
  const accessories: MochiAccessoryId[] = [];

  if ((input.waterAmountMl ?? 0) < (input.waterTargetMl ?? 2000) * 0.4) {
    accessories.push('water_bottle');
  }

  if (input.currentStreak >= 7 || input.unlockedAchievementIds.includes('streak_7')) {
    accessories.push('streak_badge');
  }

  if (input.currentStreak >= 14 || input.unlockedAchievementIds.includes('streak_14')) {
    accessories.push('medal');
  }

  if (input.currentStreak >= 14 || input.unlockedAchievementIds.includes('streak_30')) {
    accessories.push('trophy');
  }

  return unique(accessories);
};

export const getMochiCompanionState = (
  input: MochiCompanionInput,
): MochiCompanionState => {
  const firstReminder = input.reminders[0];
  const accessories = getProgressAccessories(input);
  const waterAmount = input.waterAmountMl ?? 0;
  const waterTarget = input.waterTargetMl ?? 2000;
  const totalCalories = input.totalCalories ?? 0;
  const targetCalories = input.targetCalories ?? 0;

  if (firstReminder?.type === 'meal') {
    return {
      mood: 'hungry_nudge',
      animation: 'reminder',
      dialogue: `Mochi không phán xét đâu... nhưng cái bụng đang hỏi bữa ${firstReminder.label.toLowerCase()} ở đâu rồi.`,
      primaryAction: 'addMeal',
      activeAccessoryIds: accessories,
    };
  }

  if (firstReminder?.type === 'water' || waterAmount < waterTarget * 0.4) {
    return {
      mood: 'thirsty',
      animation: 'drinkWater',
      dialogue: 'Bạn định chạy bằng Wi-Fi hả? Uống miếng nước đi, Mochi nhìn khát giùm rồi.',
      primaryAction: 'water',
      activeAccessoryIds: unique(['water_bottle', ...accessories]),
    };
  }

  if (targetCalories > 0 && totalCalories > targetCalories * 1.08) {
    return {
      mood: 'calorie_caution',
      animation: 'surprised',
      dialogue: 'Hôm nay hơi nhiệt tình với đồ ăn rồi đó. Không sao, log tiếp để Mochi còn cứu kế hoạch.',
      primaryAction: 'addMeal',
      activeAccessoryIds: accessories,
    };
  }

  if (input.currentStreak >= 7) {
    return {
      mood: 'streak_flex',
      animation: 'celebrate',
      dialogue: `Streak ${input.currentStreak} ngày. Được đó, Mochi tạm thời chưa cà khịa bạn hôm nay.`,
      primaryAction: 'viewProgress',
      activeAccessoryIds: accessories,
    };
  }

  return {
    mood: 'idle',
    animation: 'idle',
    dialogue: 'Mochi đang trực ca. Có món gì cần scan không, hay lại định để trí nhớ tự xử?',
    primaryAction: 'scanFood',
    activeAccessoryIds: accessories,
  };
};
