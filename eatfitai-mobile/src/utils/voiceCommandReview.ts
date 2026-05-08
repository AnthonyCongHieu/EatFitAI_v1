import type { ParsedVoiceCommand } from '../services/voiceService';

const LOW_CONFIDENCE_REVIEW_MESSAGE =
  'Độ tin cậy chưa cao. Hãy kiểm tra trước khi lưu.';

const GENERIC_REVIEW_MESSAGE = 'Voice Beta cần bạn xác nhận trước khi lưu.';
const MISSING_PORTION_MESSAGE =
  'Bạn muốn ghi khẩu phần bao nhiêu? Hãy nói số gram hoặc khẩu phần như 1 bát, 1 phần.';

export function shouldRequireVoiceConfirmation(
  command: ParsedVoiceCommand,
): boolean {
  if (command.intent === 'UNKNOWN' || command.intent === 'ASK_CALORIES') {
    return false;
  }

  if (command.reviewRequired === true) {
    return true;
  }

  if (command.intent === 'ADD_FOOD' || command.intent === 'LOG_WEIGHT') {
    return true;
  }

  return command.confidence <= 0 || command.confidence < 0.75;
}

export function getVoiceReviewMessage(
  command: ParsedVoiceCommand,
): string | null {
  if (!shouldRequireVoiceConfirmation(command)) {
    return null;
  }

  const reviewReason = command.reviewReason?.trim();
  if (reviewReason) {
    return reviewReason;
  }

  const portionClarification = getVoicePortionClarificationMessage(command);
  if (portionClarification) {
    return portionClarification;
  }

  if (command.confidence <= 0 || command.confidence < 0.75) {
    return LOW_CONFIDENCE_REVIEW_MESSAGE;
  }

  return GENERIC_REVIEW_MESSAGE;
}

export function getMissingVoicePortionFoods(command: ParsedVoiceCommand): string[] {
  if (command.intent !== 'ADD_FOOD') {
    return [];
  }

  const foods = command.entities.foods?.length
    ? command.entities.foods
    : command.entities.foodName
      ? [
          {
            foodName: command.entities.foodName,
            quantity: command.entities.quantity,
            unit: command.entities.unit,
            weight: command.entities.weight,
          },
        ]
      : [];

  return foods
    .filter((food) => !food.weight && !food.quantity && !food.unit)
    .map((food) => food.foodName?.trim())
    .filter((foodName): foodName is string => Boolean(foodName));
}

export function getVoicePortionClarificationMessage(
  command: ParsedVoiceCommand,
): string | null {
  const missingFoods = getMissingVoicePortionFoods(command);
  if (missingFoods.length === 0) {
    return null;
  }

  return missingFoods.length === 1
    ? `${MISSING_PORTION_MESSAGE} (${missingFoods[0]})`
    : `${MISSING_PORTION_MESSAGE} (${missingFoods.slice(0, 3).join(', ')})`;
}
