import {
  MOCHI_ANIMATION_TO_POSE,
  MOCHI_POSE_CATALOG,
  MOCHI_POSE_ORDER,
} from '../src/features/mochi/mochiPoseCatalog';
import {
  MOCHI_VECTOR_TRACE_META,
  MOCHI_VECTOR_TRACE_XML,
} from '../src/features/mochi/mochiVectorTraceAssets';

describe('Mochi pose catalog', () => {
  it('defines exactly 24 production vector poses', () => {
    expect(MOCHI_POSE_ORDER).toHaveLength(24);
    expect(new Set(MOCHI_POSE_ORDER).size).toBe(24);

    for (const poseKey of MOCHI_POSE_ORDER) {
      const pose = MOCHI_POSE_CATALOG[poseKey];

      expect(pose.key).toBe(poseKey);
      expect(pose.sourceAsset).toBe(poseKey);
      expect(pose.order).toBeGreaterThanOrEqual(1);
      expect(pose.order).toBeLessThanOrEqual(24);
      expect(pose.labelVi).toEqual(expect.any(String));
      expect(pose.labelVi.length).toBeGreaterThan(3);
      expect(pose.accessibilityLabel).toContain('Mochi');
      expect(pose.accessoryIds).toEqual(expect.any(Array));
    }
  });

  it('maps every companion animation to a non-ambiguous pose', () => {
    expect(MOCHI_ANIMATION_TO_POSE).toEqual({
      idle: 'idle',
      wave: 'hello',
      happy: 'happy',
      thinking: 'thinking',
      surprised: 'surprised',
      reminder: 'reminder',
      drinkWater: 'drinkWater',
      celebrate: 'goalComplete',
    });

    for (const poseKey of Object.values(MOCHI_ANIMATION_TO_POSE)) {
      expect(MOCHI_POSE_CATALOG[poseKey]).toBeDefined();
    }
  });

  it('keeps Vietnamese labels readable', () => {
    const labels = MOCHI_POSE_ORDER
      .map((poseKey) => MOCHI_POSE_CATALOG[poseKey].labelVi)
      .join('\n');

    expect(labels).toContain('Đứng yên');
    expect(labels).toContain('Quét món ăn');
    expect(labels).toContain('Uống nước');
    expect(labels).toContain('Đạt mục tiêu');
    expect(labels).not.toMatch(/[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00bb|\u00e2[\u201d\u2022]/u);
  });

  it('has production vector trace data for every pose', () => {
    for (const poseKey of MOCHI_POSE_ORDER) {
      const xml = MOCHI_VECTOR_TRACE_XML[poseKey];
      const meta = MOCHI_VECTOR_TRACE_META[poseKey];

      expect(xml).toContain('<svg ');
      expect(xml).toContain('viewBox=');
      expect(xml).toContain('preserveAspectRatio=');
      expect(xml).not.toContain('<image');
      expect(xml).not.toContain('data:image');
      expect(meta.width).toBeGreaterThan(40);
      expect(meta.height).toBeGreaterThan(40);
      expect(meta.pathCount).toBeGreaterThan(40);
      expect(meta.byteLength).toBe(xml.length);
    }
  });
});
