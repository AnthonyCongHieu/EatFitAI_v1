import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AppTabs from './AppTabs';
import FoodSearchScreen from '../screens/diary/FoodSearchScreen';
import FoodDetailScreen from '../screens/diary/FoodDetailScreen';
import CustomDishScreen from '../screens/diary/CustomDishScreen';
import MealDiaryScreen from '../screens/diary/MealDiaryScreen';
import AiCameraScreen from '../screens/ai/AiCameraScreen';
import AiNutritionScreen from '../screens/ai/AiNutritionScreen';
import NutritionSuggestScreen from '../screens/ai/NutritionSuggestScreen';
import AddMealFromVisionScreen from '../screens/meals/AddMealFromVisionScreen';
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
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
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
                component={AiCameraScreen}
                options={{
                  headerShown: true,
                  title: t('navigation.camera'),
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="AiNutrition"
                component={AiNutritionScreen}
                options={{
                  headerShown: true,
                  title: t('navigation.aiNutrition'),
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                }}
              />
              <Stack.Screen
                name="NutritionSuggest"
                component={NutritionSuggestScreen}
                options={{
                  headerShown: true,
                  title: t('navigation.aiNutrition'),
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
                  title: 'Them tu AI Vision',
                  headerStyle: { backgroundColor: theme.colors.card },
                  headerTintColor: theme.colors.text,
                  headerShadowVisible: false,
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
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
