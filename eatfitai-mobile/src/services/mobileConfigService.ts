import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

import { API_BASE_URL } from '../config/env';
import logger from '../utils/logger';
import { getCurrentApiUrl, initializeApiClient } from './apiClient';
import { setTelemetrySampleRate } from './telemetryService';

const MOBILE_CONFIG_CACHE_KEY = '@eatfitai_mobile_runtime_config';
const MOBILE_CONFIG_ETAG_KEY = '@eatfitai_mobile_runtime_config_etag';
const MOBILE_CONFIG_FETCHED_AT_KEY = '@eatfitai_mobile_runtime_config_fetched_at';
export const OPTIONAL_UPDATE_DISMISSED_VERSION_KEY =
  '@eatfitai_optional_update_dismissed_version';
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const CONFIG_FETCH_TIMEOUT_MS = 8000;

export interface MobileRuntimeConfig {
  environment: string;
  platform: string;
  channel: string;
  maintenanceEnabled: boolean;
  maintenanceMessage?: string | null;
  forceUpdateEnabled: boolean;
  minSupportedVersion?: string | null;
  latestVersion?: string | null;
  updateUrl?: string | null;
  featureFlags: Record<string, boolean>;
  telemetrySampleRate: number;
  configVersion: number;
  updatedAt: string;
  eTag?: string;
}

const defaultConfig: MobileRuntimeConfig = {
  environment: 'production',
  platform: 'all',
  channel: 'production',
  maintenanceEnabled: false,
  maintenanceMessage: null,
  forceUpdateEnabled: false,
  minSupportedVersion: null,
  latestVersion: null,
  updateUrl: null,
  featureFlags: {
    aiScan: true,
    voice: true,
    recipes: true,
    pushCampaigns: true,
  },
  telemetrySampleRate: 1,
  configVersion: 1,
  updatedAt: new Date(0).toISOString(),
};

const resolveBaseUrl = (): string | null => {
  const value = getCurrentApiUrl() ?? API_BASE_URL;
  return value?.trim() || null;
};

export const getCurrentAppVersion = (): string =>
  Constants.expoConfig?.version ?? '1.0.0';

const getRuntimeVersion = (): string =>
  String(
    Constants.expoConfig?.runtimeVersion ??
      Updates.runtimeVersion ??
      getCurrentAppVersion(),
  );

const getChannel = (): string =>
  Updates.channel || Constants.expoConfig?.extra?.channel || 'production';

const loadCachedConfig = async (): Promise<MobileRuntimeConfig | null> => {
  try {
    const raw = await AsyncStorage.getItem(MOBILE_CONFIG_CACHE_KEY);
    return raw ? ({ ...defaultConfig, ...JSON.parse(raw) } as MobileRuntimeConfig) : null;
  } catch (error) {
    logger.warn('[MobileConfig] Failed to load cached config', error);
    return null;
  }
};

const persistConfig = async (
  config: MobileRuntimeConfig,
  eTag?: string | null,
): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      [MOBILE_CONFIG_CACHE_KEY, JSON.stringify(config)],
      [MOBILE_CONFIG_ETAG_KEY, eTag ?? config.eTag ?? ''],
      [MOBILE_CONFIG_FETCHED_AT_KEY, String(Date.now())],
    ]);
  } catch (error) {
    logger.warn('[MobileConfig] Failed to persist config', error);
  }
};

const isFreshEnough = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(MOBILE_CONFIG_FETCHED_AT_KEY);
    const fetchedAt = raw ? Number(raw) : 0;
    return Number.isFinite(fetchedAt) && Date.now() - fetchedAt < DEFAULT_CACHE_TTL_MS;
  } catch {
    return false;
  }
};

export const fetchMobileRuntimeConfig = async (
  options: { force?: boolean } = {},
): Promise<MobileRuntimeConfig> => {
  const cached = await loadCachedConfig();
  if (!options.force && cached && (await isFreshEnough())) {
    setTelemetrySampleRate(cached.telemetrySampleRate);
    return cached;
  }

  await initializeApiClient();
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    setTelemetrySampleRate(
      cached?.telemetrySampleRate ?? defaultConfig.telemetrySampleRate,
    );
    return cached ?? defaultConfig;
  }

  const query = new URLSearchParams({
    environment: __DEV__ ? 'development' : 'production',
    platform: Platform.OS,
    channel: getChannel(),
    version: getCurrentAppVersion(),
    runtimeVersion: getRuntimeVersion(),
  });
  const url = `${baseUrl.replace(/\/+$/, '')}/api/mobile/config?${query.toString()}`;
  const eTag = await AsyncStorage.getItem(MOBILE_CONFIG_ETAG_KEY).catch(() => null);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), CONFIG_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: eTag ? { 'If-None-Match': eTag } : undefined,
      signal: abortController.signal,
    });

    if (response.status === 304 && cached) {
      await persistConfig(cached, eTag);
      setTelemetrySampleRate(cached.telemetrySampleRate);
      return cached;
    }

    if (!response.ok) {
      logger.warn('[MobileConfig] Config endpoint returned', response.status);
      setTelemetrySampleRate(
        cached?.telemetrySampleRate ?? defaultConfig.telemetrySampleRate,
      );
      return cached ?? defaultConfig;
    }

    const nextConfig = {
      ...defaultConfig,
      ...(await response.json()),
    } as MobileRuntimeConfig;
    const nextETag = response.headers.get('etag') ?? nextConfig.eTag;
    nextConfig.eTag = nextETag ?? undefined;
    await persistConfig(nextConfig, nextETag);
    setTelemetrySampleRate(nextConfig.telemetrySampleRate);
    return nextConfig;
  } catch (error) {
    logger.warn('[MobileConfig] Config fetch failed', error);
    setTelemetrySampleRate(
      cached?.telemetrySampleRate ?? defaultConfig.telemetrySampleRate,
    );
    return cached ?? defaultConfig;
  } finally {
    clearTimeout(timeout);
  }
};

export const isForceUpdateRequired = (
  config: MobileRuntimeConfig,
  currentVersion = getCurrentAppVersion(),
): boolean => {
  if (!config.forceUpdateEnabled) {
    return false;
  }

  const minimum = config.minSupportedVersion;
  if (!minimum) {
    return true;
  }

  return compareAppVersions(currentVersion, minimum) < 0;
};

export const isUpdateAvailable = (
  config: MobileRuntimeConfig,
  currentVersion = getCurrentAppVersion(),
): boolean => {
  const latest = config.latestVersion?.trim();
  if (!latest) {
    return false;
  }

  return compareAppVersions(currentVersion, latest) < 0;
};

export const getDismissedOptionalUpdateVersion = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(OPTIONAL_UPDATE_DISMISSED_VERSION_KEY);
  } catch (error) {
    logger.warn('[MobileConfig] Failed to read optional update dismissal', error);
    return null;
  }
};

export const dismissOptionalUpdateVersion = async (version: string): Promise<void> => {
  const normalized = version.trim();
  if (!normalized) {
    return;
  }

  try {
    await AsyncStorage.setItem(OPTIONAL_UPDATE_DISMISSED_VERSION_KEY, normalized);
  } catch (error) {
    logger.warn('[MobileConfig] Failed to persist optional update dismissal', error);
  }
};

export const compareAppVersions = (left: string, right: string): number => {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue > rightValue ? 1 : -1;
    }
  }

  return 0;
};

const parseVersionParts = (value: string): number[] => {
  const parts = value.trim().match(/\d+/g);
  if (!parts || parts.length === 0) {
    return [0];
  }

  return parts.map((part) => Number(part)).filter(Number.isFinite);
};
