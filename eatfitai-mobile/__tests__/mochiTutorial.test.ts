import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MOCHI_TUTORIAL_FLOWS,
  MOCHI_TUTORIAL_STEPS,
  getMoChiTutorialStepById,
} from '../src/features/mochi/tutorial/mochiTutorialCatalog';
import {
  clearMoChiTutorialPending,
  getMoChiTutorialStatus,
  markMoChiTutorialCompleted,
  markMoChiTutorialPending,
  markMoChiTutorialSkipped,
  resetMoChiTutorialForReplay,
  shouldAutoStartMoChiTutorial,
} from '../src/features/mochi/tutorial/mochiTutorialStorage';
import {
  areMoChiTutorialFramesStable,
  getMoChiTutorialSpotlightLayout,
} from '../src/features/mochi/tutorial/mochiTutorialLayout';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('MoChi tutorial system', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('ships independent short flows instead of one shared fake sequence', () => {
    expect(MOCHI_TUTORIAL_FLOWS.map((flow) => flow.id)).toEqual([
      'scan_food_flow',
      'add_meal_flow',
      'water_flow',
      'stats_flow',
    ]);

    expect(MOCHI_TUTORIAL_FLOWS.map((flow) => flow.destinationLabel)).toEqual([
      'Camera AI',
      'Tìm món',
      'Thẻ Nước',
      'Thống kê',
    ]);
  });

  it('orders tutorial stages by feature flow and waits for the user between flows', () => {
    expect(MOCHI_TUTORIAL_STEPS.map((step) => step.id)).toEqual([
      'scan_open_hub',
      'scan_choose_action',
      'add_meal_open_hub',
      'add_meal_choose_action',
      'water_find_card',
      'stats_open_tab',
    ]);

    expect(MOCHI_TUTORIAL_STEPS.map((step) => step.flowId)).toEqual([
      'scan_food_flow',
      'scan_food_flow',
      'add_meal_flow',
      'add_meal_flow',
      'water_flow',
      'stats_flow',
    ]);

    for (const step of MOCHI_TUTORIAL_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
      expect(step.primaryActionLabel.length).toBeGreaterThan(0);
      expect(step.allowSkip).toBe(true);
      expect(step.body.split(/\s+/).length).toBeLessThanOrEqual(12);
      expect(step.surface).toMatch(/^(root|smart_add_sheet)$/);
      expect(step.coachPlacement).toMatch(/^(topSafe|aboveTarget|sheetHeader|routeChip)$/);
      expect(step.activationMode).toMatch(
        /^(target_press_advance|target_press_destination|info_continue|target_press_complete)$/,
      );
      expect(step.highlightProfile).toMatch(/^(dock|tab|sheetAction|homeWater)$/);
    }
  });

  it('keeps tutorial targets stable for production source wiring', () => {
    expect(getMoChiTutorialStepById('scan_open_hub')?.targetId).toBe('mochi_hub');
    expect(getMoChiTutorialStepById('scan_choose_action')?.targetId).toBe('quick_add_scan');
    expect(getMoChiTutorialStepById('add_meal_open_hub')?.targetId).toBe('mochi_hub');
    expect(getMoChiTutorialStepById('add_meal_choose_action')?.targetId).toBe('quick_add_search');
    expect(getMoChiTutorialStepById('water_find_card')?.targetId).toBe('home_water');
    expect(getMoChiTutorialStepById('stats_open_tab')?.targetId).toBe('stats_tab');
  });

  it('marks routed flows with their destination and quick-add sheet dependency', () => {
    expect(getMoChiTutorialStepById('scan_choose_action')).toMatchObject({
      requiresQuickAddSheet: true,
      destinationRouteName: 'AiCamera',
      completionBehavior: 'navigate_then_wait',
      activationMode: 'target_press_destination',
      surface: 'smart_add_sheet',
      coachPlacement: 'sheetHeader',
      highlightProfile: 'sheetAction',
      transitionActionLabel: 'Về Trang chủ',
    });
    expect(getMoChiTutorialStepById('add_meal_choose_action')).toMatchObject({
      requiresQuickAddSheet: true,
      destinationRouteName: 'FoodSearch',
      completionBehavior: 'navigate_then_wait',
      activationMode: 'target_press_destination',
      surface: 'smart_add_sheet',
      coachPlacement: 'sheetHeader',
      highlightProfile: 'sheetAction',
      transitionActionLabel: 'Về Trang chủ',
    });
    expect(getMoChiTutorialStepById('stats_open_tab')).toMatchObject({
      destinationRouteName: 'StatsTab',
      completionBehavior: 'complete',
      activationMode: 'target_press_complete',
      surface: 'root',
      coachPlacement: 'topSafe',
      highlightProfile: 'tab',
      transitionActionLabel: 'Hoàn tất',
    });

    for (const step of MOCHI_TUTORIAL_STEPS) {
      expect('returnHomeAfterMs' in step).toBe(false);
    }
  });

  it('uses warm transition notes instead of blocking arrival copy', () => {
    expect(getMoChiTutorialStepById('scan_choose_action')?.transitionNote).toBe(
      'Quét món bằng ảnh tại đây.',
    );
    expect(getMoChiTutorialStepById('add_meal_choose_action')?.transitionNote).toBe(
      'Gõ tên món, chọn kết quả rồi lưu.',
    );
    expect(getMoChiTutorialStepById('water_find_card')?.transitionNote).toBeUndefined();
    expect(getMoChiTutorialStepById('stats_open_tab')?.transitionNote).toBe(
      'Sẵn sàng ghi bữa đầu tiên.',
    );
  });

  it('keeps tutorial copy short and avoids robotic wording', () => {
    const forbiddenPhrases = [
      'Đây là màn',
      'Bạn đã tới nơi',
      'MoChi chưa thấy đúng vị trí',
      'Luồng',
      'Lối',
      'lối',
      'Chạm vùng sáng',
      'MoChi mở tiếp',
      'MoChi đang căn',
      'Chờ một nhịp',
      'đưa bạn',
      'Lần sau',
      'phù hợp',
      'Bạn đã biết',
      'Bạn đã thấy',
    ];

    for (const step of MOCHI_TUTORIAL_STEPS) {
      expect(step.body.split(/\s+/).length).toBeLessThanOrEqual(12);
      expect(step.primaryActionLabel.split(/\s+/).length).toBeLessThanOrEqual(5);
      if (step.transitionNote) {
        expect(step.transitionNote.split(/\s+/).length).toBeLessThanOrEqual(10);
      }

      const copy = [
        step.title,
        step.body,
        step.primaryActionLabel,
        step.transitionNote ?? '',
      ].join(' ');

      for (const phrase of forbiddenPhrases) {
        expect(copy).not.toContain(phrase);
      }
    }
  });

  it('auto-starts only when onboarding created a pending tutorial and no final status exists', async () => {
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await markMoChiTutorialPending();
    expect(await shouldAutoStartMoChiTutorial()).toBe(true);

    await markMoChiTutorialCompleted();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await resetMoChiTutorialForReplay();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await markMoChiTutorialPending();
    await markMoChiTutorialSkipped();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);

    await clearMoChiTutorialPending();
    expect(await shouldAutoStartMoChiTutorial()).toBe(false);
  });

  it('stores completion status with a version so future tutorials can be safely replayed', async () => {
    await markMoChiTutorialSkipped();
    expect(await getMoChiTutorialStatus()).toMatchObject({
      status: 'skipped',
      version: 1,
    });

    await markMoChiTutorialCompleted();
    expect(await getMoChiTutorialStatus()).toMatchObject({
      status: 'completed',
      version: 1,
    });

    await resetMoChiTutorialForReplay();
    expect(await getMoChiTutorialStatus()).toBeNull();
  });

  it('keeps spotlight geometry inside small screens and targets near the edge', () => {
    const layout = getMoChiTutorialSpotlightLayout({
      frame: { x: 370, y: 760, width: 72, height: 58 },
      screenWidth: 392,
      screenHeight: 844,
      topInset: 24,
      bottomInset: 24,
    });

    expect(layout.ring.left).toBeGreaterThanOrEqual(12);
    expect(layout.ring.top).toBeGreaterThanOrEqual(30);
    expect(layout.ring.width).toBeGreaterThanOrEqual(44);
    expect(layout.ring.height).toBeGreaterThanOrEqual(44);
    expect(layout.ring.left + layout.ring.width).toBeLessThanOrEqual(380);
    expect(layout.ring.top + layout.ring.height).toBeLessThanOrEqual(820);
    expect(layout.card.left).toBeGreaterThanOrEqual(16);
    expect(layout.card.left + layout.card.width).toBeLessThanOrEqual(376);
  });

  it('keeps the coach card clear of a low target instead of covering the highlighted control', () => {
    const layout = getMoChiTutorialSpotlightLayout({
      frame: { x: 78, y: 700, width: 236, height: 56 },
      screenWidth: 392,
      screenHeight: 844,
      topInset: 24,
      bottomInset: 24,
    });

    expect(layout.card.top + layout.card.height).toBeLessThanOrEqual(layout.ring.top - 24);
    expect(layout.card.height).toBeLessThanOrEqual(112);
  });

  it('waits for stable target measurements before spotlighting animated sheet items', () => {
    expect(areMoChiTutorialFramesStable(
      { x: 24, y: 620, width: 190, height: 84 },
      { x: 24.5, y: 621, width: 190, height: 84 },
    )).toBe(true);

    expect(areMoChiTutorialFramesStable(
      { x: 24, y: 620, width: 190, height: 84 },
      { x: 24, y: 698, width: 190, height: 84 },
    )).toBe(false);
  });

  it('uses direct, non-AI copy instead of explanation-heavy labels', () => {
    expect(getMoChiTutorialStepById('scan_open_hub')).toMatchObject({
      title: 'Mở MoChi',
      body: 'Chạm biểu tượng ở giữa thanh dưới.',
      primaryActionLabel: 'Mở MoChi',
    });
    expect(getMoChiTutorialStepById('scan_open_hub')?.body).toBe(
      'Chạm biểu tượng ở giữa thanh dưới.',
    );
    expect(getMoChiTutorialStepById('scan_choose_action')?.body).toBe(
      'Chọn “Quét thức ăn”.',
    );
    expect(getMoChiTutorialStepById('add_meal_open_hub')?.body).toBe(
      'Mở menu thêm nhanh.',
    );
    expect(getMoChiTutorialStepById('water_find_card')?.body).toBe(
      'Thẻ Nước ở đây. Bấm + hoặc − khi cần.',
    );
    expect(getMoChiTutorialStepById('stats_open_tab')?.body).toBe(
      'Chạm tab Thống kê.',
    );
  });

  it('renders tutorial as target-owned guidance instead of a fake blocking hit area', () => {
    const hostSource = readSource('src/features/mochi/tutorial/MoChiTutorialHost.tsx');
    const targetSource = readSource('src/features/mochi/tutorial/MoChiTutorialTarget.tsx');
    const tabBarSource = readSource('src/components/navigation/CustomTabBar.tsx');
    const sheetSource = readSource('src/components/ui/SmartAddSheet.tsx');

    expect(hostSource).toContain('SpotlightMask');
    expect(hostSource).toContain('pointerEvents="box-none"');
    expect(hostSource).not.toContain('targetHitArea');
    expect(hostSource).not.toContain('MeasuringTargetCard');
    expect(hostSource).not.toContain('SHEET_MODAL_SETTLE_MS');
    expect(hostSource).not.toContain('styles.spotlightRing');
    expect(targetSource).toContain('highlightProfile');
    expect(targetSource).toContain('isActiveTarget');
    expect(targetSource).toContain('pointerEvents="none"');
    expect(tabBarSource).toContain('notifyTargetActivated');
    expect(tabBarSource).not.toContain('style={styles.tutorialTarget}');
    expect(sheetSource).toContain('SheetTutorialCoach');
    expect(sheetSource).toContain('notifyTargetActivated');
  });
});
