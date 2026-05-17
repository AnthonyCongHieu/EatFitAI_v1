import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import CustomTabBar from './CustomTabBar';

type BottomCommandOverlayProps = {
  activeRouteName: string;
  children: React.ReactNode;
};

const TAB_ROUTE_NAMES = ['HomeTab', 'VoiceTab', 'StatsTab', 'ProfileTab'];

const buildOverlayState = (activeRouteName: string): BottomTabBarProps['state'] => {
  const routeNames = TAB_ROUTE_NAMES.includes(activeRouteName)
    ? TAB_ROUTE_NAMES
    : [activeRouteName, ...TAB_ROUTE_NAMES];
  const activeIndex = routeNames.indexOf(activeRouteName);

  return {
    stale: false,
    type: 'tab',
    key: 'bottom-command-overlay',
    index: activeIndex >= 0 ? activeIndex : 0,
    routeNames,
    history: [],
    routes: routeNames.map((name) => ({ key: `${name}-overlay`, name })),
  } as BottomTabBarProps['state'];
};

const BottomCommandOverlay = ({
  activeRouteName,
  children,
}: BottomCommandOverlayProps): React.ReactElement => {
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      <CustomTabBar
        state={buildOverlayState(activeRouteName)}
        navigation={navigation as unknown as BottomTabBarProps['navigation']}
        descriptors={{} as BottomTabBarProps['descriptors']}
        insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default BottomCommandOverlay;
