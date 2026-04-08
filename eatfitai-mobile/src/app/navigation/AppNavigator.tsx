import { useEffect, type ComponentType } from 'react';
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
import IntroCarouselScreen from '../screens/auth/IntroCarouselScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
// Profile screens - mới thêm
import { t } from '../../i18n/vi';

const Stack = createNativeStackNavigator<RootStackParamList>();

const lazyScreen = (
  loader: () => { default: ComponentType<any> },
): (() => ComponentType<any>) => {
  return () => loader().default;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const getAppTabs = lazyScreen(() => require('./AppTabs'));
const getFoodSearchScreen = lazyScreen(() => require('../screens/diary/FoodSearchScreen'));
const getFoodDetailScreen = lazyScreen(() => require('../screens/diary/FoodDetailScreen'));
const getCustomDishScreen = lazyScreen(() => require('../screens/diary/CustomDishScreen'));
const getMealDiaryScreen = lazyScreen(() => require('../screens/diary/MealDiaryScreen'));
const getAIScanScreen = lazyScreen(() => require('../screens/ai/AIScanScreen'));
const getAddMealFromVisionScreen = lazyScreen(
  () => require('../screens/meals/AddMealFromVisionScreen'),
);
const getVisionHistoryScreen = lazyScreen(() => require('../screens/ai/VisionHistoryScreen'));
const getRecipeSuggestionsScreen = lazyScreen(
  () => require('../screens/ai/RecipeSuggestionsScreen'),
);
const getNutritionInsightsScreen = lazyScreen(
  () => require('../screens/ai/NutritionInsightsScreen'),
);
const getRecipeDetailScreen = lazyScreen(() => require('../screens/ai/RecipeDetailScreen'));
const getNutritionSettingsScreen = lazyScreen(
  () => require('../screens/ai/NutritionSettingsScreen'),
);
const getAchievementsScreen = lazyScreen(
  () => require('../screens/gamification/AchievementsScreen'),
);
const getEditProfileScreen = lazyScreen(() => require('../screens/profile/EditProfileScreen'));
const getBodyMetricsScreen = lazyScreen(() => require('../screens/profile/BodyMetricsScreen'));
const getGoalSettingsScreen = lazyScreen(() => require('../screens/profile/GoalSettingsScreen'));
const getWeightHistoryScreen = lazyScreen(
  () => require('../screens/profile/WeightHistoryScreen'),
);
const getChangePasswordScreen = lazyScreen(
  () => require('../screens/profile/ChangePasswordScreen'),
);
const getAboutScreen = lazyScreen(() => require('../screens/profile/AboutScreen'));
const getPrivacyPolicyScreen = lazyScreen(
  () => require('../screens/profile/PrivacyPolicyScreen'),
);
const getNotificationsScreen = lazyScreen(
  () => require('../screens/profile/NotificationsScreen'),
);
const getDietaryRestrictionsScreen = lazyScreen(
  () => require('../screens/ai/DietaryRestrictionsScreen'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

const AppNavigator = (): React.ReactElement => {
  const { navigationTheme, theme } = useAppTheme();
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const init = useAuthStore((s) => s.init);
  const isInAuthFlow = !isAuthenticated || needsOnboarding;
  const navigatorKey = isInitializing
    ? 'initializing'
    : isInAuthFlow
      ? 'auth-flow'
      : 'authenticated';
  const initialRouteName: keyof RootStackParamList = isInAuthFlow
    ? needsOnboarding
      ? 'Onboarding'
      : 'IntroCarousel'
    : 'AppTabs';

  // Khởi tạo auth store khi app mount
  useEffect(() => {
    init().catch(() => {
      // bỏ qua lỗi init (ví dụ chưa có token)
    });
  }, [init]);

  return (
    <NavigationContainer key={navigatorKey} theme={navigationTheme}>
      {/* Điều hướng: nếu đang init thì hiển thị màn hình trắng đơn giản */}
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
          key={navigatorKey}
          initialRouteName={initialRouteName}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          {isInAuthFlow ? (
            // Chưa đăng nhập: hiển thị stack đăng nhập/đăng ký
            <Stack.Group navigationKey="auth-flow">
              <Stack.Screen name="IntroCarousel" component={IntroCarouselScreen} />
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>
          ) : (
            // Đã đăng nhập: vào App Tabs
            <Stack.Group navigationKey="authenticated">
              <Stack.Screen name="AppTabs" getComponent={getAppTabs} />
              <Stack.Screen
                name="FoodSearch"
                getComponent={getFoodSearchScreen}
                options={{
                  headerShown: false, // Custom header in screen
                }}
              />
              <Stack.Screen
                name="FoodDetail"
                getComponent={getFoodDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CustomDish"
                getComponent={getCustomDishScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MealDiary"
                getComponent={getMealDiaryScreen}
                options={{
                  headerShown: false,
                  title: 'Nhật ký bữa ăn',
                }}
              />
              <Stack.Screen
                name="AiCamera"
                getComponent={getAIScanScreen}
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
                getComponent={getAddMealFromVisionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="VisionHistory"
                getComponent={getVisionHistoryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RecipeSuggestions"
                getComponent={getRecipeSuggestionsScreen}
                options={{
                  headerShown: false,
                  title: 'Gợi ý công thức',
                }}
              />
              <Stack.Screen
                name="NutritionInsights"
                getComponent={getNutritionInsightsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="NutritionSettings"
                getComponent={getNutritionSettingsScreen}
                options={{
                  headerShown: false, // Custom header in screen
                }}
              />
              <Stack.Screen
                name="RecipeDetail"
                getComponent={getRecipeDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Achievements"
                getComponent={getAchievementsScreen}
                options={{
                  headerShown: false, // Đã có ScreenHeader custom
                }}
              />
              {/* Profile screens */}
              <Stack.Screen
                name="EditProfile"
                getComponent={getEditProfileScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BodyMetrics"
                getComponent={getBodyMetricsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GoalSettings"
                getComponent={getGoalSettingsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="WeightHistory"
                getComponent={getWeightHistoryScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ChangePassword"
                getComponent={getChangePasswordScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="About"
                getComponent={getAboutScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                getComponent={getPrivacyPolicyScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="DietaryRestrictions"
                getComponent={getDietaryRestrictionsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="NotificationsSettings"
                getComponent={getNotificationsScreen}
                options={{ headerShown: false }}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
