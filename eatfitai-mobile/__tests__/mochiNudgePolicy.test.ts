import {
  createEmptyMoChiPolicyMemory,
  recordMoChiPolicyEvent,
  resolveMoChiSurfaceDecision,
} from '../src/features/mochi/mochiNudgePolicy';

const NOW = new Date('2026-05-18T13:30:00+07:00');

describe('mochiNudgePolicy', () => {
  it('keeps visible MealDiary meal reminders inline even when overlay is requested', () => {
    const decision = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'MealDiary',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      isCollisionSafe: true,
      now: NOW,
    });

    expect(decision.shouldShow).toBe(true);
    expect(decision.surface).toBe('inline');
    expect(decision.reason).toBe('visible-target-inline');
  });

  it('downgrades repeated overlays for the same event within 24 hours', () => {
    const memory = createEmptyMoChiPolicyMemory(NOW);
    const first = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      memory,
      now: NOW,
    });
    const afterShown = recordMoChiPolicyEvent(memory, first, 'shown', NOW);

    const second = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      memory: afterShown,
      now: new Date(NOW.getTime() + 60 * 60 * 1000),
    });

    expect(first.surface).toBe('overlay');
    expect(second.surface).toBe('inline');
    expect(second.reason).toBe('overlay-cooldown');
  });

  it('allows important notification retries to bypass the normal overlay cooldown', () => {
    const memory = createEmptyMoChiPolicyMemory(NOW);
    const first = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      memory,
      now: NOW,
    });
    const afterShown = recordMoChiPolicyEvent(memory, first, 'shown', NOW);

    const retry = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      bypassOverlayCooldown: true,
      memory: afterShown,
      now: new Date(NOW.getTime() + 60 * 60 * 1000),
    });

    expect(retry.surface).toBe('overlay');
    expect(retry.reason).toBe('overlay');
  });

  it('caps overlays to two per session and falls back to inline task help', () => {
    const decision = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      session: { overlayCount: 2, messageCount: 2 },
      now: NOW,
    });

    expect(decision.shouldShow).toBe(true);
    expect(decision.surface).toBe('inline');
    expect(decision.reason).toBe('session-overlay-cap');
  });

  it('downgrades overlays to inline when timing is weak or collision safety fails', () => {
    const weakTiming = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: false,
      now: NOW,
    });
    const collisionRisk = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      isCollisionSafe: false,
      now: NOW,
    });

    expect(weakTiming.surface).toBe('inline');
    expect(weakTiming.reason).toBe('weak-timing');
    expect(collisionRisk.surface).toBe('inline');
    expect(collisionRisk.reason).toBe('collision-risk');
  });

  it('suppresses non-critical nudges for three days after repeated dismissals', () => {
    const memory = createEmptyMoChiPolicyMemory(NOW);
    const decision = resolveMoChiSurfaceDecision({
      eventType: 'water_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      memory,
      now: NOW,
    });
    const dismissedOnce = recordMoChiPolicyEvent(memory, decision, 'dismissed', NOW);
    const dismissedTwice = recordMoChiPolicyEvent(
      dismissedOnce,
      decision,
      'dismissed',
      new Date(NOW.getTime() + 30 * 60 * 1000),
    );

    const next = resolveMoChiSurfaceDecision({
      eventType: 'water_reminder',
      routeName: 'HomeTab',
      preferredSurface: 'overlay',
      hasStrongTiming: true,
      memory: dismissedTwice,
      now: new Date(NOW.getTime() + 60 * 60 * 1000),
    });

    expect(next.shouldShow).toBe(false);
    expect(next.surface).toBe('none');
    expect(next.reason).toBe('dismiss-suppressed');
  });

  it('keeps live process states exempt from message caps but prevents live stacking', () => {
    const allowed = resolveMoChiSurfaceDecision({
      eventType: 'scan_processing',
      routeName: 'AiCamera',
      preferredSurface: 'inline',
      session: { overlayCount: 2, messageCount: 3 },
      now: NOW,
    });
    const stacked = resolveMoChiSurfaceDecision({
      eventType: 'scan_processing',
      routeName: 'AiCamera',
      preferredSurface: 'inline',
      activeLiveEventKey: 'voice_listening:VoiceTab',
      session: { overlayCount: 2, messageCount: 3 },
      now: NOW,
    });

    expect(allowed.shouldShow).toBe(true);
    expect(allowed.surface).toBe('inline');
    expect(allowed.reason).toBe('live');
    expect(stacked.shouldShow).toBe(false);
    expect(stacked.reason).toBe('live-stack');
  });

  it('treats backend nudge decisions as advisory but still applies local suppression', () => {
    const declined = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'system',
      preferredSurface: 'systemNotification',
      backendDecision: {
        shouldNudge: false,
        reason: 'backend-suppressed',
        suggestedMessage: '',
        deepLink: 'eatfitai://diary',
      },
      now: NOW,
    });
    const locallyCapped = resolveMoChiSurfaceDecision({
      eventType: 'meal_reminder',
      routeName: 'system',
      preferredSurface: 'systemNotification',
      backendDecision: {
        shouldNudge: true,
        reason: 'missing-lunch',
        suggestedMessage: 'Bạn chưa ghi bữa trưa.',
        deepLink: 'eatfitai://diary',
      },
      memory: recordMoChiPolicyEvent(
        createEmptyMoChiPolicyMemory(NOW),
        resolveMoChiSurfaceDecision({
          eventType: 'meal_reminder',
          routeName: 'system',
          preferredSurface: 'systemNotification',
          now: NOW,
        }),
        'shown',
        NOW,
      ),
      now: new Date(NOW.getTime() + 60 * 60 * 1000),
    });

    expect(declined.shouldShow).toBe(false);
    expect(declined.reason).toBe('backend-suppressed');
    expect(locallyCapped.shouldShow).toBe(false);
    expect(locallyCapped.reason).toBe('system-cooldown');
  });
});
