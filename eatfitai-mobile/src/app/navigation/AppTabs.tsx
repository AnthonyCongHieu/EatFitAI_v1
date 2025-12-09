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
import StatsNavigator from './StatsNavigator';
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
  const isDark = theme.mode === 'dark';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          // Glassmorphism tab bar với bo góc trên
          backgroundColor: isDark
            ? 'rgba(20, 25, 23, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          height: 75,
          paddingBottom: 12,
          paddingTop: 10,
          // Shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 16,
          elevation: 15,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          marginTop: 2,
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
            <View
              style={
                focused
                  ? [
                      styles.activeIconPill,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]
                  : undefined
              }
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                color={color}
                size={size}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AIScanTab"
        component={AIScanScreen}
        options={{
          title: 'AI Scan',
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={
                focused
                  ? [
                      styles.scanIconActive,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]
                  : undefined
              }
            >
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
        component={StatsNavigator}
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
  activeIconPill: {
    padding: 8,
    borderRadius: 16,
  },
  scanIconActive: {
    padding: 8,
    borderRadius: 12,
  },
});

export default AppTabs;
