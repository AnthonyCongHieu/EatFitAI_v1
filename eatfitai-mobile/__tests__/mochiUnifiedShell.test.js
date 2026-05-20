import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Unified MoChi shell and loading states', () => {
  it('keeps tab commands in the persistent bottom-tab shell and overlays only stack commands', () => {
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const tabsSource = readSource('src/app/navigation/AppTabs.tsx');

    expect(navigatorSource).toContain('BottomCommandOverlay');
    expect(navigatorSource).toContain('activeRouteName="AiCamera"');
    expect(navigatorSource).not.toContain('activeRouteName="MealDiary"');
    expect(tabsSource).toContain('<Tab.Screen name="MealDiary"');
  });

  it('uses a MoChi dock for the center command instead of the old green block', () => {
    const tabBarSource = readSource('src/components/navigation/CustomTabBar.tsx');

    expect(tabBarSource).toContain('resolveMoChiDockPose');
    expect(tabBarSource).toContain('primaryDock');
    expect(tabBarSource).toContain('primaryDockCore');
    expect(tabBarSource).toContain('primaryDockHalo');
    expect(tabBarSource).toContain("poseKey={isMoChiBusy && !isHubOpen ? 'boxIdle' : dockPose}");
    expect(tabBarSource).toContain("return 'boxIdle'");
    expect(tabBarSource).toContain("return 'weeklyReportNotice'");
    expect(tabBarSource).toContain("return 'secureAccountFull'");
    expect(tabBarSource).not.toContain('variant="face"');
    expect(tabBarSource).toContain("target: 'MoChiHub'");
  });

  it('renders the MoChi hub as a compact action sheet anchored above the mascot dock', () => {
    const sheetSource = readSource('src/components/ui/SmartAddSheet.tsx');

    expect(sheetSource).toContain('DESIGN_TOKENS');
    expect(sheetSource).toContain('sheetDock');
    expect(sheetSource).toContain('actionGrid');
    expect(sheetSource).toContain('actionCard');
    expect(sheetSource).toContain('diaryShortcut');
    expect(sheetSource).toContain('bottom: Math.max(insets.bottom, 10) + 96');
    expect(sheetSource).toContain('Quét thức ăn');
    expect(sheetSource).toContain('Thêm bữa');
    expect(sheetSource).toContain('Công thức');
    expect(sheetSource).toContain('Giọng nói');
    expect(sheetSource).not.toContain('quickGrid');
    expect(sheetSource).not.toContain('QuickAddHub');
    expect(sheetSource).not.toContain('Lối vào khác');
    expect(sheetSource).not.toContain('mascotAnchor');
  });

  it('softens the home dashboard into the shared iOS glass language', () => {
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');

    expect(homeSource).toContain('glassDashboardCard');
    expect(homeSource).toContain('glassDiaryEntryCard');
    expect(homeSource).toContain('glassWaterCard');
    expect(homeSource).toContain('paddingBottom: 190');
  });

  it('uses shared MoChi state surfaces for main standalone loading areas', () => {
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const diarySource = readSource('src/app/screens/diary/MealDiaryScreen.tsx');
    const scanSource = readSource('src/app/screens/ai/AIScanScreen.tsx');
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');
    const foodSearchSource = readSource('src/app/screens/diary/FoodSearchScreen.tsx');
    const statsSource = readSource('src/app/screens/stats/StatsScreen.tsx');
    const recipeDetailSource = readSource('src/app/screens/ai/RecipeDetailScreen.tsx');

    expect(homeSource).toContain('MoChiScreenState');
    expect(diarySource).toContain('MoChiScreenState');
    expect(scanSource).toContain('MoChiScreenState');
    expect(profileSource).toContain('MoChiScreenState');
    expect(foodSearchSource).toContain('MoChiScreenState');
    expect(statsSource).toContain('MoChiScreenState');
    expect(recipeDetailSource).toContain('MoChiScreenState');
  });

  it('does not show a bare spinner in the scan processing card', () => {
    const scanSource = readSource('src/app/screens/ai/AIScanScreen.tsx');
    const progressCard = scanSource.match(/const ScanProgressCard[\s\S]*?\n\);/)?.[0] ?? '';

    expect(progressCard).toContain('MoChiSprite');
    expect(progressCard).not.toContain('ActivityIndicator');
  });
});
