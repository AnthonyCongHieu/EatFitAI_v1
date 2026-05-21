describe('healthService', () => {
  const loadHealthService = (baseUrl: string, getMock: jest.Mock) => {
    jest.resetModules();
    jest.doMock('../src/config/env', () => ({
      API_BASE_URL: baseUrl,
    }));
    jest.doMock('../src/services/apiClient', () => ({
      __esModule: true,
      default: {
        get: getMock,
      },
      getCurrentApiUrl: jest.fn(() => baseUrl),
    }));

    return require('../src/services/healthService').healthService as typeof import('../src/services/healthService').healthService;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('coalesces concurrent local warm-up calls into a single health request chain', async () => {
    let resolveFirstRequest: (() => void) | undefined;
    const firstRequest = new Promise<void>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const getMock = jest
      .fn()
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValue({ data: {} });
    const healthService = loadHealthService('http://10.0.2.2:5247', getMock);

    const first = healthService.warmUpBackend({ timeoutMs: 1000 });
    const second = healthService.warmUpBackend({ timeoutMs: 1000 });

    expect(getMock).toHaveBeenCalledTimes(1);
    resolveFirstRequest?.();

    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('reuses a recent successful local warm-up instead of pinging again immediately', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T08:00:00Z'));
    const getMock = jest.fn().mockResolvedValue({ data: {} });
    const healthService = loadHealthService('http://10.0.2.2:5247', getMock);

    await expect(healthService.warmUpBackend({ timeoutMs: 1000 })).resolves.toEqual({ ok: true });
    await expect(healthService.warmUpBackend({ timeoutMs: 1000 })).resolves.toEqual({ ok: true });

    expect(getMock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
