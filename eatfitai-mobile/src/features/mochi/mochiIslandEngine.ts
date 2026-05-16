import type { SmartReminder } from '../../hooks/useSmartReminders';
import type {
  MoChiPoseKey,
  MoChiSpriteVariant,
} from '../../assets/mascot/mochi/mochiAssets';
import {
  getMoChiPoseForEvent,
  MOCHI_SPRITE_CATALOG,
  type MoChiPetEventType,
  type MoChiPetMood,
} from './mochiPoseCatalog';
import { getMoChiExperience } from './mochiExperienceCatalog';

export type MoChiIslandMode = 'compact' | 'message' | 'live' | 'confirm';

export type MoChiIslandPresentation = {
  height: number;
  reservedHeight: number;
  spriteSize: number;
  spriteVariant: MoChiSpriteVariant;
  maxLines: number;
};

export type MoChiIslandConfirmationAction =
  | 'addMeal'
  | 'water'
  | 'reviewVoice'
  | 'scanFood'
  | 'viewProgress'
  | null;

export type MoChiVoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'parsing'
  | 'review'
  | 'executing'
  | 'committing'
  | 'success'
  | 'error';

export type MoChiIslandInput = {
  routeName?: string | null;
  activeEvent?: MoChiPetEventType | null;
  reminders: SmartReminder[];
  totalCalories?: number | null;
  targetCalories?: number | null;
  waterAmountMl?: number | null;
  waterTargetMl?: number | null;
  currentStreak: number;
  totalXP: number;
  unlockedAchievementIds: string[];
  voiceStatus?: MoChiVoiceStatus | null;
  isOffline?: boolean;
  dismissedEventType?: MoChiPetEventType | null;
  now?: Date;
};

export type MoChiIslandState = {
  eventType: MoChiPetEventType;
  mode: MoChiIslandMode;
  mood: MoChiPetMood;
  poseKey: MoChiPoseKey;
  message: string | null;
  ctaLabel: string | null;
  confirmationAction: MoChiIslandConfirmationAction;
  priority: number;
  autoHideMs: number | null;
  cooldownKey: string | null;
  presentation: MoChiIslandPresentation;
};

const CONFIRM_AUTO_HIDE_MS = 8000;

const COMPACT_PRESENTATION: MoChiIslandPresentation = {
  height: 42,
  reservedHeight: 58,
  spriteSize: 34,
  spriteVariant: 'face',
  maxLines: 1,
};

const COMPACT_STATE: MoChiIslandState = {
  eventType: 'companion_rest',
  mode: 'compact',
  mood: 'idle',
  poseKey: 'islandAvatar',
  message: null,
  ctaLabel: null,
  confirmationAction: null,
  priority: 0,
  autoHideMs: null,
  cooldownKey: null,
  presentation: COMPACT_PRESENTATION,
};

const ACTIVE_EVENT_PRIORITY = new Set<MoChiPetEventType>([
  'scan_error',
  'scan_empty',
  'scan_processing',
  'scan_success',
  'meal_logged',
  'water_added',
  'report_ready',
  'streak_unlocked',
  'generic_error',
  'app_offline',
]);

const SUCCESS_EVENTS = new Set<MoChiPetEventType>([
  'meal_logged',
  'water_added',
  'scan_success',
  'voice_success',
  'streak_unlocked',
  'achievement_unlocked',
  'report_ready',
]);

const ERROR_EVENTS = new Set<MoChiPetEventType>([
  'scan_error',
  'scan_empty',
  'voice_error',
  'food_search_error',
  'recipe_error',
  'generic_error',
  'app_offline',
]);

const LIVE_EVENTS = new Set<MoChiPetEventType>([
  'scan_processing',
  'voice_listening',
  'recipe_searching',
]);

const CONFIRM_EVENT_TO_ACTION: Partial<
  Record<MoChiPetEventType, Exclude<MoChiIslandConfirmationAction, null>>
> = {
  meal_reminder: 'addMeal',
  diary_empty_today: 'addMeal',
  food_search_empty: 'addMeal',
  water_reminder: 'water',
  hydration_goal: 'water',
  voice_review: 'reviewVoice',
  scan_empty: 'scanFood',
  calorie_caution: 'addMeal',
  stats_low_data: 'addMeal',
  weekly_review: 'viewProgress',
};

const CONFIRM_ACTION_LABEL: Record<
  Exclude<MoChiIslandConfirmationAction, null>,
  string
> = {
  addMeal: 'Ghi bữa',
  water: 'Ghi nước',
  reviewVoice: 'Kiểm tra',
  scanFood: 'Quét lại',
  viewProgress: 'Xem',
};

const VOICE_STATUS_EVENT: Partial<Record<MoChiVoiceStatus, MoChiPetEventType>> = {
  listening: 'voice_listening',
  processing: 'voice_listening',
  parsing: 'voice_listening',
  review: 'voice_review',
  executing: 'voice_review',
  committing: 'voice_review',
  success: 'voice_success',
  error: 'voice_error',
};

const EVENT_MESSAGE_OVERRIDE: Partial<Record<MoChiPetEventType, string>> = {
  voice_listening: 'MoChi đang nghe món, lượng và bữa.',
  voice_review: 'Rà lại lệnh giọng nói trước khi lưu.',
  voice_success: 'Đã xử lý lệnh giọng nói.',
  voice_error: 'MoChi chưa hiểu rõ lệnh này.',
  scan_processing: 'MoChi đang phân tích món ăn.',
  scan_success: 'Có kết quả scan, kiểm tra trước khi lưu.',
  scan_empty: 'Ảnh hơi khó đọc, thử quét lại nhé.',
  scan_error: 'Scan bị lỗi, thử lại sau một nhịp.',
  meal_logged: 'Đã ghi bữa vào nhật ký.',
  water_added: 'Đã ghi thêm nước cho hôm nay.',
  report_ready: 'Có tín hiệu mới trong tiến độ.',
  app_offline: 'Kết nối chưa ổn, chuẩn bị dữ liệu trước nhé.',
};

const getHour = (input: MoChiIslandInput): number =>
  (input.now ?? new Date()).getHours();

const getReminderEvent = (reminders: SmartReminder[]): MoChiPetEventType | null => {
  const firstReminder = reminders[0];
  if (!firstReminder) return null;

  return firstReminder.type === 'water' ? 'water_reminder' : 'meal_reminder';
};

const shouldWarnCalories = (input: MoChiIslandInput): boolean => {
  const totalCalories = input.totalCalories ?? 0;
  const targetCalories = input.targetCalories ?? 0;

  return targetCalories > 0 && totalCalories > targetCalories * 1.08;
};

const shouldNudgeWater = (input: MoChiIslandInput): boolean => {
  const waterAmount = input.waterAmountMl ?? 0;
  const waterTarget = input.waterTargetMl ?? 2000;
  const hour = getHour(input);

  return waterTarget > 0 && hour >= 12 && waterAmount < waterTarget * 0.4;
};

const hasStreakMoment = (input: MoChiIslandInput): boolean =>
  input.currentStreak >= 7 ||
  input.unlockedAchievementIds.includes('streak_7') ||
  input.unlockedAchievementIds.includes('streak_14') ||
  input.unlockedAchievementIds.includes('streak_30');

const getRouteEvent = (routeName?: string | null): MoChiPetEventType | null => {
  if (routeName === 'VoiceTab') return 'voice_idle';
  if (routeName === 'StatsTab') return 'stats_low_data';
  return null;
};

const resolveEventType = (input: MoChiIslandInput): MoChiPetEventType => {
  const voiceEvent = input.voiceStatus ? VOICE_STATUS_EVENT[input.voiceStatus] : null;
  if (voiceEvent && input.voiceStatus !== 'idle') return voiceEvent;

  if (input.activeEvent && ACTIVE_EVENT_PRIORITY.has(input.activeEvent)) {
    return input.activeEvent;
  }

  if (input.isOffline) return 'app_offline';

  const reminderEvent = getReminderEvent(input.reminders);
  if (reminderEvent) return reminderEvent;
  if (shouldWarnCalories(input)) return 'calorie_caution';
  if (shouldNudgeWater(input)) return 'water_reminder';
  if (input.activeEvent === 'streak_unlocked' || hasStreakMoment(input)) {
    return 'streak_unlocked';
  }
  if (input.activeEvent) return input.activeEvent;

  return getRouteEvent(input.routeName) ?? 'companion_rest';
};

const resolveMode = (eventType: MoChiPetEventType): MoChiIslandMode => {
  if (LIVE_EVENTS.has(eventType)) return 'live';
  if (CONFIRM_EVENT_TO_ACTION[eventType]) return 'confirm';
  if (SUCCESS_EVENTS.has(eventType) || ERROR_EVENTS.has(eventType)) return 'message';
  if (eventType === 'companion_rest' || eventType === 'app_idle') return 'compact';
  return 'message';
};

const resolveAutoHideMs = (mode: MoChiIslandMode): number | null => {
  if (mode === 'message') return 4200;
  if (mode === 'confirm') return CONFIRM_AUTO_HIDE_MS;
  if (mode === 'live') return null;
  return null;
};

const getMessage = (eventType: MoChiPetEventType, mode: MoChiIslandMode): string | null => {
  if (mode === 'compact') return null;
  return EVENT_MESSAGE_OVERRIDE[eventType] ?? getMoChiExperience(eventType).dialogue;
};

const EXPANDED_FACE_POSE_FALLBACK: Partial<Record<MoChiPetEventType, MoChiPoseKey>> = {
  voice_idle: 'idle',
  voice_listening: 'listeningNotice',
  voice_review: 'mealPortionNotice',
  voice_error: 'scanErrorFull',
  food_search_empty: 'mealChoice',
  food_search_error: 'scanErrorFull',
  stats_low_data: 'weeklyReportNotice',
  profile_incomplete: 'secureAccountFull',
  favorite_saved: 'thumbsUp',
  app_offline: 'secureAccountFull',
  generic_error: 'scanErrorFull',
  companion_love: 'heartLove',
  companion_determined: 'thumbsUp',
  companion_surprised: 'confused',
  companion_embarrassed: 'confused',
  companion_strained: 'angry',
};

const getDisplayPoseKey = (
  eventType: MoChiPetEventType,
  mode: MoChiIslandMode,
): MoChiPoseKey => {
  if (mode === 'compact') {
    return 'islandAvatar';
  }

  const poseKey = getMoChiPoseForEvent(eventType);
  if (MOCHI_SPRITE_CATALOG[poseKey]?.variant === 'face') {
    return EXPANDED_FACE_POSE_FALLBACK[eventType] ?? 'idle';
  }

  return poseKey;
};

const getPresentation = (
  mode: MoChiIslandMode,
  poseKey: MoChiPoseKey,
  message: string | null,
  confirmationAction: MoChiIslandConfirmationAction,
): MoChiIslandPresentation => {
  if (mode === 'compact') {
    return COMPACT_PRESENTATION;
  }

  const poseVariant = MOCHI_SPRITE_CATALOG[poseKey]?.variant ?? 'notice';
  const messageLength = message?.length ?? 0;
  const needsTallConfirm = Boolean(confirmationAction) && messageLength > 58;
  const needsTallMessage = mode === 'message' && messageLength > 72;
  const height = needsTallConfirm ? 132 : needsTallMessage ? 110 : mode === 'message' ? 92 : 108;
  const reservedHeight = height + (needsTallConfirm ? 20 : 18);

  return {
    height,
    reservedHeight,
    spriteSize: mode === 'message' ? 60 : 64,
    spriteVariant: poseVariant === 'face' ? 'full' : poseVariant,
    maxLines: needsTallConfirm ? 4 : needsTallMessage ? 3 : mode === 'message' ? 2 : 3,
  };
};

export const getMoChiIslandState = (input: MoChiIslandInput): MoChiIslandState => {
  const eventType = resolveEventType(input);
  const mode = resolveMode(eventType);

  if (mode !== 'live' && input.dismissedEventType === eventType) {
    return COMPACT_STATE;
  }

  const experience = getMoChiExperience(eventType);
  const confirmationAction = CONFIRM_EVENT_TO_ACTION[eventType] ?? null;
  const poseKey = getDisplayPoseKey(eventType, mode);
  const message = getMessage(eventType, mode);

  return {
    eventType,
    mode,
    mood: experience.mood,
    poseKey,
    message,
    ctaLabel: confirmationAction
      ? CONFIRM_ACTION_LABEL[confirmationAction]
      : experience.ctaLabel ?? null,
    confirmationAction,
    priority: experience.priority,
    autoHideMs: resolveAutoHideMs(mode),
    cooldownKey: mode === 'confirm' || mode === 'message' ? eventType : null,
    presentation: getPresentation(mode, poseKey, message, confirmationAction),
  };
};
