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
      poseKey: 'islandAvatar',
      message: null,
      confirmationAction: null,
      presentation: {
        height: 42,
        reservedHeight: 58,
        spriteVariant: 'face',
        spriteSize: 38,
      },
    });
  });

  it('uses a dedicated compact island avatar sprite', () => {
    expect(getMoChiIslandState(baseInput)).toMatchObject({
      mode: 'compact',
      poseKey: 'islandAvatar',
      presentation: {
        spriteVariant: 'face',
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
        spriteVariant: 'full',
        spriteSize: 72,
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
      poseKey: 'mealPortionNotice',
      presentation: {
        spriteVariant: 'notice',
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
      poseKey: 'weeklyReportNotice',
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
      poseKey: 'listeningNotice',
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

  it('auto-hides confirm nudges and leaves live task states active', () => {
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
      autoHideMs: 9000,
      cooldownKey: 'water_reminder:HomeTab',
    });

    expect(
      getMoChiIslandState({
        ...baseInput,
        activeEvent: 'scan_processing',
      }),
    ).toMatchObject({
      mode: 'live',
      autoHideMs: null,
      cooldownKey: null,
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
      poseKey: 'scanThinkingFull',
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
