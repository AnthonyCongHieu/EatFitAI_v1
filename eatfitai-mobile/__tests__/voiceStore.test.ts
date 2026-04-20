import { act } from '@testing-library/react-native';

import voiceService from '../src/services/voiceService';
import { useVoiceStore } from '../src/store/useVoiceStore';

jest.mock('../src/services/voiceService', () => ({
  __esModule: true,
  default: {
    processVoiceText: jest.fn(),
    executeCommand: jest.fn(),
    confirmWeight: jest.fn(),
  },
}));

jest.mock('../src/store/useProfileStore', () => ({
  useProfileStore: {
    getState: jest.fn(() => ({
      invalidateProfile: jest.fn(),
      fetchProfile: jest.fn().mockResolvedValue(null),
    })),
  },
}));

const mockedVoiceService = voiceService as jest.Mocked<typeof voiceService>;

describe('useVoiceStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVoiceStore.getState().reset();
  });

  it('moves add-food parsing into review state before save', async () => {
    mockedVoiceService.processVoiceText.mockResolvedValue({
      success: true,
      command: {
        intent: 'ADD_FOOD',
        entities: {
          foodName: 'banana',
          quantity: 1,
          mealType: 'breakfast',
        },
        confidence: 0.84,
        rawText: 'ghi 1 banana vao bua sang',
        source: 'backend-rule-fallback',
        reviewRequired: true,
        reviewReason: 'Cần xác nhận món trước khi lưu.',
      },
    });

    await act(async () => {
      await useVoiceStore.getState().processText('ghi 1 banana vao bua sang');
    });

    const state = useVoiceStore.getState();
    expect(state.status).toBe('review');
    expect(state.parsedCommand?.intent).toBe('ADD_FOOD');
    expect(state.executedData).toBeNull();
    expect(state.error).toBeNull();
  });

  it('keeps log-weight in review state until user confirms save', async () => {
    mockedVoiceService.processVoiceText.mockResolvedValue({
      success: true,
      command: {
        intent: 'LOG_WEIGHT',
        entities: {
          weight: 70,
        },
        confidence: 0.91,
        rawText: 'can nang 70 kg',
        source: 'ai-provider-proxy',
        reviewRequired: true,
      },
    });
    mockedVoiceService.executeCommand.mockResolvedValue({
      success: true,
      executedAction: {
        type: 'LOG_WEIGHT_CONFIRM',
        details: 'Kiểm tra trước khi lưu cân nặng.',
        data: {
          currentWeight: 69,
          newWeight: 70,
          requireConfirm: true,
        },
      },
    });

    await act(async () => {
      await useVoiceStore.getState().processText('can nang 70 kg');
    });

    const state = useVoiceStore.getState();
    expect(state.status).toBe('review');
    expect(state.parsedCommand?.intent).toBe('LOG_WEIGHT');
    expect(state.executedData?.requireConfirm).toBe(true);
    expect(state.executedData?.newWeight).toBe(70);
  });
});
