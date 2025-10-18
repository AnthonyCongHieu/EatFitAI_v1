// Bottom Tabs cho khu vực sau khi đăng nhập
// Chú thích bằng tiếng Việt

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAppTheme } from '../../theme/ThemeProvider';

export type AppTabsParamList = {
  HomeTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

const AppTabs = (): JSX.Element => {
  const { theme } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.card },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
};

export default AppTabs;
