// Bottom Tabs after authentication

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import FoodSearchScreen from '../screens/diary/FoodSearchScreen';
import AiCameraScreen from '../screens/ai/AiCameraScreen';
import AiNutritionScreen from '../screens/ai/AiNutritionScreen';
import AiVisionScreen from '../screens/ai/AiVisionScreen';
import WeekStatsScreen from '../screens/stats/WeekStatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAppTheme } from '../../theme/ThemeProvider';
import { t } from '../../i18n/vi';

export type AppTabsParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CameraTab: undefined;
  AITab: undefined;
  AiVisionTab: undefined;
  StatsTab: undefined;
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
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: 'transparent',
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={FoodSearchScreen}
        options={{
          title: t('navigation.search'),
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CameraTab"
        component={AiCameraScreen}
        options={{
          title: t('navigation.camera'),
          tabBarIcon: ({ color, size }) => <Ionicons name="camera" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AITab"
        component={AiNutritionScreen}
        options={{
          title: t('navigation.ai'),
          tabBarIcon: ({ color, size }) => <Ionicons name="bulb" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AiVisionTab"
        component={AiVisionScreen}
        options={{
          title: 'AI Vision (test)',
          tabBarIcon: ({ color, size }) => <Ionicons name="image" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={WeekStatsScreen}
        options={{
          title: t('navigation.stats'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;

