import type { MochiAssetKey } from '../../assets/mascot/mochi/mochiAssets';
import type { MochiAccessoryId, MochiAnimation } from './mochiCompanionEngine';

export type MochiPoseKey = MochiAssetKey;

export type MochiAnimationPreset =
  | 'breathing'
  | 'wave'
  | 'thumbsUp'
  | 'celebrate'
  | 'thinking'
  | 'surprised'
  | 'sleepy'
  | 'writing'
  | 'phone'
  | 'scan'
  | 'analysis'
  | 'mealLog'
  | 'drink'
  | 'healthyChoice'
  | 'reminder'
  | 'exercise'
  | 'streak'
  | 'goal';

export type MochiVectorLayer =
  | 'shadow'
  | 'body'
  | 'ears'
  | 'headband'
  | 'face'
  | 'arms'
  | 'legs'
  | 'accessories'
  | 'motionFx';

export type MochiRendererMode = 'vector' | 'pngFallback' | 'compare';

export type MochiExpressionKey =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'surprised'
  | 'sleepy'
  | 'focused'
  | 'eating'
  | 'drinkWater'
  | 'celebrate';

export type MochiPoseAccessory =
  | 'notebook'
  | 'pen'
  | 'phone'
  | 'appPhone'
  | 'scanFrame'
  | 'foodPlate'
  | 'analysisCard'
  | 'caloriePhone'
  | 'breakfastBowl'
  | 'lunchPlate'
  | 'dinnerPlate'
  | 'waterBottle'
  | 'fruitBowl'
  | 'smartChoicePlate'
  | 'bellBubble'
  | 'dumbbells'
  | 'streakBoard'
  | 'trophy'
  | 'confetti';

export type MochiPoseMeta = {
  key: MochiPoseKey;
  order: number;
  labelVi: string;
  accessibilityLabel: string;
  sourceAsset: MochiAssetKey;
  expression: MochiExpressionKey;
  animationPreset: MochiAnimationPreset;
  accessoryIds: MochiPoseAccessory[];
  companionAccessories?: MochiAccessoryId[];
  bodyLean?: number;
};

export const MOCHI_VECTOR_LAYERS: MochiVectorLayer[] = [
  'shadow',
  'body',
  'ears',
  'headband',
  'face',
  'arms',
  'legs',
  'accessories',
  'motionFx',
];

export const MOCHI_POSE_ORDER: MochiPoseKey[] = [
  'idle',
  'hello',
  'happy',
  'excited',
  'thinking',
  'surprised',
  'sleepy',
  'notebook',
  'logCalorieNote',
  'holdPhone',
  'openApp',
  'scanFood',
  'analyzeResult',
  'showCalorie',
  'breakfastLog',
  'lunchLog',
  'dinnerLog',
  'drinkWater',
  'healthyFood',
  'smartChoice',
  'reminder',
  'exercise',
  'streakTracking',
  'goalComplete',
];

export const MOCHI_POSE_CATALOG: Record<MochiPoseKey, MochiPoseMeta> = {
  idle: {
    key: 'idle',
    order: 1,
    labelVi: 'Đứng yên',
    accessibilityLabel: 'Mochi đứng yên',
    sourceAsset: 'idle',
    expression: 'idle',
    animationPreset: 'breathing',
    accessoryIds: [],
  },
  hello: {
    key: 'hello',
    order: 2,
    labelVi: 'Chào bạn',
    accessibilityLabel: 'Mochi vẫy tay chào bạn',
    sourceAsset: 'hello',
    expression: 'happy',
    animationPreset: 'wave',
    accessoryIds: [],
    bodyLean: -2,
  },
  happy: {
    key: 'happy',
    order: 3,
    labelVi: 'Vui vẻ',
    accessibilityLabel: 'Mochi vui vẻ giơ hai ngón cái',
    sourceAsset: 'happy',
    expression: 'happy',
    animationPreset: 'thumbsUp',
    accessoryIds: [],
  },
  excited: {
    key: 'excited',
    order: 4,
    labelVi: 'Phấn khích',
    accessibilityLabel: 'Mochi phấn khích ăn mừng',
    sourceAsset: 'excited',
    expression: 'excited',
    animationPreset: 'celebrate',
    accessoryIds: ['confetti'],
  },
  thinking: {
    key: 'thinking',
    order: 5,
    labelVi: 'Đang suy nghĩ',
    accessibilityLabel: 'Mochi đang suy nghĩ',
    sourceAsset: 'thinking',
    expression: 'thinking',
    animationPreset: 'thinking',
    accessoryIds: [],
    bodyLean: 4,
  },
  surprised: {
    key: 'surprised',
    order: 6,
    labelVi: 'Ngạc nhiên',
    accessibilityLabel: 'Mochi ngạc nhiên',
    sourceAsset: 'surprised',
    expression: 'surprised',
    animationPreset: 'surprised',
    accessoryIds: ['bellBubble'],
  },
  sleepy: {
    key: 'sleepy',
    order: 7,
    labelVi: 'Buồn ngủ',
    accessibilityLabel: 'Mochi buồn ngủ',
    sourceAsset: 'sleepy',
    expression: 'sleepy',
    animationPreset: 'sleepy',
    accessoryIds: [],
    bodyLean: 5,
  },
  notebook: {
    key: 'notebook',
    order: 8,
    labelVi: 'Cầm sổ tay',
    accessibilityLabel: 'Mochi cầm sổ tay',
    sourceAsset: 'notebook',
    expression: 'focused',
    animationPreset: 'writing',
    accessoryIds: ['notebook'],
  },
  logCalorieNote: {
    key: 'logCalorieNote',
    order: 9,
    labelVi: 'Ghi chú calo',
    accessibilityLabel: 'Mochi ghi chú calo',
    sourceAsset: 'logCalorieNote',
    expression: 'focused',
    animationPreset: 'writing',
    accessoryIds: ['notebook', 'pen'],
  },
  holdPhone: {
    key: 'holdPhone',
    order: 10,
    labelVi: 'Cầm điện thoại',
    accessibilityLabel: 'Mochi cầm điện thoại',
    sourceAsset: 'holdPhone',
    expression: 'idle',
    animationPreset: 'phone',
    accessoryIds: ['phone'],
  },
  openApp: {
    key: 'openApp',
    order: 11,
    labelVi: 'Mở ứng dụng',
    accessibilityLabel: 'Mochi mở ứng dụng EatFitAI',
    sourceAsset: 'openApp',
    expression: 'happy',
    animationPreset: 'phone',
    accessoryIds: ['appPhone'],
  },
  scanFood: {
    key: 'scanFood',
    order: 12,
    labelVi: 'Quét món ăn',
    accessibilityLabel: 'Mochi quét món ăn',
    sourceAsset: 'scanFood',
    expression: 'focused',
    animationPreset: 'scan',
    accessoryIds: ['foodPlate', 'phone', 'scanFrame'],
  },
  analyzeResult: {
    key: 'analyzeResult',
    order: 13,
    labelVi: 'Phân tích kết quả',
    accessibilityLabel: 'Mochi phân tích kết quả dinh dưỡng',
    sourceAsset: 'analyzeResult',
    expression: 'focused',
    animationPreset: 'analysis',
    accessoryIds: ['phone', 'analysisCard'],
  },
  showCalorie: {
    key: 'showCalorie',
    order: 14,
    labelVi: 'Hiển thị calo',
    accessibilityLabel: 'Mochi hiển thị lượng calo',
    sourceAsset: 'showCalorie',
    expression: 'happy',
    animationPreset: 'phone',
    accessoryIds: ['caloriePhone'],
  },
  breakfastLog: {
    key: 'breakfastLog',
    order: 15,
    labelVi: 'Ghi nhận bữa sáng',
    accessibilityLabel: 'Mochi ghi nhận bữa sáng',
    sourceAsset: 'breakfastLog',
    expression: 'eating',
    animationPreset: 'mealLog',
    accessoryIds: ['breakfastBowl'],
  },
  lunchLog: {
    key: 'lunchLog',
    order: 16,
    labelVi: 'Ghi nhận bữa trưa',
    accessibilityLabel: 'Mochi ghi nhận bữa trưa',
    sourceAsset: 'lunchLog',
    expression: 'happy',
    animationPreset: 'mealLog',
    accessoryIds: ['lunchPlate', 'pen'],
  },
  dinnerLog: {
    key: 'dinnerLog',
    order: 17,
    labelVi: 'Ghi nhận bữa tối',
    accessibilityLabel: 'Mochi ghi nhận bữa tối',
    sourceAsset: 'dinnerLog',
    expression: 'happy',
    animationPreset: 'mealLog',
    accessoryIds: ['dinnerPlate'],
  },
  drinkWater: {
    key: 'drinkWater',
    order: 18,
    labelVi: 'Uống nước',
    accessibilityLabel: 'Mochi uống nước',
    sourceAsset: 'drinkWater',
    expression: 'drinkWater',
    animationPreset: 'drink',
    accessoryIds: ['waterBottle'],
    companionAccessories: ['water_bottle'],
  },
  healthyFood: {
    key: 'healthyFood',
    order: 19,
    labelVi: 'Ăn lành mạnh',
    accessibilityLabel: 'Mochi chọn trái cây lành mạnh',
    sourceAsset: 'healthyFood',
    expression: 'happy',
    animationPreset: 'healthyChoice',
    accessoryIds: ['fruitBowl'],
  },
  smartChoice: {
    key: 'smartChoice',
    order: 20,
    labelVi: 'Chọn lựa thông minh',
    accessibilityLabel: 'Mochi chọn lựa thông minh',
    sourceAsset: 'smartChoice',
    expression: 'happy',
    animationPreset: 'healthyChoice',
    accessoryIds: ['smartChoicePlate'],
  },
  reminder: {
    key: 'reminder',
    order: 21,
    labelVi: 'Nhắc nhở',
    accessibilityLabel: 'Mochi nhắc nhở',
    sourceAsset: 'reminder',
    expression: 'idle',
    animationPreset: 'reminder',
    accessoryIds: ['bellBubble'],
  },
  exercise: {
    key: 'exercise',
    order: 22,
    labelVi: 'Tập luyện',
    accessibilityLabel: 'Mochi tập luyện',
    sourceAsset: 'exercise',
    expression: 'happy',
    animationPreset: 'exercise',
    accessoryIds: ['dumbbells'],
  },
  streakTracking: {
    key: 'streakTracking',
    order: 23,
    labelVi: 'Theo dõi streak',
    accessibilityLabel: 'Mochi theo dõi streak',
    sourceAsset: 'streakTracking',
    expression: 'focused',
    animationPreset: 'streak',
    accessoryIds: ['streakBoard'],
    companionAccessories: ['streak_badge'],
  },
  goalComplete: {
    key: 'goalComplete',
    order: 24,
    labelVi: 'Đạt mục tiêu',
    accessibilityLabel: 'Mochi đạt mục tiêu',
    sourceAsset: 'goalComplete',
    expression: 'celebrate',
    animationPreset: 'goal',
    accessoryIds: ['trophy', 'confetti'],
    companionAccessories: ['trophy'],
  },
};

export const MOCHI_ANIMATION_TO_POSE: Record<MochiAnimation, MochiPoseKey> = {
  idle: 'idle',
  wave: 'hello',
  happy: 'happy',
  thinking: 'thinking',
  surprised: 'surprised',
  reminder: 'reminder',
  drinkWater: 'drinkWater',
  celebrate: 'goalComplete',
};

export const getMochiPoseMeta = (pose: MochiPoseKey): MochiPoseMeta =>
  MOCHI_POSE_CATALOG[pose];

export const getMochiPoseFromAnimation = (
  animation: MochiAnimation,
): MochiPoseKey => MOCHI_ANIMATION_TO_POSE[animation];
