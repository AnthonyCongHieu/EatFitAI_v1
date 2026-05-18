import type { MoChiPoseKey } from '../../../assets/mascot/mochi/mochiAssets';

export const MOCHI_TUTORIAL_VERSION = 1;

export type MoChiTutorialStepId =
  | 'mochi_hub'
  | 'add_meal'
  | 'scan_food'
  | 'water'
  | 'stats';

export type MoChiTutorialTargetId =
  | 'mochi_hub'
  | 'quick_add_search'
  | 'quick_add_scan'
  | 'home_water'
  | 'stats_tab';

export type MoChiTutorialStep = {
  id: MoChiTutorialStepId;
  targetId: MoChiTutorialTargetId;
  title: string;
  body: string;
  primaryActionLabel: string;
  miniPathLabel: string;
  poseKey: MoChiPoseKey;
  allowSkip: true;
  requiresQuickAddSheet?: boolean;
};

export const MOCHI_TUTORIAL_STEPS: readonly MoChiTutorialStep[] = [
  {
    id: 'mochi_hub',
    targetId: 'mochi_hub',
    title: 'MoChi ở đây',
    body: 'Chạm MoChi để mở các thao tác nhanh khi bạn cần ghi nhận bữa ăn.',
    primaryActionLabel: 'Mở bước tiếp theo',
    miniPathLabel: 'MoChi',
    poseKey: 'boxIdle',
    allowSkip: true,
  },
  {
    id: 'add_meal',
    targetId: 'quick_add_search',
    title: 'Thêm bữa thủ công',
    body: 'Dùng mục này khi bạn biết tên món và muốn ghi nhanh, chính xác.',
    primaryActionLabel: 'Xem bước quét ảnh',
    miniPathLabel: 'Thêm bữa',
    poseKey: 'mealCoachFull',
    allowSkip: true,
    requiresQuickAddSheet: true,
  },
  {
    id: 'scan_food',
    targetId: 'quick_add_scan',
    title: 'Quét thức ăn',
    body: 'Khi ăn ngoài hoặc có đĩa sẵn, chụp ảnh để MoChi gợi ý món.',
    primaryActionLabel: 'Xem uống nước',
    miniPathLabel: 'Quét ảnh',
    poseKey: 'scanThinkingFull',
    allowSkip: true,
    requiresQuickAddSheet: true,
  },
  {
    id: 'water',
    targetId: 'home_water',
    title: 'Ghi lượng nước',
    body: 'Cộng hoặc trừ từng ly để nhật ký hôm nay đủ bối cảnh hơn.',
    primaryActionLabel: 'Xem thống kê',
    miniPathLabel: 'Nước',
    poseKey: 'waterCoachFull',
    allowSkip: true,
  },
  {
    id: 'stats',
    targetId: 'stats_tab',
    title: 'Xem tiến độ',
    body: 'Vào Thống kê để nhìn xu hướng tuần và điều chỉnh nhẹ nhàng.',
    primaryActionLabel: 'Hoàn tất',
    miniPathLabel: 'Thống kê',
    poseKey: 'weeklyReportNotice',
    allowSkip: true,
  },
];

export const getMoChiTutorialStepById = (
  stepId: MoChiTutorialStepId,
): MoChiTutorialStep | undefined =>
  MOCHI_TUTORIAL_STEPS.find((step) => step.id === stepId);
