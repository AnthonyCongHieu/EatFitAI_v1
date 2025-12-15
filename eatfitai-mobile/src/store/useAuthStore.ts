// Auth store (Zustand) quản lý session: login/register/google + silent refresh

import { create } from 'zustand';

import { API_BASE_URL } from '../config/env';
import apiClient, { setAuthExpiredCallback } from '../services/apiClient';
import { setAccessTokenMem } from '../services/authTokens';
import { tokenStorage } from '../services/secureStore';
import { initAuthSession, updateSessionFromAuthResponse } from '../services/authSession';
import type { AuthResponse } from '../types';
import type { AuthTokensResponse } from '../types/auth';
import { t } from '../i18n/vi';

type AuthUser = { id: string; email: string; name?: string };

type AuthState = {
  isInitializing: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ needsOnboarding: boolean }>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | undefined>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
};

const API_BASE = API_BASE_URL ?? '';

const extractRegisterErrorMessage = (err: any): string => {
  const fallback = t('auth.registerFailed');
  if (!err) return fallback;

  const responseData = err?.response?.data ?? err?.data;
  if (!responseData) return err?.message ?? fallback;

  const errors = responseData.errors as Record<string, string[]> | undefined;
  if (errors && typeof errors === 'object') {
    const allMessages = Object.values(errors).flat().filter(Boolean);
    if (allMessages.length > 0) {
      return allMessages.join('\n');
    }
  }

  if (typeof responseData.title === 'string' && responseData.title.trim().length > 0) {
    return responseData.title;
  }

  return err?.message ?? fallback;
};

export const useAuthStore = create<AuthState>((set: any) => ({
  isInitializing: true,
  isAuthenticated: false,
  user: null,

  init: async () => {
    try {
      // Register callback để auto-logout khi refresh token fails
      setAuthExpiredCallback(() => {
        if (__DEV__) {
          console.log('[useAuthStore] Auth expired callback triggered - logging out');
        }
        // Gọi getState() để access store actions từ bên ngoài component
        useAuthStore.getState().logout().catch((err) => {
          console.error('[useAuthStore] Auto-logout failed:', err);
        });
      });

      const token = await tokenStorage.getAccessToken();
      if (token) {
        setAccessTokenMem(token);
        set({ isAuthenticated: true });
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

    set({ isAuthenticated: true, user: (data?.user as AuthUser | undefined) ?? null });

    // Return needsOnboarding flag for navigation decision
    return { needsOnboarding: data?.needsOnboarding ?? false };
  },

  /**
   * @deprecated KHÔNG SỬ DỤNG - Hàm này bypass email verification!
   * Đăng ký mới nên thông qua RegisterScreen → VerifyEmailScreen flow.
   * Endpoint đúng là /api/auth/register-with-verification
   */
  register: async (name, email, password) => {
    console.warn('[useAuthStore] DEPRECATED: register() bypasses email verification!');
    console.warn('[useAuthStore] Use RegisterScreen → VerifyEmailScreen flow instead.');
    throw new Error('Register function is deprecated. Use RegisterScreen for proper email verification flow.');
  },

  signInWithGoogle: async () => {
    // Import googleAuthService for native Google Sign-In
    const { googleAuthService } = await import('../services/googleAuthService');

    // Configure và sign in với native module
    const configured = await googleAuthService.configure();
    if (!configured) {
      throw new Error('Không thể khởi tạo Google Sign-In. Kiểm tra cấu hình trong google.config.ts');
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
    const resp = await apiClient.post<AuthTokensResponse & { user?: AuthUser }>('/api/auth/google/signin', {
      idToken: result.idToken,
    });

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

    set({ isAuthenticated: true, user: data?.user ?? null });
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
      setAccessTokenMem(null);
      set({ isAuthenticated: false, user: null });
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
