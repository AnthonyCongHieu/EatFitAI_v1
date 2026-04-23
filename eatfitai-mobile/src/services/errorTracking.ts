import crashlytics from '@react-native-firebase/crashlytics';

import logger from '../utils/logger';
import { initTelemetryService, trackTelemetryEvent } from './telemetryService';

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }

  return {
    message: typeof error === 'string' ? error : String(error),
  };
};

/**
 * Khởi tạo error tracking: bật Crashlytics + telemetry tự build.
 * Crashlytics chạy ở tầng native → không phụ thuộc backend.
 */
export const initErrorTracking = async (): Promise<void> => {
  try {
    // Bật Crashlytics collection (mặc định đã bật, nhưng gọi rõ ràng)
    await crashlytics().setCrashlyticsCollectionEnabled(true);
  } catch (error) {
    // Crashlytics init fail không block app
    logger.warn('[ErrorTracking] Crashlytics init failed, fallback to telemetry only', error);
  }

  await initTelemetryService();
};

/**
 * Ghi nhận lỗi runtime.
 * Gửi tới CẢ HAI:
 *   1. Firebase Crashlytics (native, không phụ thuộc backend)
 *   2. Telemetry tự build (gửi về backend khi có mạng)
 */
export const captureError = (
  error: unknown,
  context?: string,
  extras?: Record<string, unknown>,
): void => {
  logger.error('[ErrorTracking]', context ?? 'App', error);

  // --- Firebase Crashlytics (đáng tin cậy hơn, chạy offline) ---
  try {
    const cr = crashlytics();

    // Gắn context để dễ filter trên Firebase Console
    if (context) {
      cr.setAttribute('context', context);
    }

    // Gắn thêm metadata nếu có
    if (extras) {
      for (const [key, value] of Object.entries(extras)) {
        cr.setAttribute(key, String(value));
      }
    }

    if (error instanceof Error) {
      // Ghi lại error có stack trace → hiện trên Crashlytics dashboard
      cr.recordError(error);
    } else {
      // Error không phải Error object → tạo Error wrapper
      const wrapped = new Error(typeof error === 'string' ? error : JSON.stringify(error));
      wrapped.name = context ?? 'NonStandardError';
      cr.recordError(wrapped);
    }
  } catch (crashlyticsError) {
    // Crashlytics fail → không block, telemetry vẫn chạy
    logger.warn('[ErrorTracking] Crashlytics recordError failed', crashlyticsError);
  }

  // --- Telemetry tự build (backup, gửi về backend) ---
  void trackTelemetryEvent({
    name: 'mobile_runtime_error',
    category: 'error',
    flow: 'runtime',
    step: context ?? 'app',
    status: 'failure',
    metadata: {
      context: context ?? 'App',
      ...serializeError(error),
      ...extras,
    },
  });
};

/**
 * Set user ID cho Crashlytics để biết user nào bị lỗi.
 * Gọi sau khi user login thành công.
 */
export const setErrorTrackingUser = (userId: string): void => {
  try {
    crashlytics().setUserId(userId);
  } catch (error) {
    logger.warn('[ErrorTracking] Failed to set Crashlytics userId', error);
  }
};

/**
 * Ghi log custom (không phải crash) lên Crashlytics.
 * Hữu ích để debug: "user vừa làm gì trước khi crash?"
 */
export const logBreadcrumb = (message: string): void => {
  try {
    crashlytics().log(message);
  } catch {
    // Im lặng, breadcrumb không critical
  }
};
