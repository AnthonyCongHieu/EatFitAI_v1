import { summaryService } from '../src/services/summaryService';
import apiClient from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('summaryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the local calendar date when no date is provided', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 0, 30));
    try {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalCalories: 0,
          dailyCalories: {},
        },
      });

      await summaryService.getWeekSummary();

      expect(apiClient.get).toHaveBeenCalledWith('/api/summary/week', {
        params: { date: '2026-04-01' },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
