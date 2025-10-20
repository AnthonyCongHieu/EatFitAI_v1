import { AppState, AppStateStatus } from 'react-native';
import { setAccessTokenMem } from './authTokens';
import { tokenStorage } from './secureStore';
import { requestRefreshToken } from './tokenService';

// Silent refresh: schedule before access token expires; also trigger on foreground

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let appStateListenerSet = false;

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

    // Call refresh endpoint via token service to avoid circular import
    const data = await postRefreshToken(refreshToken);
    const accessToken = data?.accessToken as string | undefined;
    const refreshTokenNew = data?.refreshToken as string | undefined;
    const accessTokenExpiresAt = data?.accessTokenExpiresAt as string | undefined;
    const refreshTokenExpiresAt = data?.refreshTokenExpiresAt as string | undefined;
    if (accessToken) {
      setAccessTokenMem(accessToken);
      await tokenStorage.saveTokensFull({
        accessToken,
        accessTokenExpiresAt,
        refreshToken: refreshTokenNew ?? refreshToken,
        refreshTokenExpiresAt: refreshTokenExpiresAt,
      });
      await scheduleRefresh(accessTokenExpiresAt);
    }
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

