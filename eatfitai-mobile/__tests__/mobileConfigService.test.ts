import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  compareAppVersions,
  dismissOptionalUpdateVersion,
  getDismissedOptionalUpdateVersion,
  isForceUpdateRequired,
  isUpdateAvailable,
  OPTIONAL_UPDATE_DISMISSED_VERSION_KEY,
  type MobileRuntimeConfig,
} from '../src/services/mobileConfigService';

jest.mock('../src/config/env', () => ({
  API_BASE_URL: 'https://api.example.test',
}));

jest.mock('../src/services/apiClient', () => ({
  getCurrentApiUrl: jest.fn(() => 'https://api.example.test'),
  initializeApiClient: jest.fn(async () => undefined),
}));

jest.mock('../src/services/telemetryService', () => ({
  setTelemetrySampleRate: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const makeConfig = (
  overrides: Partial<MobileRuntimeConfig> = {},
): MobileRuntimeConfig => ({
  environment: 'production',
  platform: 'android',
  channel: 'production',
  maintenanceEnabled: false,
  maintenanceMessage: null,
  forceUpdateEnabled: false,
  minSupportedVersion: null,
  latestVersion: null,
  updateUrl: null,
  featureFlags: {},
  telemetrySampleRate: 1,
  configVersion: 1,
  updatedAt: '2026-05-21T00:00:00.000Z',
  ...overrides,
});

describe('mobileConfigService update gating', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('compares semantic release versions with optional prefixes', () => {
    expect(compareAppVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareAppVersions('android-v1.2.0', '1.1.9')).toBeGreaterThan(0);
    expect(compareAppVersions('1.0', '1.0.0')).toBe(0);
  });

  it('detects optional APK updates from latestVersion', () => {
    expect(isUpdateAvailable(makeConfig({ latestVersion: '1.0.1' }), '1.0.0')).toBe(true);
    expect(isUpdateAvailable(makeConfig({ latestVersion: '1.0.0' }), '1.0.0')).toBe(
      false,
    );
    expect(isUpdateAvailable(makeConfig(), '1.0.0')).toBe(false);
  });

  it('requires forced updates only below the minimum supported version', () => {
    expect(
      isForceUpdateRequired(
        makeConfig({ forceUpdateEnabled: true, minSupportedVersion: '1.1.0' }),
        '1.0.0',
      ),
    ).toBe(true);
    expect(
      isForceUpdateRequired(
        makeConfig({ forceUpdateEnabled: true, minSupportedVersion: '1.0.0' }),
        '1.0.0',
      ),
    ).toBe(false);
  });

  it('stores dismissed optional update prompts per version', async () => {
    await dismissOptionalUpdateVersion('1.0.1');

    await expect(getDismissedOptionalUpdateVersion()).resolves.toBe('1.0.1');
    await expect(
      AsyncStorage.getItem(OPTIONAL_UPDATE_DISMISSED_VERSION_KEY),
    ).resolves.toBe('1.0.1');
  });
});
