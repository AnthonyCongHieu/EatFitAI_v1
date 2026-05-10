/**
 * usePostFirstLogNotificationPrompt
 *
 * Task A1.3: Hỏi xin quyền gửi Thông báo SAU khi người dùng ghi nhận
 * bữa ăn đầu tiên, không hỏi ngay lập tức lúc mới tải app về.
 *
 * Usage: call `promptIfFirstLog()` after a successful diary add/save.
 * It will only fire ONCE per installation.
 */
import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import {
  requestNotificationPermissions,
  scheduleNotifications,
  type NotificationSettings,
} from '../services/notificationService';
import logger from '../utils/logger';
import { trackEvent } from '../services/analytics';

const FIRST_LOG_NOTIF_PROMPTED_KEY = '@eatfitai_first_log_notif_prompted';
const NOTIFICATIONS_SETTINGS_KEY = '@eatfitai_notifications';

/** Default settings when user first enables notifications from this prompt */
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  breakfastEnabled: true,
  breakfastTime: '07:00',
  lunchEnabled: true,
  lunchTime: '11:30',
  dinnerEnabled: true,
  dinnerTime: '18:30',
  snackEnabled: false,
  snackTime: '15:00',
  waterReminderEnabled: false,
  weeklyReviewEnabled: true,
  goalAchievedEnabled: true,
  streakRiskEnabled: true,
  aiRecipeSuggestionsEnabled: false,
  aiNutritionTipsEnabled: false,
  aiAchievementUnlockedEnabled: false,
  quietHoursEnabled: true,
  quietHoursFrom: '22:00',
  quietHoursTo: '07:00',
};

export function usePostFirstLogNotificationPrompt() {
  const prompting = useRef(false);

  const promptIfFirstLog = useCallback(async () => {
    // Prevent double-fire
    if (prompting.current) return;

    try {
      const alreadyPrompted = await AsyncStorage.getItem(FIRST_LOG_NOTIF_PROMPTED_KEY);
      if (alreadyPrompted === 'true') return; // Already asked before

      prompting.current = true;

      // Mark as prompted immediately to avoid re-prompting on rapid taps
      await AsyncStorage.setItem(FIRST_LOG_NOTIF_PROMPTED_KEY, 'true');

      trackEvent('notification_permission_prompt_shown', {
        category: 'product',
        flow: 'onboarding',
        step: 'first_log_complete',
        status: 'prompted',
      });

      // Small delay so the "success toast" from diary add is visible first
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Show a friendly Alert asking user if they want meal reminders
      Alert.alert(
        '🔔 Bật nhắc nhở bữa ăn?',
        'Bạn vừa ghi nhận bữa đầu tiên — tuyệt vời! Bạn có muốn app nhắc nhở giờ ăn để không bỏ lỡ bữa nào không?',
        [
          {
            text: 'Để sau',
            style: 'cancel',
            onPress: () => {
              trackEvent('notification_permission_prompt_dismissed', {
                category: 'product',
                flow: 'onboarding',
                step: 'first_log_complete',
                status: 'dismissed',
              });
            },
          },
          {
            text: 'Bật nhắc nhở',
            onPress: async () => {
              try {
                const granted = await requestNotificationPermissions();
                if (granted) {
                  // Save default settings & schedule
                  await AsyncStorage.setItem(
                    NOTIFICATIONS_SETTINGS_KEY,
                    JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS),
                  );
                  await scheduleNotifications(DEFAULT_NOTIFICATION_SETTINGS);

                  trackEvent('notification_permission_granted_after_first_log', {
                    category: 'product',
                    flow: 'onboarding',
                    step: 'first_log_complete',
                    status: 'granted',
                  });
                } else {
                  trackEvent('notification_permission_denied_after_first_log', {
                    category: 'product',
                    flow: 'onboarding',
                    step: 'first_log_complete',
                    status: 'denied',
                  });
                }
              } catch (err) {
                logger.warn('[PostFirstLogNotif] Error enabling notifications:', err);
              }
            },
          },
        ],
        { cancelable: true },
      );
    } catch (err) {
      logger.warn('[PostFirstLogNotif] Error in promptIfFirstLog:', err);
    } finally {
      prompting.current = false;
    }
  }, []);

  return { promptIfFirstLog };
}
