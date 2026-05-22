import apiClient from '../apiClient';
import { aiQuotaService } from '../aiQuotaService';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('aiQuotaService', () => {
  const mockedApiClient = apiClient as unknown as {
    get: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads AI quota status from the backend', async () => {
    mockedApiClient.get.mockResolvedValue({
      status: 200,
      data: {
        planCode: 'free',
        isPremium: false,
        timeZoneId: 'Asia/Ho_Chi_Minh',
        windowStartUtc: '2026-05-22T00:00:00Z',
        resetAtUtc: '2026-05-23T00:00:00Z',
        features: [
          {
            key: 'vision_scan',
            label: 'Vision scan',
            isLimited: false,
            limit: null,
            used: 1,
            remaining: null,
            resetAtUtc: '2026-05-23T00:00:00Z',
          },
          {
            key: 'voice_parse',
            label: 'Voice parse',
            isLimited: true,
            limit: 30,
            used: 7,
            remaining: 23,
            resetAtUtc: '2026-05-23T00:00:00Z',
          },
        ],
      },
    });

    const status = await aiQuotaService.getStatus();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/ai/quota', {
      validateStatus: expect.any(Function),
    });
    expect(status.features).toHaveLength(2);
    expect(
      status.features.find((feature) => feature.key === 'vision_scan'),
    ).toMatchObject({
      isLimited: false,
      limit: null,
      remaining: null,
      used: 1,
    });
    expect(
      status.features.find((feature) => feature.key === 'ai_shared_quota'),
    ).toMatchObject({
      limit: 30,
      used: 7,
      remaining: 23,
    });
  });

  it('falls back to unlimited scan and shared free AI quota when quota endpoint is unavailable', async () => {
    mockedApiClient.get.mockResolvedValue({
      status: 404,
      data: '',
    });

    const status = await aiQuotaService.getStatus();

    expect(status).toMatchObject({
      planCode: 'free',
      isPremium: false,
      timeZoneId: 'Asia/Ho_Chi_Minh',
    });
    expect(status.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'vision_scan',
          isLimited: false,
          limit: null,
          remaining: null,
        }),
        expect.objectContaining({
          key: 'ai_shared_quota',
          isLimited: true,
          limit: 30,
          remaining: 30,
        }),
      ]),
    );
  });

  it('adds missing free quota features instead of showing every group as unlimited', async () => {
    mockedApiClient.get.mockResolvedValue({
      status: 200,
      data: {
        planCode: 'free',
        isPremium: false,
        timeZoneId: 'Asia/Ho_Chi_Minh',
        windowStartUtc: '2026-05-22T00:00:00Z',
        resetAtUtc: '2026-05-23T00:00:00Z',
        features: [],
      },
    });

    const status = await aiQuotaService.getStatus();

    expect(status.features.map((feature) => feature.key)).toEqual([
      'vision_scan',
      'ai_shared_quota',
    ]);
    expect(status.features[0]).toMatchObject({ isLimited: false, limit: null });
    expect(status.features[1]).toMatchObject({ limit: 30, remaining: 30 });
  });

  it('normalizes legacy per-feature free quotas into one shared non-scan quota', async () => {
    mockedApiClient.get.mockResolvedValue({
      status: 200,
      data: {
        planCode: 'free',
        isPremium: false,
        timeZoneId: 'Asia/Ho_Chi_Minh',
        windowStartUtc: '2026-05-22T00:00:00Z',
        resetAtUtc: '2026-05-23T00:00:00Z',
        features: [
          {
            key: 'vision_scan',
            label: 'Vision scan',
            isLimited: false,
            limit: null,
            used: 0,
            remaining: null,
            resetAtUtc: '2026-05-23T00:00:00Z',
          },
          {
            key: 'voice_parse',
            label: 'Voice parse',
            isLimited: true,
            limit: 20,
            used: 6,
            remaining: 14,
            resetAtUtc: '2026-05-23T00:00:00Z',
          },
          {
            key: 'recipe_suggestion',
            label: 'Recipe',
            isLimited: true,
            limit: 20,
            used: 3,
            remaining: 17,
            resetAtUtc: '2026-05-23T00:00:00Z',
          },
        ],
      },
    });

    const status = await aiQuotaService.getStatus();

    expect(
      status.features.find((feature) => feature.key === 'vision_scan'),
    ).toMatchObject({
      isLimited: false,
      limit: null,
      remaining: null,
    });
    expect(
      status.features.find((feature) => feature.key === 'ai_shared_quota'),
    ).toMatchObject({
      isLimited: true,
      limit: 30,
      used: 9,
      remaining: 21,
    });
  });
});
