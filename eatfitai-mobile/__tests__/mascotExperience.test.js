import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
};

describe('Mochi mascot experience', () => {
  it('defines a reusable vector-rig Mochi component with the planned animation states', () => {
    const source = readSource('src/components/MascotCharacter.tsx');

    expect(source).toContain('export type MascotState');
    expect(source).toContain('MOCHI_STATE_ASSETS');
    expect(source).toContain('MochiRig');
    expect(source).not.toContain('<Image');
    expect(source).not.toContain('MOCHI_ASSETS[');
    expect(source).toContain("'idle'");
    expect(source).toContain("'wave'");
    expect(source).toContain("'thinking'");
    expect(source).toContain("'pointing'");
    expect(source).toContain("'success'");
    expect(source).toContain("'reminder'");
    expect(source).toContain("'error'");
    expect(source).toContain('hasReminder?: boolean');
    expect(source).toContain('size?: number');
    expect(source).toContain('testID?: string');
    expect(source).toContain('accessibilityLabel="Mochi"');
  });

  it('ships the Mochi source-sheet sprites as static app assets', () => {
    const assetSource = readSource('src/assets/mascot/mochi/mochiAssets.ts');
    const assetDir = path.join(__dirname, '..', 'src/assets/mascot/mochi/characters');

    expect(assetSource).toContain('01_idle.png');
    expect(assetSource).toContain('12_scan_food.png');
    expect(assetSource).toContain('18_drink_water.png');
    expect(assetSource).toContain('24_goal_complete.png');
    expect(assetSource).toContain('sourceSheet');

    [
      '01_idle.png',
      '02_hello.png',
      '05_thinking.png',
      '12_scan_food.png',
      '18_drink_water.png',
      '21_reminder.png',
      '24_goal_complete.png',
    ].forEach((fileName) => {
      expect(fs.existsSync(path.join(assetDir, fileName))).toBe(true);
    });
  });

  it('uses Mochi from the overlay instead of the old robot face', () => {
    const source = readSource('src/components/MascotOverlay.tsx');

    expect(source).toContain('import MascotCharacter');
    expect(source).toContain('<MascotCharacter');
    expect(source).toContain("state={hasReminders ? 'reminder' : 'idle'}");
    expect(source).toContain('bottom: 170');
    expect(source).toContain('TEST_IDS.home.mascotButton');
    expect(source).not.toContain('styles.robotFace');
    expect(source).not.toContain('styles.robotVisor');
  });

  it('exposes a real-device Mochi room screen from the authenticated app', () => {
    const typeSource = readSource('src/app/types/index.ts');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');
    const previewSource = readSource('src/app/screens/dev/MochiPreviewScreen.tsx');
    const testIdsSource = readSource('src/testing/testIds.ts');

    expect(typeSource).toContain('MochiPreview: undefined');
    expect(navigatorSource).toContain('getMochiPreviewScreen');
    expect(navigatorSource).toContain('<Stack.Screen');
    expect(navigatorSource).toContain('name="MochiPreview"');
    expect(navigatorSource).toContain("currentRouteName !== 'MochiPreview'");
    expect(profileSource).toContain("navigation.navigate('MochiPreview')");
    expect(profileSource).toContain('TEST_IDS.profile.mochiPreviewButton');
    expect(profileSource).toContain('Phòng Mochi');
    expect(previewSource).toContain('MochiRoomScene');
    expect(previewSource).toContain('getMochiCompanionState');
    expect(previewSource).toContain('Cosmetic unlocks');
    expect(previewSource).not.toContain('MochiFallback');
    expect(previewSource).not.toContain('mochi-room-fallback-mascot');
    expect(testIdsSource).toContain("mochiPreviewButton: 'profile-mochi-preview-button'");
    expect(testIdsSource).toContain("mochiPreviewScreen: 'mochi-preview-screen'");
  });

  it('renders Mochi Room with a layered vector rig instead of PNG sprites or GLView', () => {
    const roomSource = readSource('src/features/mochi/MochiRoomScene.tsx');
    const rigSource = readSource('src/features/mochi/MochiRig.tsx');
    const previewSource = readSource('src/app/screens/dev/MochiPreviewScreen.tsx');

    expect(roomSource).toContain('LinearGradient');
    expect(roomSource).toContain('MochiRig');
    expect(roomSource).toContain('mochi-room-3d-rig');
    expect(roomSource).not.toContain('GLView');
    expect(roomSource).not.toContain('expo-gl');
    expect(roomSource).not.toContain('CapsuleGeometry');
    expect(previewSource).not.toContain('MascotCharacter');
    expect(rigSource).toContain('MOCHI_VECTOR_LAYERS');
    expect(rigSource).toContain('mochiHeadbandPink');
    expect(rigSource).toContain('mochiInk');
    expect(rigSource).toContain('MUZZLE');
    expect(rigSource).toContain('renderEyes');
    expect(rigSource).toContain("expression === 'drinkWater'");
    expect(rigSource).toContain('activeAccessoryIds');
    expect(rigSource).not.toContain('<Image');
    expect(rigSource).not.toContain('.png');
    expect(rigSource).not.toContain('mochiBellyCream');
  });

  it('defines a first-login home tutorial with storage gate and expected controls', () => {
    const tutorialSource = readSource('src/components/home/HomeFirstLoginTutorial.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const testIdsSource = readSource('src/testing/testIds.ts');

    expect(tutorialSource).toContain('HOME_TUTORIAL_SEEN_KEY = \'home_tutorial_v1_seen\'');
    expect(tutorialSource).toContain('isAuthenticated');
    expect(tutorialSource).toContain('needsOnboarding');
    expect(tutorialSource).toContain('AsyncStorage.getItem(HOME_TUTORIAL_SEEN_KEY)');
    expect(tutorialSource).toContain('AsyncStorage.setItem(HOME_TUTORIAL_SEEN_KEY,');
    expect(tutorialSource).toContain('Bỏ qua');
    expect(tutorialSource).toContain('Tiếp tục');
    expect(tutorialSource).toContain('Xong');
    expect(tutorialSource).toContain('Quét món bằng AI');
    expect(tutorialSource).toContain('Thêm món thủ công');
    expect(tutorialSource).toContain('Nhật ký hôm nay');

    expect(homeSource).toContain('import HomeFirstLoginTutorial');
    expect(homeSource).toContain('<HomeFirstLoginTutorial');
    expect(testIdsSource).toContain("mascotButton: 'home-mascot-button'");
    expect(testIdsSource).toContain("tutorialOverlay: 'home-tutorial-overlay'");
    expect(testIdsSource).toContain("tutorialNextButton: 'home-tutorial-next-button'");
    expect(testIdsSource).toContain("tutorialSkipButton: 'home-tutorial-skip-button'");
    expect(testIdsSource).toContain("tutorialFinishButton: 'home-tutorial-finish-button'");
  });

  it('keeps touched mascot and quick-action UI text free from mojibake markers', () => {
    const source = [
      'src/components/MascotCharacter.tsx',
      'src/components/MascotOverlay.tsx',
      'src/components/home/HomeFirstLoginTutorial.tsx',
      'src/components/home/QuickActionsOverlay.tsx',
      'src/features/mochi/MochiRoomScene.tsx',
      'src/features/mochi/MochiRig.tsx',
      'src/app/screens/dev/MochiPreviewScreen.tsx',
      'src/testing/testIds.ts',
    ]
      .map(readSource)
      .join('\n');

    expect(source).not.toMatch(/[\u00c3\u00c2\u00c4\u00c6]|\u00e1\u00bb|\u00e2[\u201d\u2022]/u);
  });

  it('uses readable Vietnamese labels in the quick actions overlay', () => {
    const source = readSource('src/components/home/QuickActionsOverlay.tsx');

    expect(source).toContain("label: 'QUÉT THỨC ĂN'");
    expect(source).toContain("label: 'THÊM BỮA'");
    expect(source).toContain("label: 'CÔNG THỨC'");
    expect(source).toContain("label: 'LƯỢNG NƯỚC'");
    expect(source).toContain('Thao tác nhanh');
    expect(source).toContain('Bạn muốn thực hiện gì tiếp theo?');
    expect(source).toContain('CHẠM X ĐỂ QUAY LẠI');
  });
});
