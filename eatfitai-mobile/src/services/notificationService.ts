/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
// notificationService.ts - Quản lý local notifications cho meal reminders
// Sử dụng expo-notifications để schedule thông báo
// LƯU Ý: Expo Go không hỗ trợ native modules, cần development build để test

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { navigateToStatsWeeklyReview } from '../app/navigation/navigationRef';
import {
  toMoChiNotificationItemFromPayload,
  useMoChiNotificationInboxStore,
} from '../features/mochi/mochiNotificationInbox';
import {
  notifyMoChiReminderSettingsChanged,
  resolveMoChiSystemNotificationBehavior,
} from '../features/mochi/mochiReminderOrchestrator';
import logger from '../utils/logger';
import apiClient from './apiClient';
import { trackEvent } from './analytics';

// Lazy import để tránh crash trong Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsAvailable = false;

const isExpoGo = Constants.appOwnership === 'expo';

// Try load notifications module. Expo Go SDK 53+ không còn hỗ trợ Android remote
// notifications; require module trong Expo Go sẽ bắn warning/error native gây nhiễu UI.
if (isExpoGo) {
  logger.info('[NotificationService] Skip native notifications in Expo Go');
} else {
  try {
    const notificationsModule =
      require('expo-notifications') as typeof import('expo-notifications');
    Notifications = notificationsModule;
    notificationsAvailable = true;

    // Config hiển thị notification khi app đang foreground
    notificationsModule.setNotificationHandler({
      handleNotification: async (notification) => {
        const isHandledByMoChi = isMoChiHandledNotification(
          notification.request.content.data as Record<string, unknown> | undefined,
        );

        return {
          shouldShowAlert: !isHandledByMoChi,
          shouldPlaySound: !isHandledByMoChi,
          shouldSetBadge: false,
          shouldShowBanner: !isHandledByMoChi,
          shouldShowList: true,
        };
      },
    });
    logger.info('[NotificationService] Native module loaded successfully');
  } catch (error) {
    logger.info('[NotificationService] Native module không available');
    notificationsAvailable = false;
  }
}

// Key lưu trữ cài đặt notifications
const NOTIFICATIONS_SETTINGS_KEY = '@eatfitai_notifications';
const PUSH_REGISTRATION_KEY = '@eatfitai_push_registration';

// Types
export interface NotificationSettings {
  enabled: boolean;
  breakfastEnabled: boolean;
  breakfastTime: string; // "HH:mm"
  lunchEnabled: boolean;
  lunchTime: string;
  dinnerEnabled: boolean;
  dinnerTime: string;
  snackEnabled: boolean;
  snackTime: string;

  waterReminderEnabled: boolean;
  weeklyReviewEnabled: boolean;
  goalAchievedEnabled: boolean;
  streakRiskEnabled: boolean;

  aiRecipeSuggestionsEnabled: boolean;
  aiNutritionTipsEnabled: boolean;
  aiAchievementUnlockedEnabled: boolean;

  quietHoursEnabled: boolean;
  quietHoursFrom: string;
  quietHoursTo: string;
}

export interface ScheduledNotification {
  identifier: string;
  mealType: string;
}

export interface NotificationDecision {
  shouldNudge: boolean;
  reason: string;
  reasonToSend?: string | null;
  reasonToSuppress?: string | null;
  suppressUntil?: string | null;
  suggestedMessage: string;
  deepLink: string;
  quietHours?: string;
  cooldownPassed?: boolean;
  predictedMealWindow?: string | null;
  currentDayState?: string | null;
}

interface PushRegistrationCache {
  expoPushToken: string;
  platform: string;
  appVersion: string;
  runtimeVersion: string;
  channel: string;
  permissionStatus: string;
}

// Notification identifiers để quản lý
const NOTIFICATION_IDS = {
  breakfast: 'meal-reminder-breakfast',
  lunch: 'meal-reminder-lunch',
  dinner: 'meal-reminder-dinner',
  snack: 'meal-reminder-snack',
  weeklyReview: 'weekly-review',
  water: 'water-reminder',
  streak: 'streak-risk',
  aiRecipes: 'ai-recipes',
  aiTips: 'ai-tips',
};
const WEEKLY_REVIEW_DAY = 2;
const WEEKLY_REVIEW_TIME = '08:30';
type NotificationTarget = 'weekly-review';

let notificationResponseSubscription: { remove: () => void } | null = null;
let notificationReceivedSubscription: { remove: () => void } | null = null;
let pendingNotificationTarget: NotificationTarget | null = null;

export const isMoChiHandledNotification = (
  data?: Record<string, unknown> | null,
): boolean => typeof data?.mochiEventType === 'string';

const getExpoProjectId = (): string | undefined => {
  const constantsWithEas = Constants as unknown as { easConfig?: { projectId?: string } };
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    constantsWithEas.easConfig?.projectId
  );
};

const getAppVersion = (): string => Constants.expoConfig?.version ?? '1.0.0';
const getRuntimeVersion = (): string =>
  String(Constants.expoConfig?.runtimeVersion ?? Updates.runtimeVersion ?? getAppVersion());
const getChannel = (): string => Updates.channel || 'production';

// Meal reminder messages
const MEAL_MESSAGES = {
  breakfast: {
    title: '🌅 Bữa sáng!',
    body: 'Đã đến giờ ghi bữa sáng. Hãy log những gì bạn ăn nhé!',
  },
  lunch: {
    title: '☀️ Bữa trưa!',
    body: 'Đã đến giờ ghi bữa trưa. Bạn ăn gì hôm nay?',
  },
  dinner: {
    title: '🌙 Bữa tối!',
    body: 'Đã đến giờ ghi bữa tối. Đừng quên log bữa ăn nhé!',
  },
  snack: {
    title: '🥤 Bữa phụ!',
    body: 'Nhớ ghi nhận các bữa ăn nhẹ trong ngày nhé!',
  },
  water: {
    title: '💧 Đã đến lúc uống nước!',
    body: 'Hãy uống một cốc nước để giữ cơ thể luôn đủ nước nhé.',
  },
  aiRecipes: {
    title: '🥗 Gợi ý món mới từ AI',
    body: 'Khám phá ngay công thức mới phù hợp với mục tiêu của bạn.',
  },
  aiTips: {
    title: '💡 Mẹo dinh dưỡng',
    body: 'Tips hay từ AI hôm nay giúp bạn ăn uống khoa học hơn.',
  },
  streak: {
    title: '⚠️ Đừng bỏ lỡ ngày hôm nay!',
    body: 'Chuỗi theo dõi của bạn sắp bị gián đoạn. Hãy ghi nhật ký ngay.',
  },
  weekly: {
    title: '📊 Báo cáo tiến độ tuần',
    body: 'Báo cáo dinh dưỡng tuần qua của bạn đã sẵn sàng. Xem ngay!',
  },
};

const resolveNotificationTarget = (response: any): NotificationTarget | null => {
  const target = response?.notification?.request?.content?.data?.target;
  return target === 'weekly-review' ? 'weekly-review' : null;
};

const handleNotificationTarget = (
  target: NotificationTarget,
  source: 'tap' | 'launch' | 'pending',
): void => {
  if (target !== 'weekly-review') {
    return;
  }

  const navigated = navigateToStatsWeeklyReview();
  pendingNotificationTarget = navigated ? null : target;

  trackEvent('weekly_review_notification_open', {
    category: 'product',
    flow: 'retention',
    step: 'weekly_review_notification',
    status: navigated ? 'opened' : 'pending',
    screen: 'StatsScreen',
    metadata: { source },
  });
};

const processNotificationResponse = (
  response: any,
  source: 'tap' | 'launch',
): void => {
  const content = response?.notification?.request?.content;
  const item = toMoChiNotificationItemFromPayload({
    title: content?.title,
    body: content?.body,
    data: content?.data,
    source,
  });
  if (item) {
    const inbox = useMoChiNotificationInboxStore.getState();
    inbox.upsertItem(item);
    inbox.markRead(item.id);
  }

  trackEvent('notification_opened', {
    category: 'retention',
    flow: 'notification',
    step: String(content?.data?.mochiEventType ?? content?.data?.target ?? 'unknown'),
    status: source,
    metadata: {
      source,
      target: content?.data?.target,
      mochiAction: content?.data?.mochiAction,
      mealTypeId: content?.data?.mealTypeId,
    },
  });

  const target = resolveNotificationTarget(response);
  if (!target) {
    return;
  }

  handleNotificationTarget(target, source);
  if (item) {
    useMoChiNotificationInboxStore.getState().markActed(item.id);
  }
};

const ensureNotificationResponseListener = (): void => {
  if (!Notifications) {
    return;
  }

  if (!notificationResponseSubscription) {
    notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        processNotificationResponse(response, 'tap');
      });
  }

  if (!notificationReceivedSubscription) {
    notificationReceivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        const item = toMoChiNotificationItemFromPayload({
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data as Record<string, unknown> | undefined,
          source: 'foreground',
        });
        if (item) {
          useMoChiNotificationInboxStore.getState().upsertItem(item);
        }
      });
  }
};

export const flushPendingNotificationNavigation = (): void => {
  if (!pendingNotificationTarget) {
    return;
  }

  handleNotificationTarget(pendingNotificationTarget, 'pending');
};

/**
 * Yêu cầu quyền notification từ user
 * @returns true nếu được cấp quyền
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // Check nếu native module không available (Expo Go)
    if (!notificationsAvailable || !Notifications) {
      logger.info('[NotificationService] Native module không available (Expo Go mode)');
      return false;
    }

    // Kiểm tra thiết bị vật lý (notifications không hoạt động trên simulator/Expo Go)
    if (!Device.isDevice) {
      logger.info(
        '[NotificationService] Notifications không hoạt động trên simulator/Expo Go',
      );
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('[NotificationService] Không được cấp quyền notification');
      return false;
    }

    // Android cần notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('meal-reminders', {
        name: 'Nhắc nhở bữa ăn',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
      });
    }

    await registerExpoPushTokenIfNeeded(finalStatus);
    logger.info('[NotificationService] Đã được cấp quyền notification');
    return true;
  } catch (error) {
    // Handle gracefully khi native module không available (Expo Go)
    logger.warn('[NotificationService] Native module không available:', error);
    return false;
  }
}

async function registerExpoPushTokenIfNeeded(permissionStatus: string): Promise<void> {
  if (!Notifications || permissionStatus !== 'granted' || !Device.isDevice) {
    return;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    logger.warn('[NotificationService] Missing Expo projectId, skip push token registration');
    return;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResult.data;
    const payload: PushRegistrationCache = {
      expoPushToken,
      platform: Platform.OS,
      appVersion: getAppVersion(),
      runtimeVersion: getRuntimeVersion(),
      channel: getChannel(),
      permissionStatus,
    };

    const previousRaw = await AsyncStorage.getItem(PUSH_REGISTRATION_KEY);
    if (previousRaw === JSON.stringify(payload)) {
      return;
    }

    await apiClient.post('/api/notifications/register-device', payload);
    await AsyncStorage.setItem(PUSH_REGISTRATION_KEY, JSON.stringify(payload));
    logger.info('[NotificationService] Expo push token registered');
  } catch (error) {
    logger.warn('[NotificationService] Expo push token registration failed', error);
  }
}

/**
 * Parse time string "HH:mm" thành hours và minutes
 */
function parseTime(timeString: string): { hours: number; minutes: number } {
  const parts = timeString.split(':');
  return {
    hours: parseInt(parts[0] || '0', 10),
    minutes: parseInt(parts[1] || '0', 10),
  };
}

const formatTime = (hours: number, minutes: number): string =>
  `${String((hours + 24) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

const addMinutesToTime = (timeString: string, minutesToAdd: number): string => {
  const { hours, minutes } = parseTime(timeString);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return formatTime(Math.floor(normalized / 60), normalized % 60);
};

const isTimeInsideQuietHours = (
  time: string,
  settings: NotificationSettings,
): boolean => {
  if (!settings.quietHoursEnabled) {
    return false;
  }

  const current = parseTime(time);
  const from = parseTime(settings.quietHoursFrom);
  const to = parseTime(settings.quietHoursTo);
  const currentMinutes = current.hours * 60 + current.minutes;
  const fromMinutes = from.hours * 60 + from.minutes;
  const toMinutes = to.hours * 60 + to.minutes;

  if (fromMinutes === toMinutes) {
    return false;
  }

  return fromMinutes < toMinutes
    ? currentMinutes >= fromMinutes && currentMinutes < toMinutes
    : currentMinutes >= fromMinutes || currentMinutes < toMinutes;
};

const resolveScheduledTime = (
  requestedTime: string,
  settings: NotificationSettings,
): string =>
  isTimeInsideQuietHours(requestedTime, settings)
    ? settings.quietHoursTo
    : requestedTime;

/**
 * Schedule một notification hàng ngày vào giờ chỉ định
 */
async function scheduleDailyNotification(
  identifier: string,
  time: string,
  title: string,
  body: string,
  options?: {
    priority?: 'DEFAULT' | 'HIGH';
    data?: Record<string, unknown>;
  },
): Promise<string | null> {
  if (!Notifications) return null;

  try {
    // Cancel notification cũ với identifier này
    await Notifications.cancelScheduledNotificationAsync(identifier);

    const { hours, minutes } = parseTime(time);

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: 'default',
        priority:
          options?.priority === 'HIGH'
            ? Notifications.AndroidNotificationPriority.HIGH
            : Notifications.AndroidNotificationPriority.DEFAULT,
        data: options?.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    logger.info(`[NotificationService] Đã schedule ${identifier} lúc ${time}`);
    trackEvent('notification_sent', {
      category: 'retention',
      flow: 'notification',
      step: identifier,
      status: 'scheduled',
      metadata: {
        identifier,
        time,
        mochiEventType: options?.data?.mochiEventType,
        mealTypeId: options?.data?.mealTypeId,
      },
    });
    return notificationId;
  } catch (error) {
    logger.error(`[NotificationService] Lỗi schedule ${identifier}:`, error);
    return null;
  }
}

async function scheduleWeeklyReviewNotification(): Promise<string | null> {
  if (!Notifications) return null;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.weeklyReview);

    const { hours, minutes } = parseTime(WEEKLY_REVIEW_TIME);
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.weeklyReview,
      content: {
        title: MEAL_MESSAGES.weekly.title,
        body: MEAL_MESSAGES.weekly.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          target: 'weekly-review',
          mochiEventType: 'weekly_review',
          mochiAction: 'viewProgress',
          mochiCategory: 'report',
          mochiSeverity: 'active',
          ctaLabel: 'Xem báo cáo',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: WEEKLY_REVIEW_DAY,
        hour: hours,
        minute: minutes,
      } as any,
    });

    logger.info('[NotificationService] Đã schedule weekly review notification');
    return notificationId;
  } catch (error) {
    logger.error('[NotificationService] Lỗi schedule weekly review:', error);
    return null;
  }
}

/**
 * Cancel một notification đã schedule
 */
async function cancelNotification(identifier: string): Promise<void> {
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    logger.info(`[NotificationService] Đã cancel ${identifier}`);
  } catch (error) {
    logger.error(`[NotificationService] Lỗi cancel ${identifier}:`, error);
  }
}

/**
 * Schedule notifications dựa trên settings
 */
export async function shouldNudgeFromBackend(input: {
  localDate: string;
  localTime: string;
  nudgeType?: string;
  mealTypeId?: number;
  predictedMealWindowStart?: string;
  predictedMealWindowEnd?: string;
  lastNudgedAt?: string;
  cooldownMinutes?: number;
  lastIgnoredAt?: string;
  ignoreCooldownMinutes?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}): Promise<NotificationDecision | null> {
  try {
    const response = await apiClient.post('/api/notifications/should-nudge', {
      localDate: input.localDate,
      localTime: input.localTime,
      nudgeType: input.nudgeType ?? 'meal',
      mealTypeId: input.mealTypeId,
      predictedMealWindowStart: input.predictedMealWindowStart,
      predictedMealWindowEnd: input.predictedMealWindowEnd,
      lastNudgedAt: input.lastNudgedAt,
      cooldownMinutes: input.cooldownMinutes,
      lastIgnoredAt: input.lastIgnoredAt,
      ignoreCooldownMinutes: input.ignoreCooldownMinutes,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
    });
    const decision = response.data as NotificationDecision;
    if (!decision.shouldNudge) {
      trackEvent('notification_suppressed', {
        category: 'retention',
        flow: 'notification',
        step: input.nudgeType ?? 'meal',
        status: decision.reasonToSuppress ?? decision.reason,
        metadata: {
          reason: decision.reason,
          reasonToSuppress: decision.reasonToSuppress,
          quietHours: decision.quietHours,
          cooldownPassed: decision.cooldownPassed,
          currentDayState: decision.currentDayState,
          mealTypeId: input.mealTypeId,
        },
      });
    }
    return decision;
  } catch (error) {
    logger.warn('[NotificationService] Backend nudge decision unavailable', error);
    return null;
  }
}

export async function scheduleNotifications(
  settings: NotificationSettings,
): Promise<void> {
  notifyMoChiReminderSettingsChanged();

  // Nếu notifications bị tắt, cancel tất cả
  if (!settings.enabled) {
    await cancelAllMealNotifications();
    return;
  }

  // Yêu cầu quyền nếu chưa có
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    logger.warn('[NotificationService] Không có quyền, skip scheduling');
    return;
  }

  // Schedule từng meal reminder
  if (settings.breakfastEnabled) {
    const behavior = resolveMoChiSystemNotificationBehavior('meal_reminder');
    await scheduleDailyNotification(
      NOTIFICATION_IDS.breakfast,
      resolveScheduledTime(addMinutesToTime(settings.breakfastTime, 30), settings),
      MEAL_MESSAGES.breakfast.title,
      MEAL_MESSAGES.breakfast.body,
      {
        priority: behavior.androidPriority,
        data: {
          mochiEventType: 'meal_reminder',
          mochiAction: 'addMeal',
          mochiCategory: 'reminder',
          mochiSeverity: 'active',
          mealTypeId: 1,
          ctaLabel: 'Ghi bữa',
        },
      },
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.breakfast);
  }

  if (settings.lunchEnabled) {
    const behavior = resolveMoChiSystemNotificationBehavior('meal_reminder');
    await scheduleDailyNotification(
      NOTIFICATION_IDS.lunch,
      resolveScheduledTime(addMinutesToTime(settings.lunchTime, 30), settings),
      MEAL_MESSAGES.lunch.title,
      MEAL_MESSAGES.lunch.body,
      {
        priority: behavior.androidPriority,
        data: {
          mochiEventType: 'meal_reminder',
          mochiAction: 'addMeal',
          mochiCategory: 'reminder',
          mochiSeverity: 'active',
          mealTypeId: 2,
          ctaLabel: 'Ghi bữa',
        },
      },
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.lunch);
  }

  if (settings.dinnerEnabled) {
    const behavior = resolveMoChiSystemNotificationBehavior('meal_reminder');
    await scheduleDailyNotification(
      NOTIFICATION_IDS.dinner,
      resolveScheduledTime(addMinutesToTime(settings.dinnerTime, 30), settings),
      MEAL_MESSAGES.dinner.title,
      MEAL_MESSAGES.dinner.body,
      {
        priority: behavior.androidPriority,
        data: {
          mochiEventType: 'meal_reminder',
          mochiAction: 'addMeal',
          mochiCategory: 'reminder',
          mochiSeverity: 'active',
          mealTypeId: 3,
          ctaLabel: 'Ghi bữa',
        },
      },
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.dinner);
  }

  if (settings.snackEnabled) {
    const behavior = resolveMoChiSystemNotificationBehavior('meal_reminder');
    await scheduleDailyNotification(
      NOTIFICATION_IDS.snack,
      resolveScheduledTime(addMinutesToTime(settings.snackTime, 30), settings),
      MEAL_MESSAGES.snack.title,
      MEAL_MESSAGES.snack.body,
      {
        priority: behavior.androidPriority,
        data: {
          mochiEventType: 'meal_reminder',
          mochiAction: 'addMeal',
          mochiCategory: 'reminder',
          mochiSeverity: 'active',
          mealTypeId: 4,
          ctaLabel: 'Ghi bữa',
        },
      },
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.snack);
  }

  // Water reminder (Schedule at 10:00)
  if (settings.waterReminderEnabled) {
    const behavior = resolveMoChiSystemNotificationBehavior('water_reminder');
    await scheduleDailyNotification(
      NOTIFICATION_IDS.water,
      resolveScheduledTime('10:00', settings),
      MEAL_MESSAGES.water.title,
      MEAL_MESSAGES.water.body,
      {
        priority: behavior.androidPriority,
        data: {
          mochiEventType: 'water_reminder',
          mochiAction: 'addWater',
          mochiCategory: 'reminder',
          mochiSeverity: 'active',
          ctaLabel: 'Ghi nước',
        },
      },
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.water);
  }

  await cancelNotification(NOTIFICATION_IDS.aiRecipes);
  await cancelNotification(NOTIFICATION_IDS.aiTips);

  // Streak Watcher (Schedule at 21:00 to remind users if they haven't logged)
  if (settings.streakRiskEnabled) {
    const behavior = resolveMoChiSystemNotificationBehavior('streak_unlocked');
    await scheduleDailyNotification(
      NOTIFICATION_IDS.streak,
      resolveScheduledTime('21:00', settings),
      MEAL_MESSAGES.streak.title,
      MEAL_MESSAGES.streak.body,
      {
        priority: behavior.androidPriority,
        data: {
          mochiEventType: 'streak_unlocked',
          mochiAction: 'viewDiary',
          mochiCategory: 'reminder',
          mochiSeverity: 'timeSensitive',
          ctaLabel: 'Mở nhật ký',
        },
      },
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.streak);
  }

  if (settings.weeklyReviewEnabled) {
    await scheduleWeeklyReviewNotification();
  } else {
    await cancelNotification(NOTIFICATION_IDS.weeklyReview);
  }

  // Note: For Goal Achieved, Achievements and Weekly Report, in a real app these are typically scheduled based on date logic or backend push. Here we connect the toggles.

  logger.info('[NotificationService] Đã schedule tất cả notifications');
}

/**
 * Cancel tất cả meal notifications
 */
export async function cancelAllMealNotifications(): Promise<void> {
  notifyMoChiReminderSettingsChanged();
  await cancelNotification(NOTIFICATION_IDS.breakfast);
  await cancelNotification(NOTIFICATION_IDS.lunch);
  await cancelNotification(NOTIFICATION_IDS.dinner);
  await cancelNotification(NOTIFICATION_IDS.snack);
  await cancelNotification(NOTIFICATION_IDS.weeklyReview);
  await cancelNotification(NOTIFICATION_IDS.water);
  await cancelNotification(NOTIFICATION_IDS.aiRecipes);
  await cancelNotification(NOTIFICATION_IDS.aiTips);
  await cancelNotification(NOTIFICATION_IDS.streak);
  logger.info('[NotificationService] Đã cancel tất cả notifications');
}

/**
 * Lấy danh sách notifications đã schedule
 */
export async function getScheduledNotifications(): Promise<any[]> {
  if (!Notifications) return [];
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Load settings và schedule notifications (gọi khi app khởi động)
 */
export async function initializeNotifications(): Promise<void> {
  try {
    if (Notifications) {
      ensureNotificationResponseListener();
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        processNotificationResponse(lastResponse, 'launch');
      }
    }

    const saved = await AsyncStorage.getItem(NOTIFICATIONS_SETTINGS_KEY);
    if (saved) {
      const settings: NotificationSettings = JSON.parse(saved);
      if (settings.enabled) {
        await scheduleNotifications(settings);
      }
    }
    logger.info('[NotificationService] Initialized successfully');
  } catch (error) {
    logger.error('[NotificationService] Lỗi khởi tạo:', error);
  }
}
