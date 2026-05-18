import fs from 'fs';
import path from 'path';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('MoChi notification surfaces', () => {
  it('keeps top coaching overlays separate from visible inline targets', () => {
    const overlayHostSource = readSource('src/features/mochi/MoChiOverlayHost.tsx');
    const surfaceDecisionSource = readSource('src/features/mochi/useMoChiSurfaceDecision.ts');

    expect(overlayHostSource).toContain('resolveMoChiTopOverlayOffset');
    expect(overlayHostSource).toContain('top: topOffset');
    expect(overlayHostSource).not.toContain('resolveMoChiOverlayBottomOffset');
    expect(overlayHostSource).toContain('useMoChiTopNotificationCandidate');
    expect(surfaceDecisionSource).not.toContain('isCollisionSafe: true');
  });

  it('renders persisted inbox state and only shows the home bell dot for unread items', () => {
    const notificationCenterSource = readSource(
      'src/app/screens/profile/NotificationCenterScreen.tsx',
    );
    const welcomeHeaderSource = readSource('src/components/home/WelcomeHeader.tsx');
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');

    expect(notificationCenterSource).toContain('useMoChiNotificationInboxStore');
    expect(notificationCenterSource).toContain('selectUnreadMoChiNotificationCount');
    expect(notificationCenterSource).toContain('markActed');
    expect(notificationCenterSource).toContain('MoChiInlineNotice');
    expect(welcomeHeaderSource).toContain('unreadNotificationCount');
    expect(welcomeHeaderSource).toContain('unreadNotificationCount > 0');
    expect(homeSource).toContain('selectUnreadMoChiNotificationCount');
  });

  it('keeps actionable MoChi metadata in scheduled notifications and avoids external AI tip pushes', () => {
    const notificationServiceSource = readSource('src/services/notificationService.ts');

    expect(notificationServiceSource).toContain('mochiEventType');
    expect(notificationServiceSource).toContain('mochiAction');
    expect(notificationServiceSource).toContain('addNotificationReceivedListener');
    expect(notificationServiceSource).toContain('isMoChiHandledNotification');
    expect(notificationServiceSource).toContain('AndroidNotificationPriority.DEFAULT');
    expect(notificationServiceSource).toContain('inbox.markRead(item.id)');
    expect(notificationServiceSource).not.toContain('performMoChiNotificationAction(item.action');
    expect(notificationServiceSource).not.toContain('scheduleDailyNotification(NOTIFICATION_IDS.aiTips');
    expect(notificationServiceSource).not.toContain('scheduleDailyNotification(NOTIFICATION_IDS.aiRecipes');
  });

  it('keeps inline MoChi guidance on suitable screens beyond the diary card', () => {
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');
    const searchSource = readSource('src/app/screens/diary/FoodSearchScreen.tsx');
    const recipeSource = readSource('src/app/screens/ai/RecipeSuggestionsScreen.tsx');
    const statsSource = readSource('src/app/screens/stats/StatsScreen.tsx');
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');

    expect(homeSource).toContain('mochiEvent="diary_empty_today"');
    expect(searchSource).toContain('mochiEvent="food_search_empty"');
    expect(recipeSource).toContain('mochiEvent="recipe_empty"');
    expect(statsSource).toContain('MoChiInlineNotice');
    expect(statsSource).toContain('mochiEvent="stats_low_data"');
    expect(profileSource).toContain('mochiEvent="profile_incomplete"');
  });
});
