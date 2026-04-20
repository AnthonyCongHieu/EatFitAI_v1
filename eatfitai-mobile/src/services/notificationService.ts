/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
// notificationService.ts - Quản lý local notifications cho meal reminders
// Sử dụng expo-notifications để schedule thông báo
// LƯU Ý: Expo Go không hỗ trợ native modules, cần development build để test

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lazy import để tránh crash trong Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsAvailable = false;

// Try load notifications module
try {
  const notificationsModule =
    require('expo-notifications') as typeof import('expo-notifications');
  Notifications = notificationsModule;
  notificationsAvailable = true;

  // Config hiển thị notification khi app đang foreground
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  console.log('[NotificationService] Native module loaded successfully');
} catch (error) {
  console.log('[NotificationService] Native module không available (Expo Go mode)');
  notificationsAvailable = false;
}

// Key lưu trữ cài đặt notifications
const NOTIFICATIONS_SETTINGS_KEY = '@eatfitai_notifications';

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
  }
};

/**
 * Yêu cầu quyền notification từ user
 * @returns true nếu được cấp quyền
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // Check nếu native module không available (Expo Go)
    if (!notificationsAvailable || !Notifications) {
      console.log('[NotificationService] Native module không available (Expo Go mode)');
      return false;
    }

    // Kiểm tra thiết bị vật lý (notifications không hoạt động trên simulator/Expo Go)
    if (!Device.isDevice) {
      console.log(
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
      console.log('[NotificationService] Không được cấp quyền notification');
      return false;
    }

    // Android cần notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('meal-reminders', {
        name: 'Nhắc nhở bữa ăn',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
      });
    }

    console.log('[NotificationService] Đã được cấp quyền notification');
    return true;
  } catch (error) {
    // Handle gracefully khi native module không available (Expo Go)
    console.log('[NotificationService] Native module không available:', error);
    return false;
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

/**
 * Schedule một notification hàng ngày vào giờ chỉ định
 */
async function scheduleDailyNotification(
  identifier: string,
  time: string,
  title: string,
  body: string,
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
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    console.log(`[NotificationService] Đã schedule ${identifier} lúc ${time}`);
    return notificationId;
  } catch (error) {
    console.error(`[NotificationService] Lỗi schedule ${identifier}:`, error);
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
    console.log(`[NotificationService] Đã cancel ${identifier}`);
  } catch (error) {
    console.error(`[NotificationService] Lỗi cancel ${identifier}:`, error);
  }
}

/**
 * Schedule notifications dựa trên settings
 */
export async function scheduleNotifications(
  settings: NotificationSettings,
): Promise<void> {
  // Nếu notifications bị tắt, cancel tất cả
  if (!settings.enabled) {
    await cancelAllMealNotifications();
    return;
  }

  // Yêu cầu quyền nếu chưa có
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('[NotificationService] Không có quyền, skip scheduling');
    return;
  }

  // Schedule từng meal reminder
  if (settings.breakfastEnabled) {
    await scheduleDailyNotification(
      NOTIFICATION_IDS.breakfast,
      settings.breakfastTime,
      MEAL_MESSAGES.breakfast.title,
      MEAL_MESSAGES.breakfast.body,
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.breakfast);
  }

  if (settings.lunchEnabled) {
    await scheduleDailyNotification(
      NOTIFICATION_IDS.lunch,
      settings.lunchTime,
      MEAL_MESSAGES.lunch.title,
      MEAL_MESSAGES.lunch.body,
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.lunch);
  }

  if (settings.dinnerEnabled) {
    await scheduleDailyNotification(
      NOTIFICATION_IDS.dinner,
      settings.dinnerTime,
      MEAL_MESSAGES.dinner.title,
      MEAL_MESSAGES.dinner.body,
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.dinner);
  }

  if (settings.snackEnabled) {
    await scheduleDailyNotification(
      NOTIFICATION_IDS.snack,
      settings.snackTime,
      MEAL_MESSAGES.snack.title,
      MEAL_MESSAGES.snack.body,
    );
  } else {
    await cancelNotification(NOTIFICATION_IDS.snack);
  }

  // Water reminder (Schedule at 10:00)
  if (settings.waterReminderEnabled) {
    await scheduleDailyNotification(NOTIFICATION_IDS.water, '10:00', MEAL_MESSAGES.water.title, MEAL_MESSAGES.water.body);
  } else {
    await cancelNotification(NOTIFICATION_IDS.water);
  }

  // AI Recipe Suggestions (Schedule at 11:30, right before lunch logic)
  if (settings.aiRecipeSuggestionsEnabled) {
    await scheduleDailyNotification(NOTIFICATION_IDS.aiRecipes, '11:00', MEAL_MESSAGES.aiRecipes.title, MEAL_MESSAGES.aiRecipes.body);
  } else {
    await cancelNotification(NOTIFICATION_IDS.aiRecipes);
  }

  // AI Nutrition Tips (Schedule at 08:30)
  if (settings.aiNutritionTipsEnabled) {
    await scheduleDailyNotification(NOTIFICATION_IDS.aiTips, '08:30', MEAL_MESSAGES.aiTips.title, MEAL_MESSAGES.aiTips.body);
  } else {
    await cancelNotification(NOTIFICATION_IDS.aiTips);
  }

  // Streak Watcher (Schedule at 21:00 to remind users if they haven't logged)
  if (settings.streakRiskEnabled) {
    await scheduleDailyNotification(NOTIFICATION_IDS.streak, '21:00', MEAL_MESSAGES.streak.title, MEAL_MESSAGES.streak.body);
  } else {
    await cancelNotification(NOTIFICATION_IDS.streak);
  }

  // Note: For Goal Achieved, Achievements and Weekly Report, in a real app these are typically scheduled based on date logic or backend push. Here we connect the toggles.
  
  console.log('[NotificationService] Đã schedule tất cả notifications');
}

/**
 * Cancel tất cả meal notifications
 */
export async function cancelAllMealNotifications(): Promise<void> {
  await cancelNotification(NOTIFICATION_IDS.breakfast);
  await cancelNotification(NOTIFICATION_IDS.lunch);
  await cancelNotification(NOTIFICATION_IDS.dinner);
  await cancelNotification(NOTIFICATION_IDS.snack);
  await cancelNotification(NOTIFICATION_IDS.weeklyReview);
  await cancelNotification(NOTIFICATION_IDS.water);
  await cancelNotification(NOTIFICATION_IDS.aiRecipes);
  await cancelNotification(NOTIFICATION_IDS.aiTips);
  await cancelNotification(NOTIFICATION_IDS.streak);
  console.log('[NotificationService] Đã cancel tất cả notifications');
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
    const saved = await AsyncStorage.getItem(NOTIFICATIONS_SETTINGS_KEY);
    if (saved) {
      const settings: NotificationSettings = JSON.parse(saved);
      if (settings.enabled) {
        await scheduleNotifications(settings);
      }
    }
    console.log('[NotificationService] Initialized successfully');
  } catch (error) {
    console.error('[NotificationService] Lỗi khởi tạo:', error);
  }
}
