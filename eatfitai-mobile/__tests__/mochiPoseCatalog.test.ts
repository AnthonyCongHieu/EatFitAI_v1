declare const __dirname: string;
declare const require: (moduleName: string) => any;

const fs = require('fs');
const path = require('path');

import {
  MOCHI_REQUIRED_EVENT_POSES,
  MOCHI_SPRITE_CATALOG,
  MOCHI_SPRITE_ORDER,
  getMoChiPoseForEvent,
} from '../src/features/mochi/mochiPoseCatalog';
import { MOCHI_SPRITES, MOCHI_SPRITE_METADATA } from '../src/assets/mascot/mochi/mochiAssets';

describe('MoChi sprite catalog', () => {
  it('defines the required event poses from the source sprite sheets', () => {
    expect(MOCHI_SPRITE_ORDER).toEqual(expect.arrayContaining(MOCHI_REQUIRED_EVENT_POSES));

    for (const poseKey of MOCHI_REQUIRED_EVENT_POSES) {
      const pose = MOCHI_SPRITE_CATALOG[poseKey];

      expect(pose).toBeDefined();
      expect(pose.key).toBe(poseKey);
      expect(pose.accessibilityLabel).toContain('MoChi');
      expect(MOCHI_SPRITES[poseKey]).toBeDefined();
      expect(MOCHI_SPRITE_METADATA[poseKey].sourceSheet).toMatch(/^mochi-source-[12]\.png$/);
    }
  });

  it('maps pet events to explicit semantic poses', () => {
    expect(getMoChiPoseForEvent('app_idle')).toBe('idle');
    expect(getMoChiPoseForEvent('meal_reminder')).toBe('foodPhone');
    expect(getMoChiPoseForEvent('water_reminder')).toBe('hydrate');
    expect(getMoChiPoseForEvent('scan_processing')).toBe('analyzing');
    expect(getMoChiPoseForEvent('scan_success')).toBe('sparkleSuccess');
    expect(getMoChiPoseForEvent('scan_empty')).toBe('confused');
    expect(getMoChiPoseForEvent('scan_error')).toBe('sadCry');
    expect(getMoChiPoseForEvent('meal_logged')).toBe('saladSuccess');
    expect(getMoChiPoseForEvent('water_added')).toBe('waterGlass');
    expect(getMoChiPoseForEvent('streak_unlocked')).toBe('celebrate');
    expect(getMoChiPoseForEvent('calorie_caution')).toBe('cakeConcern');
    expect(getMoChiPoseForEvent('report_ready')).toBe('reportReview');
  });

  it('ships optimized runtime sprites without importing the large source sheets', () => {
    const assetSource = fs.readFileSync(
      path.join(__dirname, '..', 'src/assets/mascot/mochi/mochiAssets.ts'),
      'utf8',
    );
    const spritesDir = path.join(__dirname, '..', 'src/assets/mascot/mochi/sprites');

    expect(assetSource).toContain('./sprites/01_idle.png');
    expect(assetSource).not.toContain('tools/mascot/sources');

    for (const poseKey of MOCHI_REQUIRED_EVENT_POSES) {
      const fileName = MOCHI_SPRITE_METADATA[poseKey].fileName;
      const spritePath = path.join(spritesDir, fileName);

      expect(fs.existsSync(spritePath)).toBe(true);
      expect(fs.statSync(spritePath).size).toBeGreaterThan(4000);
    }
  });

  it('removes the old vector rig and room implementation', () => {
    const featureDir = path.join(__dirname, '..', 'src/features/mochi');
    const fileNames = fs.readdirSync(featureDir) as string[];
    const allSources = fileNames
      .filter((fileName) => fileName.endsWith('.ts') || fileName.endsWith('.tsx'))
      .map((fileName) => fs.readFileSync(path.join(featureDir, fileName), 'utf8'))
      .join('\n');

    expect(fs.existsSync(path.join(featureDir, 'MochiRig.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(featureDir, 'MochiRoomScene.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(featureDir, 'mochiVectorTraceAssets.ts'))).toBe(false);
    expect(allSources).not.toMatch(/MochiRig|MochiRoomScene|MOCHI_VECTOR_TRACE/u);
  });
});
