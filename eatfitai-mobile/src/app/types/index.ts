// Khai bÃ¡o cÃ¡c screen cá»§a Stack gá»‘c
// - Login, Register: mÃ n hÃ¬nh xÃ¡c thá»±c
// - AppTabs: nhÃ³m Tab chÃ­nh sau khi Ä‘Äƒng nháº­p
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; verificationCode?: string }; // verificationCode chá»‰ dÃ¹ng cho dev mode
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
  // Profile screens - má»›i thÃªm
  EditProfile: undefined;
  BodyMetrics: undefined;
  GoalSettings: undefined;
  WeightHistory: undefined;
  ChangePassword: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  NotificationsSettings: undefined;
  DietaryRestrictions: undefined;
};

export interface UserPreference {
  dietaryRestrictions: string[];
  allergies: string[];
  preferredMealsPerDay: number;
  preferredCuisine: string | null;
}
