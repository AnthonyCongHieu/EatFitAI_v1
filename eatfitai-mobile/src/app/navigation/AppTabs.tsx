// Bottom Tabs after authentication
// 5 tabs: Home, AI Scan, Voice, Stats, Profile

import type { ComponentType } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '../../theme/ThemeProvider';
import { t } from '../../i18n/vi';

export type AppTabsParamList = {
  HomeTab: undefined;
  AIScanTab: undefined;
  VoiceTab:
    | {
        autoStart?: boolean;
        source?: 'home-hub' | 'sheet-hub' | 'home-fab';
      }
    | undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

const lazyScreen = (
  loader: () => { default: ComponentType<any> },
): (() => ComponentType<any>) => {
  return () => loader().default;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const getHomeScreen = lazyScreen(() => require('../screens/HomeScreen'));
const getAIScanScreen = lazyScreen(() => require('../screens/ai/AIScanScreen'));
const getVoiceScreen = lazyScreen(() => require('../screens/VoiceScreen'));
const getStatsNavigator = lazyScreen(() => require('./StatsNavigator'));
const getProfileScreen = lazyScreen(() => require('../screens/ProfileScreen'));
/* eslint-enable @typescript-eslint/no-require-imports */

// Custom animated tab button
const AnimatedTabButton = ({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  ...rest
}: any): React.ReactElement => {
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

const AppTabs = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: isDark
            ? 'rgba(20, 25, 23, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          height: 75,
          paddingBottom: 12,
          paddingTop: 10,
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
        getComponent={getHomeScreen}
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
        getComponent={getAIScanScreen}
        options={{
          title: t('navigation.camera'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'scan' : 'scan-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="VoiceTab"
        getComponent={getVoiceScreen}
        options={{
          title: t('navigation.voice'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'mic' : 'mic-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        getComponent={getStatsNavigator}
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
        getComponent={getProfileScreen}
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
    padding: 10,
    borderRadius: 14,
  },
  scanIconActive: {
    padding: 10,
    borderRadius: 14,
  },
});

export default AppTabs;

