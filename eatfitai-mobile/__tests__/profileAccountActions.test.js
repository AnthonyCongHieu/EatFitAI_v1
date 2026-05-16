import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
};

describe('Profile and top account actions IA', () => {
  it('uses Home gear as the profile entry and keeps bell for notification content', () => {
    const welcomeHeaderSource = readSource('src/components/home/WelcomeHeader.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const navigatorSource = readSource('src/app/navigation/AppNavigator.tsx');
    const typesSource = readSource('src/app/types/index.ts');
    const testIdsSource = readSource('src/testing/testIds.ts');

    expect(welcomeHeaderSource).toContain('onSettingsPress');
    expect(welcomeHeaderSource).toContain('settings-outline');
    expect(welcomeHeaderSource).toContain('TEST_IDS.home.settingsButton');
    expect(testIdsSource).toContain("settingsButton: 'home-settings-button'");
    expect(homeSource).toContain(
      "onSettingsPress={() => navigation.navigate('AppTabs', { screen: 'ProfileTab' })}",
    );
    expect(homeSource).toContain("onNotificationPress={() => navigation.navigate('NotificationCenter')}");
    expect(homeSource).not.toContain(
      "onAvatarPress={() => navigation.navigate('AppTabs', { screen: 'ProfileTab' })}",
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
    expect(profileSource).toContain('testID={`${TEST_IDS.profile.logoutButton}-confirm`}');
  });
});
