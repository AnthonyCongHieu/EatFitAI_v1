import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import { t } from '../../i18n/vi';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): JSX.Element => {
  const { navigationTheme, theme } = useAppTheme();
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const init = useAuthStore((s) => s.init);

  // Khởi tạo auth store khi app mount
  useEffect(() => {
    init().catch(() => {
      // bỏ qua lỗi init (ví dụ chưa có token)
    });
  }, [init]);

  return (
    <NavigationContainer theme={navigationTheme}>
      {/* Điều hướng: nếu đang init => hiển thị màn hình trắng đơn giản */}
      {isInitializing ? (
        <></>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            statusBarStyle: theme.statusBarStyle,
          }}
        >
          {!isAuthenticated ? (
            // Chưa đăng nhập: Hiển thị stack đăng nhập/đăng ký
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: true, title: t('auth.forgotPasswordTitle') }}
              />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            </>
          ) : (
            // Đã đăng nhập: vào App Tabs
            <>
              <Stack.Screen name="AppTabs" component={AppTabs} />
              <Stack.Screen
                name="FoodSearch"
                component={FoodSearchScreen}
                options={{
                  headerShown: true,
                  title: t('navigation.foodSearch'),
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="FoodDetail"
                component={FoodDetailScreen}
                options={{
                  headerShown: true,
                  title: t('navigation.foodDetail'),
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="CustomDish"
                component={CustomDishScreen}
                options={{
                  headerShown: true,
                  title: t('navigation.customDish'),
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="MealDiary"
                component={MealDiaryScreen}
                options={{
                  headerShown: true,
                  title: 'Nhật ký bữa ăn',
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
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
                options={{
                  headerShown: true,
                  title: 'Thêm từ AI Vision',
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="VisionHistory"
                component={VisionHistoryScreen}
                options={{
                  headerShown: true,
                  title: 'Lịch sử nhận diện',
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="RecipeSuggestions"
                component={RecipeSuggestionsScreen}
                options={{
                  headerShown: true,
                  title: 'Gợi ý công thức',
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="NutritionInsights"
                component={NutritionInsightsScreen}
                options={{
                  headerShown: true,
                  title: 'Phân tích dinh dưỡng',
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
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
                options={{
                  headerShown: true,
                  title: 'Chi tiết công thức',
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="Achievements"
                component={AchievementsScreen}
                options={{
                  headerShown: false, // Đã có ScreenHeader custom
                }}
              />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
