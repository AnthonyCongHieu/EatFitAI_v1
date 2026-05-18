import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AppTabsParamList } from '../navigation/AppTabs';

export type RootStackParamList = {
  IntroCarousel: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; verificationCode?: string };
  ForgotPassword: undefined;
  Onboarding: { initialStep?: number } | undefined;
  AppTabs: NavigatorScreenParams<AppTabsParamList> | undefined;
  FoodSearch:
    | {
        initialTab?: 'search' | 'favorites';
        autoFocus?: boolean;
        showQuickSuggestions?: boolean;
        selectedDate?: string;
        returnToDiaryOnSave?: boolean;
        initialQuery?: string;
        defaultMealType?: number;
      }
    | undefined;
  FoodDetail: {
    foodId: string;
    source?: 'catalog' | 'user';
    selectedDate?: string;
    returnToDiaryOnSave?: boolean;
    defaultMealType?: number;
    diaryEntryId?: string;
    currentGrams?: number;
  };
  CustomDish: undefined;
  CommonMeals: undefined;
  CommonMealTemplate: { templateId?: string } | undefined;
  AiCamera: undefined;
  AddMealFromVision: import('../../types/navigation').AddMealFromVisionParams;
  MealDiary: { selectedDate?: string } | undefined;
  RecipeSuggestions: {
    ingredients?: string[];
    availableFoodItemIds?: number[];
    ingredientHints?: import('../../types/aiEnhanced').RecipeIngredientHint[];
    mode?: 'auto' | 'ingredient_combo' | 'daily_recommendation';
    recipes?: import('../../services/aiService').SuggestedRecipe[];
  };
  RecipeDetail: {
    recipeId: number;
    recipeName: string;
    defaultMealType?: number;
    diaryEntryId?: string;
    currentGrams?: number;
    availableIngredients?: string[];
    missingIngredients?: string[];
    prepItems?: string[];
  };
  NutritionInsights: undefined;
  VisionHistory: undefined;
  NutritionSettings: undefined;
  Achievements: undefined;
  AllAchievements: undefined;
  EditProfile: undefined;
  BodyMetrics: undefined;
  GoalSettings: undefined;
  WeightHistory: undefined;
  ChangePassword: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  NotificationCenter: undefined;
  NotificationsSettings: undefined;
  DietaryRestrictions: undefined;
  BasicInfo: undefined;
  MoChiPoseGallery: undefined;
};

export interface UserPreference {
  dietaryRestrictions: string[];
  allergies: string[];
  preferredMealsPerDay: number;
  preferredCuisine: string | null;
  timeZoneId?: string;
}
