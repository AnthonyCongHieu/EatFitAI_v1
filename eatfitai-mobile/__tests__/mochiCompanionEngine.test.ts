import {
  BODY_SHAMING_MARKERS,
  getMoChiPetState,
  type MoChiPetInput,
} from '../src/features/mochi/mochiPetEngine';

const baseInput: MoChiPetInput = {
  reminders: [],
  totalCalories: 920,
  targetCalories: 1800,
  waterAmountMl: 1700,
  waterTargetMl: 2000,
  currentStreak: 2,
  totalXP: 120,
  unlockedAchievementIds: [],
};

describe('MoChiPetEngine', () => {
  it('uses explicit priority: scan error before reminder before calorie caution before water before streak before idle', () => {
    expect(
      getMoChiPetState({
        ...baseInput,
        activeEvent: 'scan_error',
        reminders: [{ id: 'meal-1', type: 'meal', label: 'Bữa sáng', emoji: '', message: 'Ghi bữa sáng nhé' }],
        totalCalories: 2300,
        targetCalories: 1800,
        waterAmountMl: 100,
        currentStreak: 30,
      }).poseKey,
    ).toBe('sadCry');

    expect(
      getMoChiPetState({
        ...baseInput,
        reminders: [{ id: 'meal-1', type: 'meal', label: 'Bữa sáng', emoji: '', message: 'Ghi bữa sáng nhé' }],
        totalCalories: 2300,
        targetCalories: 1800,
        waterAmountMl: 100,
        currentStreak: 30,
      }).poseKey,
    ).toBe('foodPhone');

    expect(
      getMoChiPetState({
        ...baseInput,
        totalCalories: 2300,
        targetCalories: 1800,
        waterAmountMl: 100,
        currentStreak: 30,
      }).poseKey,
    ).toBe('cakeConcern');

    expect(
      getMoChiPetState({
        ...baseInput,
        waterAmountMl: 100,
        waterTargetMl: 2000,
        currentStreak: 30,
      }).poseKey,
    ).toBe('hydrate');

    expect(
      getMoChiPetState({
        ...baseInput,
        currentStreak: 30,
        unlockedAchievementIds: ['streak_30'],
      }).poseKey,
    ).toBe('celebrate');

    expect(getMoChiPetState(baseInput).poseKey).toBe('idle');
  });

  it('returns actions and bubbles for the core assistant flows', () => {
    expect(getMoChiPetState({ ...baseInput, activeEvent: 'scan_processing' })).toMatchObject({
      mood: 'thinking',
      poseKey: 'analyzing',
      primaryAction: 'scanFood',
      shouldBubble: true,
    });

    expect(getMoChiPetState({ ...baseInput, activeEvent: 'meal_logged' })).toMatchObject({
      mood: 'happy',
      poseKey: 'saladSuccess',
      primaryAction: 'viewDiary',
      shouldBubble: true,
    });

    expect(getMoChiPetState({ ...baseInput, activeEvent: 'report_ready' })).toMatchObject({
      mood: 'reporting',
      poseKey: 'reportReview',
      primaryAction: 'viewProgress',
    });
  });

  it('keeps scripted Vietnamese dialogue readable and body-safe', () => {
    const sampledDialogues = [
      getMoChiPetState(baseInput).dialogue,
      getMoChiPetState({ ...baseInput, activeEvent: 'scan_error' }).dialogue,
      getMoChiPetState({ ...baseInput, waterAmountMl: 100, waterTargetMl: 2000 }).dialogue,
      getMoChiPetState({ ...baseInput, totalCalories: 2300, targetCalories: 1800 }).dialogue,
      getMoChiPetState({ ...baseInput, currentStreak: 14, unlockedAchievementIds: ['streak_14'] }).dialogue,
    ].join('\n');

    expect(sampledDialogues).not.toMatch(/[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00bb|\u00e2[\u201d\u2022]/u);

    for (const marker of BODY_SHAMING_MARKERS) {
      expect(sampledDialogues.toLowerCase()).not.toContain(marker);
    }
  });
});
