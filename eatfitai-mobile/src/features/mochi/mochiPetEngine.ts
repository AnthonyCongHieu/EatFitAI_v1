import type { SmartReminder } from '../../hooks/useSmartReminders';
import {
  getMoChiPoseForEvent,
  type MoChiPetEventType,
  type MoChiPetMood,
  type MoChiPrimaryAction,
} from './mochiPoseCatalog';
import type { MoChiPoseKey } from '../../assets/mascot/mochi/mochiAssets';
import { getMoChiExperience } from './mochiExperienceCatalog';

export type { MoChiPetEventType, MoChiPetMood, MoChiPrimaryAction };

export type MoChiPetInput = {
  activeEvent?: MoChiPetEventType | null;
  reminders: SmartReminder[];
  totalCalories?: number | null;
  targetCalories?: number | null;
  waterAmountMl?: number | null;
  waterTargetMl?: number | null;
  currentStreak: number;
  totalXP: number;
  unlockedAchievementIds: string[];
};

export type MoChiPetState = {
  eventType: MoChiPetEventType;
  mood: MoChiPetMood;
  poseKey: MoChiPoseKey;
  dialogue: string;
  primaryAction: MoChiPrimaryAction;
  urgency: number;
  shouldBubble: boolean;
};

export const EMPTY_MOCHI_PET_INPUT: MoChiPetInput = {
  reminders: [],
  totalCalories: 0,
  targetCalories: 0,
  waterAmountMl: 2000,
  waterTargetMl: 2000,
  currentStreak: 0,
  totalXP: 0,
  unlockedAchievementIds: [],
};

export const BODY_SHAMING_MARKERS = [
  'béo',
  'mập',
  'xấu',
  'ốm quá',
  'body',
  'cân nặng của bạn tệ',
];

const EVENT_STATE: Partial<Record<
  MoChiPetEventType,
  Omit<MoChiPetState, 'eventType' | 'poseKey'>
>> = {
  app_idle: {
    mood: 'idle',
    dialogue: 'MoChi đang trực ca. Có món cần scan, bữa cần ghi, hay nước cần nhắc không?',
    primaryAction: 'scanFood',
    urgency: 1,
    shouldBubble: false,
  },
  tutorial_step: {
    mood: 'celebrating',
    dialogue: 'MoChi đi cùng bạn từng bước. Cứ thử từng việc, sai thì mình sửa tiếp.',
    primaryAction: 'dismiss',
    urgency: 4,
    shouldBubble: true,
  },
  meal_reminder: {
    mood: 'hungry',
    dialogue: 'Bữa này chưa thấy trong nhật ký. Ghi nhanh để MoChi còn canh kế hoạch giúp bạn.',
    primaryAction: 'addMeal',
    urgency: 8,
    shouldBubble: true,
  },
  water_reminder: {
    mood: 'thirsty',
    dialogue: 'Tạm dừng vài giây uống nước nha. MoChi thấy bình nước đang hơi cô đơn rồi.',
    primaryAction: 'water',
    urgency: 7,
    shouldBubble: true,
  },
  scan_processing: {
    mood: 'thinking',
    dialogue: 'MoChi đang soi món này. Chờ một nhịp để kiểm tra kết quả nhé.',
    primaryAction: 'scanFood',
    urgency: 9,
    shouldBubble: true,
  },
  scan_success: {
    mood: 'happy',
    dialogue: 'Nhận diện được rồi. Kiểm tra khẩu phần một chút trước khi lưu nha.',
    primaryAction: 'addMeal',
    urgency: 8,
    shouldBubble: true,
  },
  scan_empty: {
    mood: 'confused',
    dialogue: 'MoChi chưa nhìn ra món. Chụp rõ hơn hoặc tìm thủ công sẽ chắc hơn.',
    primaryAction: 'scanFood',
    urgency: 9,
    shouldBubble: true,
  },
  scan_error: {
    mood: 'error',
    dialogue: 'Có lỗi khi xử lý ảnh. Thử lại sau vài giây, MoChi vẫn ở đây canh tiếp.',
    primaryAction: 'scanFood',
    urgency: 10,
    shouldBubble: true,
  },
  meal_logged: {
    mood: 'happy',
    dialogue: 'Đã ghi bữa. MoChi cộng thêm một điểm gọn gàng cho hôm nay.',
    primaryAction: 'viewDiary',
    urgency: 6,
    shouldBubble: true,
  },
  water_added: {
    mood: 'thirsty',
    dialogue: 'Đã thêm nước. Nhịp nhỏ thôi nhưng kế hoạch cả ngày sẽ dễ thở hơn.',
    primaryAction: 'water',
    urgency: 5,
    shouldBubble: true,
  },
  streak_unlocked: {
    mood: 'celebrating',
    dialogue: 'Streak đang lên đẹp. MoChi cho phép bạn tự hào một chút.',
    primaryAction: 'viewProgress',
    urgency: 6,
    shouldBubble: true,
  },
  calorie_caution: {
    mood: 'concerned',
    dialogue: 'Calo hôm nay hơi vượt nhịp. Không sao, ghi tiếp để MoChi cân lại phần sau.',
    primaryAction: 'addMeal',
    urgency: 7,
    shouldBubble: true,
  },
  report_ready: {
    mood: 'reporting',
    dialogue: 'Báo cáo đã có tín hiệu mới. MoChi mở ra cho bạn xem bức tranh tổng nhé.',
    primaryAction: 'viewProgress',
    urgency: 4,
    shouldBubble: true,
  },
};

const ACTIVE_EVENT_PRIORITY = new Set<MoChiPetEventType>([
  'scan_error',
  'scan_empty',
  'scan_processing',
  'scan_success',
  'meal_logged',
  'water_added',
  'report_ready',
  'tutorial_step',
]);

const getReminderEvent = (reminders: SmartReminder[]): MoChiPetEventType | null => {
  const firstReminder = reminders[0];
  if (!firstReminder) return null;

  return firstReminder.type === 'water' ? 'water_reminder' : 'meal_reminder';
};

const shouldWarnCalories = (input: MoChiPetInput): boolean => {
  const totalCalories = input.totalCalories ?? 0;
  const targetCalories = input.targetCalories ?? 0;

  return targetCalories > 0 && totalCalories > targetCalories * 1.08;
};

const shouldNudgeWater = (input: MoChiPetInput): boolean => {
  const waterAmount = input.waterAmountMl ?? 0;
  const waterTarget = input.waterTargetMl ?? 2000;

  return waterTarget > 0 && waterAmount < waterTarget * 0.4;
};

const hasStreakMoment = (input: MoChiPetInput): boolean =>
  input.currentStreak >= 7 ||
  input.unlockedAchievementIds.includes('streak_7') ||
  input.unlockedAchievementIds.includes('streak_14') ||
  input.unlockedAchievementIds.includes('streak_30');

const resolveEventType = (input: MoChiPetInput): MoChiPetEventType => {
  if (input.activeEvent && ACTIVE_EVENT_PRIORITY.has(input.activeEvent)) {
    return input.activeEvent;
  }

  const reminderEvent = getReminderEvent(input.reminders);
  if (reminderEvent) return reminderEvent;
  if (shouldWarnCalories(input)) return 'calorie_caution';
  if (shouldNudgeWater(input)) return 'water_reminder';
  if (input.activeEvent === 'streak_unlocked' || hasStreakMoment(input)) return 'streak_unlocked';
  if (input.activeEvent) return input.activeEvent;

  return 'app_idle';
};

export const getMoChiPetState = (input: MoChiPetInput): MoChiPetState => {
  const eventType = resolveEventType(input);
  const experience = getMoChiExperience(eventType);

  return {
    eventType,
    poseKey: getMoChiPoseForEvent(eventType),
    mood: experience.mood,
    dialogue: experience.dialogue,
    primaryAction: experience.primaryAction,
    urgency: experience.priority,
    shouldBubble: experience.shouldBubble,
  };
};

export const getMoChiEventState = (eventType: MoChiPetEventType): MoChiPetState =>
  getMoChiPetState({
    ...EMPTY_MOCHI_PET_INPUT,
    activeEvent: eventType,
  });
