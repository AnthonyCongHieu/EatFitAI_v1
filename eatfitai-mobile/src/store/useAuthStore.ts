// Store xác thực (auth) dùng Zustand
// Chú thích bằng tiếng Việt: quản lý token, đăng nhập/đăng ký, Google sign-in

import { create } from 'zustand';
import * as AuthSession from 'expo-auth-session';

import apiClient, { setAccessTokenMem } from '../services/apiClient';
import { tokenStorage } from '../services/secureStore';

type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

type AuthState = {
  isInitializing: boolean; // trạng thái khởi tạo (đọc token từ SecureStore)
  isAuthenticated: boolean;
  user: AuthUser | null;
  // actions
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

// Helper: lấy base URL từ biến môi trường Expo
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export const useAuthStore = create<AuthState>((set) => ({
  isInitializing: true,
  isAuthenticated: false,
  user: null,

  // Khởi tạo: đọc token từ SecureStore, nếu có => đánh dấu đăng nhập
  init: async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        setAccessTokenMem(token);
        set({ isAuthenticated: true });
        // Tuỳ chọn: có thể gọi /me để lấy thông tin user nếu backend hỗ trợ
        // const me = await apiClient.get('/api/auth/me');
        // set({ user: me.data });
      }
    } finally {
      set({ isInitializing: false });
    }
  },

  // Đăng nhập bằng email/password
  login: async (email, password) => {
    const resp = await apiClient.post('/api/auth/login', { email, password });
    const data = resp.data as any;
    const accessToken = data?.accessToken as string | undefined;
    const refreshToken = data?.refreshToken as string | undefined;
    const user = data?.user as AuthUser | undefined;

    if (!accessToken) {
      throw new Error('Thiếu accessToken trong phản hồi đăng nhập');
    }

    // Lưu và cập nhật trạng thái
    await tokenStorage.saveTokens(accessToken, refreshToken);
    setAccessTokenMem(accessToken);
    set({ isAuthenticated: true, user: user ?? null });
  },

  // Đăng ký tài khoản
  register: async (name, email, password) => {
    const resp = await apiClient.post('/api/auth/register', { name, email, password });
    const data = resp.data as any;
    const accessToken = data?.accessToken as string | undefined;
    const refreshToken = data?.refreshToken as string | undefined;
    const user = data?.user as AuthUser | undefined;

    if (!accessToken) {
      throw new Error('Thiếu accessToken trong phản hồi đăng ký');
    }

    await tokenStorage.saveTokens(accessToken, refreshToken);
    setAccessTokenMem(accessToken);
    set({ isAuthenticated: true, user: user ?? null });
  },

  // Đăng nhập Google: mở trình duyệt xác thực tại backend `/api/auth/google`
  // Backend sau khi xác thực sẽ redirect về redirectUri kèm token (query/fragment)
  signInWithGoogle: async () => {
    // redirectUri tiêu chuẩn cho Expo (dev): dùng proxy để dễ chạy trên thiết bị thật
    const redirectUri = (AuthSession as any).makeRedirectUri({ useProxy: true });
    const authUrl = `${API_BASE}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Dùng any để tương thích API giữa các phiên bản
    const AS: any = AuthSession as any;
    const result = await AS.startAsync({ authUrl });
    if (result.type !== 'success') {
      throw new Error('Đăng nhập Google bị hủy hoặc thất bại');
    }

    // Backend nên trả về cặp token trong params (tùy theo triển khai)
    // Ví dụ: /redirect#accessToken=...&refreshToken=...
    const params: Record<string, string | undefined> = (result as any).params ?? {};
    const accessToken =
      params.accessToken || params.access_token || (result as any).accessToken || (result as any).access_token;
    const refreshToken =
      params.refreshToken || params.refresh_token || (result as any).refreshToken || (result as any).refresh_token;

    if (!accessToken) {
      throw new Error('Không nhận được accessToken từ Google callback');
    }

    await tokenStorage.saveTokens(accessToken, refreshToken);
    setAccessTokenMem(accessToken);
    set({ isAuthenticated: true });
  },

  // Đăng xuất: xóa token và state
  logout: async () => {
    await tokenStorage.clearAll();
    setAccessTokenMem(null);
    set({ isAuthenticated: false, user: null });
  },
}));
