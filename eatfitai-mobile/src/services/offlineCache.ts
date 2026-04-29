import AsyncStorage from '@react-native-async-storage/async-storage';

import logger from '../utils/logger';

type CacheEnvelope<T> = {
  cachedAt: string;
  value: T;
};

const readEnvelope = async <T>(key: string): Promise<CacheEnvelope<T> | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch (error) {
    logger.warn('[OfflineCache] Failed to read cache', key, error);
    return null;
  }
};

const writeEnvelope = async <T>(key: string, value: T): Promise<void> => {
  try {
    const envelope: CacheEnvelope<T> = {
      cachedAt: new Date().toISOString(),
      value,
    };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    logger.warn('[OfflineCache] Failed to write cache', key, error);
  }
};

export const offlineCache = {
  async get<T>(key: string): Promise<T | null> {
    const envelope = await readEnvelope<T>(key);
    return envelope?.value ?? null;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await writeEnvelope(key, value);
  },

  async getCachedAt(key: string): Promise<string | null> {
    const envelope = await readEnvelope<unknown>(key);
    return envelope?.cachedAt ?? null;
  },
};

export const loadWithOfflineFallback = async <T>(
  key: string,
  loader: () => Promise<T>,
): Promise<T> => {
  try {
    const value = await loader();
    await offlineCache.set(key, value);
    return value;
  } catch (error) {
    const cachedValue = await offlineCache.get<T>(key);
    if (cachedValue != null) {
      logger.warn('[OfflineCache] Serving cached snapshot for', key);
      return cachedValue;
    }

    throw error;
  }
};
