import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { getCachedApiUrl } from './ipScanner';

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
};

const resolveRefreshBaseUrl = (overrideBaseUrl?: string): string | undefined => {
  const override = overrideBaseUrl?.trim();
  if (override) {
    return override;
  }

  const configuredBaseUrl = API_BASE_URL?.trim();
  const cachedApiUrl = getCachedApiUrl()?.trim();

  if (configuredBaseUrl && (!__DEV__ || shouldWarmCloudBackend(configuredBaseUrl))) {
    return configuredBaseUrl;
  }

  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  return configuredBaseUrl;
};

const isPrivateIpv4Host = (host: string): boolean =>
  /^10\./.test(host) ||
  /^127\./.test(host) ||
  /^192\.168\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

const shouldWarmCloudBackend = (baseUrl?: string): boolean => {
  if (!baseUrl) {
    return false;
  }

  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
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

const warmCloudBackend = async (baseUrl?: string): Promise<void> => {
  const resolvedBaseUrl = resolveRefreshBaseUrl(baseUrl);
  if (!shouldWarmCloudBackend(resolvedBaseUrl) || !resolvedBaseUrl) {
    return;
  }

  const trimmedBaseUrl = resolvedBaseUrl.replace(/\/+$/, '');
  const healthUrls = [`${trimmedBaseUrl}/health/live`, `${trimmedBaseUrl}/health/ready`];

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
  baseUrl?: string,
): Promise<RefreshTokenResponse> => {
  const resolvedBaseUrl = resolveRefreshBaseUrl(baseUrl);
  if (!resolvedBaseUrl) {
    throw new Error('API base URL is missing for token refresh.');
  }

  await warmCloudBackend(resolvedBaseUrl);

  try {
    const response = await axios.post('/api/auth/refresh', { refreshToken }, {
      baseURL: resolvedBaseUrl,
      timeout: 10000,
    });
    return response.data as RefreshTokenResponse;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const shouldRetry = status === undefined || status >= 500;

    if (!shouldRetry) {
      throw error;
    }

    await warmCloudBackend(resolvedBaseUrl);
    const retryResponse = await axios.post('/api/auth/refresh', { refreshToken }, {
      baseURL: resolvedBaseUrl,
      timeout: 10000,
    });
    return retryResponse.data as RefreshTokenResponse;
  }
};
