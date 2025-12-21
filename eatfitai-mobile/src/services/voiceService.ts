/**
 * Voice Service - API client for Voice AI Assistant
 * Uses Ollama AI for intelligent voice command parsing
 */

import axios from 'axios';
import { aiApiClient, getCurrentApiUrl } from './apiClient';
import { API_BASE_URL } from '../config/env';

// AI Provider URL (Flask server with Ollama)
// Lấy dynamic từ apiClient khi cần, không fix cứng lúc khởi động
const getAiProviderUrl = (): string => {
  const currentUrl = getCurrentApiUrl() || API_BASE_URL;
  return currentUrl?.replace(':5247', ':5050') || 'http://10.0.2.2:5050';
};

// Axios client for AI Provider with long timeout for Ollama
// baseURL sẽ được set động mỗi request
const aiProviderClient = axios.create({
  timeout: 30000, // 30s for Ollama processing
});

// Intent types supported
export type VoiceIntent =
  | 'ADD_FOOD'      // Thêm món ăn vào nhật ký
  | 'LOG_WEIGHT'    // Ghi cân nặng
  | 'ASK_CALORIES'  // Hỏi số calories hôm nay
  | 'ASK_NUTRITION' // Hỏi thông tin dinh dưỡng
  | 'UNKNOWN';      // Không hiểu lệnh

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
    date?: string; // ISO date string
    weight?: number;
    // Nhiều món ăn (khi user nói "thêm 100g cơm và 200g gà")
    foods?: FoodItemEntity[];
  };
  confidence: number;
  rawText: string;
  source?: string; // 'ollama' | 'fallback'
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
      // ASK_CALORIES
      totalCalories?: number;
      targetCalories?: number;
      remaining?: number;
      // LOG_WEIGHT
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
 * Voice Service API - Uses Ollama AI for parsing, Whisper for STT
 */
export const voiceService = {
  /**
   * Transcribe audio file to Vietnamese text using Whisper
   * @param audioUri Local URI of recorded audio file
   * @returns Transcribed text
   */
  async transcribeAudio(audioUri: string): Promise<TranscriptionResponse> {
    try {
      const aiProviderUrl = getAiProviderUrl();
      console.log('[VoiceService] Transcribing audio:', audioUri, 'via', aiProviderUrl);

      // Create form data with audio file
      const formData = new FormData();

      // Get file extension
      const ext = audioUri.split('.').pop() || 'm4a';

      // Append file to form data
      formData.append('audio', {
        uri: audioUri,
        type: `audio/${ext}`,
        name: `recording.${ext}`,
      } as any);

      const response = await aiProviderClient.post<TranscriptionResponse>(
        `${aiProviderUrl}/voice/transcribe`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60s for long audio
        }
      );

      console.log('[VoiceService] Whisper response:', response.data);
      return response.data;
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
   * Parse voice text using Ollama AI (via AI Provider)
   * @param text Voice/text input from user
   * @returns Parsed command with intent and entities
   */
  async parseWithOllama(text: string): Promise<ParsedVoiceCommand> {
    try {
      const aiProviderUrl = getAiProviderUrl();
      console.log('[VoiceService] Parsing with Ollama:', text, 'via', aiProviderUrl);

      const response = await aiProviderClient.post(`${aiProviderUrl}/voice/parse`, { text });
      const data = response.data;

      console.log('[VoiceService] Ollama response:', data);

      return {
        intent: data.intent || 'UNKNOWN',
        entities: data.entities || {},
        confidence: data.confidence || 0,
        rawText: data.rawText || text,
        source: data.source || 'ollama',
      };
    } catch (error: any) {
      console.error('[VoiceService] Ollama parse error:', error?.message);

      // Fallback khi Ollama không khả dụng
      return {
        intent: 'UNKNOWN',
        entities: {},
        confidence: 0,
        rawText: text,
        source: 'error',
        suggestedAction: 'Không thể kết nối AI. Vui lòng thử lại.',
      };
    }
  },

  /**
   * Execute parsed command (add food, log weight, etc.) via Backend
   * @param command Parsed voice command
   * @returns Execution result
   */
  async executeCommand(command: ParsedVoiceCommand): Promise<VoiceProcessResponse> {
    try {
      // Map mealType string to enum NAME for Backend
      // Backend uses JsonStringEnumConverter: Breakfast, Lunch, Dinner, Snack
      const mealTypeMapping: Record<string, string> = {
        'breakfast': 'Breakfast', 'sáng': 'Breakfast',
        'lunch': 'Lunch', 'trưa': 'Lunch',
        'dinner': 'Dinner', 'tối': 'Dinner',
        'snack': 'Snack', 'phụ': 'Snack', 'chiều': 'Snack', // Thêm 'chiều' → Snack
      };

      // Transform command for Backend
      const backendCommand = {
        ...command,
        entities: {
          ...command.entities,
          // Convert mealType string to enum name, default to Lunch
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
        error: error?.response?.data?.message || 'Không thể thực hiện lệnh',
      };
    }
  },

  /**
   * Main function: Parse voice text with Ollama AI
   * (Legacy processVoiceText kept for compatibility)
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
   * @param newWeight Weight in kg to save
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
        error: error?.response?.data?.message || 'Không thể lưu cân nặng',
      };
    }
  },
};

export default voiceService;
