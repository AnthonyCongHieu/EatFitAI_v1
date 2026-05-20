import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
};

describe('Profile and top account actions IA', () => {
  it('keeps the MoChi home header and settings beside notifications without a floating island dependency', () => {
    const welcomeHeaderSource = readSource('src/components/home/WelcomeHeader.tsx');
    const tabBarSource = readSource('src/components/navigation/CustomTabBar.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const typesSource = readSource('src/app/types/index.ts');

    expect(welcomeHeaderSource).not.toContain('useMoChiIslandLayout');
    expect(welcomeHeaderSource).toContain('Chào');
    expect(welcomeHeaderSource).toContain('settings-outline');
    expect(tabBarSource).not.toContain("label: 'Cài đặt'");
    expect(homeSource).toContain(
      "onNotificationPress={() => navigation.navigate('NotificationCenter')}",
    );
    expect(homeSource).toContain(
      "onSettingsPress={() => navigation.navigate('ProfileTab')}",
    );
    expect(navigatorSource).toContain('getNotificationCenterScreen');
    expect(navigatorSource).toContain('name="NotificationCenter"');
    expect(typesSource).toContain('NotificationCenter: undefined');
  });

  it('keeps profile settings in rows, removes the duplicate profile gear, and exposes logout as a row', () => {
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');

    expect(profileSource).toContain('avatarMenuOpen');
    expect(profileSource).toContain('setAvatarMenuOpen(true)');
    expect(profileSource).toContain('avatarActionsSheet');
    expect(profileSource).toContain('TEST_IDS.profile.avatarActionsSheet');
    expect(profileSource).not.toContain('accountMenuOpen');
    expect(profileSource).not.toContain('settings-outline');
    expect(profileSource).toContain('label="Đăng xuất"');
    expect(profileSource).toContain('testID={TEST_IDS.profile.logoutButton}');
    expect(profileSource).toContain(
      'testID={`${TEST_IDS.profile.logoutButton}-confirm`}',
    );
  });
});
