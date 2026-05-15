import type { ImageSourcePropType } from 'react-native';

export type MochiAssetKey =
  | 'idle'
  | 'hello'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'surprised'
  | 'sleepy'
  | 'notebook'
  | 'logCalorieNote'
  | 'holdPhone'
  | 'openApp'
  | 'scanFood'
  | 'analyzeResult'
  | 'showCalorie'
  | 'breakfastLog'
  | 'lunchLog'
  | 'dinnerLog'
  | 'drinkWater'
  | 'healthyFood'
  | 'smartChoice'
  | 'reminder'
  | 'exercise'
  | 'streakTracking'
  | 'goalComplete';

export type MochiAssetMeta = {
  fileName: string;
  sourceSheet: string;
};

export const MOCHI_SOURCE_SHEET = 'mochi-handdrawn-study.html export, 2026-05-15';

export const MOCHI_ASSETS: Record<MochiAssetKey, ImageSourcePropType> = {
  idle: require('./characters/01_idle.png'),
  hello: require('./characters/02_hello.png'),
  happy: require('./characters/03_happy.png'),
  excited: require('./characters/04_excited.png'),
  thinking: require('./characters/05_thinking.png'),
  surprised: require('./characters/06_surprised.png'),
  sleepy: require('./characters/07_sleepy.png'),
  notebook: require('./characters/08_notebook.png'),
  logCalorieNote: require('./characters/09_log_calorie_note.png'),
  holdPhone: require('./characters/10_hold_phone.png'),
  openApp: require('./characters/11_open_app.png'),
  scanFood: require('./characters/12_scan_food.png'),
  analyzeResult: require('./characters/13_analyze_result.png'),
  showCalorie: require('./characters/14_show_calorie.png'),
  breakfastLog: require('./characters/15_breakfast_log.png'),
  lunchLog: require('./characters/16_lunch_log.png'),
  dinnerLog: require('./characters/17_dinner_log.png'),
  drinkWater: require('./characters/18_drink_water.png'),
  healthyFood: require('./characters/19_healthy_food.png'),
  smartChoice: require('./characters/20_smart_choice.png'),
  reminder: require('./characters/21_reminder.png'),
  exercise: require('./characters/22_exercise.png'),
  streakTracking: require('./characters/23_streak_tracking.png'),
  goalComplete: require('./characters/24_goal_complete.png'),
};

export const MOCHI_ASSET_METADATA: Record<MochiAssetKey, MochiAssetMeta> = {
  idle: { fileName: '01_idle.png', sourceSheet: MOCHI_SOURCE_SHEET },
  hello: { fileName: '02_hello.png', sourceSheet: MOCHI_SOURCE_SHEET },
  happy: { fileName: '03_happy.png', sourceSheet: MOCHI_SOURCE_SHEET },
  excited: { fileName: '04_excited.png', sourceSheet: MOCHI_SOURCE_SHEET },
  thinking: { fileName: '05_thinking.png', sourceSheet: MOCHI_SOURCE_SHEET },
  surprised: { fileName: '06_surprised.png', sourceSheet: MOCHI_SOURCE_SHEET },
  sleepy: { fileName: '07_sleepy.png', sourceSheet: MOCHI_SOURCE_SHEET },
  notebook: { fileName: '08_notebook.png', sourceSheet: MOCHI_SOURCE_SHEET },
  logCalorieNote: { fileName: '09_log_calorie_note.png', sourceSheet: MOCHI_SOURCE_SHEET },
  holdPhone: { fileName: '10_hold_phone.png', sourceSheet: MOCHI_SOURCE_SHEET },
  openApp: { fileName: '11_open_app.png', sourceSheet: MOCHI_SOURCE_SHEET },
  scanFood: { fileName: '12_scan_food.png', sourceSheet: MOCHI_SOURCE_SHEET },
  analyzeResult: { fileName: '13_analyze_result.png', sourceSheet: MOCHI_SOURCE_SHEET },
  showCalorie: { fileName: '14_show_calorie.png', sourceSheet: MOCHI_SOURCE_SHEET },
  breakfastLog: { fileName: '15_breakfast_log.png', sourceSheet: MOCHI_SOURCE_SHEET },
  lunchLog: { fileName: '16_lunch_log.png', sourceSheet: MOCHI_SOURCE_SHEET },
  dinnerLog: { fileName: '17_dinner_log.png', sourceSheet: MOCHI_SOURCE_SHEET },
  drinkWater: { fileName: '18_drink_water.png', sourceSheet: MOCHI_SOURCE_SHEET },
  healthyFood: { fileName: '19_healthy_food.png', sourceSheet: MOCHI_SOURCE_SHEET },
  smartChoice: { fileName: '20_smart_choice.png', sourceSheet: MOCHI_SOURCE_SHEET },
  reminder: { fileName: '21_reminder.png', sourceSheet: MOCHI_SOURCE_SHEET },
  exercise: { fileName: '22_exercise.png', sourceSheet: MOCHI_SOURCE_SHEET },
  streakTracking: { fileName: '23_streak_tracking.png', sourceSheet: MOCHI_SOURCE_SHEET },
  goalComplete: { fileName: '24_goal_complete.png', sourceSheet: MOCHI_SOURCE_SHEET },
};
