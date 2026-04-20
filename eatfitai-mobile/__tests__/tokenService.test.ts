describe('tokenService', () => {
  beforeEach(() => {
    jest.resetModules();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prefers the configured cloud base URL over a cached LAN URL', async () => {
    const axiosPost = jest.fn().mockResolvedValue({
      data: { accessToken: 'fresh-access-token' },
    });
    const isAxiosError = jest.fn(() => false);

    jest.doMock('../src/config/env', () => ({
      API_BASE_URL: 'https://eatfitai-backend.onrender.com',
    }));
    jest.doMock('../src/services/ipScanner', () => ({
      getCachedApiUrl: jest.fn(() => 'http://192.168.1.20:5247'),
    }));
    jest.doMock('axios', () => ({
      __esModule: true,
      default: {
        post: axiosPost,
        isAxiosError,
      },
      post: axiosPost,
      isAxiosError,
    }));

    let postRefreshToken!: typeof import('../src/services/tokenService').postRefreshToken;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ postRefreshToken } = require('../src/services/tokenService'));
    });

    await postRefreshToken('refresh-token');

    expect(axiosPost).toHaveBeenCalledWith(
      '/api/auth/refresh',
      { refreshToken: 'refresh-token' },
      {
        baseURL: 'https://eatfitai-backend.onrender.com',
        timeout: 10000,
      },
    );
  });

  it('still uses the cached LAN URL for local dev refreshes', async () => {
    const axiosPost = jest.fn().mockResolvedValue({
      data: { accessToken: 'fresh-access-token' },
    });
    const isAxiosError = jest.fn(() => false);

    jest.doMock('../src/config/env', () => ({
      API_BASE_URL: 'http://10.0.2.2:5247',
    }));
    jest.doMock('../src/services/ipScanner', () => ({
      getCachedApiUrl: jest.fn(() => 'http://192.168.1.20:5247'),
    }));
    jest.doMock('axios', () => ({
      __esModule: true,
      default: {
        post: axiosPost,
        isAxiosError,
      },
      post: axiosPost,
      isAxiosError,
    }));

    let postRefreshToken!: typeof import('../src/services/tokenService').postRefreshToken;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ postRefreshToken } = require('../src/services/tokenService'));
    });

    await postRefreshToken('refresh-token');

    expect(axiosPost).toHaveBeenCalledWith(
      '/api/auth/refresh',
      { refreshToken: 'refresh-token' },
      {
        baseURL: 'http://192.168.1.20:5247',
        timeout: 10000,
      },
    );
  });
});
