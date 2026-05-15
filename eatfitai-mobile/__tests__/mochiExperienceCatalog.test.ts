import {
  MOCHI_CONTEXT_EVENT_TO_POSE,
  MOCHI_EXPERIENCE_CATALOG,
  REQUIRED_MOCHI_CONTEXT_EVENTS,
  getMoChiExperience,
} from '../src/features/mochi/mochiExperienceCatalog';
import { MOCHI_SPRITE_ORDER } from '../src/features/mochi/mochiPoseCatalog';
import type { MoChiPoseKey } from '../src/assets/mascot/mochi/mochiAssets';

describe('MoChi contextual experience catalog', () => {
  it('represents every shipped MoChi sprite with a contextual role', () => {
    const catalogPoseKeys = new Set(
      Object.values(MOCHI_EXPERIENCE_CATALOG).map((entry) => entry.poseKey),
    );

    for (const poseKey of MOCHI_SPRITE_ORDER) {
      expect(catalogPoseKeys.has(poseKey)).toBe(true);
    }
  });

  it('maps required app flows to explicit MoChi events and next actions', () => {
    for (const eventType of REQUIRED_MOCHI_CONTEXT_EVENTS) {
      const poseKey = MOCHI_CONTEXT_EVENT_TO_POSE[eventType];
      const experience = getMoChiExperience(eventType);

      expect(poseKey).toBeDefined();
      expect(MOCHI_SPRITE_ORDER).toContain(poseKey as MoChiPoseKey);
      expect(experience.eventType).toBe(eventType);
      expect(experience.dialogue.length).toBeGreaterThan(12);
      expect(experience.primaryAction).toBeDefined();
      expect(experience.priority).toBeGreaterThan(0);
    }
  });

  it('keeps touched Vietnamese MoChi copy free from mojibake markers', () => {
    const copy = Object.values(MOCHI_EXPERIENCE_CATALOG)
      .flatMap((entry) => [entry.title, entry.dialogue, entry.ctaLabel ?? ''])
      .join('\n');

    expect(copy).not.toMatch(/[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00bb|\u00e2[\u201d\u2022]/u);
  });
});
