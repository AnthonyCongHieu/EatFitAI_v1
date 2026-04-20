/**
 * useHaptics - Custom hook cho haptic feedback
 * Cung cấp các patterns haptic khác nhau cho UX tốt hơn
 */

import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

type HapticType =
  | 'light' // Tap nhẹ
  | 'medium' // Tap thường
  | 'heavy' // Tap mạnh
  | 'success' // Thành công
  | 'warning' // Cảnh báo
  | 'error' // Lỗi
  | 'selection'; // Chọn item

export const useHaptics = () => {
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  /**
   * Trigger haptic feedback
   */
  const trigger = useCallback(
    async (type: HapticType = 'light') => {
      if (!isSupported) return;

      try {
        switch (type) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'selection':
            await Haptics.selectionAsync();
            break;
          default:
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        // Silently fail - haptics không critical
        console.log('Haptic feedback error:', error);
      }
    },
    [isSupported],
  );

  /**
   * Trigger success celebration pattern
   * (2 pulses)
   */
  const celebrate = useCallback(async () => {
    if (!isSupported) return;

    await trigger('success');
    setTimeout(() => trigger('light'), 150);
  }, [trigger, isSupported]);

  /**
   * Trigger selection feedback
   */
  const select = useCallback(async () => {
    await trigger('selection');
  }, [trigger]);

  /**
   * Trigger button press feedback
   */
  const buttonPress = useCallback(async () => {
    await trigger('light');
  }, [trigger]);

  return {
    trigger,
    celebrate,
    select,
    buttonPress,
    isSupported,
  };
};

export default useHaptics;
