import { waterService } from '../src/services/waterService';
import apiClient from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
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

describe('waterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the backend monthly endpoint for water aggregates', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        year: 2026,
        month: 4,
        totalMl: 12000,
        averageMl: 2000,
        daysWithData: 6,
      },
    });

    const result = await waterService.getMonthlyWaterIntake(2026, 4);

    expect(apiClient.get).toHaveBeenCalledWith('/api/water-intake/monthly', {
      params: { year: 2026, month: 4 },
    });
    expect(result).toEqual({
      year: 2026,
      month: 4,
      totalMl: 12000,
      averageMl: 2000,
      daysWithData: 6,
    });
  });

  it('returns a zeroed snapshot when the backend monthly request fails', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('backend unavailable'));

    const result = await waterService.getMonthlyWaterIntake(2026, 4);

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      year: 2026,
      month: 4,
      totalMl: 0,
      averageMl: 0,
      daysWithData: 0,
    });
  });
});
