// Khai báo các screen của Stack gốc
// - Login, Register: màn hình xác thực
// - AppTabs: nhóm Tab chính sau khi đăng nhập
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; verificationCode?: string }; // verificationCode chỉ dùng cho dev mode
  ForgotPassword: undefined;
  Onboarding: undefined;
  AppTabs: undefined;
  FoodSearch: { initialTab?: 'search' | 'favorites' } | undefined;
  FoodDetail: { foodId: string; source?: 'catalog' | 'user' };
  CustomDish: undefined;
  AiCamera: undefined;
  AddMealFromVision: import('../../types/navigation').AddMealFromVisionParams;
  MealDiary: { selectedDate?: string } | undefined;
  RecipeSuggestions: {
    ingredients?: string[];
    recipes?: import('../../services/aiService').SuggestedRecipe[];
  };
  RecipeDetail: { recipeId: number; recipeName: string };
  NutritionInsights: undefined;
  VisionHistory: undefined;
  NutritionSettings: undefined;
  Achievements: undefined;
  // Profile screens - mới thêm
  EditProfile: undefined;
  BodyMetrics: undefined;
  GoalSettings: undefined;
  WeightHistory: undefined;
  ChangePassword: undefined;
  About: undefined;
  NotificationsSettings: undefined;
  DietaryRestrictions: undefined;
};

export interface UserPreference {
  dietaryRestrictions: string[];
  allergies: string[];
  preferredMealsPerDay: number;
  preferredCuisine: string | null;
}

