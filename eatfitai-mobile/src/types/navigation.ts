// Navigation types dung chung cho cac man lien quan den meals / AI Vision
// Chu thich bang tieng Viet khong dau

import type { VisionDetectResult } from './ai';

export interface AddMealFromVisionParams {
  imageUri: string;
  result: VisionDetectResult;
}

