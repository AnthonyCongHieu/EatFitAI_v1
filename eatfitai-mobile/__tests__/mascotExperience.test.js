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

  it('keeps the floating MoChi island disabled while preserving rule-based MoChi assets', () => {
    const islandSource = readSource('src/features/mochi/MoChiIslandHost.tsx');
    const engineSource = readSource('src/features/mochi/mochiIslandEngine.ts');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const spacerSource = readSource('src/features/mochi/MoChiIslandSpacer.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');

    expect(navigatorSource).not.toContain('MoChiIslandHost');
    expect(navigatorSource).not.toContain('MoChiIslandLayoutProvider');
    expect(navigatorSource).not.toContain('<MascotOverlay />');
    expect(islandSource).toContain('getMoChiIslandState');
    expect(islandSource).toContain('setIslandLayout');
    expect(islandSource).toContain(
      "variant={isCompact ? 'face' : islandState.presentation.spriteVariant}",
    );
    expect(engineSource).toContain("poseKey: 'islandAvatar'");
    expect(islandSource).toContain(
      'Math.min(width - (isHomeHeaderAnchored ? 40 : 24), 388)',
    );
    expect(engineSource).toContain('confirmationAction');
    expect(islandSource).not.toContain('QuickActionsOverlay');
    expect(spacerSource).toContain('MoChiIslandSpacer');
    expect(spacerSource).toContain('return <></>');
    expect(homeSource).toContain('WelcomeHeader');
    expect(navigatorSource).not.toContain('MoChiIslandSpacer');
    expect(homeSource).toContain('borderRadius: 999');
    expect(homeSource).toContain("overflow: 'hidden'");
    expect(engineSource).toContain(
      "export type MoChiIslandMode = 'compact' | 'message' | 'live' | 'confirm'",
    );
    expect(engineSource).not.toMatch(/body shaming|béo|mập|xấu/u);
  });

  it('uses themed Profile account controls instead of the native logout alert', () => {
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');

    expect(profileSource).toContain('logoutConfirmOpen');
    expect(profileSource).toContain('label="Đăng xuất"');
    expect(profileSource).not.toContain('settings-outline');
    expect(profileSource).toContain('Đăng xuất khỏi EatFitAI?');
    expect(profileSource).not.toContain('ellipsis-horizontal');
    expect(profileSource).not.toContain("Alert.alert(t('common.logout')");
  });

  it('keeps the old MoChi room removed and exposes the temporary pose gallery from profile', () => {
    const typeSource = readSource('src/app/types/index.ts');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');
    const testIdsSource = readSource('src/testing/testIds.ts');

    expect(typeSource).not.toContain('MochiPreview');
    expect(navigatorSource).not.toContain('getMochiPreviewScreen');
    expect(navigatorSource).not.toContain('MochiPreview');
    expect(typeSource).toContain('MoChiPoseGallery');
    expect(navigatorSource).toContain('getMoChiPoseGalleryScreen');
    expect(profileSource).toContain('Phòng MoChi');
    expect(profileSource).not.toContain('mochiPreviewButton');
    expect(testIdsSource).not.toContain('mochiPreviewButton');
    expect(testIdsSource).not.toContain('mochiPreviewScreen');
  });

  it('keeps the first-login tutorial and core flows wired to MoChi sprites', () => {
    const tutorialSource = readSource('src/components/home/HomeFirstLoginTutorial.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const scanSource = readSource('src/app/screens/ai/AIScanScreen.tsx');
    const visionReviewSource = readSource(
      'src/app/screens/meals/AddMealFromVisionScreen.tsx',
    );

    expect(tutorialSource).toContain('MascotCharacter');
    expect(tutorialSource).toContain("mascotState: 'wave'");
    expect(tutorialSource).toContain("mascotState: 'thinking'");
    expect(homeSource).toContain('HomeFirstLoginTutorial');
    expect(homeSource).toContain('mochiEvent="water_added"');
    expect(scanSource).toContain('ScanProgressCard');
    expect(scanSource).toContain('mochiEvent="scan_empty"');
    expect(scanSource).toContain('mochiEvent="scan_error"');
    expect(visionReviewSource).toContain('mochiEvent="meal_logged"');
  });

  it('routes transient MoChi coaching through a shared overlay host without enabling the old island', () => {
    const diarySource = readSource('src/app/screens/diary/MealDiaryScreen.tsx');
    const appNavigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const overlayHostSource = readSource('src/features/mochi/MoChiOverlayHost.tsx');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const tabBarSource = readSource('src/components/navigation/CustomTabBar.tsx');
    const mochiDesignSource = readSource('DESIGN.md');

    expect(diarySource).not.toContain('MoChiDiaryCompanionPeek');
    expect(diarySource).not.toContain('mochiDiaryPeekShownThisSession');
    expect(diarySource).not.toContain('showCompanionPeek');
    expect(diarySource).not.toContain('MOCHI_DIARY_PEEK_HIDE_MS');
    expect(diarySource).not.toContain('MOCHI_DIARY_PEEK_MAX_SHOWS');
    expect(diarySource).not.toContain('MOCHI_DIARY_PEEK_STORAGE_KEY');
    expect(diarySource).not.toContain('AsyncStorage.getItem(MOCHI_DIARY_PEEK_STORAGE_KEY)');
    expect(appNavigatorSource).toContain('MoChiOverlayHost');
    expect(overlayHostSource).toContain('useMoChiNudgeContext');
    expect(overlayHostSource).toContain('useMoChiSurfaceDecision');
    expect(overlayHostSource).toContain('recordDecision');
    expect(overlayHostSource).toContain('styles.companionStage');
    expect(overlayHostSource).toContain('StyleSheet.absoluteFillObject');
    expect(overlayHostSource).toContain('styles.companionOverlay');
    expect(overlayHostSource).toContain('styles.companionSpeechTail');
    expect(overlayHostSource).toContain('pointerEvents="box-none"');
    expect(overlayHostSource).toContain('<MoChiSprite');
    expect(overlayHostSource).toContain("variant=\"full\"");
    expect(overlayHostSource).not.toContain('styles.companionSpritePlate');
    expect(diarySource).not.toContain('topOffset={insets.top + 108}');
    expect(overlayHostSource).toContain('MoChi đang gợi ý');
    expect(tabBarSource).toContain("return 'boxIdle'");
    expect(tabBarSource).toContain("return 'weeklyReportNotice'");
    expect(tabBarSource).not.toContain('variant="face"');
    expect(tabBarSource).not.toContain("backgroundColor: '#3fd56f'");
    expect(mochiDesignSource).toContain('name: EatFitAI MoChi Companion');
    expect(mochiDesignSource).toContain('Accent xanh chỉ là tín hiệu');
    expect(navigatorSource).not.toContain('MoChiIslandHost');
  });

  it('keeps touched mascot and quick-action UI text free from mojibake markers', () => {
    const source = [
      'src/components/MascotCharacter.tsx',
      'src/components/home/HomeFirstLoginTutorial.tsx',
      'src/components/home/QuickActionsOverlay.tsx',
      'src/features/mochi/MoChiSprite.tsx',
      'src/features/mochi/MoChiIslandHost.tsx',
      'src/features/mochi/mochiIslandEngine.ts',
      'src/features/mochi/mochiPoseCatalog.ts',
      'src/features/mochi/mochiPetEngine.ts',
      'src/assets/mascot/mochi/mochiAssets.ts',
      'src/testing/testIds.ts',
    ]
      .map(readSource)
      .join('\n');

    expect(source).not.toMatch(
      /[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00bb|\u00e2[\u201d\u2022]/u,
    );
  });
});
