import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MOCHI_TUTORIAL_STEPS,
  getMoChiTutorialStepById,
} from '../src/features/mochi/tutorial/mochiTutorialCatalog';
import {
  clearMoChiTutorialPending,
  getMoChiTutorialStatus,
  markMoChiTutorialCompleted,
  markMoChiTutorialPending,
  markMoChiTutorialSkipped,
  resetMoChiTutorialForReplay,
  shouldAutoStartMoChiTutorial,
} from '../src/features/mochi/tutorial/mochiTutorialStorage';
import { getMoChiTutorialSpotlightLayout } from '../src/features/mochi/tutorial/mochiTutorialLayout';

describe('MoChi tutorial system', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('ships the approved 5-step C -> A + D tutorial sequence with concise copy', () => {
    expect(MOCHI_TUTORIAL_STEPS.map((step) => step.id)).toEqual([
      'mochi_hub',
      'add_meal',
      'scan_food',
      'water',
      'stats',
    ]);

    for (const step of MOCHI_TUTORIAL_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
      expect(step.primaryActionLabel.length).toBeGreaterThan(0);
      expect(step.allowSkip).toBe(true);
      expect(step.body.split(/\s+/).length).toBeLessThanOrEqual(18);
    }
  });

  it('keeps tutorial targets stable for production source wiring', () => {
    expect(getMoChiTutorialStepById('mochi_hub')?.targetId).toBe('mochi_hub');
    expect(getMoChiTutorialStepById('add_meal')?.targetId).toBe('quick_add_search');
    expect(getMoChiTutorialStepById('scan_food')?.targetId).toBe('quick_add_scan');
    expect(getMoChiTutorialStepById('water')?.targetId).toBe('home_water');
    expect(getMoChiTutorialStepById('stats')?.targetId).toBe('stats_tab');
  });

  it('auto-starts only when onboarding created a pending tutorial and no final status exists', async () => {
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await markMoChiTutorialPending();
    expect(await shouldAutoStartMoChiTutorial()).toBe(true);

    await markMoChiTutorialCompleted();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await resetMoChiTutorialForReplay();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await markMoChiTutorialPending();
    await markMoChiTutorialSkipped();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await clearMoChiTutorialPending();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);
  });

  it('stores completion status with a version so future tutorials can be safely replayed', async () => {
    await markMoChiTutorialSkipped();
    expect(await getMoChiTutorialStatus()).toMatchObject({
      status: 'skipped',
      version: 1,
    });

    await markMoChiTutorialCompleted();
    expect(await getMoChiTutorialStatus()).toMatchObject({
      status: 'completed',
      version: 1,
    });

    await resetMoChiTutorialForReplay();
    expect(await getMoChiTutorialStatus()).toBeNull();
  });

  it('keeps spotlight geometry inside small screens and targets near the edge', () => {
    const layout = getMoChiTutorialSpotlightLayout({
      frame: { x: 370, y: 760, width: 72, height: 58 },
      screenWidth: 392,
      screenHeight: 844,
      topInset: 24,
      bottomInset: 24,
    });

    expect(layout.ring.left).toBeGreaterThanOrEqual(12);
    expect(layout.ring.top).toBeGreaterThanOrEqual(30);
    expect(layout.ring.width).toBeGreaterThanOrEqual(44);
    expect(layout.ring.height).toBeGreaterThanOrEqual(44);
    expect(layout.ring.left + layout.ring.width).toBeLessThanOrEqual(380);
    expect(layout.ring.top + layout.ring.height).toBeLessThanOrEqual(820);
    expect(layout.card.left).toBeGreaterThanOrEqual(16);
    expect(layout.card.left + layout.card.width).toBeLessThanOrEqual(376);
  });
});
