// Centralized error handling utility
// Replaces 94+ duplicate showAppToast() calls across the app

import Toast from 'react-native-toast-message';

import { showAppToast } from './showAppToast';

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
  const serverMessage =
    error?.response?.data?.detail ??
    error?.response?.data?.title ??
    error?.response?.data?.message;
  // Network error detection (Relaxed for Emulator/Dev)
  // Only report offline if the error message explicitly says so, or if request failed completely
  // navigator.onLine is often flaky in emulators
  const isNetworkError =
    error?.message === 'Network Error' || error?.message === 'Network request failed';

  if (isNetworkError) {
    showAppToast({
      type: 'error',
      text1: 'Ồ, mất kết nối mạng rồi! 🔌',
      text2: 'Bạn kiểm tra lại Wifi/4G để tụi mình tiếp tục nha!',
    });
    return { type: 'network_error', status: 0, message: error?.message };
  }

  // HTTP status-based errors
  switch (status) {
    case 401:
      showAppToast({
        type: 'error',
        text1: 'Hết phiên làm việc rồi!',
        text2: 'Bạn đăng nhập lại giúp mình nha! 🔑',
      });
      return { type: 'unauthorized', status, message: serverMessage };

    case 403:
      showAppToast({
        type: 'error',
        text1: 'Không được rồi nha! 🙅‍♂️',
        text2: 'Bạn chưa có quyền thực hiện thao tác này.',
      });
      return { type: 'forbidden', status, message: serverMessage };

    case 404:
      showAppToast({
        type: 'error',
        text1: 'Không tìm thấy rồi! 🔍',
        text2: 'Dữ liệu không tồn tại hoặc đã bị xóa đi mất rồi.',
      });
      return { type: 'not_found', status, message: serverMessage };

    case 422:
      showAppToast({
        type: 'error',
        text1: 'Thông tin chưa đúng rồi! 🧐',
        text2: 'Bạn kiểm tra lại các thông tin đã nhập nha!',
      });
      return { type: 'validation', status, message: serverMessage };

    case 500:
    case 502:
    case 503:
    case 504:
      showAppToast({
        type: 'error',
        text1: 'Máy chủ đang bận tí xíu! 🤖',
        text2: 'Bạn đợi một chút rồi thử lại cùng mình nha!',
      });
      return { type: 'server_error', status, message: serverMessage };

    default:
      showAppToast({
        type: 'error',
        text1: 'Có lỗi nhỏ xảy ra rồi! 😢',
        text2: 'Bạn thử lại hoặc nhắn tin hỗ trợ giúp tụi mình nha!',
      });
      return { type: 'unknown', status, message: serverMessage };
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
    showAppToast({
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
  const serverMessage =
    error?.response?.data?.detail ??
    error?.response?.data?.title ??
    error?.response?.data?.message;

  if (isNetworkError)
    return { type: 'network_error', status: 0, message: error?.message };

  const rawStatus = error?.response?.status;
  const status = rawStatus ? Number(rawStatus) : undefined;

  switch (status) {
    case 401:
      return { type: 'unauthorized', status, message: serverMessage };
    case 403:
      return { type: 'forbidden', status, message: serverMessage };
    case 404:
      return { type: 'not_found', status, message: serverMessage };
    case 422:
      return { type: 'validation', status, message: serverMessage };
    case 500:
    case 502:
    case 503:
    case 504:
      return { type: 'server_error', status, message: serverMessage };
    default:
      return { type: 'unknown', status, message: serverMessage };
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
  | 'password_changed'
  | 'custom';

const successMessages: Record<SuccessType, { text1: string; text2?: string }> = {
  meal_added: { text1: 'Ngon miệng nha! 🍽️', text2: 'Bữa ăn của bạn đã được lưu vào nhật ký rồi!' },
  meal_updated: { text1: 'Đã cập nhật xong rồi! ✨', text2: 'Thay đổi của bạn đã được ghi lại thành công.' },
  meal_deleted: { text1: 'Đã xóa món ăn! 🗑️', text2: 'Món ăn đã được bỏ khỏi nhật ký rồi.' },
  food_added: { text1: 'Thêm món mới thành công! 🥦', text2: 'Món ăn đã được lưu vào thực đơn của bạn.' },
  settings_saved: { text1: 'Đã lưu cài đặt!', text2: 'Mọi thứ đã sẵn sàng cho bạn rồi.' },
  profile_updated: { text1: 'Cập nhật hồ sơ xong rồi! 🎉', text2: 'Thông tin của bạn đã được lưu lại.' },
  target_updated: {
    text1: 'Đặt mục tiêu mới thành công!',
    text2: 'Cùng nhau cố gắng hoàn thành mục tiêu mới nha!',
  },
  favorite_added: { text1: 'Đã thêm vào yêu thích! ❤️', text2: 'Món ăn đã được lưu để bạn dễ tìm sau này.' },
  favorite_removed: { text1: 'Đã bỏ yêu thích! 💔', text2: 'Món ăn đã được xóa khỏi danh sách yêu thích.' },
  password_changed: { text1: 'Đổi mật khẩu thành công! 🔐', text2: 'Mật khẩu mới đã được áp dụng, bảo mật an toàn rồi nha!' },
  custom: { text1: 'Thành công rồi nha! 🎉' },
};

/**
 * Show professional success toast
 */
export const showSuccess = (
  type: SuccessType,
  customMessage?: { text1?: string; text2?: string },
) => {
  const msg = successMessages[type];
  showAppToast({
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
  showAppToast({
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
  showAppToast({
    type: 'error', // Using error type with orange styling suggested
    text1: text1,
    text2,
    visibilityTime: 3500,
  });
};

// ============== LOADING STATES ==============

/**
 * Show loading indicator toast (auto-dismiss disabled)
 */
export const showLoading = (message: string = 'Đang xử lý...') => {
  showAppToast({
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
