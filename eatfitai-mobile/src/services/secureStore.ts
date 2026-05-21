// Lưu ý: file tiện ích dùng Expo SecureStore để lưu token một cách an toàn
// Tất cả chú thích bằng tiếng Việt theo yêu cầu

import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';

// Khóa cố định để lưu trữ token
const ACCESS_TOKEN_KEY = 'eatfitai.accessToken';
const REFRESH_TOKEN_KEY = 'eatfitai.refreshToken';
const ACCESS_EXP_KEY = 'eatfitai.accessTokenExp'; // ISO string UTC
const REFRESH_EXP_KEY = 'eatfitai.refreshTokenExp'; // ISO string UTC
const CHUNK_COUNT_SUFFIX = '.chunkCount';
const CHUNK_VALUE_SUFFIX = '.chunk.';
const SECURE_STORE_CHUNK_SIZE = 1800;

const getChunkCountKey = (key: string): string => `${key}${CHUNK_COUNT_SUFFIX}`;
const getChunkKey = (key: string, index: number): string =>
  `${key}${CHUNK_VALUE_SUFFIX}${index}`;

const deleteChunkedItemAsync = async (key: string): Promise<void> => {
  const countValue = await SecureStore.getItemAsync(getChunkCountKey(key));
  const count = Number.parseInt(countValue || '', 10);
  if (Number.isFinite(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(getChunkKey(key, index)),
      ),
    );
  }

  await SecureStore.deleteItemAsync(getChunkCountKey(key));
};

const setSecureValueAsync = async (key: string, value: string): Promise<void> => {
  if (value.length <= SECURE_STORE_CHUNK_SIZE) {
    await deleteChunkedItemAsync(key);
    await SecureStore.setItemAsync(key, value);
    return;
  }

  const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, 'g')) ?? [];
  await Promise.all(
    chunks.map((chunk, index) => SecureStore.setItemAsync(getChunkKey(key, index), chunk)),
  );
  await SecureStore.setItemAsync(getChunkCountKey(key), String(chunks.length));
  await SecureStore.deleteItemAsync(key);
};

const getSecureValueAsync = async (key: string): Promise<string | null> => {
  const countValue = await SecureStore.getItemAsync(getChunkCountKey(key));
  const count = Number.parseInt(countValue || '', 10);

  if (Number.isFinite(count) && count > 0) {
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(getChunkKey(key, index)),
      ),
    );

    if (chunks.every((chunk): chunk is string => typeof chunk === 'string')) {
      return chunks.join('');
    }

    logger.warn('[SecureStore] Chunked value is incomplete, clearing stale chunks');
    await deleteChunkedItemAsync(key);
    return null;
  }

  return SecureStore.getItemAsync(key);
};

const deleteSecureValueAsync = async (key: string): Promise<void> => {
  await SecureStore.deleteItemAsync(key);
  await deleteChunkedItemAsync(key);
};

// Hàm set/get/clear token tiện dụng
export const tokenStorage = {
  // Lưu access token và refresh token vào SecureStore (mã hoá bởi hệ điều hành)
  async saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
    // Validate tokens before saving
    if (
      !accessToken ||
      typeof accessToken !== 'string' ||
      accessToken.trim().length === 0
    ) {
      throw new Error('Invalid access token provided to saveTokens');
    }
    if (
      refreshToken &&
      (typeof refreshToken !== 'string' || refreshToken.trim().length === 0)
    ) {
      logger.warn('[EatFitAI] Refresh token đưa vào saveTokens không hợp lệ, bỏ qua');
      refreshToken = undefined;
    }
    await setSecureValueAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await setSecureValueAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  // Lưu đầy đủ cả hạn token (ISO UTC)
  async saveTokensFull(params: {
    accessToken: string;
    accessTokenExpiresAt?: string | null;
    refreshToken?: string | null;
    refreshTokenExpiresAt?: string | null;
  }): Promise<void> {
    const { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt } =
      params;

    // Validate access token
    if (
      !accessToken ||
      typeof accessToken !== 'string' ||
      accessToken.trim().length === 0
    ) {
      throw new Error('Invalid access token provided to saveTokensFull');
    }

    // Validate expiration dates if provided
    if (
      accessTokenExpiresAt &&
      typeof accessTokenExpiresAt === 'string' &&
      isNaN(Date.parse(accessTokenExpiresAt))
    ) {
      logger.warn(
        '[EatFitAI] Invalid access token expiration date format:',
        accessTokenExpiresAt,
      );
    }
    if (
      refreshTokenExpiresAt &&
      typeof refreshTokenExpiresAt === 'string' &&
      isNaN(Date.parse(refreshTokenExpiresAt))
    ) {
      logger.warn(
        '[EatFitAI] Định dạng ngày hết hạn refresh token không hợp lệ:',
        refreshTokenExpiresAt,
      );
    }

    // Validate refresh token if provided
    if (
      refreshToken &&
      (typeof refreshToken !== 'string' || refreshToken.trim().length === 0)
    ) {
      logger.warn(
        '[EatFitAI] Refresh token đưa vào saveTokensFull không hợp lệ, bỏ qua',
      );
    }

    await setSecureValueAsync(ACCESS_TOKEN_KEY, accessToken);
    if (__DEV__) {
      logger.info('[SecureStore] Saved access token:', {
        tokenLength: accessToken.length,
        hasExpiry: !!accessTokenExpiresAt,
      });
    }
    if (
      typeof accessTokenExpiresAt === 'string' &&
      !isNaN(Date.parse(accessTokenExpiresAt))
    ) {
      await setSecureValueAsync(ACCESS_EXP_KEY, accessTokenExpiresAt);
    }
    if (
      refreshToken &&
      typeof refreshToken === 'string' &&
      refreshToken.trim().length > 0
    ) {
      await setSecureValueAsync(REFRESH_TOKEN_KEY, refreshToken);
      if (__DEV__) {
        logger.info('[SecureStore] Saved refresh token:', {
          tokenLength: refreshToken.length,
          hasExpiry: !!refreshTokenExpiresAt,
        });
      }
    } else if (__DEV__) {
      logger.warn(
        '[SecureStore] No valid refresh token to save - this will cause auth issues later!',
      );
    }
    if (
      typeof refreshTokenExpiresAt === 'string' &&
      !isNaN(Date.parse(refreshTokenExpiresAt))
    ) {
      await setSecureValueAsync(REFRESH_EXP_KEY, refreshTokenExpiresAt);
    }
  },

  // Lấy access token
  async getAccessToken(): Promise<string | null> {
    const token = await getSecureValueAsync(ACCESS_TOKEN_KEY);
    if (__DEV__) {
      logger.info('[EatFitAI] Getting access token from storage:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
      });
    }
    return token;
  },

  // Lấy refresh token
  async getRefreshToken(): Promise<string | null> {
    const token = await getSecureValueAsync(REFRESH_TOKEN_KEY);
    if (__DEV__) {
      logger.info('[EatFitAI] Getting refresh token from storage:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
      });
    }
    return token;
  },

  async getAccessTokenExpiresAt(): Promise<string | null> {
    return getSecureValueAsync(ACCESS_EXP_KEY);
  },

  async getRefreshTokenExpiresAt(): Promise<string | null> {
    return getSecureValueAsync(REFRESH_EXP_KEY);
  },

  // Xoá cả hai token (đăng xuất)
  async clearAll(): Promise<void> {
    await deleteSecureValueAsync(ACCESS_TOKEN_KEY);
    await deleteSecureValueAsync(REFRESH_TOKEN_KEY);
    await deleteSecureValueAsync(ACCESS_EXP_KEY);
    await deleteSecureValueAsync(REFRESH_EXP_KEY);
  },
};

export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  ACCESS_EXP_KEY,
  REFRESH_EXP_KEY,
} as const;
