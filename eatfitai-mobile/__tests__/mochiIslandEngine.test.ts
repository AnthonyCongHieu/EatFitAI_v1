import {
  getMoChiIslandState,
  type MoChiIslandInput,
} from '../src/features/mochi/mochiIslandEngine';

const baseInput: MoChiIslandInput = {
  routeName: 'HomeTab',
  reminders: [],
  totalCalories: 900,
  targetCalories: 1800,
  waterAmountMl: 1800,
  waterTargetMl: 2000,
  currentStreak: 2,
  totalXP: 120,
  unlockedAchievementIds: [],
  voiceStatus: 'idle',
  now: new Date('2026-05-16T10:00:00+07:00'),
};

describe('MoChi island engine', () => {
  it('stays compact when there is no meaningful context to interrupt the user', () => {
    expect(getMoChiIslandState(baseInput)).toMatchObject({
      mode: 'compact',
      eventType: 'companion_rest',
      poseKey: 'faceCheerful',
      message: null,
      confirmationAction: null,
      presentation: {
        height: 42,
        reservedHeight: 58,
        spriteVariant: 'face',
        spriteSize: 34,
      },
    });
  });

  it('describes expanded presentation metadata for layout-aware host spacing', () => {
    const mealReminderState = getMoChiIslandState({
      ...baseInput,
      reminders: [
        {
          id: 'meal-1',
          type: 'meal',
          label: 'Bữa sáng',
          emoji: '',
          message: 'Ghi bữa sáng nhé',
        },
      ],
    });

    expect(mealReminderState).toMatchObject({
      mode: 'confirm',
      presentation: {
        height: 132,
        reservedHeight: 152,
        spriteVariant: 'notice',
        spriteSize: 64,
        maxLines: 4,
      },
    });
    expect(mealReminderState.presentation.reservedHeight).toBeGreaterThan(
      mealReminderState.presentation.height,
    );
  });

  it('uses full or notice body sprites whenever the island displays text', () => {
    const voiceReviewState = getMoChiIslandState({
      ...baseInput,
      routeName: 'VoiceTab',
      voiceStatus: 'review',
    });

    expect(voiceReviewState).toMatchObject({
      mode: 'confirm',
      eventType: 'voice_review',
      poseKey: 'tabletLog',
      presentation: {
        spriteVariant: 'full',
      },
    });

    const statsNudgeState = getMoChiIslandState({
      ...baseInput,
      routeName: 'StatsTab',
      currentStreak: 0,
      totalCalories: 0,
    });

    expect(statsNudgeState).toMatchObject({
      mode: 'confirm',
      eventType: 'stats_low_data',
      poseKey: 'reportReview',
    });
    expect(statsNudgeState.presentation.spriteVariant).not.toBe('face');
    expect(statsNudgeState.presentation.height).toBeGreaterThan(108);
    expect(statsNudgeState.presentation.reservedHeight).toBeGreaterThan(
      statsNudgeState.presentation.height,
    );
  });

  it('prioritizes live voice context over water and meal nudges', () => {
    expect(
      getMoChiIslandState({
        ...baseInput,
        voiceStatus: 'listening',
        waterAmountMl: 100,
        reminders: [
          {
            id: 'meal-2',
            type: 'meal',
            label: 'Bữa trưa',
            emoji: '',
            message: 'Ghi bữa trưa nhé',
          },
        ],
      }),
    ).toMatchObject({
      mode: 'live',
      eventType: 'voice_listening',
      poseKey: 'analyzing',
      message: 'MoChi đang nghe món, lượng và bữa.',
      confirmationAction: null,
    });
  });

  it('turns meal and water nudges into narrow confirmations instead of a menu', () => {
    expect(
      getMoChiIslandState({
        ...baseInput,
        reminders: [
          {
            id: 'meal-1',
            type: 'meal',
            label: 'Bữa sáng',
            emoji: '',
            message: 'Ghi bữa sáng nhé',
          },
        ],
      }),
    ).toMatchObject({
      mode: 'confirm',
      eventType: 'meal_reminder',
      confirmationAction: 'addMeal',
      ctaLabel: 'Ghi bữa',
    });

    expect(
      getMoChiIslandState({
        ...baseInput,
        now: new Date('2026-05-16T16:00:00+07:00'),
        waterAmountMl: 300,
        waterTargetMl: 2000,
      }),
    ).toMatchObject({
      mode: 'confirm',
      eventType: 'water_reminder',
      confirmationAction: 'water',
      ctaLabel: 'Ghi nước',
    });
  });

  it('keeps scan processing live before lower-priority reminders', () => {
    expect(
      getMoChiIslandState({
        ...baseInput,
        activeEvent: 'scan_processing',
        reminders: [
          {
            id: 'meal-3',
            type: 'meal',
            label: 'Bữa tối',
            emoji: '',
            message: 'Ghi bữa tối nhé',
          },
        ],
      }),
    ).toMatchObject({
      mode: 'live',
      eventType: 'scan_processing',
      poseKey: 'analyzing',
      confirmationAction: null,
    });
  });

  it('uses result messages for success moments and does not expose body-shaming copy', () => {
    const state = getMoChiIslandState({
      ...baseInput,
      activeEvent: 'meal_logged',
    });

    expect(state).toMatchObject({
      mode: 'message',
      eventType: 'meal_logged',
      poseKey: 'saladSuccess',
    });
    expect(state.message?.toLowerCase()).not.toMatch(/béo|mập|xấu|body/u);
  });
});
