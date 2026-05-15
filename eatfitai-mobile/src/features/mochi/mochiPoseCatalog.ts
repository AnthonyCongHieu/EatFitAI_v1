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
  | 'meal_reminder'
  | 'water_reminder'
  | 'scan_processing'
  | 'scan_success'
  | 'scan_empty'
  | 'scan_error'
  | 'meal_logged'
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
  meal_reminder: 'foodPhone',
  water_reminder: 'hydrate',
  scan_processing: 'analyzing',
  scan_success: 'sparkleSuccess',
  scan_empty: 'confused',
  scan_error: 'sadCry',
  meal_logged: 'saladSuccess',
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
