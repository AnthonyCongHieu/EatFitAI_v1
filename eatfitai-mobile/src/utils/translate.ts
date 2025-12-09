// Translation helper for AI-generated content
// Dịch nội dung AI từ tiếng Anh sang tiếng Việt

const TRANSLATIONS: Record<string, string> = {
  // Priority levels
  high: 'cao',
  medium: 'trung bình',
  low: 'thấp',

  // Recommendation types (từ backend NutritionInsightService)
  missing_data: 'THIẾU DỮ LIỆU',
  reduce_calories: 'GIẢM CALO',
  increase_calories: 'TĂNG CALO',
  reduce_protein: 'GIẢM PROTEIN',
  increase_protein: 'TĂNG PROTEIN',
  reduce_carbs: 'GIẢM CARBS',
  increase_carbs: 'TĂNG CARBS',
  reduce_fat: 'GIẢM CHẤT BÉO',
  increase_fat: 'TĂNG CHẤT BÉO',
  improve_adherence: 'CẢI THIỆN TUÂN THỦ',
  improve: 'CẢI THIỆN',

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

// Dịch tên nguyên liệu từ AI detection (lowercase key)
const INGREDIENT_TRANSLATIONS: Record<string, string> = {
  // Thịt
  chicken: 'Thịt gà',
  pork: 'Thịt heo',
  beef: 'Thịt bò',
  meat: 'Thịt',
  bacon: 'Thịt xông khói',
  sausage: 'Xúc xích',
  ham: 'Giăm bông',
  duck: 'Thịt vịt',
  lamb: 'Thịt cừu',

  // Hải sản
  fish: 'Cá',
  shrimp: 'Tôm',
  crab: 'Cua',
  squid: 'Mực',
  salmon: 'Cá hồi',
  tuna: 'Cá ngừ',
  oyster: 'Hàu',
  clam: 'Nghêu',

  // Rau củ
  tomato: 'Cà chua',
  carrot: 'Cà rốt',
  potato: 'Khoai tây',
  onion: 'Hành tây',
  garlic: 'Tỏi',
  cucumber: 'Dưa chuột',
  cabbage: 'Bắp cải',
  lettuce: 'Rau xà lách',
  spinach: 'Rau chân vịt',
  broccoli: 'Bông cải xanh',
  pepper: 'Ớt chuông',
  mushroom: 'Nấm',
  corn: 'Ngô',
  bean: 'Đậu',
  pea: 'Đậu Hà Lan',
  eggplant: 'Cà tím',
  zucchini: 'Bí ngòi',
  pumpkin: 'Bí đỏ',

  // Trái cây
  apple: 'Táo',
  banana: 'Chuối',
  orange: 'Cam',
  mango: 'Xoài',
  grape: 'Nho',
  watermelon: 'Dưa hấu',
  pineapple: 'Dứa',
  strawberry: 'Dâu tây',
  lemon: 'Chanh',
  lime: 'Chanh xanh',
  coconut: 'Dừa',
  papaya: 'Đu đủ',
  avocado: 'Bơ',

  // Thực phẩm khác
  egg: 'Trứng',
  rice: 'Cơm',
  bread: 'Bánh mì',
  noodle: 'Mì',
  pasta: 'Mì Ý',
  tofu: 'Đậu phụ',
  cheese: 'Phô mai',
  milk: 'Sữa',
  butter: 'Bơ',
  oil: 'Dầu ăn',
  sugar: 'Đường',
  salt: 'Muối',
  flour: 'Bột mì',

  // Món ăn
  soup: 'Súp',
  salad: 'Salad',
  sandwich: 'Bánh mì kẹp',
  pizza: 'Pizza',
  burger: 'Hamburger',
  cake: 'Bánh ngọt',
  cookie: 'Bánh quy',
};

/**
 * Translate English text to Vietnamese
 * Uses simple string replacement for common phrases
 * Note: Backend NutritionInsightService đã trả về messages tiếng Việt,
 * function này chủ yếu dịch các keywords/types
 */
export function translateToVietnamese(text: string): string {
  if (!text) return text;

  let translated = text;

  // Replace common phrases
  Object.entries(TRANSLATIONS).forEach(([en, vi]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    translated = translated.replace(regex, vi);
  });

  return translated;
}

/**
 * Translate recommendation type to Vietnamese
 */
export function translateRecommendationType(type: string): string {
  const normalized = type.toLowerCase();
  return (
    TRANSLATIONS[normalized] ||
    TRANSLATIONS[type] ||
    type.replace(/_/g, ' ').toUpperCase()
  );
}

/**
 * Translate priority level to Vietnamese
 */
export function translatePriority(priority: string): string {
  return TRANSLATIONS[priority.toLowerCase()] || priority;
}

/**
 * Translate ingredient name from AI detection to Vietnamese
 * Returns original if no translation found
 */
export function translateIngredient(name: string): string {
  if (!name) return name;
  const normalized = name.toLowerCase().trim();
  return INGREDIENT_TRANSLATIONS[normalized] || name;
}
