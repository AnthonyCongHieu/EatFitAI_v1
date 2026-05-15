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
};

export const MOCHI_EVENT_TO_POSE: Record<MoChiPetEventType, MoChiPoseKey> = {
  app_idle: 'idle',
  tutorial_step: 'celebrate',
  tutorial_welcome: 'boxIdle',
  tutorial_scan: 'foodPhone',
  tutorial_search: 'mealChoice',
  tutorial_water: 'waterGlass',
  tutorial_progress: 'reportReview',
  meal_reminder: 'foodPhone',
  water_reminder: 'hydrate',
  scan_processing: 'analyzing',
  scan_success: 'sparkleSuccess',
  scan_empty: 'confused',
  scan_error: 'sadCry',
  meal_logged: 'saladSuccess',
  diary_empty_today: 'tabletLog',
  diary_review: 'tabletMeal',
  food_search_empty: 'faceThinking',
  food_search_no_results: 'burgerSurprise',
  food_search_error: 'faceStrained',
  voice_idle: 'faceCheerful',
  voice_listening: 'faceSurprised',
  voice_review: 'faceThinking',
  voice_success: 'thumbsUp',
  voice_error: 'faceSad',
  recipe_empty: 'healthyBasket',
  recipe_searching: 'cookingPrep',
  recipe_success: 'heartLove',
  recipe_error: 'reportPanic',
  stats_low_data: 'faceCalm',
  weekly_review: 'reportReview',
  achievement_unlocked: 'sparkleSuccess',
  profile_incomplete: 'faceEmbarrassed',
  weight_checkin: 'weighIn',
  nutrition_targets: 'foodScale',
  nutrition_explain: 'carbExplain',
  hydration_goal: 'waterGlass',
  meal_choice: 'spinChoice',
  workout_nudge: 'workout',
  favorite_saved: 'faceHappy',
  cooking_prep: 'phoneMealPrep',
  diet_warning: 'dietWarning',
  companion_rest: 'calm',
  companion_love: 'faceLove',
  companion_determined: 'faceDetermined',
  companion_surprised: 'faceShocked',
  companion_embarrassed: 'faceEmbarrassed',
  companion_strained: 'faceStrained',
  companion_box_idle: 'boxIdle',
  app_offline: 'faceTired',
  generic_error: 'angry',
  water_added: 'waterGlass',
  streak_unlocked: 'celebrate',
  calorie_caution: 'cakeConcern',
  report_ready: 'reportReview',
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
