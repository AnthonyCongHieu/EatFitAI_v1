import { summaryService } from '../src/services/summaryService';
import apiClient from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../src/services/offlineCache', () => ({
  loadWithOfflineFallback: jest.fn(async (_key: string, loader: () => Promise<unknown>) => {
    return await loader();
  }),
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

  it('normalizes the weekly review response contract', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        status: 'ADJUST',
        message: 'Tuần này bạn đang đi đúng hướng.',
        confidence: '88',
        dataQuality: '91',
        suggestedActions: {
          type: 'adjust_calories',
          newTargetCalories: '2100',
          newMacros: {
            protein: '140',
            carbs: '220',
            fat: '60',
          },
          lifestyleChanges: ['Ngủ sớm hơn'],
          trackingTips: ['Log bữa tối đầy đủ'],
        },
        insights: {
          weightTrend: 'stable',
          complianceScore: '84',
          energyLevel: 'good',
          recommendations: ['Giữ mức protein ổn định'],
        },
      },
    });

    const result = await summaryService.getWeeklyReview();

    expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/weekly-review');
    expect(result).toEqual({
      status: 'ADJUST',
      message: 'Tuần này bạn đang đi đúng hướng.',
      confidence: 88,
      dataQuality: 91,
      suggestedActions: {
        type: 'adjust_calories',
        newTargetCalories: 2100,
        newMacros: {
          protein: 140,
          carbs: 220,
          fat: 60,
        },
        lifestyleChanges: ['Ngủ sớm hơn'],
        trackingTips: ['Log bữa tối đầy đủ'],
      },
      insights: {
        weightTrend: 'stable',
        complianceScore: 84,
        energyLevel: 'good',
        recommendations: ['Giữ mức protein ổn định'],
      },
    });
  });
});
