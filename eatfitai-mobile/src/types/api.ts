// API Response Type Definitions
// Auto-generated types for backend API responses

// ============================================
// FOOD SERVICE TYPES
// ============================================

export interface ApiFoodSearchItem {
  id: number | string;
  foodName: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
  source?: 'catalog' | 'user';
  thumbnailUrl?: string | null;
}

export interface ApiUserFoodDetail {
  userFoodItemId?: number | string;
  id?: number | string;
  foodName: string;
  description?: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
  unitType?: string;
  createdAt?: string;
  updatedAt?: string;
  servingSizeGram?: number;
  thumbnailUrl?: string | null;
}

export interface ApiFoodDetail {
  foodId: number;
  foodName: string;
  brand?: string;
  description?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  servingSizeGram?: number;
}

export interface ApiSearchResponse<T> {
  items: T[];
  total: number;
}

// ============================================
// PROFILE SERVICE TYPES
// ============================================

export interface ApiProfileResponse {
  userId: number;
  fullName: string;
  email: string;
  gender?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  activityLevel?: number;
  goalType?: number;
  targetWeight?: number;
  weeklyGoal?: number;
}

export interface ApiUpdateProfileRequest {
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  activityLevel?: number;
  goalType?: number;
  targetWeight?: number;
  weeklyGoal?: number;
}

export interface ApiUpdateBodyMetricsRequest {
  height?: number;
  weight?: number;
  activityLevel?: number;
  goalType?: number;
  targetWeight?: number;
  weeklyGoal?: number;
}

// ============================================
// DIARY SERVICE TYPES
// ============================================

export interface ApiDiaryEntry {
  mealDiaryId: number;
  mealTypeId: number;
  foodId?: number;
  userFoodItemId?: number;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note?: string;
  createdAt: string;
}

export interface ApiDaySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  meals?: {
    [mealTypeId: number]: ApiDiaryEntry[];
  };
}

// ============================================
// AUTH SERVICE TYPES
// ============================================

export interface ApiAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user?: {
    userId: number;
    email: string;
    fullName: string;
  };
}

// ============================================
// HEALTH SERVICE TYPES
// ============================================

export interface ApiHealthCheckResponse {
  status: 'ok' | 'error';
  message?: string;
  timestamp?: string;
}
