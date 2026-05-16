import type { MoChiPoseKey, MoChiSpriteVariant } from '../../assets/mascot/mochi/mochiAssets';
import { MOCHI_SPRITE_METADATA } from '../../assets/mascot/mochi/mochiAssets';

export type MoChiPetMood =
  | 'idle'
  | 'happy'
  | 'hungry'
  | 'thirsty'
  | 'thinking'
  | 'confused'
  | 'concerned'
  | 'error'
  | 'celebrating'
  | 'reporting';

export type MoChiPetEventType =
  | 'app_idle'
  | 'tutorial_step'
  | 'tutorial_welcome'
  | 'tutorial_scan'
  | 'tutorial_search'
  | 'tutorial_water'
  | 'tutorial_progress'
  | 'meal_reminder'
  | 'water_reminder'
  | 'scan_processing'
  | 'scan_success'
  | 'scan_empty'
  | 'scan_error'
  | 'meal_logged'
  | 'diary_empty_today'
  | 'diary_review'
  | 'food_search_empty'
  | 'food_search_no_results'
  | 'food_search_error'
  | 'voice_idle'
  | 'voice_listening'
  | 'voice_review'
  | 'voice_success'
  | 'voice_error'
  | 'recipe_empty'
  | 'recipe_searching'
  | 'recipe_success'
  | 'recipe_error'
  | 'stats_low_data'
  | 'weekly_review'
  | 'achievement_unlocked'
  | 'profile_incomplete'
  | 'weight_checkin'
  | 'nutrition_targets'
  | 'nutrition_explain'
  | 'hydration_goal'
  | 'meal_choice'
  | 'workout_nudge'
  | 'favorite_saved'
  | 'cooking_prep'
  | 'diet_warning'
  | 'companion_rest'
  | 'companion_love'
  | 'companion_determined'
  | 'companion_surprised'
  | 'companion_embarrassed'
  | 'companion_strained'
  | 'companion_box_idle'
  | 'app_offline'
  | 'generic_error'
  | 'water_added'
  | 'streak_unlocked'
  | 'calorie_caution'
  | 'report_ready';

export type MoChiPrimaryAction =
  | 'scanFood'
  | 'addMeal'
  | 'water'
  | 'viewProgress'
  | 'viewDiary'
  | 'dismiss';

export type MoChiSpriteMeta = {
  key: MoChiPoseKey;
  order: number;
  variant: MoChiSpriteVariant;
  mood: MoChiPetMood;
  labelVi: string;
  accessibilityLabel: string;
};

export const MOCHI_SPRITE_ORDER: MoChiPoseKey[] = [
  'idle',
  'angry',
  'sadCry',
  'celebrate',
  'confused',
  'calm',
  'foodPhone',
  'analyzing',
  'hydrate',
  'thumbsUp',
  'sparkleSuccess',
  'faceShocked',
  'faceSurprised',
  'faceSad',
  'faceTired',
  'faceThinking',
  'faceHappy',
  'faceEmbarrassed',
  'faceCalm',
  'faceLove',
  'faceDetermined',
  'islandAvatar',
  'faceCheerful',
  'faceStrained',
  'foodScale',
  'cakeConcern',
  'tabletLog',
  'tabletMeal',
  'carbExplain',
  'saladSuccess',
  'burgerSurprise',
  'mealChoice',
  'workout',
  'heartLove',
  'healthyBasket',
  'weighIn',
  'waterGlass',
  'reportReview',
  'reportPanic',
  'phoneMealPrep',
  'dietWarning',
  'cookingPrep',
  'spinChoice',
  'boxIdle',
  'scanThinkingFull',
  'scanSuccessFull',
  'scanErrorFull',
  'mealCoachFull',
  'waterCoachFull',
  'sleepyIdleFull',
  'secureAccountFull',
  'nutritionCoachNotice',
  'scanUncertainNotice',
  'listeningNotice',
  'weeklyReportNotice',
  'portionAdjustNotice',
  'mealPortionNotice',
  'logoutNotice',
  'scanSuccessFace',
  'scanUncertainFace',
  'softSorryFace',
  'secureFace',
];

export const MOCHI_REQUIRED_EVENT_POSES: MoChiPoseKey[] = [
  'idle',
  'foodPhone',
  'hydrate',
  'analyzing',
  'sparkleSuccess',
  'confused',
  'sadCry',
  'saladSuccess',
  'waterGlass',
  'celebrate',
  'cakeConcern',
  'reportReview',
  'scanThinkingFull',
  'scanSuccessFull',
  'scanErrorFull',
  'mealCoachFull',
  'waterCoachFull',
  'scanUncertainNotice',
  'listeningNotice',
  'weeklyReportNotice',
  'portionAdjustNotice',
  'mealPortionNotice',
];

const POSE_MOOD: Partial<Record<MoChiPoseKey, MoChiPetMood>> = {
  idle: 'idle',
  angry: 'concerned',
  sadCry: 'error',
  celebrate: 'celebrating',
  confused: 'confused',
  calm: 'idle',
  foodPhone: 'hungry',
  analyzing: 'thinking',
  hydrate: 'thirsty',
  thumbsUp: 'happy',
  cakeConcern: 'concerned',
  saladSuccess: 'happy',
  burgerSurprise: 'confused',
  waterGlass: 'thirsty',
  reportReview: 'reporting',
  reportPanic: 'error',
  sparkleSuccess: 'happy',
  islandAvatar: 'idle',
  scanThinkingFull: 'thinking',
  scanSuccessFull: 'happy',
  scanErrorFull: 'error',
  mealCoachFull: 'hungry',
  waterCoachFull: 'thirsty',
  sleepyIdleFull: 'idle',
  secureAccountFull: 'concerned',
  nutritionCoachNotice: 'thinking',
  scanUncertainNotice: 'confused',
  listeningNotice: 'thinking',
  weeklyReportNotice: 'reporting',
  portionAdjustNotice: 'thinking',
  mealPortionNotice: 'hungry',
  logoutNotice: 'idle',
  scanSuccessFace: 'happy',
  scanUncertainFace: 'confused',
  softSorryFace: 'error',
  secureFace: 'concerned',
};

export const MOCHI_EVENT_TO_POSE: Record<MoChiPetEventType, MoChiPoseKey> = {
  app_idle: 'idle',
  tutorial_step: 'celebrate',
  tutorial_welcome: 'boxIdle',
  tutorial_scan: 'foodPhone',
  tutorial_search: 'mealChoice',
  tutorial_water: 'waterGlass',
  tutorial_progress: 'reportReview',
  meal_reminder: 'mealCoachFull',
  water_reminder: 'waterCoachFull',
  scan_processing: 'scanThinkingFull',
  scan_success: 'scanSuccessFull',
  scan_empty: 'scanUncertainNotice',
  scan_error: 'scanErrorFull',
  meal_logged: 'saladSuccess',
  diary_empty_today: 'tabletLog',
  diary_review: 'mealPortionNotice',
  food_search_empty: 'nutritionCoachNotice',
  food_search_no_results: 'burgerSurprise',
  food_search_error: 'softSorryFace',
  voice_idle: 'faceCheerful',
  voice_listening: 'listeningNotice',
  voice_review: 'mealPortionNotice',
  voice_success: 'thumbsUp',
  voice_error: 'softSorryFace',
  recipe_empty: 'healthyBasket',
  recipe_searching: 'cookingPrep',
  recipe_success: 'heartLove',
  recipe_error: 'reportPanic',
  stats_low_data: 'weeklyReportNotice',
  weekly_review: 'weeklyReportNotice',
  achievement_unlocked: 'sparkleSuccess',
  profile_incomplete: 'secureAccountFull',
  weight_checkin: 'weighIn',
  nutrition_targets: 'portionAdjustNotice',
  nutrition_explain: 'nutritionCoachNotice',
  hydration_goal: 'waterCoachFull',
  meal_choice: 'mealPortionNotice',
  workout_nudge: 'workout',
  favorite_saved: 'faceHappy',
  cooking_prep: 'phoneMealPrep',
  diet_warning: 'dietWarning',
  companion_rest: 'sleepyIdleFull',
  companion_love: 'faceLove',
  companion_determined: 'faceDetermined',
  companion_surprised: 'faceShocked',
  companion_embarrassed: 'faceEmbarrassed',
  companion_strained: 'faceStrained',
  companion_box_idle: 'boxIdle',
  app_offline: 'softSorryFace',
  generic_error: 'softSorryFace',
  water_added: 'waterCoachFull',
  streak_unlocked: 'celebrate',
  calorie_caution: 'nutritionCoachNotice',
  report_ready: 'weeklyReportNotice',
};

export const MOCHI_SPRITE_CATALOG: Record<MoChiPoseKey, MoChiSpriteMeta> =
  MOCHI_SPRITE_ORDER.reduce(
    (catalog, key, index) => {
      const metadata = MOCHI_SPRITE_METADATA[key];

      catalog[key] = {
        key,
        order: index + 1,
        variant: metadata.variant,
        mood: POSE_MOOD[key] ?? 'idle',
        labelVi: metadata.labelVi,
        accessibilityLabel: metadata.accessibilityLabel,
      };

      return catalog;
    },
    {} as Record<MoChiPoseKey, MoChiSpriteMeta>,
  );

export const getMoChiPoseForEvent = (eventType: MoChiPetEventType): MoChiPoseKey =>
  MOCHI_EVENT_TO_POSE[eventType];
