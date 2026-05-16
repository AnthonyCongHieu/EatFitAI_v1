import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Task-first bottom command bar', () => {
  it('exposes the primary food logging commands directly instead of a profile tab slot', () => {
    const source = readSource('src/components/navigation/CustomTabBar.tsx');

    expect(source).toContain("label: 'Trang chủ'");
    expect(source).toContain("label: 'Thêm bữa'");
    expect(source).toContain("label: 'Scan'");
    expect(source).toContain("label: 'Giọng nói'");
    expect(source).toContain("label: 'Thống kê'");
    expect(source).toContain("target: 'FoodSearch'");
    expect(source).toContain("target: 'AiCamera'");
    expect(source).not.toContain("label: 'Cá nhân'");
  });

  it('uses the root navigation helper for stack commands to avoid parent navigator crashes', () => {
    const source = readSource('src/components/navigation/CustomTabBar.tsx');

    expect(source).toContain('navigateRoot');
    expect(source).toMatch(/navigateRoot\(\s*'FoodSearch'/);
    expect(source).toContain("navigateRoot('AiCamera'");
    expect(source).not.toContain('navigation.getParent()');
  });

  it('uses a shared MoChi island host instead of the old floating mascot overlay', () => {
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');

    expect(navigatorSource).toContain('MoChiIslandHost');
    expect(navigatorSource).not.toContain('<MascotOverlay />');
  });
});
