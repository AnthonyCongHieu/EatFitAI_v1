import type { ParsedVoiceCommand } from '../src/services/voiceService';
import {
  getVoicePortionClarificationMessage,
  getVoiceReviewMessage,
  shouldRequireVoiceConfirmation,
} from '../src/utils/voiceCommandReview';

const createCommand = (
  overrides: Partial<ParsedVoiceCommand>,
): ParsedVoiceCommand => ({
  intent: 'UNKNOWN',
  entities: {},
  confidence: 0,
  rawText: 'test command',
  ...overrides,
});

describe('voiceCommandReview', () => {
  it('requires confirmation for ADD_FOOD high confidence', () => {
    const command = createCommand({
      intent: 'ADD_FOOD',
      confidence: 0.95,
    });

    expect(shouldRequireVoiceConfirmation(command)).toBe(true);
  });

  it('does not require confirmation for ASK_CALORIES', () => {
    const command = createCommand({
      intent: 'ASK_CALORIES',
      confidence: 0.2,
      reviewRequired: true,
    });

    expect(shouldRequireVoiceConfirmation(command)).toBe(false);
  });

  it('uses backend reviewReason before generic copy', () => {
    const command = createCommand({
      intent: 'LOG_WEIGHT',
      confidence: 0.9,
      reviewReason: '  Backend needs confirmation.  ',
    });

    expect(getVoiceReviewMessage(command)).toBe('Backend needs confirmation.');
  });

  it('uses low confidence copy for low confidence write intent', () => {
    const command = createCommand({
      intent: 'ADD_FOOD',
      confidence: 0.5,
    });

    expect(getVoiceReviewMessage(command)).toBe(
      'Độ tin cậy chưa cao. Hãy kiểm tra trước khi lưu.',
    );
  });

  it('asks for clarification when multi-food voice log is missing portions', () => {
    const command = createCommand({
      intent: 'ADD_FOOD',
      confidence: 0.92,
      entities: {
        foods: [
          { foodName: 'cơm', quantity: 1, unit: 'bát' },
          { foodName: 'gà' },
        ],
      },
    });

    expect(getVoicePortionClarificationMessage(command)).toBe(
      'Bạn muốn ghi khẩu phần bao nhiêu? Hãy nói số gram hoặc khẩu phần như 1 bát, 1 phần. (gà)',
    );
  });
});
