import fs from 'fs';
import path from 'path';

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('Task-first bottom command bar', () => {
  it('exposes the five primary food logging commands without duplicating settings', () => {
    const source = readSource('src/components/navigation/CustomTabBar.tsx');

    expect(source).toContain("label: 'Trang chủ'");
    expect(source).toContain("label: 'Nhật ký'");
    expect(source).toContain("label: 'MoChi'");
    expect(source).toContain("label: 'Thống kê'");
    expect(source).toContain("label: 'Cá nhân'");
    expect(source).not.toContain("label: 'Cài đặt'");
    expect(source).toContain("target: 'MealDiary'");
    expect(source).toContain("target: 'MoChiHub'");
  });

  it('uses the root navigation helper for stack commands to avoid parent navigator crashes', () => {
    const source = readSource('src/components/navigation/CustomTabBar.tsx');

    expect(source).toContain('navigateRoot');
    expect(source).toMatch(/navigateRoot\(\s*'MealDiary'/);
    expect(source).not.toContain('navigation.getParent()');
  });

  it('does not mount the old floating mascot overlay in the app navigator', () => {
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');

    expect(navigatorSource).not.toContain('MoChiIslandLayoutProvider');
    expect(navigatorSource).not.toContain('MoChiIslandHost');
    expect(navigatorSource).not.toContain('<MascotOverlay />');
  });
});
