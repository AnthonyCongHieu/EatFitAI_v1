// Translation helper for AI-generated content
// Dịch nội dung AI từ tiếng Anh sang tiếng Việt

const TRANSLATIONS: Record<string, string> = {
  // Priority levels
  high: 'cao',
  medium: 'trung bình',
  low: 'thấp',

  // Recommendation types
  CALORIE_ADJUSTMENT: 'ĐIỀU CHỈNH CALORIES',
  PROTEIN_INCREASE: 'TĂNG PROTEIN',
  PROTEIN_DECREASE: 'GIẢM PROTEIN',
  CARB_ADJUSTMENT: 'ĐIỀU CHỈNH CARBS',
  FAT_ADJUSTMENT: 'ĐIỀU CHỈNH CHẤT BÉO',
  MEAL_TIMING: 'THỜI GIAN BỮA ĂN',
  MEAL_FREQUENCY: 'TẦN SUẤT BỮA ĂN',
  NUTRIENT_BALANCE: 'CÂN BẰNG DINH DƯỠNG',

  // Common phrases
  "You're consuming": 'Bạn đang tiêu thụ',
  'calories below your target': 'calories thấp hơn mục tiêu',
  'calories above your target': 'calories cao hơn mục tiêu',
  'Consider adding nutrient-dense foods': 'Hãy thêm thực phẩm giàu dinh dưỡng',
  'Consider reducing portion sizes': 'Hãy giảm khẩu phần ăn',
  'Maintaining consistent calorie intake is crucial for achieving your goals':
    'Duy trì lượng calories ổn định rất quan trọng để đạt mục tiêu',

  'Increase protein by': 'Tăng protein thêm',
  'Add lean meats, fish, eggs, or legumes': 'Thêm thịt nạc, cá, trứng hoặc đậu',
  'Adequate protein supports muscle maintenance and satiety':
    'Protein đầy đủ hỗ trợ duy trì cơ bắp và no lâu',

  'Decrease protein by': 'Giảm protein',
  'Reduce portions of high-protein foods': 'Giảm khẩu phần thực phẩm giàu protein',

  'Adjust carbohydrate intake': 'Điều chỉnh lượng carbs',
  'Focus on whole grains and vegetables': 'Tập trung vào ngũ cốc nguyên hạt và rau',
  'Balanced carbs provide sustained energy':
    'Carbs cân bằng cung cấp năng lượng bền vững',

  'Adjust fat intake': 'Điều chỉnh lượng chất béo',
  'Choose healthy fats from nuts, avocados, and olive oil':
    'Chọn chất béo lành mạnh từ hạt, bơ và dầu ô liu',
  'Healthy fats support hormone production and nutrient absorption':
    'Chất béo lành mạnh hỗ trợ sản xuất hormone và hấp thu dinh dưỡng',

  improving: 'đang cải thiện',
  declining: 'đang giảm',
  stable: 'ổn định',
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
