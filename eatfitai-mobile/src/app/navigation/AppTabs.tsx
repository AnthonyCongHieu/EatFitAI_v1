// Bottom tabs after authentication.
// CustomTabBar stays mounted while users switch between primary surfaces.

import type { ComponentType, ReactElement } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CustomTabBar from '../../components/navigation/CustomTabBar';

export type AppTabsParamList = {
  HomeTab:
    | {
        focusWaterRequestId?: number;
        source?: 'water-quick-action';
      }
    | undefined;
  MealDiary: { selectedDate?: string } | undefined;
  VoiceTab:
    | {
        autoStart?: boolean;
        source?: 'home-hub' | 'sheet-hub' | 'home-fab' | 'command-bar';
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
const getMealDiaryScreen = lazyScreen(() => require('../screens/diary/MealDiaryScreen'));
const getVoiceScreen = lazyScreen(() => require('../screens/VoiceScreen'));
const getStatsNavigator = lazyScreen(() => require('./StatsNavigator'));
const getProfileScreen = lazyScreen(() => require('../screens/ProfileScreen'));
/* eslint-enable @typescript-eslint/no-require-imports */

const AppTabs = (): ReactElement => {
  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="HomeTab" getComponent={getHomeScreen} />
      <Tab.Screen name="MealDiary" getComponent={getMealDiaryScreen} />
      <Tab.Screen name="VoiceTab" getComponent={getVoiceScreen} />
      <Tab.Screen name="StatsTab" getComponent={getStatsNavigator} />
      <Tab.Screen name="ProfileTab" getComponent={getProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppTabs;
