// Lưu ý: file tiện ích dùng Expo SecureStore để lưu token một cách an toàn
// Tất cả chú thích bằng tiếng Việt theo yêu cầu

import * as SecureStore from 'expo-secure-store';

// Khóa cố định để lưu trữ token
const ACCESS_TOKEN_KEY = 'eatfitai.accessToken';
const REFRESH_TOKEN_KEY = 'eatfitai.refreshToken';

// Hàm set/get/clear token tiện dụng
export const tokenStorage = {
  // Lưu access token và refresh token vào SecureStore (mã hoá bởi hệ điều hành)
  async saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  // Lấy access token
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  // Lấy refresh token
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  // Xoá cả hai token (đăng xuất)
  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} as const;

