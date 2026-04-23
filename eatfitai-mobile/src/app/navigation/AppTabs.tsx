// Bottom Tabs after authentication
// 5 tabs: Home, AI Scan, Voice, Stats, Profile
// Uses CustomTabBar for Emerald Nebula design

import type { ComponentType } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CustomTabBar from '../../components/navigation/CustomTabBar';

export type AppTabsParamList = {
  HomeTab: undefined;
  AIScanTab: undefined;
  VoiceTab:
    | {
        autoStart?: boolean;
        source?: 'home-hub' | 'sheet-hub' | 'home-fab';
      }
    | undefined;
  StatsTab:
    | {
        source?: 'weekly-review';
        focusWeeklyReview?: boolean;
      }
    | undefined;
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

const AppTabs = (): React.ReactElement => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
        },
      }}
    >
      <Tab.Screen name="HomeTab" getComponent={getHomeScreen} />
      <Tab.Screen name="AIScanTab" getComponent={getAIScanScreen} />
      <Tab.Screen name="VoiceTab" getComponent={getVoiceScreen} />
      <Tab.Screen name="StatsTab" getComponent={getStatsNavigator} />
      <Tab.Screen name="ProfileTab" getComponent={getProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppTabs;
