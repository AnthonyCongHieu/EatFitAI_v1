import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import AppTabs from './AppTabs';
import FoodSearchScreen from '../screens/diary/FoodSearchScreen';
import FoodDetailScreen from '../screens/diary/FoodDetailScreen';
import CustomDishScreen from '../screens/diary/CustomDishScreen';
import MealDiaryScreen from '../screens/diary/MealDiaryScreen';
import AIScanScreen from '../screens/ai/AIScanScreen';
import AddMealFromVisionScreen from '../screens/meals/AddMealFromVisionScreen';
import VisionHistoryScreen from '../screens/ai/VisionHistoryScreen';
import RecipeSuggestionsScreen from '../screens/ai/RecipeSuggestionsScreen';
import NutritionInsightsScreen from '../screens/ai/NutritionInsightsScreen';
import RecipeDetailScreen from '../screens/ai/RecipeDetailScreen';
import NutritionSettingsScreen from '../screens/ai/NutritionSettingsScreen';
import AchievementsScreen from '../screens/gamification/AchievementsScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
// Profile screens - má»›i thÃªm
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import BodyMetricsScreen from '../screens/profile/BodyMetricsScreen';
import GoalSettingsScreen from '../screens/profile/GoalSettingsScreen';
import WeightHistoryScreen from '../screens/profile/WeightHistoryScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import AboutScreen from '../screens/profile/AboutScreen';
import PrivacyPolicyScreen from '../screens/profile/PrivacyPolicyScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import DietaryRestrictionsScreen from '../screens/ai/DietaryRestrictionsScreen';
import { t } from '../../i18n/vi';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.ReactElement => {
  const { navigationTheme, theme } = useAppTheme();
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const init = useAuthStore((s) => s.init);

  // Khá»Ÿi táº¡o auth store khi app mount
  useEffect(() => {
    init().catch(() => {
      // bá» qua lá»—i init (vÃ­ dá»¥ chÆ°a cÃ³ token)
    });
  }, [init]);

  return (
    <NavigationContainer theme={navigationTheme}>
      {/* Äiá»u hÆ°á»›ng: náº¿u Ä‘ang init => hiá»ƒn thá»‹ mÃ n hÃ¬nh tráº¯ng Ä‘Æ¡n giáº£n */}
      {isInitializing ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.background,
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            statusBarStyle: theme.statusBarStyle,
          }}
        >
          {!isAuthenticated ? (
            // ChÆ°a Ä‘Äƒng nháº­p: Hiá»ƒn thá»‹ stack Ä‘Äƒng nháº­p/Ä‘Äƒng kÃ½
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: true, title: t('auth.forgotPasswordTitle') }}
              />
            </>
          ) : needsOnboarding ? (
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            </>
          ) : (
            // ÄÃ£ Ä‘Äƒng nháº­p: vÃ o App Tabs
            <>
              <Stack.Screen name="AppTabs" component={AppTabs} />
              <Stack.Screen
                name="FoodSearch"
                component={FoodSearchScreen}
                options={{
                  headerShown: false, // Custom header in screen
                }}
              />
              <Stack.Screen
                name="FoodDetail"
                component={FoodDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CustomDish"
                component={CustomDishScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MealDiary"
                component={MealDiaryScreen}
                options={{
                  headerShown: false,
                  title: 'Nháº­t kÃ½ bá»¯a Äƒn',
                }}
              />
              <Stack.Screen
                name="AiCamera"
                component={AIScanScreen}
                options={{
                  headerShown: false, // AIScanScreen has its own header
                  title: t('navigation.camera'),
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="AddMealFromVision"
                component={AddMealFromVisionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="VisionHistory"
                component={VisionHistoryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RecipeSuggestions"
                component={RecipeSuggestionsScreen}
                options={{
                  headerShown: false,
                  title: 'Gá»£i Ã½ cÃ´ng thá»©c',
                }}
              />
              <Stack.Screen
                name="NutritionInsights"
                component={NutritionInsightsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="NutritionSettings"
                component={NutritionSettingsScreen}
                options={{
                  headerShown: false, // Custom header in screen
                }}
              />
              <Stack.Screen
                name="RecipeDetail"
                component={RecipeDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Achievements"
                component={AchievementsScreen}
                options={{
                  headerShown: false, // ÄÃ£ cÃ³ ScreenHeader custom
                }}
              />
              {/* Profile screens */}
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BodyMetrics"
                component={BodyMetricsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GoalSettings"
                component={GoalSettingsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="WeightHistory"
                component={WeightHistoryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="About"
                component={AboutScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="DietaryRestrictions"
                component={DietaryRestrictionsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="NotificationsSettings"
                component={NotificationsScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
