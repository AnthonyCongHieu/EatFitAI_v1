import type { MoChiPoseKey } from '../../../assets/mascot/mochi/mochiAssets';

export const MOCHI_TUTORIAL_VERSION = 1;

export type MoChiTutorialFlowId =
  | 'scan_food_flow'
  | 'add_meal_flow'
  | 'water_flow'
  | 'stats_flow';

export type MoChiTutorialStepId =
  | 'scan_open_hub'
  | 'scan_choose_action'
  | 'add_meal_open_hub'
  | 'add_meal_choose_action'
  | 'water_find_card'
  | 'stats_open_tab';

export type MoChiTutorialTargetId =
  | 'mochi_hub'
  | 'quick_add_search'
  | 'quick_add_scan'
  | 'home_water'
  | 'stats_tab';

export type MoChiTutorialDestinationRouteName = 'AiCamera' | 'FoodSearch' | 'StatsTab';

export type MoChiTutorialFlow = {
  id: MoChiTutorialFlowId;
  title: string;
  destinationLabel: string;
  miniPathLabel: string;
};

export type MoChiTutorialCompletionBehavior =
  | 'advance'
  | 'navigate_then_wait'
  | 'complete';

export type MoChiTutorialSurface = 'root' | 'smart_add_sheet';

export type MoChiTutorialCoachPlacement =
  | 'topSafe'
  | 'aboveTarget'
  | 'sheetHeader'
  | 'routeChip';

export type MoChiTutorialActivationMode =
  | 'target_press_advance'
  | 'target_press_destination'
  | 'info_continue'
  | 'target_press_complete';

export type MoChiTutorialHighlightProfile = 'dock' | 'tab' | 'sheetAction' | 'homeWater';

export type MoChiTutorialStep = {
  id: MoChiTutorialStepId;
  flowId: MoChiTutorialFlowId;
  targetId: MoChiTutorialTargetId;
  title: string;
  body: string;
  primaryActionLabel: string;
  completionBehavior: MoChiTutorialCompletionBehavior;
  surface: MoChiTutorialSurface;
  coachPlacement: MoChiTutorialCoachPlacement;
  activationMode: MoChiTutorialActivationMode;
  highlightProfile: MoChiTutorialHighlightProfile;
  transitionNote?: string;
  transitionActionLabel?: string;
  miniPathLabel: string;
  poseKey: MoChiPoseKey;
  allowSkip: true;
  requiresQuickAddSheet?: boolean;
  destinationRouteName?: MoChiTutorialDestinationRouteName;
};

export const MOCHI_TUTORIAL_FLOWS: readonly MoChiTutorialFlow[] = [
  {
    id: 'scan_food_flow',
    title: 'Quét thức ăn',
    destinationLabel: 'Camera AI',
    miniPathLabel: 'Quét ảnh',
  },
  {
    id: 'add_meal_flow',
    title: 'Thêm bữa thủ công',
    destinationLabel: 'Tìm món',
    miniPathLabel: 'Thêm bữa',
  },
  {
    id: 'water_flow',
    title: 'Ghi lượng nước',
    destinationLabel: 'Thẻ Nước',
    miniPathLabel: 'Nước',
  },
  {
    id: 'stats_flow',
    title: 'Xem thống kê',
    destinationLabel: 'Thống kê',
    miniPathLabel: 'Thống kê',
  },
];

export const MOCHI_TUTORIAL_STEPS: readonly MoChiTutorialStep[] = [
  {
    id: 'scan_open_hub',
    flowId: 'scan_food_flow',
    targetId: 'mochi_hub',
    title: 'Quét ảnh',
    body: 'Mở MoChi ở giữa thanh dưới.',
    primaryActionLabel: 'Mở MoChi',
    completionBehavior: 'advance',
    surface: 'root',
    coachPlacement: 'topSafe',
    activationMode: 'target_press_advance',
    highlightProfile: 'dock',
    miniPathLabel: 'Quét ảnh',
    poseKey: 'boxIdle',
    allowSkip: true,
  },
  {
    id: 'scan_choose_action',
    flowId: 'scan_food_flow',
    targetId: 'quick_add_scan',
    title: 'Quét ảnh',
    body: 'Chọn “Nhận diện món ăn”.',
    primaryActionLabel: 'Nhận diện món ăn',
    completionBehavior: 'navigate_then_wait',
    surface: 'smart_add_sheet',
    coachPlacement: 'routeChip',
    activationMode: 'target_press_destination',
    highlightProfile: 'sheetAction',
    transitionNote: 'Quét món bằng ảnh tại đây.',
    transitionActionLabel: 'Về Trang chủ',
    miniPathLabel: 'Quét ảnh',
    poseKey: 'scanThinkingFull',
    allowSkip: true,
    requiresQuickAddSheet: true,
    destinationRouteName: 'AiCamera',
  },
  {
    id: 'add_meal_open_hub',
    flowId: 'add_meal_flow',
    targetId: 'mochi_hub',
    title: 'Thêm bữa',
    body: 'Mở MoChi để chọn cách ghi bữa.',
    primaryActionLabel: 'Mở MoChi',
    completionBehavior: 'advance',
    surface: 'root',
    coachPlacement: 'topSafe',
    activationMode: 'target_press_advance',
    highlightProfile: 'dock',
    miniPathLabel: 'Thêm bữa',
    poseKey: 'boxIdle',
    allowSkip: true,
  },
  {
    id: 'add_meal_choose_action',
    flowId: 'add_meal_flow',
    targetId: 'quick_add_search',
    title: 'Thêm bằng tên',
    body: 'Chọn “Ghi lại bữa ăn”.',
    primaryActionLabel: 'Ghi lại bữa ăn',
    completionBehavior: 'navigate_then_wait',
    surface: 'smart_add_sheet',
    coachPlacement: 'routeChip',
    activationMode: 'target_press_destination',
    highlightProfile: 'sheetAction',
    transitionNote: 'Gõ tên món, chọn kết quả rồi lưu.',
    transitionActionLabel: 'Về Trang chủ',
    miniPathLabel: 'Thêm bữa',
    poseKey: 'mealCoachFull',
    allowSkip: true,
    requiresQuickAddSheet: true,
    destinationRouteName: 'FoodSearch',
  },
  {
    id: 'water_find_card',
    flowId: 'water_flow',
    targetId: 'home_water',
    title: 'Ghi nước',
    body: 'Thẻ Nước ở đây. Bấm + hoặc − khi cần.',
    primaryActionLabel: 'Tiếp tục',
    completionBehavior: 'advance',
    surface: 'root',
    coachPlacement: 'aboveTarget',
    activationMode: 'info_continue',
    highlightProfile: 'homeWater',
    miniPathLabel: 'Nước',
    poseKey: 'waterCoachFull',
    allowSkip: true,
  },
  {
    id: 'stats_open_tab',
    flowId: 'stats_flow',
    targetId: 'stats_tab',
    title: 'Thống kê',
    body: 'Chạm tab Thống kê.',
    primaryActionLabel: 'Thống kê',
    completionBehavior: 'complete',
    surface: 'root',
    coachPlacement: 'topSafe',
    activationMode: 'target_press_complete',
    highlightProfile: 'tab',
    transitionNote: 'Sẵn sàng ghi bữa đầu tiên.',
    transitionActionLabel: 'Hoàn tất',
    miniPathLabel: 'Thống kê',
    poseKey: 'weeklyReportNotice',
    allowSkip: true,
    destinationRouteName: 'StatsTab',
  },
];

export const getMoChiTutorialStepById = (
  stepId: MoChiTutorialStepId,
): MoChiTutorialStep | undefined =>
  MOCHI_TUTORIAL_STEPS.find((step) => step.id === stepId);

export const getMoChiTutorialFlowIndex = (flowId: MoChiTutorialFlowId): number =>
  MOCHI_TUTORIAL_FLOWS.findIndex((flow) => flow.id === flowId);

export const getMoChiTutorialStepPosition = (
  step: MoChiTutorialStep,
): {
  flowIndex: number;
  stepIndexInFlow: number;
  flowStepCount: number;
  displayLabel: string;
} => {
  const flowSteps = MOCHI_TUTORIAL_STEPS.filter(
    (candidate) => candidate.flowId === step.flowId,
  );
  const flowIndex = Math.max(0, getMoChiTutorialFlowIndex(step.flowId));
  const stepIndexInFlow = Math.max(
    0,
    flowSteps.findIndex((candidate) => candidate.id === step.id),
  );
  const flowStepCount = Math.max(1, flowSteps.length);
  const baseLabel = `${flowIndex + 1}/${MOCHI_TUTORIAL_FLOWS.length}`;
  const displayLabel =
    flowStepCount > 1
      ? `${baseLabel} · ${stepIndexInFlow + 1}/${flowStepCount}`
      : baseLabel;

  return {
    flowIndex,
    stepIndexInFlow,
    flowStepCount,
    displayLabel,
  };
};
