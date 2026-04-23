import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '../config/env';
import { tokenStorage } from './secureStore';
import { getAccessTokenMem } from './authTokens';
import { refreshAccessToken } from './authSession';
import {
  getApiUrl,
  forceRescan,
  getCachedApiUrl,
  verifyApiUrl,
  preloadCachedUrl,
  resetScanState,
} from './ipScanner';
import logger from '../utils/logger';

export { setAuthExpiredCallback } from './authSession';

// Extend axios types để support custom retry flags
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _networkRetried?: boolean;
  }
}

// Quản lý thời gian rescan để tránh spam
let lastRescanTime = 0;
const RESCAN_COOLDOWN = 120000; // 2 phút

// Flag để track đã init chưa
let isApiInitialized = false;

const isPrivateIpv4Host = (host: string): boolean =>
  /^10\./.test(host) ||
  /^127\./.test(host) ||
  /^192\.168\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

const shouldUseLanDiscovery = (url: string | undefined | null): boolean => {
  if (!url) {
    return __DEV__;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      __DEV__ &&
      (host === 'localhost' ||
        host === '10.0.2.2' ||
        host === '127.0.0.1' ||
        host.endsWith('.local') ||
        isPrivateIpv4Host(host))
    );
  } catch {
    return __DEV__;
  }
};

const applyBaseUrl = (url: string): void => {
  apiClient.defaults.baseURL = url;
  aiApiClient.defaults.baseURL = url;
};

/**
 * Reset toàn bộ API state - gọi khi IP thay đổi hoặc cần kết nối lại
 */
export const resetApiState = async (): Promise<void> => {
  logger.info('[APIClient] Đang reset toàn bộ API state...');
  lastRescanTime = 0;
  isApiInitialized = false;
  await resetScanState();
};

// Axios client - default timeout 10s cho các request thông thường
// BaseURL sẽ được set động khi init
const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

// Axios client cho AI endpoints - timeout 60s vì Ollama/LLM mất nhiều thời gian
export const aiApiClient = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

/**
 * Initialize API client với dynamic IP discovery
 * Luôn verify URL trước khi dùng, fallback sang scan nếu cần
 */
export const initializeApiClient = async (): Promise<boolean> => {
  logger.info('[APIClient] initializeApiClient started');

  if (isApiInitialized) return true;

  try {
    // 0. Load cache từ storage trước
    await preloadCachedUrl();

    if (API_BASE_URL) {
      logger.info('[APIClient] Trying configured API URL first:', API_BASE_URL);
      if (!shouldUseLanDiscovery(API_BASE_URL)) {
        applyBaseUrl(API_BASE_URL);
        isApiInitialized = true;
        return true;
      }

      const isConfiguredUrlValid = await verifyApiUrl(API_BASE_URL);
      if (isConfiguredUrlValid) {
        applyBaseUrl(API_BASE_URL);
        isApiInitialized = true;
        return true;
      }
    }

    // 1. Ưu tiên URL tìm thấy qua scan (hoặc từ cache)
    // getApiUrl() sẽ tự động verify cachedUrl trước khi scan
    const discoveredUrl = await getApiUrl();
    if (discoveredUrl) {
      applyBaseUrl(discoveredUrl);
      logger.info('[APIClient] ✅ Đã dùng URL từ scan/cache:', discoveredUrl);
      isApiInitialized = true;
      return true;
    }

    // 2. Fallback sang URL từ env nếu scan thất bại
    if (API_BASE_URL) {
      logger.warn('[APIClient] Scan thất bại, thử URL từ env:', API_BASE_URL);
      if (!shouldUseLanDiscovery(API_BASE_URL)) {
        applyBaseUrl(API_BASE_URL);
        isApiInitialized = true;
        return true;
      }

      const isValid = await verifyApiUrl(API_BASE_URL);
      if (isValid) {
        applyBaseUrl(API_BASE_URL);
        isApiInitialized = true;
        return true;
      }
    }

    logger.error('[APIClient] ❌ Không tìm thấy backend!');
    return false;
  } catch (error) {
    logger.error('[APIClient] Init error:', error);
    return false;
  }
};

/**
 * Lấy baseURL hiện tại (sync)
 */
export const getCurrentApiUrl = (): string | undefined => {
  return apiClient.defaults.baseURL ?? getCachedApiUrl() ?? undefined;
};

if (__DEV__) {
  if (!API_BASE_URL) {
    logger.error(
      '[EatFitAI] CRITICAL: API_BASE_URL is undefined! Network requests will fail.',
    );
    logger.error(
      '[EatFitAI] Set EXPO_PUBLIC_API_BASE_URL environment variable or ensure Expo hostUri is available.',
    );
  } else {
    logger.info(`[EatFitAI] API_BASE_URL configured: ${API_BASE_URL}`);
  }
}

type FetchInitFactory = (accessToken: string | null) => RequestInit;

export const fetchWithAuthRetry = async (
  url: string,
  buildInit: FetchInitFactory,
): Promise<Response> => {
  const runAttempt = async (accessToken: string | null): Promise<Response> => {
    const init = buildInit(accessToken);
    const headers = new Headers(init.headers ?? {});

    if (accessToken && accessToken.trim().length > 0) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    } else {
      headers.delete('Authorization');
    }

    return fetch(url, {
      ...init,
      headers,
    });
  };

  const initialAccessToken = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
  const initialResponse = await runAttempt(initialAccessToken);
  if (initialResponse.status !== 401) {
    return initialResponse;
  }

  try {
    const refreshedAccessToken = await refreshAccessToken();
    return await runAttempt(refreshedAccessToken);
  } catch {
    return initialResponse;
  }
};

const retryUnauthorizedRequest = async (
  client: typeof apiClient | typeof aiApiClient,
  originalRequest: InternalAxiosRequestConfig,
) => {
  originalRequest._retry = true;
  const newAccessToken = await refreshAccessToken();
  const retryHeaders = AxiosHeaders.from(originalRequest.headers ?? {});
  retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
  originalRequest.headers = retryHeaders;
  logger.info('[EatFitAI] Retrying original request with new token');
  return client(originalRequest);
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
      '/api/auth/verify-reset-code',
      '/api/auth/reset-password',
      '/api/search',
      '/api/food/search',
      '/api/food/search-all',
    ]);
    if (__DEV__) {
      logger.debug('[EatFitAI] Request Interceptor:', {
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
          logger.debug(
            '[EatFitAI] Authorization header attached:',
            config.headers.Authorization,
          );
        }
      } else {
        logger.warn('[EatFitAI] Invalid token format, skipping authorization header');
      }
    } else if (__DEV__ && urlPath && !noAuthPaths.has(urlPath)) {
      // Only warn for endpoints that typically require auth
      logger.warn('[EatFitAI] No token available for request:', config.url);
    }
  } catch (error) {
    if (__DEV__) {
      logger.error('[EatFitAI] Error in request interceptor:', error);
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
        logger.debug('EatFitAI health ping fallback:', safeError);
      } else {
        logger.warn('EatFitAI API warning:', safeError);
      }
    }

    const originalRequest = error.config;
    const status = error.response?.status;
    if (__DEV__) {
      logger.debug('[EatFitAI] Response Interceptor - Status check:', {
        status,
        hasOriginalRequest: !!originalRequest,
        isRetry: !!originalRequest?._retry,
        url: originalRequest?.url,
      });
    }
    if (status === 401 && originalRequest && !originalRequest._retry) {
      try {
        return await retryUnauthorizedRequest(apiClient, originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    // Handle network errors specifically - thử re-scan và retry 1 lần
    if (
      !error.response &&
      error.code &&
      originalRequest &&
      !originalRequest._networkRetried
    ) {
      const retryBaseUrl =
        typeof originalRequest.baseURL === 'string'
          ? originalRequest.baseURL
          : apiClient.defaults.baseURL;
      if (!shouldUseLanDiscovery(retryBaseUrl)) {
        return Promise.reject(error);
      }

      if (__DEV__) {
        logger.warn('[EatFitAI] Network Error, đang thử tìm lại backend...');
      }

      originalRequest._networkRetried = true;

      const now = Date.now();
      if (now - lastRescanTime < RESCAN_COOLDOWN) {
        logger.info('[APIClient] Bỏ qua re-scan do đang trong cooldown');
        return Promise.reject(error);
      }

      lastRescanTime = now;
      try {
        // Force re-scan để tìm IP mới
        const newUrl = await forceRescan();
        if (newUrl) {
          // Cập nhật baseURL cho cả 2 client
          applyBaseUrl(newUrl);

          // Retry request với URL mới
          originalRequest.baseURL = newUrl;
          logger.info('[EatFitAI] Retry với URL mới:', newUrl);
          return apiClient(originalRequest);
        }
      } catch (rescanError) {
        logger.error('[EatFitAI] Re-scan failed:', rescanError);
      }

      // Re-scan thất bại, return lỗi gốc
      const networkError = new Error(
        `Network Error: ${error.message || 'Không kết nối được server'}. ` +
          'Kiểm tra kết nối mạng và đảm bảo backend đang chạy.',
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
      logger.error('[EatFitAI] AI Client Interceptor Error:', error);
    }
  }
  return config;
});

aiApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      try {
        return await retryUnauthorizedRequest(aiApiClient, originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
