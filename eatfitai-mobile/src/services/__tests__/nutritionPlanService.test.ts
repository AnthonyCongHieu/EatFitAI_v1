import apiClient from '../apiClient';
import { normalizeFlexibleNutritionPlan, nutritionPlanService } from '../nutritionPlanService';

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

describe('normalizeFlexibleNutritionPlan', () => {
  it('normalizes target, meal templates, weeks, and preference tips', () => {
    const plan = normalizeFlexibleNutritionPlan({
      Goal: 'lose',
      Preference: 'budget',
      DurationWeeks: '4',
      IsFixedMenu: false,
      DailyTarget: {
        Calories: '1900',
        Protein: '140',
        Carbs: '210',
        Fat: '55',
      },
      MealTemplates: [
        {
          MealKey: 'lunch',
          Label: 'Bữa trưa',
          MinCalories: '570',
          MaxCalories: '665',
          Structure: '1 protein, 1 carb, 1 vegetable',
        },
      ],
      Weeks: [
        {
          WeekNumber: '1',
          FocusKey: 'baseline',
          Title: 'Baseline',
          Actions: ['Log 4/7 days'],
        },
      ],
      PreferenceTips: ['Ưu tiên món tiết kiệm'],
    });

    expect(plan.goal).toBe('lose');
    expect(plan.preference).toBe('budget');
    expect(plan.durationWeeks).toBe(4);
    expect(plan.isFixedMenu).toBe(false);
    expect(plan.dailyTarget.calories).toBe(1900);
    expect(plan.mealTemplates[0]).toMatchObject({
      mealKey: 'lunch',
      minCalories: 570,
      maxCalories: 665,
    });
    expect(plan.weeks[0]).toMatchObject({
      weekNumber: 1,
      focusKey: 'baseline',
    });
    expect(plan.preferenceTips[0]).toContain('tiết kiệm');
  });
});

describe('nutritionPlanService', () => {
  const mockedApiClient = apiClient as unknown as {
    get: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads flexible plan from nutrition endpoint with target params', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        goal: 'gain',
        preference: 'gym',
        durationWeeks: 4,
        isFixedMenu: false,
        dailyTarget: { calories: 2400, protein: 150, carbs: 300, fat: 70 },
        mealTemplates: [],
        weeks: [],
        preferenceTips: [],
      },
    });

    const plan = await nutritionPlanService.getFlexiblePlan({
      goal: 'gain',
      preference: 'gym',
      targetCalories: 2400,
      targetProtein: 150,
      targetCarbs: 300,
      targetFat: 70,
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/nutrition/flexible-plan', {
      params: {
        goal: 'gain',
        preference: 'gym',
        targetCalories: 2400,
        targetProtein: 150,
        targetCarbs: 300,
        targetFat: 70,
      },
    });
    expect(plan.goal).toBe('gain');
    expect(plan.dailyTarget.calories).toBe(2400);
  });
});
