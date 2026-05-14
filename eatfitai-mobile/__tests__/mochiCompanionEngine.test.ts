import {
  BODY_SHAMING_MARKERS,
  getMochiCompanionState,
  type MochiCompanionInput,
} from '../src/features/mochi/mochiCompanionEngine';

const baseInput: MochiCompanionInput = {
  reminders: [],
  totalCalories: 920,
  targetCalories: 1800,
  waterAmountMl: 1700,
  waterTargetMl: 2000,
  currentStreak: 2,
  totalXP: 120,
  unlockedAchievementIds: [],
};

describe('MochiCompanionEngine', () => {
  it('prioritizes meal reminders with a teasing but safe dialogue', () => {
    const state = getMochiCompanionState({
      ...baseInput,
      reminders: [
        {
          id: 'meal-1',
          type: 'meal',
          label: 'Bữa sáng',
          emoji: '🌅',
          message: 'Sáng nay bạn ăn gì rồi? Ghi lại nhé!',
        },
      ],
    });

    expect(state.mood).toBe('hungry_nudge');
    expect(state.animation).toBe('reminder');
    expect(state.primaryAction).toBe('addMeal');
    expect(state.dialogue).toContain('Mochi');
    expect(state.dialogue).toMatch(/bụng|bữa|log|ghi/i);
  });

  it('nudges low water intake with the drink-water animation and bottle accessory', () => {
    const state = getMochiCompanionState({
      ...baseInput,
      waterAmountMl: 350,
      waterTargetMl: 2000,
    });

    expect(state.mood).toBe('thirsty');
    expect(state.animation).toBe('drinkWater');
    expect(state.primaryAction).toBe('water');
    expect(state.activeAccessoryIds).toContain('water_bottle');
  });

  it('celebrates strong streak progress with unlocked trophy cosmetics', () => {
    const state = getMochiCompanionState({
      ...baseInput,
      currentStreak: 14,
      totalXP: 900,
      unlockedAchievementIds: ['streak_7', 'streak_14'],
    });

    expect(state.mood).toBe('streak_flex');
    expect(state.animation).toBe('celebrate');
    expect(state.primaryAction).toBe('viewProgress');
    expect(state.activeAccessoryIds).toEqual(
      expect.arrayContaining(['streak_badge', 'medal', 'trophy']),
    );
  });

  it('uses an idle companion state when there is nothing urgent', () => {
    const state = getMochiCompanionState(baseInput);

    expect(state.mood).toBe('idle');
    expect(state.animation).toBe('idle');
    expect(state.primaryAction).toBe('scanFood');
    expect(state.activeAccessoryIds).toEqual([]);
  });

  it('keeps scripted Vietnamese dialogue free from body-shaming markers', () => {
    const sampledDialogues = [
      getMochiCompanionState(baseInput).dialogue,
      getMochiCompanionState({
        ...baseInput,
        waterAmountMl: 100,
        waterTargetMl: 2000,
      }).dialogue,
      getMochiCompanionState({
        ...baseInput,
        totalCalories: 2300,
        targetCalories: 1800,
      }).dialogue,
      getMochiCompanionState({
        ...baseInput,
        currentStreak: 30,
        unlockedAchievementIds: ['streak_7', 'streak_14', 'streak_30'],
      }).dialogue,
    ].join('\n');

    expect(sampledDialogues).not.toMatch(/[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00bb|\u00e2[\u201d\u2022]/u);

    for (const marker of BODY_SHAMING_MARKERS) {
      expect(sampledDialogues.toLowerCase()).not.toContain(marker);
    }
  });
});
