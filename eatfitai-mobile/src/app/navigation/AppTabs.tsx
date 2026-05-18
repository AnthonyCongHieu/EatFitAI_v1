// Bottom Tabs after authentication
// 5 tabs: Home, AI Scan, Voice, Stats, Profile
// Uses CustomTabBar for Emerald Nebula design

import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomTabBar from '../../components/navigation/CustomTabBar';
import BottomCommandOverlay from '../../components/navigation/BottomCommandOverlay';

export type AppTabsParamList = {
  HomeTab:
    | {
        focusWaterRequestId?: number;
        source?: 'water-quick-action';
      }
    | undefined;
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

const Stack = createNativeStackNavigator<AppTabsParamList>();

const lazyScreen = (
  loader: () => { default: ComponentType<any> },
): (() => ComponentType<any>) => {
  return () => loader().default;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const getHomeScreen = lazyScreen(() => require('../screens/HomeScreen'));
const getVoiceScreen = lazyScreen(() => require('../screens/VoiceScreen'));
const getStatsNavigator = lazyScreen(() => require('./StatsNavigator'));
const getProfileScreen = lazyScreen(() => require('../screens/ProfileScreen'));
/* eslint-enable @typescript-eslint/no-require-imports */

const HomeWithBar = (props: any) => { const S = getHomeScreen(); return <BottomCommandOverlay activeRouteName="HomeTab"><S {...props} /></BottomCommandOverlay>; };
const VoiceWithBar = (props: any) => { const S = getVoiceScreen(); return <BottomCommandOverlay activeRouteName="VoiceTab"><S {...props} /></BottomCommandOverlay>; };
const StatsWithBar = (props: any) => { const S = getStatsNavigator(); return <BottomCommandOverlay activeRouteName="StatsTab"><S {...props} /></BottomCommandOverlay>; };
const ProfileWithBar = (props: any) => { const S = getProfileScreen(); return <BottomCommandOverlay activeRouteName="ProfileTab"><S {...props} /></BottomCommandOverlay>; };

const AppTabs = (): React.ReactElement => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="HomeTab" component={HomeWithBar} />
      <Stack.Screen name="VoiceTab" component={VoiceWithBar} />
      <Stack.Screen name="StatsTab" component={StatsWithBar} />
      <Stack.Screen name="ProfileTab" component={ProfileWithBar} />
    </Stack.Navigator>
  );
};

export default AppTabs;
