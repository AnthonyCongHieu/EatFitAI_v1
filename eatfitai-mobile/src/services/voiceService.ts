import type { AxiosError } from 'axios';

import { API_BASE_URL, assertBackendApiBaseUrl } from '../config/env';
import apiClient, { fetchWithAuthRetry, getCurrentApiUrl } from './apiClient';

const getApiBaseUrl = (): string => {
  const baseUrl = getCurrentApiUrl() ?? API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL before using voice services.',
    );
  }

  return assertBackendApiBaseUrl(baseUrl, 'Voice API base URL');
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<{
    message?: string;
    error?: string;
    detail?: string;
  }>;
  const data = axiosError?.response?.data;

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    switch (data.error) {
      case 'voice_provider_timeout':
        return 'AI giọng nói phản hồi quá chậm. Vui lòng thử lại.';
      case 'voice_provider_unavailable':
        return 'AI giọng nói hiện không khả dụng. Vui lòng thử lại.';
      case 'voice_provider_error':
        return 'AI giọng nói gặp lỗi khi xử lý yêu cầu.';
      default:
        return data.error;
    }
  }

  if (typeof axiosError?.message === 'string' && axiosError.message.trim()) {
    const message = axiosError.message.trim();
    if (
      message === 'Network Error' ||
      message === 'Network request failed' ||
      message === 'Failed to fetch'
    ) {
      return `${fallback} Kiểm tra kết nối tới backend và thử lại.`;
    }

    return message;
  }

  return fallback;
};

export type VoiceIntent =
  | 'ADD_FOOD'
  | 'LOG_WEIGHT'
  | 'ASK_CALORIES'
  | 'ASK_NUTRITION'
  | 'UNKNOWN';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItemEntity {
  foodName?: string;
  quantity?: number;
  unit?: string;
  weight?: number;
}

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  entities: {
    foodName?: string;
    quantity?: number;
    unit?: string;
    mealType?: MealType;
    date?: string;
    weight?: number;
    foods?: FoodItemEntity[];
  };
  confidence: number;
  rawText: string;
  source?: string;
  suggestedAction?: string;
  reviewRequired?: boolean;
  reviewReason?: string;
}

export interface VoiceProcessResponse {
  success: boolean;
  command?: ParsedVoiceCommand;
  error?: string;
  executedAction?: {
    type: string;
    details: string;
    data?: {
      totalCalories?: number;
      targetCalories?: number;
      remaining?: number;
      currentWeight?: number;
      newWeight?: number;
      requireConfirm?: boolean;
      savedWeight?: number;
    };
  };
}

export const MEAL_TYPE_MAP: Record<MealType, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
};

export interface TranscriptionResponse {
  text: string;
  language: string;
  duration: number;
  success: boolean;
  error?: string;
}

export const voiceService = {
  async transcribeAudio(audioUri: string): Promise<TranscriptionResponse> {
    try {
      const baseUrl = getApiBaseUrl();

      const ext = audioUri.split('.').pop() || 'm4a';
      const response = await fetchWithAuthRetry(
        `${baseUrl}/api/voice/transcribe`,
        () => {
          const formData = new FormData();
          formData.append('audio', {
            uri: audioUri,
            type: `audio/${ext}`,
            name: `recording.${ext}`,
          } as any);

          return {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'application/json',
            },
          };
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Voice transcribe failed: ${response.status} ${text}`);
      }

      return (await response.json()) as TranscriptionResponse;
    } catch (error: unknown) {
      return {
        text: '',
        language: 'vi',
        duration: 0,
        success: false,
        error: getApiErrorMessage(error, 'Không thể chuyển giọng nói thành văn bản.'),
      };
    }
  },

  async parseWithOllama(text: string): Promise<ParsedVoiceCommand> {
    try {
      getApiBaseUrl();
      const response = await apiClient.post('/api/voice/parse', {
        text,
        language: 'vi',
      });
      const data = response.data;

      return {
        intent: data.intent || 'UNKNOWN',
        entities: data.entities || {},
        confidence: data.confidence || 0,
        rawText: data.rawText || text,
        source: data.source || 'backend-proxy',
        suggestedAction: data.suggestedAction,
        reviewRequired: Boolean(data.reviewRequired),
        reviewReason: data.reviewReason,
      };
    } catch (error: unknown) {
      return {
        intent: 'UNKNOWN',
        entities: {},
        confidence: 0,
        rawText: text,
        source: 'error',
        suggestedAction: 'Không thể kết nối AI giọng nói. Vui lòng thử lại.',
        reviewRequired: false,
        reviewReason: getApiErrorMessage(error, 'Không thể phân tích lệnh giọng nói.'),
      };
    }
  },

  async executeCommand(command: ParsedVoiceCommand): Promise<VoiceProcessResponse> {
    try {
      const mealTypeMapping: Record<string, string> = {
        breakfast: 'Breakfast',
        sang: 'Breakfast',
        lunch: 'Lunch',
        trua: 'Lunch',
        dinner: 'Dinner',
        toi: 'Dinner',
        snack: 'Snack',
        phu: 'Snack',
        chieu: 'Snack',
      };

      const backendCommand = {
        ...command,
        entities: {
          ...command.entities,
          mealType:
            mealTypeMapping[command.entities.mealType?.toLowerCase() || ''] || 'Lunch',
        },
      };

      const response = await apiClient.post<VoiceProcessResponse>(
        '/api/voice/execute',
        backendCommand,
      );
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'Không thể thực hiện lệnh giọng nói.'),
      };
    }
  },

  async processVoiceText(request: { text: string }): Promise<VoiceProcessResponse> {
    const command = await this.parseWithOllama(request.text);

    return {
      success: command.intent !== 'UNKNOWN',
      command,
      error:
        command.intent === 'UNKNOWN'
          ? command.reviewReason || 'Không hiểu lệnh. Hãy thử lại.'
          : undefined,
    };
  },

  async confirmWeight(newWeight: number): Promise<VoiceProcessResponse> {
    try {
      const response = await apiClient.post<VoiceProcessResponse>(
        '/api/voice/confirm-weight',
        {
          newWeight,
        },
      );
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'Không thể lưu cân nặng.'),
      };
    }
  },
};

export default voiceService;
