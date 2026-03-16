import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const shareService = {
  /**
   * Captures a screenshot of the given view reference and opens the system share dialog.
   * @param viewRef React ref of the view to capture
   */
  shareScreenshot: async (viewRef: any) => {
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Lỗi', 'Thiết bị này không hỗ trợ chia sẻ.');
        return;
      }

      // Capture screenshot
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 0.8,
        result: 'tmpfile',
      });

      // Share
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Chia sẻ thành tích EatFitAI',
        UTI: 'public.png', // iOS
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ ảnh. Vui lòng thử lại.');
    }
  },
};
