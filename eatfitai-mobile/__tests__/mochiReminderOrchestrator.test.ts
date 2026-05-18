import {
  buildMoChiReminderCandidates,
  canShowMoChiTopOverlay,
  resolveMoChiSystemNotificationBehavior,
  type MoChiReminderSettings,
} from '../src/features/mochi/mochiReminderOrchestrator';

const SETTINGS: MoChiReminderSettings = {
  enabled: true,
  breakfastEnabled: true,
  breakfastTime: '07:30',
  lunchEnabled: true,
  lunchTime: '12:00',
  dinnerEnabled: true,
  dinnerTime: '19:00',
  snackEnabled: false,
  snackTime: '15:30',
  waterReminderEnabled: true,
  weeklyReviewEnabled: true,
  streakRiskEnabled: true,
  aiRecipeSuggestionsEnabled: true,
  aiNutritionTipsEnabled: true,
  quietHoursEnabled: true,
  quietHoursFrom: '22:00',
  quietHoursTo: '07:00',
};

describe('mochiReminderOrchestrator', () => {
  it('creates meal overdue candidates only after meal time plus thirty minutes', () => {
    const tooEarly = buildMoChiReminderCandidates({
      now: new Date('2026-05-18T07:59:00+07:00'),
      settings: SETTINGS,
      loggedMealTypes: [],
      waterAmountMl: 1200,
      waterTargetMl: 2000,
    });
    const overdue = buildMoChiReminderCandidates({
      now: new Date('2026-05-18T08:01:00+07:00'),
      settings: SETTINGS,
      loggedMealTypes: [],
      waterAmountMl: 1200,
      waterTargetMl: 2000,
    });
    const alreadyLogged = buildMoChiReminderCandidates({
      now: new Date('2026-05-18T08:01:00+07:00'),
      settings: SETTINGS,
      loggedMealTypes: [1],
      waterAmountMl: 1200,
      waterTargetMl: 2000,
    });

    expect(tooEarly.some((item) => item.id.includes('meal_reminder-1'))).toBe(false);
    expect(overdue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'meal_reminder-1-2026-05-18',
          eventType: 'meal_reminder',
          mealTypeId: 1,
          action: 'addMeal',
          title: 'Bữa sáng còn trống',
        }),
      ]),
    );
    expect(alreadyLogged.some((item) => item.id.includes('meal_reminder-1'))).toBe(false);
  });

  it('defers reminders during quiet hours and keeps AI suggestions inbox-only', () => {
    const candidates = buildMoChiReminderCandidates({
      now: new Date('2026-05-18T22:30:00+07:00'),
      settings: SETTINGS,
      loggedMealTypes: [],
      waterAmountMl: 500,
      waterTargetMl: 2000,
      includePassiveTips: true,
    });
    const meal = candidates.find((item) => item.id === 'meal_reminder-3-2026-05-18');
    const aiTip = candidates.find((item) => item.id === 'ai-tip-2026-05-18');

    expect(meal?.retryAfter).toBe('2026-05-19T00:00:00.000Z');
    expect(meal?.severity).toBe('active');
    expect(aiTip).toEqual(
      expect.objectContaining({
        category: 'tip',
        severity: 'passive',
        action: 'openNotifications',
        retryAfter: undefined,
      }),
    );
    expect(canShowMoChiTopOverlay(aiTip!, 'HomeTab', new Date('2026-05-18T22:30:00+07:00'))).toEqual({
      shouldShow: false,
      reason: 'passive-inbox-only',
    });
  });

  it('does not fabricate passive AI tips during normal reminder orchestration', () => {
    const candidates = buildMoChiReminderCandidates({
      now: new Date('2026-05-18T13:00:00+07:00'),
      settings: SETTINGS,
      loggedMealTypes: [1, 2],
      waterAmountMl: 1500,
      waterTargetMl: 2000,
    });

    expect(candidates.some((item) => item.id.startsWith('ai-tip-'))).toBe(false);
  });

  it('allows important dismissed reminders to reappear after one hour but not on MealDiary visible targets', () => {
    const item = {
      ...buildMoChiReminderCandidates({
        now: new Date('2026-05-18T13:00:00+07:00'),
        settings: SETTINGS,
        loggedMealTypes: [1],
        waterAmountMl: 1000,
        waterTargetMl: 2000,
      })[0]!,
      dismissedAt: '2026-05-18T06:05:00.000Z',
      retryAfter: '2026-05-18T07:05:00.000Z',
    };

    expect(canShowMoChiTopOverlay(item, 'HomeTab', new Date('2026-05-18T14:00:00+07:00'))).toEqual({
      shouldShow: true,
      reason: 'important-ready',
    });
    expect(canShowMoChiTopOverlay(item, 'MealDiary', new Date('2026-05-18T14:00:00+07:00'))).toEqual({
      shouldShow: false,
      reason: 'visible-target-inline',
    });
  });

  it('uses default system notification importance except for streak risk and never schedules AI tips externally', () => {
    expect(resolveMoChiSystemNotificationBehavior('meal_reminder')).toEqual({
      shouldSchedule: true,
      androidPriority: 'DEFAULT',
    });
    expect(resolveMoChiSystemNotificationBehavior('water_reminder')).toEqual({
      shouldSchedule: true,
      androidPriority: 'DEFAULT',
    });
    expect(resolveMoChiSystemNotificationBehavior('streak_unlocked')).toEqual({
      shouldSchedule: true,
      androidPriority: 'HIGH',
    });
    expect(resolveMoChiSystemNotificationBehavior('recipe_success')).toEqual({
      shouldSchedule: false,
      androidPriority: 'DEFAULT',
    });
  });
});
