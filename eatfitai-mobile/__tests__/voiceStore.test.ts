import { act } from '@testing-library/react-native';

import voiceService from '../src/services/voiceService';
import { useVoiceStore } from '../src/store/useVoiceStore';

jest.mock('../src/services/voiceService', () => ({
  __esModule: true,
  default: {
    processVoiceText: jest.fn(),
    reviewCommand: jest.fn(),
    commitReview: jest.fn(),
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
    mockedVoiceService.reviewCommand.mockResolvedValue({
      intent: 'ADD_FOOD',
      rawText: 'ghi 1 banana vao bua sang',
      source: 'backend-rule-fallback',
      confidence: 0.84,
      reviewRequired: true,
      reviewReason: 'Cần xác nhận món trước khi lưu.',
      mealType: 'breakfast',
      date: '2026-05-16',
      items: [
        {
          clientId: 'item-1',
          heardText: 'banana',
          foodName: 'banana',
          grams: 100,
          quantity: 1,
          selectedCandidate: {
            id: 1,
            source: 'catalog',
            name: 'banana',
            caloriesPer100: 89,
            proteinPer100: 1,
            carbsPer100: 23,
            fatPer100: 0,
            matchScore: 1,
          },
          candidates: [],
          warnings: [],
        },
      ],
      totals: { calories: 89, protein: 1, carbs: 23, fat: 0 },
      warnings: [],
      canSave: true,
    });

    await act(async () => {
      await useVoiceStore.getState().processText('ghi 1 banana vao bua sang');
    });

    const state = useVoiceStore.getState();
    expect(state.status).toBe('review');
    expect(state.parsedCommand?.intent).toBe('ADD_FOOD');
    expect(state.reviewDraft?.items[0]!.selectedCandidate?.name).toBe('banana');
    expect(state.executedData).toBeNull();
    expect(state.error).toBeNull();
    expect(mockedVoiceService.executeCommand).not.toHaveBeenCalled();
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
    mockedVoiceService.reviewCommand.mockResolvedValue({
      intent: 'LOG_WEIGHT',
      rawText: 'can nang 70 kg',
      source: 'ai-provider-proxy',
      confidence: 0.91,
      reviewRequired: true,
      items: [],
      weight: {
        currentWeight: 69,
        newWeight: 70,
      },
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      warnings: [],
      canSave: true,
    });

    await act(async () => {
      await useVoiceStore.getState().processText('can nang 70 kg');
    });

    const state = useVoiceStore.getState();
    expect(state.status).toBe('review');
    expect(state.parsedCommand?.intent).toBe('LOG_WEIGHT');
    expect(state.reviewDraft?.weight?.currentWeight).toBe(69);
    expect(state.reviewDraft?.weight?.newWeight).toBe(70);
    expect(mockedVoiceService.executeCommand).not.toHaveBeenCalled();
  });

  it('commits review drafts and keeps draft available when commit fails', async () => {
    const draft = {
      intent: 'ADD_FOOD' as const,
      rawText: 'ghi 1 banana vao bua sang',
      confidence: 0.84,
      reviewRequired: true,
      mealType: 'breakfast' as const,
      date: '2026-05-16',
      items: [
        {
          clientId: 'item-1',
          heardText: 'banana',
          foodName: 'banana',
          grams: 100,
          selectedCandidate: {
            id: 1,
            source: 'catalog' as const,
            name: 'banana',
            caloriesPer100: 89,
            proteinPer100: 1,
            carbsPer100: 23,
            fatPer100: 0,
            matchScore: 1,
          },
          candidates: [],
          warnings: [],
        },
      ],
      totals: { calories: 89, protein: 1, carbs: 23, fat: 0 },
      warnings: [],
      canSave: true,
    };

    useVoiceStore.setState({
      status: 'review',
      reviewDraft: draft,
      parsedCommand: {
        intent: 'ADD_FOOD',
        entities: { foodName: 'banana' },
        confidence: 0.84,
        rawText: 'ghi 1 banana vao bua sang',
      },
      recognizedText: 'ghi 1 banana vao bua sang',
      error: null,
    });
    mockedVoiceService.commitReview.mockResolvedValue({
      success: false,
      error: 'Không tìm thấy món để lưu.',
    });

    await act(async () => {
      await useVoiceStore.getState().commitReviewDraft();
    });

    const state = useVoiceStore.getState();
    expect(state.status).toBe('error');
    expect(state.reviewDraft).toEqual(draft);
    expect(state.error).toBe('Không tìm thấy món để lưu.');
  });
});
