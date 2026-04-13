// Auth store (Zustand) quản lý session: login/register/google + silent refresh

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import apiClient, { setAuthExpiredCallback } from '../services/apiClient';
import { setAccessTokenMem } from '../services/authTokens';
import { tokenStorage } from '../services/secureStore';
import { initAuthSession, updateSessionFromAuthResponse } from '../services/authSession';
import { postRefreshToken } from '../services/tokenService';
import type { AuthResponse } from '../types';
import type { AuthTokensResponse } from '../types/auth';
import { t } from '../i18n/vi';

type AuthUser = { id: string; email: string; name?: string };

export const AUTH_NEEDS_ONBOARDING_KEY = 'auth_needs_onboarding';
const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';
const STARTUP_API_INIT_TIMEOUT_MS = 2500;

const readNeedsOnboardingFlag = (
  payload: Record<string, unknown> | null | undefined,
  fallback = false,
): boolean => {
  if (!payload) {
    return fallback;
  }

  const camelCaseValue = payload.needsOnboarding;
  if (typeof camelCaseValue === 'boolean') {
    return camelCaseValue;
  }

  const pascalCaseValue = payload.NeedsOnboarding;
  if (typeof pascalCaseValue === 'boolean') {
    return pascalCaseValue;
  }

  return fallback;
};

const persistNeedsOnboarding = async (needsOnboarding: boolean): Promise<void> => {
  await AsyncStorage.setItem(
    AUTH_NEEDS_ONBOARDING_KEY,
    needsOnboarding ? 'true' : 'false',
  );
};

const parseDateMs = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const isTokenStillValid = (value?: string | null): boolean => {
  const expMs = parseDateMs(value);
  return expMs === null || expMs > Date.now();
};

type AuthState = {
  isInitializing: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  user: AuthUser | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ needsOnboarding: boolean }>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ needsOnboarding: boolean }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | undefined>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set: any) => ({
  isInitializing: true,
  isAuthenticated: false,
  needsOnboarding: false,
  user: null,

  init: async () => {
    try {
      // 1. Khởi tạo API client với đúng URL (scan IP nếu cần)
      // Phải chạy TRƯỚC mọi API calls khác
      const { initializeApiClient } = await import('../services/apiClient');
      await Promise.race([
        initializeApiClient().catch((error) => {
          if (__DEV__) {
            console.warn('[useAuthStore] API init failed during startup:', error);
          }
          return false;
        }),
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            if (__DEV__) {
              console.warn(
                `[useAuthStore] API init exceeded ${STARTUP_API_INIT_TIMEOUT_MS}ms. Continuing app startup without blocking UI.`,
              );
            }
            resolve(false);
          }, STARTUP_API_INIT_TIMEOUT_MS);
        }),
      ]);

      // 2. Register callback để auto-logout khi refresh token fails
      setAuthExpiredCallback(() => {
        if (__DEV__) {
          console.log('[useAuthStore] Auth expired callback triggered - logging out');
        }
        // Gọi getState() để access store actions từ bên ngoài component
        useAuthStore
          .getState()
          .logout()
          .catch((err) => {
            console.error('[useAuthStore] Auto-logout failed:', err);
          });
      });

      // 3. Load token từ storage nếu có
      const [token, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt] =
        await Promise.all([
          tokenStorage.getAccessToken(),
          tokenStorage.getRefreshToken(),
          tokenStorage.getAccessTokenExpiresAt(),
          tokenStorage.getRefreshTokenExpiresAt(),
        ]);

      if (token) {
        const persistedNeedsOnboarding =
          (await AsyncStorage.getItem(AUTH_NEEDS_ONBOARDING_KEY)) === 'true';

        if (isTokenStillValid(accessTokenExpiresAt)) {
          setAccessTokenMem(token);
          set({ isAuthenticated: true, needsOnboarding: persistedNeedsOnboarding });
        } else if (refreshToken && isTokenStillValid(refreshTokenExpiresAt)) {
          try {
            const refreshed = await postRefreshToken(refreshToken);
            const refreshedAccessToken = refreshed?.accessToken;
            if (!refreshedAccessToken) {
              throw new Error(t('auth.missingAccessToken'));
            }

            setAccessTokenMem(refreshedAccessToken);
            await updateSessionFromAuthResponse(refreshed as AuthResponse);
            set({ isAuthenticated: true, needsOnboarding: persistedNeedsOnboarding });
          } catch (error) {
            if (__DEV__) {
              console.warn(
                '[useAuthStore] Session refresh during init failed, clearing stale auth state:',
                error,
              );
            }
            await tokenStorage.clearAll();
            await AsyncStorage.multiRemove([
              AUTH_NEEDS_ONBOARDING_KEY,
              ONBOARDING_COMPLETE_KEY,
            ]);
            setAccessTokenMem(null);
            set({ isAuthenticated: false, needsOnboarding: false, user: null });
          }
        } else {
          if (__DEV__) {
            console.log(
              '[useAuthStore] Stored access token is expired and no valid refresh token remains. Clearing session.',
            );
          }
          await tokenStorage.clearAll();
          await AsyncStorage.multiRemove([
            AUTH_NEEDS_ONBOARDING_KEY,
            ONBOARDING_COMPLETE_KEY,
          ]);
          setAccessTokenMem(null);
          set({ isAuthenticated: false, needsOnboarding: false, user: null });
        }
      } else {
        await AsyncStorage.multiRemove([
          AUTH_NEEDS_ONBOARDING_KEY,
          ONBOARDING_COMPLETE_KEY,
        ]);
      }
      await initAuthSession();
    } finally {
      set({ isInitializing: false });
    }
  },

  login: async (email, password) => {
    const resp = await apiClient.post<AuthTokensResponse & { needsOnboarding?: boolean }>(
      '/api/auth/login',
      {
        Email: email,
        Password: password,
      },
    );
    const data = resp.data;
    // Backend trả accessToken (JsonPropertyName) không phải token
    const accessToken = data?.accessToken || data?.token;
    if (!accessToken) {
      console.error('[useAuthStore] Login response missing token:', data);
      throw new Error(t('auth.missingAccessToken'));
    }

    console.log('[useAuthStore] Login successful, saving tokens...');
    await tokenStorage.saveTokensFull({
      accessToken,
      accessTokenExpiresAt: (data?.accessTokenExpiresAt || data?.expiresAt) ?? null,
      refreshToken: data?.refreshToken ?? null,
      refreshTokenExpiresAt: data?.refreshTokenExpiresAt ?? null,
    });
    setAccessTokenMem(accessToken);
    await updateSessionFromAuthResponse(data as AuthResponse);

    const needsOnboarding = readNeedsOnboardingFlag(
      data as Record<string, unknown>,
      false,
    );
    await persistNeedsOnboarding(needsOnboarding);
    set({
      isAuthenticated: true,
      needsOnboarding,
      user: (data?.user as AuthUser | undefined) ?? null,
    });

    // Return needsOnboarding flag for navigation decision
    return { needsOnboarding };
  },

  /**
   * @deprecated KHÔNG SỬ DỤNG - Hàm này bypass email verification!
   * Đăng ký mới nên thông qua RegisterScreen → VerifyEmailScreen flow.
   * Endpoint đúng là /api/auth/register-with-verification
   */
  register: async (_name, _email, _password) => {
    console.warn('[useAuthStore] DEPRECATED: register() bypasses email verification!');
    console.warn('[useAuthStore] Use RegisterScreen → VerifyEmailScreen flow instead.');
    throw new Error(
      'Register function is deprecated. Use RegisterScreen for proper email verification flow.',
    );
  },

  signInWithGoogle: async () => {
    // Import googleAuthService for native Google Sign-In
    const { googleAuthService } = await import('../services/googleAuthService');

    // Configure và sign in với native module
    const configured = await googleAuthService.configure();
    if (!configured) {
      throw new Error(
        'Không thể khởi tạo Google Sign-In. Kiểm tra EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID và env mobile.',
      );
    }

    // Sign in với Google
    const result = await googleAuthService.signIn();
    if (!result.success) {
      throw new Error(result.error || 'Đăng nhập Google thất bại');
    }

    if (!result.idToken) {
      throw new Error('Không nhận được ID Token từ Google');
    }

    // Gửi idToken lên backend để xác thực và lấy JWT
    const resp = await apiClient.post<AuthTokensResponse & { user?: AuthUser }>(
      '/api/auth/google/signin',
      {
        idToken: result.idToken,
      },
    );

    const data = resp.data;
    const accessToken = data?.accessToken || data?.token;

    if (!accessToken) {
      console.error('[useAuthStore] Google signin response missing token:', data);
      throw new Error(t('auth.missingAccessToken'));
    }

    console.log('[useAuthStore] Google Sign-In successful, saving tokens...');
    await tokenStorage.saveTokensFull({
      accessToken,
      accessTokenExpiresAt: data?.accessTokenExpiresAt ?? null,
      refreshToken: data?.refreshToken ?? null,
      refreshTokenExpiresAt: data?.refreshTokenExpiresAt ?? null,
    });
    setAccessTokenMem(accessToken);

    const needsOnboarding = readNeedsOnboardingFlag(
      data as Record<string, unknown>,
      false,
    );
    await persistNeedsOnboarding(needsOnboarding);
    set({ isAuthenticated: true, needsOnboarding, user: data?.user ?? null });

    // Return needsOnboarding flag for navigation decision
    return { needsOnboarding };
  },

  logout: async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/api/auth/logout', { MaRefreshToken: refreshToken });
      }
    } catch {
      // ignore logout API failure; proceed to clear local session
    } finally {
      await tokenStorage.clearAll();
      await AsyncStorage.multiRemove([
        AUTH_NEEDS_ONBOARDING_KEY,
        ONBOARDING_COMPLETE_KEY,
      ]);
      setAccessTokenMem(null);
      set({ isAuthenticated: false, needsOnboarding: false, user: null });
    }
  },
  forgotPassword: async (email) => {
    const resp = await apiClient.post<{ resetCode?: string }>(
      '/api/auth/forgot-password',
      { Email: email },
    );
    const data = resp.data;
    return data?.resetCode as string | undefined;
  },
  resetPassword: async (email, code, newPassword) => {
    await apiClient.post('/api/auth/reset-password', {
      Email: email,
      ResetCode: code,
      NewPassword: newPassword,
    });
  },
}));
