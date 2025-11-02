// Auth store (Zustand) quản lý session: login/register/google + silent refresh

import { create } from 'zustand';
import * as AuthSession from 'expo-auth-session';

import { API_BASE_URL } from '../config/env';
import apiClient from '../services/apiClient';
import { setAccessTokenMem } from '../services/authTokens';
import { tokenStorage } from '../services/secureStore';
import { initAuthSession, updateSessionFromAuthResponse } from '../services/authSession';
import type { AuthResponse } from '../types';

type AuthUser = { id: string; email: string; name?: string };

type AuthState = {
  isInitializing: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const API_BASE = API_BASE_URL ?? '';

const extractRegisterErrorMessage = (err: any): string => {
  const fallback = 'Đăng ký thất bại, vui lòng thử lại.';
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
    const resp = await apiClient.post('/api/auth/login', { Email: email, Password: password });
    const data = resp.data as any;
    const accessToken = data?.token as string | undefined;
    if (!accessToken) throw new Error('Thiếu accessToken trong phản hồi đăng nhập');

    await tokenStorage.saveTokensFull({
      accessToken,
      accessTokenExpiresAt: data?.expiresAt,
      refreshToken: data?.refreshToken,
      refreshTokenExpiresAt: data?.refreshTokenExpiresAt,
    });
    setAccessTokenMem(accessToken);
    await updateSessionFromAuthResponse(data);

    set({ isAuthenticated: true, user: (data?.user as AuthUser | undefined) ?? null });
  },

  register: async (name, email, password) => {
    try {
      console.log('[useAuthStore] Starting registration API call');
      const resp = await apiClient.post('/api/auth/register', { DisplayName: name, Email: email, Password: password });
      console.log('[useAuthStore] Registration API response:', resp.data);
      const data = resp.data as any;
      const accessToken = data?.token as string | undefined;
      if (!accessToken) throw new Error('Thiếu accessToken trong phản hồi đăng ký');

      await tokenStorage.saveTokensFull({
        accessToken,
        accessTokenExpiresAt: data?.expiresAt,
        refreshToken: data?.refreshToken,
        refreshTokenExpiresAt: data?.refreshTokenExpiresAt,
      });
      setAccessTokenMem(accessToken);
      await updateSessionFromAuthResponse(data);

      set({ isAuthenticated: true, user: (data?.user as AuthUser | undefined) ?? null });
    } catch (err: any) {
      console.error('[useAuthStore] Registration failed:', {
        error: err,
        message: err?.message,
        response: err?.response,
        status: err?.response?.status,
        data: err?.response?.data,
        isNetworkError: !err?.response
      });
      const message = extractRegisterErrorMessage(err);
      throw new Error(message);
    }
  },

  signInWithGoogle: async () => {
    if (!API_BASE) {
      throw new Error('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL or provide a fallback.');
    }

    const redirectUri = (AuthSession as any).makeRedirectUri({ useProxy: true });
    const authUrl = `${API_BASE}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const AS: any = AuthSession as any;
    const result = await AS.startAsync({ authUrl });
    if (result.type !== 'success') {
      throw new Error('Đăng nhập Google bị hủy hoặc thất bại');
    }

    const params: Record<string, string | undefined> = (result as any).params ?? {};
    const accessToken =
      params.accessToken || params.access_token || (result as any).accessToken || (result as any).access_token;
    const refreshToken =
      params.refreshToken || params.refresh_token || (result as any).refreshToken || (result as any).refresh_token;

    if (!accessToken) throw new Error('Không nhận được accessToken từ Google callback');

    await tokenStorage.saveTokensFull({
      accessToken,
      accessTokenExpiresAt: (result as any).accessTokenExpiresAt || params.accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt: (result as any).refreshTokenExpiresAt || params.refreshTokenExpiresAt,
    });
    setAccessTokenMem(accessToken);
    try { await updateSessionFromAuthResponse(result); } catch {}

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
}));

