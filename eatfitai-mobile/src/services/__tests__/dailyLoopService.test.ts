import apiClient from '../apiClient';
import { dailyLoopService, normalizeDailyNutritionLoop } from '../dailyLoopService';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../offlineCache', () => ({
  loadWithOfflineFallback: jest.fn(async (_key: string, loader: () => Promise<unknown>) =>
    loader(),
  ),
}));

describe('normalizeDailyNutritionLoop', () => {
  it('normalizes day state, meal budgets, recovery, and one job fields', () => {
    const loop = normalizeDailyNutritionLoop({
      Date: '2026-05-20',
      DayState: {
        Status: 'low_confidence',
        IsComplete: false,
        ConfidenceScore: '58',
        MissingMealTypes: ['dinner'],
        NextAction: {
          Action: 'review_food',
          Label: 'Review food',
          DeepLink: '/diary/review',
        },
        MealStates: [
          {
            MealKey: 'lunch',
            MealTypeId: 2,
            Status: 'logged',
            Calories: '720',
            IsSkipped: false,
            IsRough: false,
            ConfidenceScore: '72',
          },
        ],
      },
      MealBudgets: [
        {
          MealTypeId: 2,
          MealKey: 'lunch',
          Label: 'Lunch',
          TargetCalories: '700',
          MinCalories: '630',
          MaxCalories: '770',
          TargetProtein: '42',
          TargetCarbs: '77',
          TargetFat: '21',
        },
      ],
      Remaining: {
        Calories: '-520',
        Protein: '10',
        Carbs: '-60',
        Fat: '-15',
      },
      NutritionStatus: {
        Status: 'over_target',
        DeltaCalories: '520',
        Message: 'Over target',
      },
      RecoverySuggestion: {
        Tier: 'same_day_recovery',
        Action: 'choose_lighter_dinner',
        Message: 'No need to skip dinner',
        DeepLink: '/diary/add?meal=dinner',
      },
      WeeklyBalanceNote: 'Weekly note',
      OneJobToday: {
        Action: 'choose_lighter_dinner',
        Label: 'Choose lighter dinner',
        DeepLink: '/diary/add?meal=dinner',
      },
    });

    expect(loop.date).toBe('2026-05-20');
    expect(loop.dayState.status).toBe('low_confidence');
    expect(loop.dayState.confidenceScore).toBe(58);
    expect(loop.dayState.missingMealTypes).toEqual(['dinner']);
    expect(loop.dayState.mealStates[0]).toMatchObject({
      mealKey: 'lunch',
      calories: 720,
      confidenceScore: 72,
    });
    expect(loop.mealBudgets[0]).toMatchObject({
      mealTypeId: 2,
      targetCalories: 700,
      minCalories: 630,
      maxCalories: 770,
    });
    expect(loop.remaining.calories).toBe(-520);
    expect(loop.nutritionStatus.status).toBe('over_target');
    expect(loop.recoverySuggestion?.tier).toBe('same_day_recovery');
    expect(loop.oneJobToday.action).toBe('choose_lighter_dinner');
  });
});

describe('dailyLoopService', () => {
  const mockedApiClient = apiClient as unknown as {
    get: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads daily loop from nutrition endpoint using the selected date', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        date: '2026-05-20',
        dayState: { status: 'partial' },
        mealBudgets: [],
        remaining: {},
        nutritionStatus: { status: 'on_track' },
        oneJobToday: { action: 'log_next_meal', label: 'Log next meal' },
      },
    });

    const loop = await dailyLoopService.getDailyLoop('2026-05-20');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/nutrition/daily-loop', {
      params: { date: '2026-05-20' },
    });
    expect(loop.date).toBe('2026-05-20');
    expect(loop.dayState.status).toBe('partial');
    expect(loop.oneJobToday.action).toBe('log_next_meal');
  });
});
