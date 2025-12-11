/**
 * Voice Service - API client for Voice AI Assistant
 * Handles speech-to-text and intent parsing
 */

import api from './api';

// Intent types supported
export type VoiceIntent =
  | 'ADD_FOOD' // Thêm món ăn vào nhật ký
  | 'LOG_WEIGHT' // Ghi cân nặng
  | 'ASK_CALORIES' // Hỏi số calories hôm nay
  | 'ASK_NUTRITION' // Hỏi thông tin dinh dưỡng
  | 'UNKNOWN'; // Không hiểu lệnh

// Meal type mapping
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

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
  };
  confidence: number;
  rawText: string;
  suggestedAction?: string;
}

// Voice processing request
export interface VoiceProcessRequest {
  text: string;
  language?: string; // 'vi' | 'en'
}

// Voice processing response
export interface VoiceProcessResponse {
  success: boolean;
  command?: ParsedVoiceCommand;
  error?: string;
  executedAction?: {
    type: string;
    details: string;
  };
}

// Meal type to number mapping
export const MEAL_TYPE_MAP: Record<MealType, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
};

// Vietnamese meal keywords
export const MEAL_KEYWORDS: Record<string, MealType> = {
  sáng: 'breakfast',
  'bữa sáng': 'breakfast',
  'ăn sáng': 'breakfast',
  trưa: 'lunch',
  'bữa trưa': 'lunch',
  'ăn trưa': 'lunch',
  tối: 'dinner',
  'bữa tối': 'dinner',
  'ăn tối': 'dinner',
  chiều: 'snack',
  'bữa phụ': 'snack',
  'ăn vặt': 'snack',
};

/**
 * Voice Service API
 */
export const voiceService = {
  /**
   * Process voice text and parse intent
   * @param request Voice processing request with text
   * @returns Parsed command with intent and entities
   */
  async processVoiceText(request: VoiceProcessRequest): Promise<VoiceProcessResponse> {
    try {
      const response = await api.post<VoiceProcessResponse>('/voice/process', request);
      return response.data;
    } catch (error: any) {
      console.error('[VoiceService] Process error:', error);
      return {
        success: false,
        error: error?.response?.data?.message || 'Không thể xử lý lệnh giọng nói',
      };
    }
  },

  /**
   * Execute parsed command (add food, log weight, etc.)
   * @param command Parsed voice command
   * @returns Execution result
   */
  async executeCommand(command: ParsedVoiceCommand): Promise<VoiceProcessResponse> {
    try {
      const response = await api.post<VoiceProcessResponse>('/voice/execute', command);
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
   * Local intent parsing (fallback when offline)
   * Basic NLU without AI - just pattern matching
   */
  parseLocalIntent(text: string): ParsedVoiceCommand {
    const lowerText = text.toLowerCase().trim();

    // Default command
    const command: ParsedVoiceCommand = {
      intent: 'UNKNOWN',
      entities: {},
      confidence: 0,
      rawText: text,
    };

    // Pattern: "ghi X vào bữa Y" hoặc "thêm X vào bữa Y"
    const addFoodPattern =
      /(?:ghi|thêm|ăn|log)\s+(.+?)\s+(?:vào\s+)?(?:bữa\s+)?(sáng|trưa|tối|chiều)/i;
    const addFoodMatch = lowerText.match(addFoodPattern);

    if (addFoodMatch) {
      command.intent = 'ADD_FOOD';
      command.confidence = 0.8;

      // Parse food name and quantity
      const foodPart = addFoodMatch[1] || '';
      const mealPart = addFoodMatch[2] || '';

      // Extract quantity (e.g., "1 bát phở" → qty: 1, food: "bát phở")
      const qtyMatch = foodPart.match(/^(\d+)\s*(.+)/);
      if (qtyMatch) {
        command.entities.quantity = parseInt(qtyMatch[1], 10);
        command.entities.foodName = qtyMatch[2]?.trim();
      } else {
        command.entities.quantity = 1;
        command.entities.foodName = foodPart.trim();
      }

      // Map meal type
      command.entities.mealType = MEAL_KEYWORDS[mealPart] || 'lunch';
      command.entities.date = new Date().toISOString().split('T')[0];

      return command;
    }

    // Pattern: "cân nặng X kg/ký"
    const weightPattern = /(?:cân nặng|cân)\s+(?:là\s+)?(\d+(?:\.\d+)?)\s*(?:kg|ký|kí)?/i;
    const weightMatch = lowerText.match(weightPattern);

    if (weightMatch) {
      command.intent = 'LOG_WEIGHT';
      command.entities.weight = parseFloat(weightMatch[1]);
      command.confidence = 0.9;
      command.entities.date = new Date().toISOString().split('T')[0];
      return command;
    }

    // Pattern: "bao nhiêu calo" or "calories"
    const caloriesPattern = /(?:bao nhiêu|tổng)\s*(?:calo|calories|kcal)/i;
    if (caloriesPattern.test(lowerText)) {
      command.intent = 'ASK_CALORIES';
      command.confidence = 0.85;
      command.entities.date = new Date().toISOString().split('T')[0];
      return command;
    }

    return command;
  },
};

export default voiceService;
