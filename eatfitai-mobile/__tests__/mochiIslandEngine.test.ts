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

  it('describes compact notice metadata for layout-aware host spacing', () => {
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
      mode: 'message',
      presentation: {
        height: 102,
        reservedHeight: 118,
        spriteVariant: 'full',
        spriteSize: 78,
        maxLines: 3,
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
      mode: 'message',
      eventType: 'voice_review',
      poseKey: 'mealPortionNotice',
      presentation: {
        spriteVariant: 'notice',
      },
    });

    const reportReadyState = getMoChiIslandState({
      ...baseInput,
      routeName: 'StatsTab',
      activeEvent: 'report_ready',
      currentStreak: 0,
      totalCalories: 0,
    });

    expect(reportReadyState).toMatchObject({
      mode: 'message',
      eventType: 'report_ready',
      poseKey: 'weeklyReportNotice',
    });
    expect(reportReadyState.presentation.spriteVariant).not.toBe('face');
    expect(reportReadyState.presentation.height).toBeLessThanOrEqual(102);
    expect(reportReadyState.presentation.reservedHeight).toBeGreaterThan(
      reportReadyState.presentation.height,
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

  it('keeps meal and water nudges as dismissible notices without quick confirmations', () => {
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
      mode: 'message',
      eventType: 'meal_reminder',
      confirmationAction: null,
      ctaLabel: null,
    });

    expect(
      getMoChiIslandState({
        ...baseInput,
        now: new Date('2026-05-16T16:00:00+07:00'),
        waterAmountMl: 300,
        waterTargetMl: 2000,
      }),
    ).toMatchObject({
      mode: 'message',
      eventType: 'water_reminder',
      confirmationAction: null,
      ctaLabel: null,
    });
  });

  it('auto-hides notice nudges and leaves live task states active', () => {
    expect(
      getMoChiIslandState({
        ...baseInput,
        now: new Date('2026-05-16T16:00:00+07:00'),
        waterAmountMl: 300,
        waterTargetMl: 2000,
      }),
    ).toMatchObject({
      mode: 'message',
      eventType: 'water_reminder',
      autoHideMs: 6500,
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
