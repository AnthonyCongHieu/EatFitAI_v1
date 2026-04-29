import { AppState, AppStateStatus } from 'react-native';
import { clearAccessTokenMem, setAccessTokenMem } from './authTokens';
import { tokenStorage } from './secureStore';
import { postRefreshToken } from './tokenService';
import logger from '../utils/logger';

// Silent refresh: schedule before access token expires; also trigger on foreground

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let appStateListenerSet = false;
let onAuthExpiredCallback: (() => void) | null = null;
let refreshPromise: Promise<string> | null = null;

const FIVE_MIN_MS = 5 * 60 * 1000;
const SCHEDULE_AHEAD_MS = 4 * 60 * 1000; // refresh ~4 minutes before expiry

const parseDate = (value?: string | null): number | null => {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
};

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

const scheduleRefresh = async (accessExpIso?: string | null) => {
  clearRefreshTimer();
  const expMs = parseDate(accessExpIso ?? (await tokenStorage.getAccessTokenExpiresAt()));
  if (!expMs) return;
  const now = Date.now();
  let delay = expMs - now - SCHEDULE_AHEAD_MS;
  if (delay <= 0) delay = 2000; // refresh soon if already near/over threshold
  refreshTimer = setTimeout(() => {
    void silentRefreshIfNeeded();
  }, delay);
};

const notifyAuthExpired = (): void => {
  if (!onAuthExpiredCallback) {
    return;
  }

  if (__DEV__) {
    logger.info('[EatFitAI] Triggering auth expired callback (auto-logout)...');
  }

  try {
    onAuthExpiredCallback();
  } catch (callbackError) {
    logger.error('[EatFitAI] Auth expired callback error:', callbackError);
  }
};

const clearStoredAuthState = async (): Promise<void> => {
  try {
    await tokenStorage.clearAll();
  } catch (clearError) {
    logger.warn('[EatFitAI] Failed to clear stored auth state:', clearError);
  }

  clearAccessTokenMem();
};

export const setAuthExpiredCallback = (callback: (() => void) | null): void => {
  onAuthExpiredCallback = callback;
};

export const updateSessionFromAuthResponse = async (data: any): Promise<void> => {
  const accessToken = data?.accessToken as string | undefined;
  const refreshToken = data?.refreshToken as string | undefined;
  const accessTokenExpiresAt = data?.accessTokenExpiresAt as string | undefined;
  const refreshTokenExpiresAt = data?.refreshTokenExpiresAt as string | undefined;
  if (!accessToken) return;
  setAccessTokenMem(accessToken);
  await tokenStorage.saveTokensFull({
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
  });
  await scheduleRefresh(accessTokenExpiresAt);
};

const runSharedRefresh = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (__DEV__) {
        logger.info('[EatFitAI] Refresh attempt - has refresh token:', !!refreshToken);
      }

      if (!refreshToken) {
        throw new Error('Missing refresh token');
      }

      if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
        throw new Error('Định dạng refresh token không hợp lệ');
      }

      const data = await postRefreshToken(refreshToken);
      if (__DEV__) {
        logger.info('[EatFitAI] Refresh response received:', {
          hasAccessToken: !!data.accessToken,
          hasRefreshToken: !!data.refreshToken,
          accessExp: data.accessTokenExpiresAt,
          refreshExp: data.refreshTokenExpiresAt,
        });
      }

      const newAccessToken = data.accessToken;
      if (
        !newAccessToken ||
        typeof newAccessToken !== 'string' ||
        newAccessToken.trim().length === 0
      ) {
        throw new Error('Refresh response missing or invalid accessToken');
      }

      if (data.accessTokenExpiresAt && isNaN(Date.parse(data.accessTokenExpiresAt))) {
        logger.warn(
          '[EatFitAI] Invalid access token expiration format:',
          data.accessTokenExpiresAt,
        );
      }
      if (data.refreshTokenExpiresAt && isNaN(Date.parse(data.refreshTokenExpiresAt))) {
        logger.warn(
          '[EatFitAI] Định dạng thời hạn refresh token không hợp lệ:',
          data.refreshTokenExpiresAt,
        );
      }

      try {
        await updateSessionFromAuthResponse(data);
      } catch (sessionError) {
        logger.warn(
          '[EatFitAI] Refresh succeeded but session persistence failed; continuing with in-memory token.',
          sessionError,
        );
      }

      return newAccessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const tryRefreshAccessToken = async (): Promise<string | null> => {
  try {
    return await runSharedRefresh();
  } catch {
    return null;
  }
};

export const refreshAccessToken = async (): Promise<string> => {
  try {
    return await runSharedRefresh();
  } catch (err) {
    if (__DEV__) {
      logger.error('[EatFitAI] Refresh failed:', err);
    }

    await clearStoredAuthState();
    notifyAuthExpired();
    throw err;
  }
};

export const silentRefreshIfNeeded = async (): Promise<void> => {
  try {
    const accessExpIso = await tokenStorage.getAccessTokenExpiresAt();
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!accessExpIso || !refreshToken) return;

    const expMs = parseDate(accessExpIso);
    if (!expMs) return;
    const now = Date.now();
    const timeLeft = expMs - now;
    if (timeLeft > FIVE_MIN_MS) {
      return; // not close to expire
    }

    await tryRefreshAccessToken();
  } catch {
    // Ignore errors; interceptor flow will handle on demand
  }
};

const onAppStateChange = (next: AppStateStatus) => {
  if (next === 'active') {
    void silentRefreshIfNeeded();
  }
};

export const initAuthSession = async (): Promise<void> => {
  if (!appStateListenerSet) {
    AppState.addEventListener('change', onAppStateChange);
    appStateListenerSet = true;
  }
  await scheduleRefresh();
};
