import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';
import { tokenStorage } from './secureStore';

// Client axios cho toàn bộ app
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

if (__DEV__ && !API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[EatFitAI] Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL or provide fallback.');
}

// Bộ nhớ tạm trên RAM để hạn chế đọc SecureStore nhiều lần
let accessTokenMem: string | null = null;

// Cho phép nơi khác (auth store) cập nhật access token trong bộ nhớ nhanh
export const setAccessTokenMem = (token: string | null): void => {
  accessTokenMem = token;
};

// Hàng đợi request khi đang làm mới token (tránh gọi refresh trùng lặp)
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
      // Gắn token mới cho các request chờ
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    resolve(apiClient(config));
  }
};

// Interceptor request: tự động gắn Authorization nếu có token
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    // Ưu tiên đọc từ RAM, nếu không có thì lấy từ SecureStore
    const token = accessTokenMem ?? (await tokenStorage.getAccessToken());
    if (token) {
      config.headers = {
        ...(config.headers ?? {}),
        Authorization: `Bearer ${token}`,
      } as InternalAxiosRequestConfig['headers'];
    }
  } catch (e) {
    // Bỏ qua lỗi đọc SecureStore
  }
  return config;
});

// Interceptor response: tự động refresh khi 401 (nếu có refresh token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('EatFitAI API error:', error?.response?.status, error?.message);
    }

    const originalRequest = error.config;
    const status = error.response?.status;

    // Chỉ xử lý 401 một lần cho mỗi request, tránh vòng lặp vô hạn
    if (status === 401 && originalRequest && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;

      // Nếu đang refresh, đẩy request vào hàng đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('Missing refresh token');
        }

        // Gọi endpoint làm mới token (có thể điều chỉnh theo backend)
        const refreshResp = await apiClient.post('/api/auth/refresh', {
          refreshToken,
        });

        const newAccessToken = (refreshResp.data as any)?.accessToken as string | undefined;
        const newRefreshToken = (refreshResp.data as any)?.refreshToken as string | undefined;

        if (!newAccessToken) {
          throw new Error('Refresh response missing accessToken');
        }

        // Cập nhật bộ nhớ và SecureStore
        setAccessTokenMem(newAccessToken);
        await tokenStorage.saveTokens(newAccessToken, newRefreshToken);

        // Xử lý lại các request đã chờ
        processQueue(null, newAccessToken);

        // Gắn token mới cho request gốc và bắn lại
        (originalRequest as any).headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${newAccessToken}`,
        } as any;

        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Để phần còn lại (ví dụ store logout) xử lý bên ngoài nếu cần
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
