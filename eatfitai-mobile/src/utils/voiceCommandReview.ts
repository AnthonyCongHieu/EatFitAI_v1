import type { ParsedVoiceCommand } from '../services/voiceService';

const LOW_CONFIDENCE_REVIEW_MESSAGE =
  'Độ tin cậy chưa cao. Hãy kiểm tra trước khi lưu.';

const GENERIC_REVIEW_MESSAGE = 'Voice Beta cần bạn xác nhận trước khi lưu.';

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

  if (command.confidence <= 0 || command.confidence < 0.75) {
    return LOW_CONFIDENCE_REVIEW_MESSAGE;
  }

  return GENERIC_REVIEW_MESSAGE;
}
