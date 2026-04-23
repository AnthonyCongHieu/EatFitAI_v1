const storageState: Record<string, string | null> = {};

const mockGetItem = jest.fn(async (key: string) => storageState[key] ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => {
  storageState[key] = value;
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
  },
}));

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../src/config/env', () => ({
  API_BASE_URL: 'http://mock-api.local',
}));

jest.mock('../src/services/apiClient', () => ({
  fetchWithAuthRetry: jest.fn(),
  getCurrentApiUrl: jest.fn(() => 'http://mock-api.local'),
}));

describe('telemetryService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.keys(storageState).forEach((key) => {
      delete storageState[key];
    });
    storageState['@eatfitai_telemetry_session'] = 'session-fixed';
  });

  it('stores queued events and flushes them to the backend', async () => {
    const apiClientModule = require('../src/services/apiClient') as typeof import('../src/services/apiClient');
    const fetchWithAuthRetryMock = apiClientModule.fetchWithAuthRetry as jest.Mock;

    fetchWithAuthRetryMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'temporary failure',
    });
    fetchWithAuthRetryMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
    });

    const telemetry = require('../src/services/telemetryService') as typeof import('../src/services/telemetryService');

    await telemetry.trackTelemetryEvent({
      name: 'screen_view',
      category: 'screen_view',
      screen: 'StatsScreen',
      flow: 'navigation',
      step: 'StatsScreen',
      status: 'viewed',
      metadata: { source: 'test' },
    });

    await new Promise<void>((resolve) => {
      setImmediate(() => resolve());
    });

    expect(storageState['@eatfitai_telemetry_queue']).toContain('screen_view');
    expect(fetchWithAuthRetryMock).toHaveBeenCalledTimes(1);

    const flushed = await telemetry.flushTelemetryQueue();

    expect(flushed).toBe(true);
    expect(fetchWithAuthRetryMock).toHaveBeenCalledTimes(2);
    expect(fetchWithAuthRetryMock).toHaveBeenLastCalledWith(
      'http://mock-api.local/api/telemetry/events',
      expect.any(Function),
    );
    expect(storageState['@eatfitai_telemetry_queue']).toBe('[]');
  });
});
