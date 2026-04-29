import { fetchWithAuthRetry } from '../src/services/apiClient';
import { clearAccessTokenMem, getAccessTokenMem } from '../src/services/authTokens';
import {
  setAuthExpiredCallback,
  updateSessionFromAuthResponse,
} from '../src/services/authSession';
import { tokenStorage } from '../src/services/secureStore';
import { postRefreshToken } from '../src/services/tokenService';

const mockAuthSessionState = {
  onAuthExpiredCallback: null as (() => void) | null,
};

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

jest.mock('../src/services/ipScanner', () => ({
  forceRescan: jest.fn(),
  getApiUrl: jest.fn(),
  getCachedApiUrl: jest.fn(),
  preloadCachedUrl: jest.fn(),
  resetScanState: jest.fn(),
  verifyApiUrl: jest.fn(),
}));

jest.mock('../src/services/authTokens', () => ({
  clearAccessTokenMem: jest.fn(),
  getAccessTokenMem: jest.fn(),
}));

jest.mock('../src/services/secureStore', () => ({
  tokenStorage: {
    clearAll: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
  },
}));

jest.mock('../src/services/tokenService', () => ({
  postRefreshToken: jest.fn(),
}));

jest.mock('../src/services/authSession', () => {
  const authTokensModule = jest.requireMock(
    '../src/services/authTokens',
  ) as typeof import('../src/services/authTokens');
  const secureStoreModule = jest.requireMock(
    '../src/services/secureStore',
  ) as typeof import('../src/services/secureStore');
  const tokenServiceModule = jest.requireMock(
    '../src/services/tokenService',
  ) as typeof import('../src/services/tokenService');

  const mockedUpdateSessionFromAuthResponse = jest.fn(
    async (_data: unknown) => undefined,
  );
  const mockedSetAuthExpiredCallback = jest.fn((callback: (() => void) | null) => {
    mockAuthSessionState.onAuthExpiredCallback = callback;
  });
  const mockedRefreshAccessToken = jest.fn(async () => {
    try {
      const refreshToken = await secureStoreModule.tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('Missing refresh token');
      }

      const data = await tokenServiceModule.postRefreshToken(refreshToken);
      const newAccessToken = data?.accessToken;
      if (
        !newAccessToken ||
        typeof newAccessToken !== 'string' ||
        newAccessToken.trim().length === 0
      ) {
        throw new Error('Refresh response missing or invalid accessToken');
      }

      try {
        await mockedUpdateSessionFromAuthResponse(data);
      } catch {
        // Keep matching the production flow: best-effort persistence.
      }

      return newAccessToken;
    } catch (error) {
      try {
        await secureStoreModule.tokenStorage.clearAll();
      } catch {
        // Keep matching the production flow: best-effort cleanup.
      }

      authTokensModule.clearAccessTokenMem();
      mockAuthSessionState.onAuthExpiredCallback?.();
      throw error;
    }
  });

  return {
    refreshAccessToken: mockedRefreshAccessToken,
    setAuthExpiredCallback: mockedSetAuthExpiredCallback,
    updateSessionFromAuthResponse: mockedUpdateSessionFromAuthResponse,
  };
});

describe('fetchWithAuthRetry', () => {
  const mockedClearAccessTokenMem = clearAccessTokenMem as jest.Mock;
  const mockedGetAccessTokenMem = getAccessTokenMem as jest.Mock;
  const mockedPostRefreshToken = postRefreshToken as jest.Mock;
  const mockedUpdateSessionFromAuthResponse =
    updateSessionFromAuthResponse as jest.Mock;
  const mockedClearAll = tokenStorage.clearAll as jest.Mock;
  const mockedGetAccessToken = tokenStorage.getAccessToken as jest.Mock;
  const mockedGetRefreshToken = tokenStorage.getRefreshToken as jest.Mock;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    mockedGetAccessTokenMem.mockReturnValue('expired-access-token');
    mockedGetAccessToken.mockResolvedValue('stored-access-token');
    mockedGetRefreshToken.mockResolvedValue('refresh-token');
    setAuthExpiredCallback(null);
  });

  afterEach(() => {
    setAuthExpiredCallback(null);
  });

  it('retries once after a 401 and reuses the refreshed access token', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    mockedPostRefreshToken.mockResolvedValue({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      accessTokenExpiresAt: '2026-04-18T00:00:00.000Z',
    });

    const response = await fetchWithAuthRetry('http://mock-api.local/api/upload', () => ({
      method: 'POST',
      body: JSON.stringify({ ok: true }),
      headers: {
        'Content-Type': 'application/json',
      },
    }));

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe(
      'Bearer expired-access-token',
    );
    expect(fetchMock.mock.calls[1][1].headers.get('Authorization')).toBe(
      'Bearer fresh-access-token',
    );
    expect(mockedPostRefreshToken).toHaveBeenCalledWith('refresh-token');
    expect(mockedUpdateSessionFromAuthResponse).toHaveBeenCalledWith({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      accessTokenExpiresAt: '2026-04-18T00:00:00.000Z',
    });
    expect(mockedClearAll).not.toHaveBeenCalled();
    expect(mockedClearAccessTokenMem).not.toHaveBeenCalled();
  });

  it('returns the original 401 response and clears auth state when refresh fails', async () => {
    const authExpiredSpy = jest.fn();
    const unauthorizedResponse = {
      ok: false,
      status: 401,
    };

    fetchMock.mockResolvedValue(unauthorizedResponse);
    mockedPostRefreshToken.mockRejectedValue(new Error('refresh failed'));
    setAuthExpiredCallback(authExpiredSpy);

    const response = await fetchWithAuthRetry('http://mock-api.local/api/upload', () => ({
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    }));

    expect(response).toBe(unauthorizedResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedClearAll).toHaveBeenCalledTimes(1);
    expect(mockedClearAccessTokenMem).toHaveBeenCalledTimes(1);
    expect(authExpiredSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the refreshed token in-flight even when session persistence throws', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    mockedPostRefreshToken.mockResolvedValue({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      accessTokenExpiresAt: '2026-04-18T00:00:00.000Z',
    });
    mockedUpdateSessionFromAuthResponse.mockRejectedValue(
      new Error('secure store failed'),
    );
    const authExpiredSpy = jest.fn();
    setAuthExpiredCallback(authExpiredSpy);

    const response = await fetchWithAuthRetry('http://mock-api.local/api/upload', () => ({
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    }));

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.get('Authorization')).toBe(
      'Bearer fresh-access-token',
    );
    expect(mockedClearAll).not.toHaveBeenCalled();
    expect(mockedClearAccessTokenMem).not.toHaveBeenCalled();
    expect(authExpiredSpy).not.toHaveBeenCalled();
  });
});
