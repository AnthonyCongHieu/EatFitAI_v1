import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
};

const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

const isPrivateIpv4Host = (host: string): boolean =>
  /^10\./.test(host) ||
  /^127\./.test(host) ||
  /^192\.168\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

const shouldWarmCloudBackend = (): boolean => {
  if (!API_BASE_URL) {
    return false;
  }

  try {
    const host = new URL(API_BASE_URL).hostname.toLowerCase();
    return !(
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '10.0.2.2' ||
      host.endsWith('.local') ||
      isPrivateIpv4Host(host)
    );
  } catch {
    return false;
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const warmCloudBackend = async (): Promise<void> => {
  if (!shouldWarmCloudBackend() || !API_BASE_URL) {
    return;
  }

  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const healthUrls = [`${baseUrl}/health/live`, `${baseUrl}/health/ready`];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const healthUrl of healthUrls) {
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          return;
        }
      } catch {
        // Continue trying other health endpoints while Render wakes up.
      }
    }

    if (attempt < 3) {
      await sleep(4000);
    }
  }
};

export const postRefreshToken = async (
  refreshToken: string,
): Promise<RefreshTokenResponse> => {
  await warmCloudBackend();

  try {
    const response = await refreshClient.post('/api/auth/refresh', { refreshToken });
    return response.data as RefreshTokenResponse;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const shouldRetry = status === undefined || status >= 500;

    if (!shouldRetry) {
      throw error;
    }

    await warmCloudBackend();
    const retryResponse = await refreshClient.post('/api/auth/refresh', { refreshToken });
    return retryResponse.data as RefreshTokenResponse;
  }
};
