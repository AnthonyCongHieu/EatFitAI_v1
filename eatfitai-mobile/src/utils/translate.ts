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

const AI_VISION_LABEL_TRANSLATIONS: Record<string, string> = {
  banh_mi: 'Bánh mì',
  pho: 'Phở',
  bun: 'Bún',
  bot_chien: 'Bột chiên',
  goi_cuon: 'Gỏi cuốn',
  fried_rice: 'Cơm chiên',
  com_tam: 'Cơm tấm',
  thit_kho: 'Thịt kho',
  ca_kho: 'Cá kho',
  canh: 'Canh',
  banh_beo: 'Bánh bèo',
  banh_bo: 'Bánh bò',
  banh_bot_loc: 'Bánh bột lọc',
  banh_can: 'Bánh căn',
  banh_canh: 'Bánh canh',
  banh_chung: 'Bánh chưng',
  banh_cong: 'Bánh cống',
  banh_cuon: 'Bánh cuốn',
  banh_da_lon: 'Bánh da lợn',
  banh_duc: 'Bánh đúc',
  banh_khot: 'Bánh khọt',
  banh_tet: 'Bánh tét',
  banh_xeo: 'Bánh xèo',
  banh_trang: 'Bánh tráng',
  banh_trang_tron: 'Bánh tráng trộn',
  bo_kho: 'Bò kho',
  bo_la_lot: 'Bò lá lốt',
  bun_bo_hue: 'Bún bò Huế',
  bun_cha: 'Bún chả',
  bun_dau: 'Bún đậu',
  bun_mam: 'Bún mắm',
  bun_rieu: 'Bún riêu',
  cha_gio: 'Chả giò',
  hu_tieu: 'Hủ tiếu',
  lau: 'Lẩu',
  mi_quang: 'Mì Quảng',
  cao_lau: 'Cao lầu',
  xoi: 'Xôi',
  chao_long: 'Cháo lòng',
  sup_cua: 'Súp cua',
  bitter_melon_soup: 'Canh khổ qua',
  caramelized_fish_clay_pot: 'Cá kho tộ',
  chicken_rice: 'Cơm gà',
  pumpkin_soup: 'Canh bí đỏ',
  purple_yam_soup: 'Canh khoai mỡ',
  steamed_pork_belly_taro: 'Thịt ba chỉ hấp khoai môn',
  sizzling_beef_steak: 'Bò bít tết',
  hollow_fried_sesame_donut: 'Bánh tiêu',
  nuoc_cham: 'Nước chấm',
  rice: 'Cơm trắng',
  noodles: 'Mì/bún/phở',
  chicken: 'Thịt gà',
  beef: 'Thịt bò',
  pork: 'Thịt heo',
  pork_belly: 'Thịt ba chỉ',
  pork_rib: 'Sườn heo',
  grilled_pork_belly: 'Thịt ba chỉ nướng',
  fish: 'Cá',
  shrimp: 'Tôm',
  crab: 'Cua',
  squid: 'Mực',
  egg: 'Trứng',
  fried_egg: 'Trứng chiên',
  tofu: 'Đậu hũ',
  tempeh: 'Tempeh',
  tomato: 'Cà chua',
  cucumber: 'Dưa leo',
  carrot: 'Cà rốt',
  potato: 'Khoai tây',
  sweet_potato: 'Khoai lang',
  spinach: 'Rau chân vịt',
  water_spinach: 'Rau muống',
  bokchoy: 'Cải thìa',
  cabbage: 'Bắp cải',
  cauliflower: 'Bông cải trắng',
  broccoli: 'Bông cải xanh',
  eggplant: 'Cà tím',
  bitter_gourd: 'Khổ qua',
  bottle_gourd: 'Bầu',
  pumpkin: 'Bí đỏ',
  radish: 'Củ cải trắng',
  long_beans: 'Đậu đũa',
  beans: 'Đậu',
  peas: 'Đậu Hà Lan',
  mushroom: 'Nấm',
  chayote: 'Su su',
  corn: 'Bắp',
  onion: 'Hành tây',
  shallot: 'Hành tím',
  green_onion: 'Hành lá',
  garlic: 'Tỏi',
  chili: 'Ớt',
  ginger: 'Gừng',
  galangal: 'Riềng',
  lemongrass: 'Sả',
  leek: 'Tỏi tây',
  lime_leaf: 'Lá chanh',
  coriander_seed: 'Hạt ngò',
  fennel_seed: 'Hạt thì là',
  star_anise: 'Hoa hồi',
  cinnamon: 'Quế',
  clove: 'Đinh hương',
  turmeric: 'Nghệ',
  bell_pepper: 'Ớt chuông',
  lime: 'Chanh',
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
  return AI_VISION_LABEL_TRANSLATIONS[normalized] || INGREDIENT_TRANSLATIONS[normalized] || name;
}

export function getVisionFoodDisplayName(item: {
  foodName?: string | null;
  detectedLabelVi?: string | null;
  label?: string | null;
}): string {
  const foodName = item.foodName?.trim();
  if (foodName) return foodName;

  const detectedLabelVi = item.detectedLabelVi?.trim();
  if (detectedLabelVi) return detectedLabelVi;

  return translateIngredient(String(item.label ?? 'Món ăn'));
}
