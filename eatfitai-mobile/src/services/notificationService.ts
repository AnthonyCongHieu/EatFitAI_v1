// notificationService.ts - Quản lý local notifications cho meal reminders
// Sử dụng expo-notifications để schedule thông báo

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key lưu trữ cài đặt notifications
const NOTIFICATIONS_SETTINGS_KEY = '@eatfitai_notifications';

// Config hiển thị notification khi app đang foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

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
    weeklyReviewEnabled: boolean;
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
};

/**
 * Yêu cầu quyền notification từ user
 * @returns true nếu được cấp quyền
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    // Kiểm tra thiết bị vật lý (notifications không hoạt động trên simulator)
    if (!Device.isDevice) {
        console.log('[NotificationService] Notifications không hoạt động trên simulator');
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
    body: string
): Promise<string | null> {
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
export async function scheduleNotifications(settings: NotificationSettings): Promise<void> {
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
            MEAL_MESSAGES.breakfast.body
        );
    } else {
        await cancelNotification(NOTIFICATION_IDS.breakfast);
    }

    if (settings.lunchEnabled) {
        await scheduleDailyNotification(
            NOTIFICATION_IDS.lunch,
            settings.lunchTime,
            MEAL_MESSAGES.lunch.title,
            MEAL_MESSAGES.lunch.body
        );
    } else {
        await cancelNotification(NOTIFICATION_IDS.lunch);
    }

    if (settings.dinnerEnabled) {
        await scheduleDailyNotification(
            NOTIFICATION_IDS.dinner,
            settings.dinnerTime,
            MEAL_MESSAGES.dinner.title,
            MEAL_MESSAGES.dinner.body
        );
    } else {
        await cancelNotification(NOTIFICATION_IDS.dinner);
    }

    if (settings.snackEnabled) {
        await scheduleDailyNotification(
            NOTIFICATION_IDS.snack,
            settings.snackTime,
            MEAL_MESSAGES.snack.title,
            MEAL_MESSAGES.snack.body
        );
    } else {
        await cancelNotification(NOTIFICATION_IDS.snack);
    }

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
    console.log('[NotificationService] Đã cancel tất cả notifications');
}

/**
 * Lấy danh sách notifications đã schedule
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
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
