import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
};

describe('MoChi virtual pet experience', () => {
  it('renders MoChi as a sprite assistant instead of the old vector rig', () => {
    const characterSource = readSource('src/components/MascotCharacter.tsx');
    const spriteSource = readSource('src/features/mochi/MoChiSprite.tsx');

    expect(characterSource).toContain('MoChiSprite');
    expect(characterSource).toContain('export type MascotState');
    expect(characterSource).toContain("'hungry'");
    expect(characterSource).toContain("'thirsty'");
    expect(characterSource).toContain("'celebrating'");
    expect(characterSource).not.toContain('MochiRig');
    expect(spriteSource).toContain('MOCHI_SPRITES[poseKey]');
    expect(spriteSource).toContain("variant?: 'full' | 'face' | 'notice'");
    expect(spriteSource).toContain('resizeMode="contain"');
  });

  it('uses a proactive pet overlay with rule-based state and quick actions', () => {
    const overlaySource = readSource('src/components/MascotOverlay.tsx');

    expect(overlaySource).toContain('getMoChiPetState');
    expect(overlaySource).toContain('<MascotCharacter');
    expect(overlaySource).toContain('shouldBubble');
    expect(overlaySource).toContain("navigation.navigate('AiCamera')");
    expect(overlaySource).toContain("navigation.navigate('FoodSearch'");
    expect(overlaySource).toContain("screen: 'HomeTab'");
    expect(overlaySource).toContain('focusWaterRequestId: Date.now()');
    expect(overlaySource).toContain('setShowQuickActions(true);');
    expect(overlaySource).toContain('accessibilityLabel="Mở gợi ý MoChi"');
    expect(overlaySource).toContain('onLongPress={() => runPrimaryAction(petState.primaryAction)}');
    expect(overlaySource).not.toContain("if (petState.primaryAction !== 'dismiss')");
    expect(overlaySource).not.toContain('MochiRig');
  });

  it('removes the old MoChi room route and profile entry', () => {
    const typeSource = readSource('src/app/types/index.ts');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');
    const testIdsSource = readSource('src/testing/testIds.ts');

    expect(typeSource).not.toContain('MochiPreview');
    expect(navigatorSource).not.toContain('getMochiPreviewScreen');
    expect(navigatorSource).not.toContain('MochiPreview');
    expect(profileSource).not.toContain('Phòng Mochi');
    expect(profileSource).not.toContain('mochiPreviewButton');
    expect(testIdsSource).not.toContain('mochiPreviewButton');
    expect(testIdsSource).not.toContain('mochiPreviewScreen');
  });

  it('keeps the first-login tutorial and core flows wired to MoChi sprites', () => {
    const tutorialSource = readSource('src/components/home/HomeFirstLoginTutorial.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const scanSource = readSource('src/app/screens/ai/AIScanScreen.tsx');
    const visionReviewSource = readSource('src/app/screens/meals/AddMealFromVisionScreen.tsx');

    expect(tutorialSource).toContain('MascotCharacter');
    expect(tutorialSource).toContain("mascotState: 'wave'");
    expect(tutorialSource).toContain("mascotState: 'thinking'");
    expect(homeSource).toContain('HomeFirstLoginTutorial');
    expect(homeSource).toContain("mochiEvent=\"water_added\"");
    expect(scanSource).toContain("mochiEvent=\"scan_processing\"");
    expect(scanSource).toContain("mochiEvent=\"scan_empty\"");
    expect(scanSource).toContain("mochiEvent=\"scan_error\"");
    expect(visionReviewSource).toContain("mochiEvent=\"meal_logged\"");
  });

  it('keeps touched mascot and quick-action UI text free from mojibake markers', () => {
    const source = [
      'src/components/MascotCharacter.tsx',
      'src/components/MascotOverlay.tsx',
      'src/components/home/HomeFirstLoginTutorial.tsx',
      'src/components/home/QuickActionsOverlay.tsx',
      'src/features/mochi/MoChiSprite.tsx',
      'src/features/mochi/mochiPoseCatalog.ts',
      'src/features/mochi/mochiPetEngine.ts',
      'src/assets/mascot/mochi/mochiAssets.ts',
      'src/testing/testIds.ts',
    ]
      .map(readSource)
      .join('\n');

    expect(source).not.toMatch(/[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00bb|\u00e2[\u201d\u2022]/u);
  });
});
