import type { AxiosError } from 'axios';

import { API_BASE_URL, assertBackendApiBaseUrl } from '../config/env';
import apiClient, { getCurrentApiUrl } from './apiClient';
import { captureError } from './errorTracking';
import storageService from './storageService';

const getApiBaseUrl = (): string => {
  const baseUrl = getCurrentApiUrl() ?? API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL before using voice services.',
    );
  }

  return assertBackendApiBaseUrl(baseUrl, 'Voice API base URL');
};

const FRIENDLY_ERROR_BY_CODE: Record<string, string> = {
  ai_quota_exceeded: 'Hôm nay bạn dùng hết lượt xử lý giọng nói mất rồi. Để mai tụi mình lại thủ thỉ tiếp nha!',
  invalid_audio_reference: 'File ghi âm chưa hợp lệ rồi. Ghi âm lại giúp mình nha.',
  media_storage_not_configured: 'Tính năng ghi âm đang tạm nghỉ ngơi một xíu. Thử lại sau giúp mình nha!',
  voice_provider_auth_error: 'Tính năng giọng nói đang được bảo trì một tẹo. Bạn thử lại sau nhé!',
  voice_provider_timeout: 'AI giọng nói phản hồi hơi chậm một xíu rồi. Thử lại giúp mình nha.',
  voice_provider_unavailable: 'AI giọng nói của EatFit đang bận một tẹo, bạn thử lại sau nha.',
  voice_provider_error: 'EatFit chưa xử lý được yêu cầu này rồi. Bạn thử lại nha.',
};

const TECHNICAL_ERROR_PATTERN =
  /\b(api|backend|provider|parser|proxy|axios|network error|status code|timeout|undefined|null|exception|stack|500|503|404)\b/i;

const toFriendlyVoiceError = (message: string | undefined, fallback: string): string => {
  const trimmed = message?.trim();
  if (!trimmed) {
    return fallback;
  }

  return TECHNICAL_ERROR_PATTERN.test(trimmed) ? fallback : trimmed;
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<{
    message?: string;
    error?: string;
    detail?: string;
  }>;
  const data = axiosError?.response?.data;

  if (typeof data?.error === 'string' && data.error.trim()) {
    const code = data.error.trim();
    if (FRIENDLY_ERROR_BY_CODE[code]) {
      return FRIENDLY_ERROR_BY_CODE[code];
    }

    return toFriendlyVoiceError(code, fallback);
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return toFriendlyVoiceError(data.message, fallback);
  }

  if (typeof axiosError?.message === 'string' && axiosError.message.trim()) {
    const message = axiosError.message.trim();
    if (
      message === 'Network Error' ||
      message === 'Network request failed' ||
      message === 'Failed to fetch'
    ) {
      return `${fallback} Kiểm tra kết nối mạng và thử lại.`;
    }

    return toFriendlyVoiceError(message, fallback);
  }

  return fallback;
};

export type VoiceIntent =
  | 'ADD_FOOD'
  | 'LOG_WEIGHT'
  | 'ASK_CALORIES'
  | 'ASK_NUTRITION'
  | 'QUERY_MEAL'
  | 'REPEAT_MEAL'
  | 'ADD_NOTE'
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
    sourceDate?: string;
    targetDate?: string;
    dateOffsetDays?: number;
    sourceDateOffsetDays?: number;
    targetDateOffsetDays?: number;
    queryScope?: string;
    queryType?: string;
    nutrient?: string;
    noteText?: string;
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
      entryCount?: number;
      value?: number;
      nutrient?: string;
      noteText?: string;
    };
  };
}

export interface VoiceFoodCandidate {
  id: number;
  source: 'catalog' | 'user' | string;
  name: string;
  caloriesPer100?: number;
  proteinPer100?: number;
  carbPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  matchScore?: number;
}

export interface VoiceReviewItem {
  clientId: string;
  heardText?: string;
  foodName: string;
  grams: number;
  quantity?: number | null;
  unit?: string | null;
  selectedCandidate?: VoiceFoodCandidate | null;
  candidates: VoiceFoodCandidate[];
  warnings: string[];
}

export interface VoiceNutritionTotals {
  calories?: number;
  protein?: number;
  carb?: number;
  carbs?: number;
  fat?: number;
}

export interface VoiceWeightReview {
  currentWeight?: number | null;
  newWeight: number;
  noteText?: string | null;
}

export interface VoiceNoteReview {
  targetKind: 'meal' | 'day' | string;
  noteText: string;
  existingNote?: string | null;
}

export interface VoiceReviewDraft {
  intent: VoiceIntent;
  rawText: string;
  source?: string;
  confidence: number;
  reviewRequired: boolean;
  reviewReason?: string | null;
  mealType?: MealType | string | null;
  date?: string | null;
  sourceDate?: string | null;
  targetDate?: string | null;
  items: VoiceReviewItem[];
  weight?: VoiceWeightReview | null;
  note?: VoiceNoteReview | null;
  totals: VoiceNutritionTotals;
  warnings: string[];
  canSave: boolean;
  blockingReason?: string | null;
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
      // Validate API URL đã được cấu hình
      getApiBaseUrl();

      const fileName = audioUri.split('/').pop() || 'audio.wav';
      const fileType = fileName.endsWith('.m4a')
        ? 'audio/mp4'
        : fileName.endsWith('.mp3')
          ? 'audio/mp3'
          : fileName.endsWith('.ogg')
            ? 'audio/ogg'
            : 'audio/wav';

      // 1. Upload via Presigned URL and keep scoped metadata for backend validation.
      const upload = await storageService.uploadMediaObject(audioUri, fileName, fileType, 'voice');

      // 2. Transcribe using a backend-built media URL from the scoped object key.
      const response = await apiClient.post<TranscriptionResponse>(
        '/api/voice/transcribe',
        {
          ObjectKey: upload.objectKey,
          UploadId: upload.uploadId,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000, // Audio transcription có thể mất lâu hơn
        },
      );

      return response.data;
    } catch (error: unknown) {
      captureError(error, 'voiceService.transcribeAudio', { audioUri });
      return {
        text: '',
        language: 'vi',
        duration: 0,
        success: false,
        error: getApiErrorMessage(
          error,
          'EatFit chưa nghe rõ được giọng nói. Bạn thử nhập tay hoặc nói lại nha!',
        ),
      };
    }
  },

  async parseWithProvider(text: string): Promise<ParsedVoiceCommand> {
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
      captureError(error, 'voiceService.parseWithProvider', {
        textLength: text.length,
      });
      return {
        intent: 'UNKNOWN',
        entities: {},
        confidence: 0,
        rawText: text,
        source: 'error',
        suggestedAction: 'EatFit chưa kết nối được tính năng giọng nói rồi. Thử lại nha bạn.',
        reviewRequired: false,
        reviewReason: getApiErrorMessage(error, 'EatFit chưa hiểu được yêu cầu giọng nói rồi nè.'),
      };
    }
  },

  // parseWithOllama đã xóa — dùng parseWithProvider() trực tiếp

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
      captureError(error, 'voiceService.executeCommand', {
        intent: command.intent,
      });
      return {
        success: false,
        error: getApiErrorMessage(error, 'EatFit chưa thực hiện được yêu cầu này mất rồi.'),
      };
    }
  },

  async reviewCommand(command: ParsedVoiceCommand): Promise<VoiceReviewDraft> {
    const response = await apiClient.post<VoiceReviewDraft>('/api/voice/review', command);
    return response.data;
  },

  async commitReview(draft: VoiceReviewDraft): Promise<VoiceProcessResponse> {
    const response = await apiClient.post<VoiceProcessResponse>('/api/voice/commit', draft);
    return response.data;
  },

  async processVoiceText(request: { text: string }): Promise<VoiceProcessResponse> {
    const command = await this.parseWithProvider(request.text);

    return {
      success: command.intent !== 'UNKNOWN',
      command,
      error:
        command.intent === 'UNKNOWN'
          ? command.reviewReason ||
            'EatFit chưa rõ bạn muốn ghi gì nè. Kể cụ thể món, lượng ăn hoặc cân nặng nhé!'
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
      captureError(error, 'voiceService.confirmWeight', {
        newWeight,
      });
      return {
        success: false,
        error: getApiErrorMessage(error, 'EatFit chưa lưu được số cân mới rồi.'),
      };
    }
  },
};

export default voiceService;
