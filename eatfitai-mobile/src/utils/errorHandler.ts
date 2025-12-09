// Centralized error handling utility
// Replaces 94+ duplicate Toast.show() calls across the app

import Toast from 'react-native-toast-message';

export type ApiErrorType =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'server_error'
  | 'network_error'
  | 'unknown';

export interface ApiError {
  type: ApiErrorType;
  status?: number;
  message?: string;
  details?: any;
}

/**
 * Centralized API error handler
 * Automatically shows user-friendly toast messages based on error type
 */
export const handleApiError = (error: any): ApiError => {
  const rawStatus = error?.response?.status;
  const status = rawStatus ? Number(rawStatus) : undefined;
  // Network error detection (Relaxed for Emulator/Dev)
  // Only report offline if the error message explicitly says so, or if request failed completely
  // navigator.onLine is often flaky in emulators
  const isNetworkError =
    error?.message === 'Network Error' || error?.message === 'Network request failed';

  if (isNetworkError) {
    Toast.show({
      type: 'error',
      text1: 'Không có kết nối mạng',
      text2: 'Kiểm tra kết nối và thử lại',
    });
    return { type: 'network_error', status: 0 };
  }

  // HTTP status-based errors
  switch (status) {
    case 401:
      Toast.show({
        type: 'error',
        text1: 'Phiên đăng nhập đã hết hạn',
        text2: 'Vui lòng đăng nhập lại',
      });
      return { type: 'unauthorized', status };

    case 403:
      Toast.show({
        type: 'error',
        text1: 'Không có quyền',
        text2: 'Bạn không có quyền thực hiện thao tác này',
      });
      return { type: 'forbidden', status };

    case 404:
      Toast.show({
        type: 'error',
        text1: 'Không tìm thấy',
        text2: 'Dữ liệu không tồn tại hoặc đã bị xóa',
      });
      return { type: 'not_found', status };

    case 422:
      Toast.show({
        type: 'error',
        text1: 'Dữ liệu không hợp lệ',
        text2: 'Vui lòng kiểm tra lại thông tin',
      });
      return { type: 'validation', status };

    case 500:
    case 502:
    case 503:
    case 504:
      Toast.show({
        type: 'error',
        text1: 'Lỗi máy chủ',
        text2: 'Vui lòng thử lại sau',
      });
      return { type: 'server_error', status };

    default:
      Toast.show({
        type: 'error',
        text1: 'Có lỗi xảy ra',
        text2: 'Vui lòng thử lại hoặc liên hệ hỗ trợ',
      });
      return { type: 'unknown', status };
  }
};

/**
 * Custom error handler with custom messages
 * Use when you need specific error messages for specific contexts
 */
export const handleApiErrorWithCustomMessage = (
  error: any,
  customMessages?: Partial<Record<ApiErrorType, { text1: string; text2: string }>>,
): ApiError => {
  const apiError = handleApiErrorSilent(error);

  // Override with custom message if provided
  if (customMessages && customMessages[apiError.type]) {
    const custom = customMessages[apiError.type]!;
    Toast.show({
      type: 'error',
      text1: custom.text1,
      text2: custom.text2,
    });
  } else {
    // Fallback to default toast behavior if no custom message
    handleApiError(error);
  }

  return apiError;
};

/**
 * Silent error handler (no toast)
 * Use for background operations where you don't want to show errors to user
 */
export const handleApiErrorSilent = (error: any): ApiError => {
  // Network error detection (Relaxed)
  const isNetworkError =
    error?.message === 'Network Error' || error?.message === 'Network request failed';

  if (isNetworkError) return { type: 'network_error', status: 0 };

  const rawStatus = error?.response?.status;
  const status = rawStatus ? Number(rawStatus) : undefined;

  switch (status) {
    case 401:
      return { type: 'unauthorized', status };
    case 403:
      return { type: 'forbidden', status };
    case 404:
      return { type: 'not_found', status };
    case 422:
      return { type: 'validation', status };
    case 500:
    case 502:
    case 503:
    case 504:
      return { type: 'server_error', status };
    default:
      return { type: 'unknown', status };
  }
};

/**
 * Log error to monitoring service (Sentry, etc.)
 * TODO: Implement when error tracking is set up
 */
export const logError = (error: any, context?: string) => {
  if (__DEV__) {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  }
  // TODO: Send to Sentry/LogRocket/etc.
};

// ============== SUCCESS MESSAGES ==============

export type SuccessType =
  | 'meal_added'
  | 'meal_updated'
  | 'meal_deleted'
  | 'food_added'
  | 'settings_saved'
  | 'profile_updated'
  | 'target_updated'
  | 'favorite_added'
  | 'favorite_removed'
  | 'custom';

const successMessages: Record<SuccessType, { text1: string; text2?: string }> = {
  meal_added: { text1: '✅ Đã thêm vào nhật ký', text2: 'Bữa ăn đã được ghi nhận' },
  meal_updated: { text1: '✅ Đã cập nhật', text2: 'Thay đổi đã được lưu' },
  meal_deleted: { text1: '🗑️ Đã xóa', text2: 'Món ăn đã được xóa khỏi nhật ký' },
  food_added: { text1: '✅ Đã thêm món ăn', text2: 'Món ăn mới đã được tạo' },
  settings_saved: { text1: '✅ Đã lưu cài đặt' },
  profile_updated: { text1: '✅ Đã cập nhật hồ sơ' },
  target_updated: {
    text1: '🎯 Đã cập nhật mục tiêu',
    text2: 'Mục tiêu dinh dưỡng mới đã được áp dụng',
  },
  favorite_added: { text1: '❤️ Đã thêm yêu thích' },
  favorite_removed: { text1: '💔 Đã bỏ yêu thích' },
  custom: { text1: 'Thành công' },
};

/**
 * Show professional success toast
 */
export const showSuccess = (
  type: SuccessType,
  customMessage?: { text1?: string; text2?: string },
) => {
  const msg = successMessages[type];
  Toast.show({
    type: 'success',
    text1: customMessage?.text1 ?? msg.text1,
    text2: customMessage?.text2 ?? msg.text2,
    visibilityTime: 2500,
  });
};

// ============== INFO MESSAGES ==============

/**
 * Show info toast for neutral notifications
 */
export const showInfo = (text1: string, text2?: string) => {
  Toast.show({
    type: 'info',
    text1,
    text2,
    visibilityTime: 3000,
  });
};

// ============== WARNING MESSAGES ==============

/**
 * Show warning toast for non-critical issues
 */
export const showWarning = (text1: string, text2?: string) => {
  Toast.show({
    type: 'error', // Using error type with orange styling suggested
    text1: `⚠️ ${text1}`,
    text2,
    visibilityTime: 3500,
  });
};

// ============== LOADING STATES ==============

/**
 * Show loading indicator toast (auto-dismiss disabled)
 */
export const showLoading = (message: string = 'Đang xử lý...') => {
  Toast.show({
    type: 'info',
    text1: '⏳ ' + message,
    autoHide: false,
  });
};

/**
 * Hide loading toast
 */
export const hideLoading = () => {
  Toast.hide();
};
