// Lưu ý: file tiện ích dùng Expo SecureStore để lưu token một cách an toàn
// Tất cả chú thích bằng tiếng Việt theo yêu cầu

import * as SecureStore from 'expo-secure-store';

// Khóa cố định để lưu trữ token
const ACCESS_TOKEN_KEY = 'eatfitai.accessToken';
const REFRESH_TOKEN_KEY = 'eatfitai.refreshToken';
const ACCESS_EXP_KEY = 'eatfitai.accessTokenExp'; // ISO string UTC
const REFRESH_EXP_KEY = 'eatfitai.refreshTokenExp'; // ISO string UTC

// Hàm set/get/clear token tiện dụng
export const tokenStorage = {
  // Lưu access token và refresh token vào SecureStore (mã hoá bởi hệ điều hành)
  async saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
    // Validate tokens before saving
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new Error('Invalid access token provided to saveTokens');
    }
    if (refreshToken && (typeof refreshToken !== 'string' || refreshToken.trim().length === 0)) {
      console.warn('[EatFitAI] Invalid refresh token provided to saveTokens, skipping');
      refreshToken = undefined;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  // Lưu đầy đủ cả hạn token (ISO UTC)
  async saveTokensFull(params: {
    accessToken: string;
    accessTokenExpiresAt?: string | null;
    refreshToken?: string | null;
    refreshTokenExpiresAt?: string | null;
  }): Promise<void> {
    const { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt } = params;

    // Validate access token
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new Error('Invalid access token provided to saveTokensFull');
    }

    // Validate expiration dates if provided
    if (accessTokenExpiresAt && typeof accessTokenExpiresAt === 'string' && isNaN(Date.parse(accessTokenExpiresAt))) {
      console.warn('[EatFitAI] Invalid access token expiration date format:', accessTokenExpiresAt);
    }
    if (refreshTokenExpiresAt && typeof refreshTokenExpiresAt === 'string' && isNaN(Date.parse(refreshTokenExpiresAt))) {
      console.warn('[EatFitAI] Invalid refresh token expiration date format:', refreshTokenExpiresAt);
    }

    // Validate refresh token if provided
    if (refreshToken && (typeof refreshToken !== 'string' || refreshToken.trim().length === 0)) {
      console.warn('[EatFitAI] Invalid refresh token provided to saveTokensFull, skipping');
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (typeof accessTokenExpiresAt === 'string' && !isNaN(Date.parse(accessTokenExpiresAt))) {
      await SecureStore.setItemAsync(ACCESS_EXP_KEY, accessTokenExpiresAt);
    }
    if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim().length > 0) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (typeof refreshTokenExpiresAt === 'string' && !isNaN(Date.parse(refreshTokenExpiresAt))) {
      await SecureStore.setItemAsync(REFRESH_EXP_KEY, refreshTokenExpiresAt);
    }
  },

  // Lấy access token
  async getAccessToken(): Promise<string | null> {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (__DEV__) {
      console.log('[EatFitAI] Getting access token from storage:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
      });
    }
    return token;
  },

  // Lấy refresh token
  async getRefreshToken(): Promise<string | null> {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (__DEV__) {
      console.log('[EatFitAI] Getting refresh token from storage:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
      });
    }
    return token;
  },

  async getAccessTokenExpiresAt(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_EXP_KEY);
  },

  async getRefreshTokenExpiresAt(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_EXP_KEY);
  },

  // Xoá cả hai token (đăng xuất)
  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ACCESS_EXP_KEY);
    await SecureStore.deleteItemAsync(REFRESH_EXP_KEY);
  },
};

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  ACCESS_EXP_KEY,
  REFRESH_EXP_KEY,
} as const;

