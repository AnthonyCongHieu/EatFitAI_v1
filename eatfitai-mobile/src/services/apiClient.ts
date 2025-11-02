import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';
import { tokenStorage } from './secureStore';
import { getAccessTokenMem, setAccessTokenMem } from './authTokens';
import { postRefreshToken } from './tokenService';
import { updateSessionFromAuthResponse } from './authSession';

// Axios client
const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

if (__DEV__) {
  if (!API_BASE_URL) {
    // eslint-disable-next-line no-console
    console.error('[EatFitAI] CRITICAL: API_BASE_URL is undefined! Network requests will fail.');
    console.error('[EatFitAI] Set EXPO_PUBLIC_API_BASE_URL environment variable or ensure Expo hostUri is available.');
  } else {
    // eslint-disable-next-line no-console
    console.log(`[EatFitAI] API_BASE_URL configured: ${API_BASE_URL}`);
  }
}

// In-memory access token cache lives in authTokens module

// Queue for 401 refresh handling
type FailedQueueItem = { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void; config: AxiosRequestConfig };
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
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    resolve(apiClient(config));
  }
};

// Attach Authorization before requests
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
    if (token) {
      config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token}` } as InternalAxiosRequestConfig['headers'];
    }
  } catch {}
  return config;
});

// Handle 401 with refresh + queue
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('EatFitAI API error:', {
        status: error?.response?.status,
        message: error?.message || 'No message',
        url: error?.config?.url,
        method: error?.config?.method,
        data: error?.response?.data,
        isNetworkError: !error?.response,
        code: error?.code,
        baseURL: error?.config?.baseURL,
        timeout: error?.config?.timeout,
        fullError: error
      });
    }

    const originalRequest = error.config;
    const status = error.response?.status;
    if (status === 401 && originalRequest && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('Missing refresh token');

        const data = await postRefreshToken(refreshToken);
        const newAccessToken: string | undefined = data.accessToken;
        const newRefreshToken: string | undefined = data.refreshToken;
        const newAccessExp: string | undefined = data.accessTokenExpiresAt;
        const newRefreshExp: string | undefined = data.refreshTokenExpiresAt;
        if (!newAccessToken) throw new Error('Refresh response missing accessToken');

        setAccessTokenMem(newAccessToken);
        if ((tokenStorage as any).saveTokensFull) {
          await (tokenStorage as any).saveTokensFull({
            accessToken: newAccessToken,
            accessTokenExpiresAt: newAccessExp,
            refreshToken: newRefreshToken,
            refreshTokenExpiresAt: newRefreshExp,
          });
        } else {
          await tokenStorage.saveTokens(newAccessToken, newRefreshToken);
        }
        try { (updateSessionFromAuthResponse as any)?.(data); } catch {}

        processQueue(null, newAccessToken);
        (originalRequest as any).headers = { ...(originalRequest.headers ?? {}), Authorization: `Bearer ${newAccessToken}` } as any;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    // Handle network errors specifically
    if (!error.response && error.code) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('[EatFitAI] Network Error Details:', {
          code: error.code,
          message: error.message,
          baseURL: API_BASE_URL,
          request: error.request ? 'Request object exists' : 'No request object',
          config: {
            url: error.config?.url,
            method: error.config?.method,
            timeout: error.config?.timeout
          }
        });
      }

      // Create a more descriptive error for network issues
      const networkError = new Error(
        `Network Error: ${error.message || 'Unable to connect to server'}. ` +
        `Please check your internet connection and ensure the API server is running at ${API_BASE_URL || 'undefined URL'}.`
      );
      networkError.name = 'NetworkError';
      return Promise.reject(networkError);
    }

    return Promise.reject(error);
  },
);

export default apiClient;

