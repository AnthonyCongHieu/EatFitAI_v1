import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

// Extend axios types để support custom retry flags
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _networkRetried?: boolean;
  }
}
import { API_BASE_URL } from '../config/env';
import { tokenStorage } from './secureStore';
import { getAccessTokenMem, setAccessTokenMem, clearAccessTokenMem } from './authTokens';
import { postRefreshToken } from './tokenService';
import { updateSessionFromAuthResponse } from './authSession';
import { getApiUrl, forceRescan, getCachedApiUrl } from './ipScanner';

// Flag để track đã init chưa
let isApiInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Axios client - default timeout 10s cho các request thông thường
// BaseURL sẽ được set động khi init
const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

// Axios client cho AI endpoints - timeout 60s vì Ollama/LLM mất nhiều thời gian
export const aiApiClient = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

/**
 * Initialize API client với dynamic IP discovery
 * Gọi function này khi app start
 */
export const initializeApiClient = async (): Promise<boolean> => {
  // Tránh init nhiều lần
  if (isApiInitialized) return true;
  if (initializationPromise) {
    await initializationPromise;
    return isApiInitialized;
  }

  initializationPromise = (async () => {
    try {
      // Nếu đã có URL từ env, dùng luôn
      if (API_BASE_URL) {
        console.log('[APIClient] Dùng URL từ env:', API_BASE_URL);
        isApiInitialized = true;
        return;
      }

      // Không có env URL -> scan tìm backend
      console.log('[APIClient] Không có URL từ env, đang scan mạng...');
      const discoveredUrl = await getApiUrl();

      if (discoveredUrl) {
        apiClient.defaults.baseURL = discoveredUrl;
        aiApiClient.defaults.baseURL = discoveredUrl;
        console.log('[APIClient] ✅ Đã set baseURL:', discoveredUrl);
        isApiInitialized = true;
      } else {
        console.error('[APIClient] ❌ Không tìm thấy backend!');
        isApiInitialized = false;
      }
    } catch (error) {
      console.error('[APIClient] Init error:', error);
      isApiInitialized = false;
    }
  })();

  await initializationPromise;
  initializationPromise = null;
  return isApiInitialized;
};

/**
 * Lấy baseURL hiện tại (sync)
 */
export const getCurrentApiUrl = (): string | undefined => {
  return apiClient.defaults.baseURL ?? getCachedApiUrl() ?? undefined;
};

if (__DEV__) {
  if (!API_BASE_URL) {
    console.error(
      '[EatFitAI] CRITICAL: API_BASE_URL is undefined! Network requests will fail.',
    );
    console.error(
      '[EatFitAI] Set EXPO_PUBLIC_API_BASE_URL environment variable or ensure Expo hostUri is available.',
    );
  } else {
    console.log(`[EatFitAI] API_BASE_URL configured: ${API_BASE_URL}`);
  }
}

// In-memory access token cache lives in authTokens module

// Callback khi auth expired (để tránh circular dependency với useAuthStore)
let onAuthExpiredCallback: (() => void) | null = null;

/**
 * Register callback sẽ được gọi khi refresh token fails
 * Được dùng bởi useAuthStore để trigger logout
 */
export const setAuthExpiredCallback = (callback: (() => void) | null): void => {
  onAuthExpiredCallback = callback;
};

// Queue for 401 refresh handling
type FailedQueueItem = {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig;
};
let isRefreshing = false;
const failedQueue: FailedQueueItem[] = [];
const processQueue = (error: unknown, token: string | null): void => {
  while (failedQueue.length > 0) {
    const { resolve, reject, config } = failedQueue.shift()!;
    if (error) {
      reject(error);
      continue;
    }
    if (token && config.headers) {
      const headers = config.headers as AxiosHeaders | Record<string, string>;
      if (headers instanceof AxiosHeaders) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    resolve(apiClient(config));
  }
};

// Attach Authorization before requests
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
    const urlPath = String(config.url || '').split('?')[0];
    const noAuthPaths = new Set([
      '/health',
      '/api/Health/live',
      '/api/Health/ready',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/register-with-verification',
      '/api/auth/verify-email',
      '/api/auth/resend-verification',
      '/api/auth/refresh',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/search',
      '/api/food/search',
      '/api/food/search-all',
    ]);
    if (__DEV__) {
      console.log('[EatFitAI] Request Interceptor:', {
        url: config.url,
        method: config.method,
        hasTokenInMem: !!getAccessTokenMem(),
        hasTokenInStorage: !!token,
        tokenLength: token ? token.length : 0,
        headersBefore: config.headers,
      });
    }
    if (token) {
      // Validate token format before attaching
      if (typeof token === 'string' && token.trim().length > 0) {
        config.headers = {
          ...(config.headers ?? {}),
          Authorization: `Bearer ${token}`,
        } as InternalAxiosRequestConfig['headers'];
        if (__DEV__) {
          console.log(
            '[EatFitAI] Authorization header attached:',
            config.headers.Authorization,
          );
        }
      } else {
        console.warn('[EatFitAI] Invalid token format, skipping authorization header');
      }
    } else if (__DEV__ && urlPath && !noAuthPaths.has(urlPath)) {
      // Only warn for endpoints that typically require auth
      console.warn('[EatFitAI] No token available for request:', config.url);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[EatFitAI] Error in request interceptor:', error);
    }
  }
  return config;
});

// Handle 401 with refresh + queue
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (__DEV__) {
      const urlPath = String(error?.config?.url || '').split('?')[0];
      const safeError = {
        status: error?.response?.status,
        message: error?.message || 'No message',
        url: error?.config?.url,
        method: error?.config?.method,
        data: error?.response?.data,
        isNetworkError: !error?.response,
        code: error?.code,
        baseURL: error?.config?.baseURL,
        timeout: error?.config?.timeout,
      } as const;
      // Reduce noise: don't warn for /health 404 (handled by fallback)
      if (urlPath === '/health' && safeError.status === 404) {
        console.debug('EatFitAI health ping fallback:', safeError);
      } else {
        console.warn('EatFitAI API warning:', safeError);
      }
    }

    const originalRequest = error.config;
    const status = error.response?.status;
    if (__DEV__) {
      console.log('[EatFitAI] Response Interceptor - Status check:', {
        status,
        hasOriginalRequest: !!originalRequest,
        isRetry: !!originalRequest?._retry,
        url: originalRequest?.url,
      });
    }
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (__DEV__) {
          console.log('[EatFitAI] Refresh attempt - has refresh token:', !!refreshToken);
        }
        if (!refreshToken) {
          throw new Error('Missing refresh token');
        }

        // Validate refresh token format (basic check)
        if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
          throw new Error('Invalid refresh token format');
        }

        const data = await postRefreshToken(refreshToken);
        if (__DEV__) {
          console.log('[EatFitAI] Refresh response received:', {
            hasAccessToken: !!data.accessToken,
            hasRefreshToken: !!data.refreshToken,
            accessExp: data.accessTokenExpiresAt,
            refreshExp: data.refreshTokenExpiresAt,
          });
        }

        // Validate refresh response
        const newAccessToken: string | undefined = data.accessToken;
        const newRefreshToken: string | undefined = data.refreshToken;
        const newAccessExp: string | undefined = data.accessTokenExpiresAt;
        const newRefreshExp: string | undefined = data.refreshTokenExpiresAt;

        if (
          !newAccessToken ||
          typeof newAccessToken !== 'string' ||
          newAccessToken.trim().length === 0
        ) {
          throw new Error('Refresh response missing or invalid accessToken');
        }

        // Validate token expiration dates if provided
        if (newAccessExp && isNaN(Date.parse(newAccessExp))) {
          console.warn(
            '[EatFitAI] Invalid access token expiration format:',
            newAccessExp,
          );
        }
        if (newRefreshExp && isNaN(Date.parse(newRefreshExp))) {
          console.warn(
            '[EatFitAI] Invalid refresh token expiration format:',
            newRefreshExp,
          );
        }

        setAccessTokenMem(newAccessToken);
        await tokenStorage.saveTokensFull({
          accessToken: newAccessToken,
          accessTokenExpiresAt: newAccessExp,
          refreshToken: newRefreshToken,
          refreshTokenExpiresAt: newRefreshExp,
        });
        try {
          updateSessionFromAuthResponse?.(data);
        } catch { }

        processQueue(null, newAccessToken);
        const retryHeaders = AxiosHeaders.from(originalRequest.headers ?? {});
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
        originalRequest.headers = retryHeaders;
        if (__DEV__) {
          console.log('[EatFitAI] Retrying original request with new token');
        }
        return apiClient(originalRequest);
      } catch (err) {
        if (__DEV__) {
          console.error('[EatFitAI] Refresh failed:', err);
        }
        // Clear invalid tokens on refresh failure
        try {
          await tokenStorage.clearAll();
          clearAccessTokenMem();
        } catch (clearError) {
          console.warn('[EatFitAI] Failed to clear tokens on refresh error:', clearError);
        }
        processQueue(err, null);

        // Trigger auto-logout callback để redirect về Login
        if (onAuthExpiredCallback) {
          if (__DEV__) {
            console.log('[EatFitAI] Triggering auth expired callback (auto-logout)...');
          }
          try {
            onAuthExpiredCallback();
          } catch (callbackError) {
            console.error('[EatFitAI] Auth expired callback error:', callbackError);
          }
        }

        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    // Handle network errors specifically - thử re-scan và retry 1 lần
    if (!error.response && error.code && originalRequest && !originalRequest._networkRetried) {
      if (__DEV__) {
        console.warn('[EatFitAI] Network Error, đang thử tìm lại backend...');
      }

      originalRequest._networkRetried = true;

      try {
        // Force re-scan để tìm IP mới
        const newUrl = await forceRescan();
        if (newUrl) {
          // Cập nhật baseURL cho cả 2 client
          apiClient.defaults.baseURL = newUrl;
          aiApiClient.defaults.baseURL = newUrl;

          // Retry request với URL mới
          originalRequest.baseURL = newUrl;
          console.log('[EatFitAI] Retry với URL mới:', newUrl);
          return apiClient(originalRequest);
        }
      } catch (rescanError) {
        console.error('[EatFitAI] Re-scan failed:', rescanError);
      }

      // Re-scan thất bại, return lỗi gốc
      const networkError = new Error(
        `Network Error: ${error.message || 'Không kết nối được server'}. ` +
        `Kiểm tra kết nối mạng và đảm bảo backend đang chạy.`,
      );
      networkError.name = 'NetworkError';
      return Promise.reject(networkError);
    }

    return Promise.reject(error);
  },
);

// Thêm interceptors cho aiApiClient (tương tự apiClient nhưng đơn giản hơn)
aiApiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
    if (token && typeof token === 'string' && token.trim().length > 0) {
      config.headers = {
        ...(config.headers ?? {}),
        Authorization: `Bearer ${token}`,
      } as InternalAxiosRequestConfig['headers'];
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[EatFitAI] AI Client Interceptor Error:', error);
    }
  }
  return config;
});

export default apiClient;
