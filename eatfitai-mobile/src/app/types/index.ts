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
  FoodSearch: undefined;
  FoodDetail: { foodId: string; source?: 'catalog' | 'user' };
  CustomDish: undefined;
  AiCamera: undefined;
  AddMealFromVision: import('../../types/navigation').AddMealFromVisionParams;
  MealDiary: undefined;
  RecipeSuggestions: {
    ingredients?: string[];
    recipes?: import('../../services/aiService').SuggestedRecipe[];
  };
  RecipeDetail: { recipeId: number; recipeName: string };
  NutritionInsights: undefined;
  VisionHistory: undefined;
  NutritionSettings: undefined;
  Achievements: undefined;
};
