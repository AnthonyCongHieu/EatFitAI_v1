import fs from 'fs';
import path from 'path';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('MoChi notification surfaces', () => {
  it('keeps top coaching overlays separate from visible inline targets', () => {
    const overlayHostSource = readSource('src/features/mochi/MoChiOverlayHost.tsx');
    const surfaceDecisionSource = readSource('src/features/mochi/useMoChiSurfaceDecision.ts');
    const topCandidateSource = readSource('src/features/mochi/useMoChiTopNotificationCandidate.ts');
    const inlineNoticeSource = readSource('src/features/mochi/MoChiInlineNotice.tsx');
    const statsSource = readSource('src/app/screens/stats/StatsScreen.tsx');

    expect(overlayHostSource).toContain('resolveMoChiTopOverlayOffset');
    expect(overlayHostSource).toContain('top: topOffset');
    expect(overlayHostSource).not.toContain('resolveMoChiOverlayBottomOffset');
    expect(overlayHostSource).toContain('useMoChiTopNotificationCandidate');
    expect(overlayHostSource).toContain('useIsMoChiTopOverlayBlocked');
    expect(overlayHostSource).toContain('isTopOverlayBlocked');
    expect(overlayHostSource).toContain('useMoChiOverlayReadiness');
    expect(overlayHostSource).toContain('canShowTopOverlay');
    expect(overlayHostSource).toContain('useMoChiSurfacePresence');
    expect(surfaceDecisionSource).not.toContain('isCollisionSafe: true');
    expect(topCandidateSource).toContain('useMoChiVisibleTargetsStore');
    expect(topCandidateSource).toContain('visibleTargets');
    expect(inlineNoticeSource).toContain('useMoChiSurfacePresence');
    expect(inlineNoticeSource).toContain('setVisibleTarget(routeName, mochiEvent, true)');
    expect(statsSource).toContain('routeName="StatsTab"');
  });

  it('registers toast transients as top-overlay blockers', () => {
    const toastConfigSource = readSource('src/config/toastConfig.tsx');
    const overlayHostSource = readSource('src/features/mochi/MoChiOverlayHost.tsx');
    const showAppToastSource = readSource('src/utils/showAppToast.ts');

    expect(toastConfigSource).toContain('blockMoChiTopOverlay');
    expect(toastConfigSource).toContain("blockMoChiTopOverlay('toast', 4500)");
    expect(toastConfigSource).toContain('size={56}');
    expect(toastConfigSource).toContain('width: 62');
    expect(showAppToastSource).toContain('registerSurface({');
    expect(showAppToastSource.indexOf('registerSurface({')).toBeLessThan(
      showAppToastSource.indexOf('Toast.show({'),
    );
    expect(overlayHostSource).toContain('if (isTopOverlayBlocked || !isOverlayReady || !isCoordinatorTopOverlayAllowed)');
    expect(overlayHostSource).toContain('setActiveOverlay(null)');
  });

  it('keeps top MoChi notifications compact instead of modal-like', () => {
    const overlayHostSource = readSource('src/features/mochi/MoChiOverlayHost.tsx');

    expect(overlayHostSource).toContain('Math.min(width - 40, 340)');
    expect(overlayHostSource).toContain('size={60}');
    expect(overlayHostSource).not.toContain('size={84}');
    expect(overlayHostSource).toContain('zIndex: 800');
    expect(overlayHostSource).not.toContain('zIndex: 1400');
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

  it('anchors Home water reminders inline and resolves them through the water add flow', () => {
    const homeSource = readSource('src/app/screens/HomeScreen.tsx');

    expect(homeSource).toContain('homeWaterReminder');
    expect(homeSource).toContain('waterTargetInlineReady');
    expect(homeSource).toContain("setMoChiVisibleTarget('HomeTab', 'water_reminder', waterTargetInlineReady)");
    expect(homeSource).toContain('handleWaterReminderAction');
    expect(homeSource).toContain('markMoChiNotificationActed(homeWaterReminder.id)');
    expect(homeSource).toContain('homeWaterReminder && waterTargetInlineReady');
    expect(homeSource).toContain('handleAddWater({ showConfirmationToast: true })');
    expect(homeSource).toContain("text1: 'Đã ghi nước'");
    expect(homeSource).toContain('mochiEvent="water_reminder"');
    expect(homeSource).toContain('title="Nhắc uống nước"');
    expect(homeSource).toContain('message="Ghi thêm một ly nước nếu bạn vừa uống xong."');
    expect(homeSource).toContain('ctaLabel="Ghi nước"');
    expect(homeSource).not.toContain('mochiEvent="water_added"');
    expect(homeSource).toContain('hideSprite');
    expect(homeSource).toContain('tone="calm"');
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

  it('keeps MoChi guidance single-purpose on dense screens and uses user-facing toast copy', () => {
    const statsSource = readSource('src/app/screens/stats/StatsScreen.tsx');
    const profileSource = readSource('src/app/screens/ProfileScreen.tsx');

    expect(statsSource).toContain("activeTab === 'today' && !isLoading && todayCal <= 0");
    expect(statsSource).not.toContain('title="Đang vẽ heatmap"');
    expect(profileSource).toContain('Bạn đã có quyền dùng các tính năng Premium.');
    expect(profileSource).toContain('Gói nâng cấp sẽ xuất hiện khi EatFitAI mở bán.');
    expect(profileSource).not.toContain('Backend đã bật quyền Premium');
    expect(profileSource).not.toContain('sẵn sàng ở backend');
  });
});
