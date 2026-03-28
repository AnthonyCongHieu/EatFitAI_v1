/**
 * Voice Service - API client for Voice AI Assistant
 * Uses backend proxy for Whisper and voice parsing
 */

import { aiApiClient, getCurrentApiUrl } from './apiClient';
import { API_BASE_URL, assertBackendApiBaseUrl } from '../config/env';
import { getAccessTokenMem } from './authTokens';
import { tokenStorage } from './secureStore';

const getApiBaseUrl = (): string => {
  const baseUrl = getCurrentApiUrl() ?? API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL before using voice services.',
    );
  }

  return assertBackendApiBaseUrl(baseUrl, 'Voice API base URL');
};

// Intent types supported
export type VoiceIntent =
  | 'ADD_FOOD'
  | 'LOG_WEIGHT'
  | 'ASK_CALORIES'
  | 'ASK_NUTRITION'
  | 'UNKNOWN';

// Meal type mapping
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Single food item for multi-food commands
export interface FoodItemEntity {
  foodName?: string;
  quantity?: number;
  unit?: string;
  weight?: number;
}

// Parsed command from voice input
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
}

// Voice processing response
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

// Meal type to number mapping
export const MEAL_TYPE_MAP: Record<MealType, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
};

/**
 * Transcription response from Whisper
 */
export interface TranscriptionResponse {
  text: string;
  language: string;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Voice Service API - Uses backend proxy for STT and parsing
 */
export const voiceService = {
  /**
   * Transcribe audio file to Vietnamese text via backend proxy
   */
  async transcribeAudio(audioUri: string): Promise<TranscriptionResponse> {
    try {
      const baseUrl = getApiBaseUrl();
      const token = getAccessTokenMem() ?? (await tokenStorage.getAccessToken());
      console.log('[VoiceService] Transcribing audio via backend:', audioUri, 'baseUrl=', baseUrl);

      const formData = new FormData();
      const ext = audioUri.split('.').pop() || 'm4a';

      formData.append('audio', {
        uri: audioUri,
        type: `audio/${ext}`,
        name: `recording.${ext}`,
      } as any);

      const response = await fetch(`${baseUrl}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Voice transcribe failed: ${response.status} ${text}`);
      }

      const data = (await response.json()) as TranscriptionResponse;
      console.log('[VoiceService] Whisper proxy response:', data);
      return data;
    } catch (error: any) {
      console.error('[VoiceService] Transcription error:', error?.message);
      return {
        text: '',
        language: 'vi',
        duration: 0,
        success: false,
        error: error?.message || 'Transcription failed',
      };
    }
  },

  /**
   * Parse voice text using backend proxy to AI provider
   */
  async parseWithOllama(text: string): Promise<ParsedVoiceCommand> {
    try {
      const baseUrl = getApiBaseUrl();
      console.log('[VoiceService] Parsing with backend proxy:', text, 'via', `${baseUrl}/api/voice/parse`);

      const response = await aiApiClient.post(`${baseUrl}/api/voice/parse`, { text, language: 'vi' });
      const data = response.data;

      console.log('[VoiceService] Voice parse proxy response:', data);

      return {
        intent: data.intent || 'UNKNOWN',
        entities: data.entities || {},
        confidence: data.confidence || 0,
        rawText: data.rawText || text,
        source: data.source || 'backend-proxy',
      };
    } catch (error: any) {
      console.error('[VoiceService] Ollama parse error:', error?.message);

      return {
        intent: 'UNKNOWN',
        entities: {},
        confidence: 0,
        rawText: text,
        source: 'error',
        suggestedAction: 'Khong the ket noi AI. Vui long thu lai.',
      };
    }
  },

  /**
   * Execute parsed command (add food, log weight, etc.) via Backend
   */
  async executeCommand(command: ParsedVoiceCommand): Promise<VoiceProcessResponse> {
    try {
      const mealTypeMapping: Record<string, string> = {
        breakfast: 'Breakfast', sang: 'Breakfast',
        lunch: 'Lunch', trua: 'Lunch',
        dinner: 'Dinner', toi: 'Dinner',
        snack: 'Snack', phu: 'Snack', chieu: 'Snack',
      };

      const backendCommand = {
        ...command,
        entities: {
          ...command.entities,
          mealType: mealTypeMapping[command.entities.mealType?.toLowerCase() || ''] || 'Lunch',
        },
      };

      console.log('[VoiceService] Sending to backend:', JSON.stringify(backendCommand));
      const response = await aiApiClient.post<VoiceProcessResponse>('/api/voice/execute', backendCommand);
      return response.data;
    } catch (error: any) {
      console.error('[VoiceService] Execute error:', error);
      return {
        success: false,
        error: error?.response?.data?.message || 'Khong the thuc hien lenh',
      };
    }
  },

  /**
   * Main function: Parse voice text with backend proxy
   */
  async processVoiceText(request: { text: string }): Promise<VoiceProcessResponse> {
    const command = await this.parseWithOllama(request.text);

    return {
      success: command.intent !== 'UNKNOWN',
      command,
    };
  },

  /**
   * Confirm and save weight after user confirmation
   */
  async confirmWeight(newWeight: number): Promise<VoiceProcessResponse> {
    try {
      console.log('[VoiceService] Confirming weight:', newWeight);
      const response = await aiApiClient.post<VoiceProcessResponse>('/api/voice/confirm-weight', { newWeight });
      return response.data;
    } catch (error: any) {
      console.error('[VoiceService] Confirm weight error:', error);
      return {
        success: false,
        error: error?.response?.data?.message || 'Khong the luu can nang',
      };
    }
  },
};

export default voiceService;
