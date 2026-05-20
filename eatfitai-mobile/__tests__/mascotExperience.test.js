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

  it('keeps the app-wide tutorial and core flows wired to MoChi sprites', () => {
    const tutorialCatalogSource = readSource(
      'src/features/mochi/tutorial/mochiTutorialCatalog.ts',
    );
    const tutorialHostSource = readSource('src/features/mochi/tutorial/MoChiTutorialHost.tsx');
    const tutorialTargetSource = readSource('src/features/mochi/tutorial/MoChiTutorialTarget.tsx');
    const tutorialContextSource = readSource('src/features/mochi/tutorial/MoChiTutorialContext.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const scanSource = readSource('src/app/screens/ai/AIScanScreen.tsx');
    const visionReviewSource = readSource(
      'src/app/screens/meals/AddMealFromVisionScreen.tsx',
    );

    expect(tutorialCatalogSource).toContain('MOCHI_TUTORIAL_STEPS');
    expect(tutorialCatalogSource).toContain("targetId: 'mochi_hub'");
    expect(tutorialCatalogSource).toContain("targetId: 'quick_add_search'");
    expect(tutorialCatalogSource).toContain("targetId: 'quick_add_scan'");
    expect(tutorialCatalogSource).toContain("targetId: 'home_water'");
    expect(tutorialCatalogSource).toContain("targetId: 'stats_tab'");
    expect(tutorialHostSource).toContain('MoChiSprite');
    expect(tutorialHostSource).toContain('Bỏ qua');
    expect(tutorialHostSource).toContain('SpotlightMask');
    expect(tutorialHostSource).not.toContain('SHEET_MODAL_SETTLE_MS');
    expect(tutorialHostSource).not.toContain('MeasuringTargetCard');
    expect(tutorialHostSource).not.toContain('styles.spotlightRing');
    expect(tutorialHostSource).not.toContain('targetHitArea');
    expect(tutorialHostSource).not.toContain('TapTargetHint');
    expect(tutorialHostSource).not.toContain('Animated.loop');
    expect(tutorialHostSource).not.toContain('Chạm vùng sáng');
    expect(tutorialHostSource).not.toContain('Lối {');
    expect(tutorialTargetSource).toContain('onTutorialActivate');
    expect(tutorialTargetSource).toContain('highlightProfile');
    expect(tutorialContextSource).toContain('activateTarget');
    expect(tutorialContextSource).toContain('notifyTargetActivated');
    const spotlightCardSource = tutorialHostSource.slice(
      tutorialHostSource.indexOf('const SpotlightCard'),
      tutorialHostSource.indexOf('const TransitionNote'),
    );
    expect(spotlightCardSource).toContain('onContinue');
    expect(spotlightCardSource).not.toContain('targetHitArea');
    expect(tutorialHostSource).toContain('styles.progressRail');
    expect(homeSource).not.toContain('HomeFirstLoginTutorial');
    expect(homeSource).toContain('mochiEvent="water_reminder"');
    expect(homeSource).toContain('<MoChiTutorialTarget targetId="home_water" highlightProfile="homeWater">');
    expect(homeSource).toContain('Ghi nước');
    expect(homeSource).toContain('handleAddWater({ showConfirmationToast: true })');
    expect(homeSource).toContain("text1: 'Uống nước giỏi lắm! 💧'");
    expect(scanSource).toContain('ScanProgressCard');
    expect(scanSource).toContain('mochiEvent="scan_empty"');
    expect(scanSource).toContain('mochiEvent="scan_error"');
    expect(visionReviewSource).toContain('mochiEvent="meal_logged"');
  });

  it('routes transient MoChi coaching through a shared overlay host without enabling the old island', () => {
    const diarySource = readSource('src/app/screens/diary/MealDiaryScreen.tsx');
    const appNavigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const overlayHostSource = readSource('src/features/mochi/MoChiOverlayHost.tsx');
    const inlineNoticeSource = readSource('src/features/mochi/MoChiInlineNotice.tsx');
    const nudgeContextSource = readSource('src/features/mochi/useMoChiNudgeContext.ts');
    const surfaceDecisionSource = readSource('src/features/mochi/useMoChiSurfaceDecision.ts');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const tabBarSource = readSource('src/components/navigation/CustomTabBar.tsx');
    const smartAddSheetSource = readSource('src/components/ui/SmartAddSheet.tsx');
    const tutorialContextSource = readSource(
      'src/features/mochi/tutorial/MoChiTutorialContext.tsx',
    );
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');
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
    expect(overlayHostSource).toContain('resolveMoChiTopOverlayOffset');
    expect(overlayHostSource).toContain('DENSE_TOP_HEADER_ROUTES');
    expect(overlayHostSource).toContain('DEFAULT_TOP_HEADER_CLEARANCE');
    expect(overlayHostSource).toContain('<MoChiSprite');
    expect(overlayHostSource).toContain("variant=\"full\"");
    expect(overlayHostSource).not.toContain('styles.companionSpritePlate');
    expect(diarySource).not.toContain('topOffset={insets.top + 108}');
    expect(diarySource).toContain('MoChiInlineNotice');
    expect(diarySource).toContain('tone="calm"');
    expect(inlineNoticeSource).toContain('titleCalm');
    expect(inlineNoticeSource).toContain('tone === \'calm\'');
    expect(diarySource).toContain('MEAL_DIARY_INLINE_NUDGE_COPY.title');
    expect(diarySource).toContain('MEAL_DIARY_INLINE_NUDGE_COPY.message');
    expect(diarySource).toContain('MEAL_DIARY_INLINE_NUDGE_COPY.ctaLabel');
    expect(nudgeContextSource).toContain('Bữa này đang đợi bạn đó! 🍽️');
    expect(nudgeContextSource).toContain('Hãy ghi bữa ăn gần nhất để chúng mình cùng theo dõi ngày hôm nay thật liền mạch nha!');
    expect(nudgeContextSource).toContain('Ghi bữa');
    expect(nudgeContextSource).toContain("preferredSurface: 'inline'");
    expect(nudgeContextSource).toContain('buildDailyLoopMoChiCandidate');
    expect(nudgeContextSource).toContain("preferredSurface: 'overlay'");
    expect(nudgeContextSource).toContain("HOME_ROUTE_NAMES.has(currentRouteName)");
    expect(surfaceDecisionSource).not.toContain('isCollisionSafe: true');
    expect(appNavigatorSource).toContain('MoChiTutorialProvider');
    expect(appNavigatorSource).toContain('MoChiTutorialHost');
    expect(appNavigatorSource).toContain('AuthenticatedMoChiSurfaces');
    expect(tutorialContextSource).toContain('shouldAutoStartMoChiTutorial');
    expect(tutorialContextSource).toContain('autoStartCheckedRef.current = false');
    expect(tutorialContextSource).toContain('markMoChiTutorialSkipped().catch');
    expect(tutorialContextSource).toContain('activeSheetTarget');
    expect(tabBarSource).toContain('MoChiTutorialTarget');
    expect(tabBarSource).toContain("'mochi_hub'");
    expect(tabBarSource).toContain("'stats_tab'");
    expect(smartAddSheetSource).toContain("'quick_add_search'");
    expect(smartAddSheetSource).toContain("'quick_add_scan'");
    expect(profileSource).toContain('Xem hướng dẫn MoChi');
    expect(profileSource).toContain('startTutorial');
    expect(overlayHostSource).toContain('MoChi đang nhắc bạn');
    expect(tabBarSource).toContain("return 'boxIdle'");
    expect(tabBarSource).toContain("return 'weeklyReportNotice'");
    expect(tabBarSource).not.toContain('variant="face"');
    expect(tabBarSource).toContain('const TAB_BAR_HEIGHT = 58');
    expect(tabBarSource).toContain('size={54}');
    expect(tabBarSource).toContain('marginTop: -24');
    expect(tabBarSource).not.toContain("backgroundColor: '#3fd56f'");
    expect(mochiDesignSource).toContain('name: EatFitAI MoChi Companion');
    expect(mochiDesignSource).toContain('MealDiary missing-meal nudges are inline by default');
    expect(mochiDesignSource).toContain('overlay is forbidden over meal cards and bottom navigation');
    expect(mochiDesignSource).toContain('## First-Run Tutorial');
    expect(mochiDesignSource).toContain('four guided feature flows');
    expect(mochiDesignSource).toContain('looping green pulses are not allowed');
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
