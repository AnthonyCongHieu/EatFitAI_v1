// Translation helper for AI-generated content
// Dịch nội dung AI từ tiếng Anh sang tiếng Việt

const TRANSLATIONS: Record<string, string> = {
  // Priority levels
  high: 'cao',
  medium: 'trung bình',
  low: 'thấp',

  // Recommendation types (từ backend NutritionInsightService)
  reduce_calories: 'GIẢM CALO',
  increase_calories: 'TĂNG CALO',
  reduce_protein: 'GIẢM PROTEIN',
  increase_protein: 'TĂNG PROTEIN',
  reduce_carbs: 'GIẢM CARBS',
  increase_carbs: 'TĂNG CARBS',
  reduce_fat: 'GIẢM CHẤT BÉO',
  increase_fat: 'TĂNG CHẤT BÉO',
  improve_adherence: 'CẢI THIỆN TUÂN THỦ',

  // Legacy recommendation types
  CALORIE_ADJUSTMENT: 'ĐIỀU CHỈNH CALO',
  PROTEIN_INCREASE: 'TĂNG PROTEIN',
  PROTEIN_DECREASE: 'GIẢM PROTEIN',
  CARB_ADJUSTMENT: 'ĐIỀU CHỈNH CARBS',
  FAT_ADJUSTMENT: 'ĐIỀU CHỈNH CHẤT BÉO',
  MEAL_TIMING: 'THỜI GIAN BỮA ĂN',
  MEAL_FREQUENCY: 'TẦN SUẤT BỮA ĂN',
  NUTRIENT_BALANCE: 'CÂN BẰNG DINH DƯỠNG',

  // Progress trends
  improving: 'đang cải thiện',
  declining: 'đang giảm',
  stable: 'ổn định',
  insufficient_data: 'chưa đủ dữ liệu',

  // Balance quality
  excellent: 'xuất sắc',
  good: 'tốt',
  needs_improvement: 'cần cải thiện',
};

/**
 * Translate English text to Vietnamese
 * Uses simple string replacement for common phrases
 */
export function translateToVietnamese(text: string): string {
  if (!text) return text;

  let translated = text;

  // Replace common phrases
  Object.entries(TRANSLATIONS).forEach(([en, vi]) => {
    const regex = new RegExp(en, 'gi');
    translated = translated.replace(regex, vi);
  });

  return translated;
}

/**
 * Translate recommendation type to Vietnamese
 */
export function translateRecommendationType(type: string): string {
  return TRANSLATIONS[type] || type.replace(/_/g, ' ').toUpperCase();
}

/**
 * Translate priority level to Vietnamese
 */
export function translatePriority(priority: string): string {
  return TRANSLATIONS[priority.toLowerCase()] || priority;
}
