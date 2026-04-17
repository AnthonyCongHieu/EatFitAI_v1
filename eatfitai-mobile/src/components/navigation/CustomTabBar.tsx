/**
 * CustomTabBar - Emerald Nebula bottom navigation
 * All 5 tabs in a single flat row (no elevated center button)
 */
import React from 'react';
import { View, Pressable, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TEST_IDS } from '../../testing/testIds';

const C = {
  bg: '#0a0e1a',
  primary: '#4be277',
  primaryDark: '#22c55e',
  onPrimary: '#003915',
  textMuted: '#64748b',
  onSurface: '#dee1f7',
};

type TabItem = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

const ALL_TABS: TabItem[] = [
  { name: 'HomeTab', label: 'Trang chủ', icon: 'home-outline', iconFocused: 'home' },
  { name: 'VoiceTab', label: 'Giọng nói', icon: 'mic-outline', iconFocused: 'mic' },
  { name: 'AIScanTab', label: 'Quét AI', icon: 'scan-outline', iconFocused: 'scan' },
  { name: 'StatsTab', label: 'Thống kê', icon: 'bar-chart-outline', iconFocused: 'bar-chart' },
  { name: 'ProfileTab', label: 'Cá nhân', icon: 'person-outline', iconFocused: 'person' },
];

const TAB_BAR_HEIGHT = 56;
const TAB_TEST_IDS: Record<string, string> = {
  HomeTab: TEST_IDS.navigation.homeTabButton,
  VoiceTab: TEST_IDS.navigation.voiceTabButton,
  AIScanTab: TEST_IDS.navigation.aiScanTabButton,
  StatsTab: TEST_IDS.navigation.statsTabButton,
  ProfileTab: TEST_IDS.navigation.profileTabButton,
};

const TabBtn = ({
  tab, isFocused, onPress, isCenter,
}: { tab: TabItem; isFocused: boolean; onPress: () => void; isCenter?: boolean }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const iconColor = isFocused ? C.primary : C.textMuted;
  const testID = TAB_TEST_IDS[tab.name];

  if (isCenter) {
    return (
      <View style={styles.centerTabWrapper} pointerEvents="box-none">
        <Pressable
          onPress={onPress}
          hitSlop={12}
          onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 400 }); }}
          onPressOut={() => { scale.value = withSpring(1,    { damping: 15, stiffness: 400 }); }}
          accessibilityRole="tab"
          accessibilityLabel={tab.label}
          testID={testID}
        >
          <Animated.View style={[styles.centerIconWrap, anim]}>
            <Ionicons name="scan" size={26} color={C.onPrimary} />
          </Animated.View>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={styles.tabButton}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.85, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1,    { damping: 15, stiffness: 400 }); }}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      testID={testID}
    >
      <Animated.View style={[styles.tabInner, anim]}>
        <Ionicons name={isFocused ? tab.iconFocused : tab.icon} size={22} color={iconColor} />
        <Text style={[styles.tabLabel, { color: isFocused ? C.primary : C.textMuted }]}>{tab.label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : 4;
  const navigateTo = (name: string) => navigation.navigate(name);
  const current = state.routes[state.index]?.name ?? '';
  const centerTab = ALL_TABS[2]!;

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: safeBottom }]}>
        <View style={styles.row}>
          {ALL_TABS.map((tab, index) => {
            const isCenter = index === 2;
            if (isCenter) {
              return (
                <View key={tab.name} style={styles.centerSpacer} pointerEvents="none" />
              );
            }
            return (
              <TabBtn
                key={tab.name}
                tab={tab}
                isFocused={current === tab.name}
                onPress={() => navigateTo(tab.name)}
              />
            );
          })}
        </View>
      </View>
      {/* Absolute positioning for the center button to make it float */}
      <View style={[styles.absoluteCenterBtn, { bottom: TAB_BAR_HEIGHT / 2 + safeBottom - 24 }]} pointerEvents="box-none">
        <TabBtn
          tab={centerTab}
          isFocused={current === centerTab.name}
          onPress={() => navigateTo(centerTab.name)}
          isCenter={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bar: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75,226,119,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  centerSpacer: {
    width: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteCenterBtn: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  centerTabWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default CustomTabBar;
