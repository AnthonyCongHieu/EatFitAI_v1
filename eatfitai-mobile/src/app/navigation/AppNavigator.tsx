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
        <Stack.Navigator screenOptions={{ headerShown: false }}>
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
                options={{ headerShown: true, title: 'Tim mon' }}
              />
              <Stack.Screen
                name="FoodDetail"
                component={FoodDetailScreen}
                options={{ headerShown: true, title: 'Chi tiet mon' }}
              />
              <Stack.Screen
                name="CustomDish"
                component={CustomDishScreen}
                options={{ headerShown: true, title: 'Mon thu cong' }}
              />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
