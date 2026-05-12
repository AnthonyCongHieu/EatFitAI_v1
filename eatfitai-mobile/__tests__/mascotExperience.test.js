import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
};

describe('Mầm Fit mascot experience', () => {
  it('defines a reusable mascot component with the planned animation states', () => {
    const source = readSource('src/components/MascotCharacter.tsx');

    expect(source).toContain('export type MascotState');
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
    expect(source).toContain('Mầm Fit');
  });

  it('uses Mầm Fit from the overlay instead of the old robot face', () => {
    const source = readSource('src/components/MascotOverlay.tsx');

    expect(source).toContain('import MascotCharacter');
    expect(source).toContain('<MascotCharacter');
    expect(source).toContain("state={hasReminders ? 'reminder' : 'idle'}");
    expect(source).toContain('TEST_IDS.home.mascotButton');
    expect(source).not.toContain('styles.robotFace');
    expect(source).not.toContain('styles.robotVisor');
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
      'src/testing/testIds.ts',
    ]
      .map(readSource)
      .join('\n');

    expect(source).not.toMatch(/Ã|Â|Ä|á»|â”|â•|Æ/);
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
