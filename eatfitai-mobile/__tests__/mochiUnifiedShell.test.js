import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Unified MoChi shell and loading states', () => {
  it('keeps stack command screens inside the bottom command shell', () => {
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');

    expect(navigatorSource).toContain('BottomCommandOverlay');
    expect(navigatorSource).toContain('activeRouteName="MealDiary"');
    expect(navigatorSource).toContain('activeRouteName="AiCamera"');
  });

  it('uses a MoChi dock for the center command instead of the old green block', () => {
    const tabBarSource = readSource('src/components/navigation/CustomTabBar.tsx');

    expect(tabBarSource).toContain('resolveMoChiDockPose');
    expect(tabBarSource).toContain('primaryDock');
    expect(tabBarSource).toContain('primaryDockCore');
    expect(tabBarSource).toContain('primaryDockHalo');
    expect(tabBarSource).toContain('<MoChiSprite poseKey={dockPose}');
    expect(tabBarSource).toContain("return 'faceCheerful'");
    expect(tabBarSource).toContain("return 'secureFace'");
    expect(tabBarSource).toContain('variant="face"');
    expect(tabBarSource).toContain("target: 'MoChiHub'");
  });

  it('renders the MoChi hub as a radial action menu anchored to the mascot FAB', () => {
    const sheetSource = readSource('src/components/ui/SmartAddSheet.tsx');

    expect(sheetSource).toContain('DESIGN_TOKENS');
    expect(sheetSource).toContain('radialMenu');
    expect(sheetSource).toContain('radialAction');
    expect(sheetSource).toContain('orbitScrim');
    expect(sheetSource).toContain('diaryShortcut');
    expect(sheetSource).toContain("top: 0");
    expect(sheetSource).toContain("justifyContent: 'center'");
    expect(sheetSource).toContain('QUÉT THỨC ĂN');
    expect(sheetSource).toContain('THÊM BỮA');
    expect(sheetSource).toContain('CÔNG THỨC');
    expect(sheetSource).toContain('LƯỢNG NƯỚC');
    expect(sheetSource).not.toContain('quickGrid');
    expect(sheetSource).not.toContain('QuickAddHub');
    expect(sheetSource).not.toContain('Lối vào khác');
    expect(sheetSource).not.toContain('mascotAnchor');
    expect(sheetSource).not.toContain('closeButton');
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
