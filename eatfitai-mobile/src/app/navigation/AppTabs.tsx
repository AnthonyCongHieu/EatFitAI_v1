// Bottom Tabs after authentication
// Simplified from 6 tabs to 4 tabs for better UX

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Pressable, View, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import AIScanScreen from '../screens/ai/AIScanScreen';
import WeekStatsScreen from '../screens/stats/WeekStatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAppTheme } from '../../theme/ThemeProvider';
import { t } from '../../i18n/vi';

export type AppTabsParamList = {
  HomeTab: undefined;
  AIScanTab: undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

// Custom animated tab button with proper typing for react-navigation
const AnimatedTabButton = ({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  ...rest
}: any): JSX.Element => {
  const scale = useSharedValue(1);
  const isSelected = accessibilityState?.selected ?? false;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      {...rest}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
};

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
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          ...theme.shadows.md,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          marginTop: 4,
        },
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AIScanTab"
        component={AIScanScreen}
        options={{
          title: 'AI Scan',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? [styles.scanIconActive, { backgroundColor: theme.colors.primary + '20' }] : undefined}>
              <Ionicons
                name={focused ? 'scan' : 'scan-outline'}
                color={color}
                size={size + 2}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={WeekStatsScreen}
        options={{
          title: t('navigation.stats'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconActive: {
    padding: 8,
    borderRadius: 12,
  },
});

export default AppTabs;

