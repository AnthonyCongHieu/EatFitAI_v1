import { AxiosHeaders } from 'axios';

jest.mock('../src/config/env', () => ({
  API_BASE_URL: 'http://mock-api.local',
}));

jest.mock('../src/services/secureStore', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(async () => 'fresh-access-token'),
  },
}));

jest.mock('../src/services/authTokens', () => ({
  getAccessTokenMem: jest.fn(),
}));

jest.mock('../src/services/authSession', () => ({
  refreshAccessToken: jest.fn(async () => 'fresh-access-token'),
  setAuthExpiredCallback: jest.fn(),
}));

jest.mock('../src/services/ipScanner', () => ({
  forceRescan: jest.fn(),
  getApiUrl: jest.fn(),
  getCachedApiUrl: jest.fn(),
  preloadCachedUrl: jest.fn(),
  resetScanState: jest.fn(),
  verifyApiUrl: jest.fn(),
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

describe('aiApiClient 401 retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retries AI requests after refreshing the token', async () => {
    const { aiApiClient } = require('../src/services/apiClient') as typeof import('../src/services/apiClient');
    const { refreshAccessToken } = require('../src/services/authSession') as typeof import('../src/services/authSession');
    const { getAccessTokenMem } = require('../src/services/authTokens') as typeof import('../src/services/authTokens');

    let accessToken = 'expired-access-token';
    (getAccessTokenMem as jest.Mock).mockImplementation(() => accessToken);
    (refreshAccessToken as jest.Mock).mockImplementation(async () => {
      accessToken = 'fresh-access-token';
      return accessToken;
    });

    const adapter = jest.fn(async (config: any) => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    aiApiClient.defaults.adapter = adapter;

    const responseHandlers = (aiApiClient.interceptors.response as any).handlers;
    const aiRejectedHandler = responseHandlers.find((handler: any) => handler?.rejected)
      ?.rejected as ((error: any) => Promise<any>) | undefined;

    expect(aiRejectedHandler).toBeDefined();

    const response = await aiRejectedHandler!({
      response: { status: 401 },
      config: {
        url: '/api/ai/nutrition/recalculate',
        method: 'post',
        headers: new AxiosHeaders(),
      },
    });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(1);
    const retriedConfig = adapter.mock.calls[0]?.[0] as
      | { headers: AxiosHeaders }
      | undefined;
    expect(retriedConfig).toBeDefined();
    expect(retriedConfig?.headers.get('Authorization')).toBe('Bearer fresh-access-token');
    expect(response.status).toBe(200);
  });
});
