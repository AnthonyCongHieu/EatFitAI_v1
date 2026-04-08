import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AppTabsParamList } from '../navigation/AppTabs';

export type RootStackParamList = {
  IntroCarousel: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; verificationCode?: string };
  ForgotPassword: undefined;
  Onboarding: undefined;
  AppTabs: NavigatorScreenParams<AppTabsParamList> | undefined;
  FoodSearch:
    | {
        initialTab?: 'search' | 'favorites';
        autoFocus?: boolean;
        showQuickSuggestions?: boolean;
      }
    | undefined;
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
