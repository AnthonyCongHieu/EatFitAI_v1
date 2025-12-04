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
  const status = error?.response?.status;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Network error (offline)
  if (!isOnline) {
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
  const status = error?.response?.status;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) return { type: 'network_error', status: 0 };

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
