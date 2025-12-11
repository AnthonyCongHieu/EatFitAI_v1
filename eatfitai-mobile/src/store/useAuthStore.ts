// Auth store (Zustand) quản lý session: login/register/google + silent refresh

import { create } from 'zustand';
import * as AuthSession from 'expo-auth-session';
import {
  makeRedirectUri,
  type AuthSessionOptions,
  type AuthSessionResult,
} from 'expo-auth-session';

import { API_BASE_URL } from '../config/env';
import apiClient from '../services/apiClient';
import { setAccessTokenMem } from '../services/authTokens';
import { tokenStorage } from '../services/secureStore';
import { initAuthSession, updateSessionFromAuthResponse } from '../services/authSession';
import type { AuthResponse } from '../types';
import type { AuthSessionSuccessResult, AuthTokensResponse } from '../types/auth';
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
    throw new Error(
      'Register function is deprecated. Use RegisterScreen for proper email verification flow.',
    );
  },

  signInWithGoogle: async () => {
    if (!API_BASE) {
      throw new Error(
        'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL or provide a fallback.',
      );
    }

    type StartAsyncFn = (options: AuthSessionOptions) => Promise<AuthSessionResult>;
    const startAuthSessionAsync: StartAsyncFn = (
      AuthSession as unknown as { startAsync: StartAsyncFn }
    ).startAsync;

    const redirectUri = makeRedirectUri();
    const authUrl = `${API_BASE}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const result = await startAuthSessionAsync({ authUrl });
    if (result.type !== 'success') {
      throw new Error(t('auth.googleLoginCancelled'));
    }

    const params: Record<string, string | undefined> = result.params ?? {};
    const accessToken =
      params.accessToken ||
      params.access_token ||
      (result as AuthSessionSuccessResult).accessToken ||
      (result as AuthSessionSuccessResult).access_token;
    const refreshToken =
      params.refreshToken ||
      params.refresh_token ||
      (result as AuthSessionSuccessResult).refreshToken ||
      (result as AuthSessionSuccessResult).refresh_token;

    if (!accessToken) throw new Error(t('auth.googleAccessTokenMissing'));

    await tokenStorage.saveTokensFull({
      accessToken,
      accessTokenExpiresAt:
        (result as AuthSessionSuccessResult).accessTokenExpiresAt ||
        params.accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt:
        (result as AuthSessionSuccessResult).refreshTokenExpiresAt ||
        params.refreshTokenExpiresAt,
    });
    setAccessTokenMem(accessToken);
    try {
      await updateSessionFromAuthResponse(result as AuthResponse);
    } catch {}

    set({ isAuthenticated: true });
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
