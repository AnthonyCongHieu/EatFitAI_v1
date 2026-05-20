import {
  buildDailyLoopMoChiCandidate,
} from '../src/features/mochi/useMoChiNudgeContext';
import type { DailyNutritionLoop } from '../src/services/dailyLoopService';

const makeLoop = (
  overrides: Partial<DailyNutritionLoop> = {},
): DailyNutritionLoop => ({
  date: '2026-05-20',
  dayState: {
    date: '2026-05-20',
    status: 'partial',
    isComplete: false,
    score: 35,
    mealCount: 1,
    mainMealCount: 1,
    snackOnly: false,
    totalCalories: 380,
    confidenceScore: 100,
    nutritionStatus: 'under_target',
    nextAction: {
      action: 'log_next_meal',
      label: 'Quay lại nhịp hôm nay',
      deepLink: '/diary/add',
    },
    requiredMainMeals: 2,
    minimumCalories: 800,
    missingMealTypes: ['Bữa trưa'],
    mealStates: [],
  },
  mealBudgets: [],
  remaining: {
    calories: 1765,
    protein: 123,
    carbs: 164,
    fat: 63,
  },
  nutritionStatus: {
    status: 'under_target',
    deltaCalories: -620,
    message: 'Bạn đang thiếu năng lượng khá nhiều. Nếu không phải chủ ý, hãy thêm một bữa nhẹ dễ ăn.',
  },
  recoverySuggestion: null,
  weeklyBalanceNote: '',
  oneJobToday: {
    action: 'add_snack',
    label: 'Quay lại nhịp hôm nay',
    deepLink: '/diary/add',
  },
  ...overrides,
});

describe('Daily Loop MoChi context', () => {
  it('turns an incomplete Home daily loop into a single overlay candidate', () => {
    const candidate = buildDailyLoopMoChiCandidate(makeLoop(), 'HomeTab');

    expect(candidate).toMatchObject({
      eventType: 'diary_review',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      isCollisionSafe: true,
      notificationAction: 'addMeal',
      title: 'Quay lại nhịp hôm nay',
      message: 'Bạn đang thiếu năng lượng khá nhiều. Nếu không phải chủ ý, hãy thêm một bữa nhẹ dễ ăn.',
      ctaLabel: 'Mở nhật ký',
    });
  });

  it('does not interrupt when the day is already complete or user leaves Home', () => {
    expect(
      buildDailyLoopMoChiCandidate(
        makeLoop({
          dayState: {
            ...makeLoop().dayState,
            status: 'complete',
            isComplete: true,
          },
        }),
        'HomeTab',
      ),
    ).toBeNull();

    expect(buildDailyLoopMoChiCandidate(makeLoop(), 'StatsTab')).toBeNull();
  });
});
