/**
 * CustomTabBar - Emerald Nebula task-first bottom command bar.
 *
 * Navigation destinations stay in tabs, while high-frequency logging actions
 * are exposed as direct commands instead of hiding behind a floating mascot.
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { TEST_IDS } from '../../testing/testIds';
import { navigateRoot } from '../../app/navigation/navigationRef';
import { resolveBottomTabSafePadding } from './tabBarSafeArea';
import { useAppTheme } from '../../theme/ThemeProvider';
import MoChiSprite from '../../features/mochi/MoChiSprite';
import SmartAddSheet from '../ui/SmartAddSheet';
import type { MoChiPoseKey } from '../../assets/mascot/mochi/mochiAssets';

type CommandTarget = 'HomeTab' | 'MealDiary' | 'MoChiHub' | 'StatsTab' | 'ProfileTab';

type CommandItem = {
  target: CommandTarget;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  testID: string;
  kind: 'tab' | 'stack' | 'hub';
  isPrimary?: boolean;
};

const COMMAND_ITEMS: CommandItem[] = [
  {
    target: 'HomeTab',
    label: 'Trang chủ',
    icon: 'home-outline',
    iconFocused: 'home',
    testID: TEST_IDS.navigation.homeTabButton,
    kind: 'tab',
  },
  {
    target: 'MealDiary',
    label: 'Nhật ký',
    icon: 'book-outline',
    iconFocused: 'book',
    testID: TEST_IDS.navigation.diaryTabButton,
    kind: 'stack',
  },
  {
    target: 'MoChiHub',
    label: 'MoChi',
    icon: 'sparkles-outline',
    iconFocused: 'sparkles',
    testID: TEST_IDS.navigation.mochiHubButton,
    kind: 'hub',
    isPrimary: true,
  },
  {
    target: 'StatsTab',
    label: 'Thống kê',
    icon: 'bar-chart-outline',
    iconFocused: 'bar-chart',
    testID: TEST_IDS.navigation.statsTabButton,
    kind: 'tab',
  },
  {
    target: 'ProfileTab',
    label: 'Cá nhân',
    icon: 'person-outline',
    iconFocused: 'person',
    testID: TEST_IDS.navigation.profileTabButton,
    kind: 'tab',
  },
];

const TAB_BAR_HEIGHT = 60;

const resolveMoChiDockPose = (currentRouteName: string): MoChiPoseKey => {
  if (currentRouteName === 'AiCamera') {
    return 'scanThinkingFull';
  }

  if (currentRouteName === 'MealDiary') {
    return 'mealCoachFull';
  }

  if (currentRouteName === 'StatsTab') {
    return 'weeklyReportNotice';
  }

  if (currentRouteName === 'ProfileTab') {
    return 'secureAccountFull';
  }

  return 'boxIdle';
};

const CommandButton = ({
  command,
  isFocused,
  onPress,
  dockPose,
  colors,
}: {
  command: CommandItem;
  isFocused: boolean;
  onPress: () => void;
  dockPose: MoChiPoseKey;
  colors: { primary: string; onPrimary: string; textMuted: string; bg: string };
}) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconColor = command.isPrimary
    ? colors.onPrimary
    : isFocused
      ? colors.primary
      : colors.textMuted;

  return (
    <Pressable
      style={styles.commandButton}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      accessibilityRole={command.kind === 'tab' ? 'tab' : 'button'}
      accessibilityLabel={command.label}
      testID={command.testID}
      nativeID={command.testID}
    >
      <Animated.View
        style={[
          styles.commandInner,
          command.isPrimary && styles.primaryDock,
          anim,
        ]}
      >
        {command.isPrimary ? (
          <View style={styles.primaryDockHalo}>
            <View style={styles.primaryDockCore}>
              <View style={styles.primaryDockMascotPlate}>
                <MoChiSprite poseKey={dockPose} size={62} animated={false} />
              </View>
            </View>
          </View>
        ) : (
          <Ionicons
            name={isFocused ? command.iconFocused : command.icon}
            size={22}
            color={iconColor}
          />
        )}
        <Text
          style={[
            styles.commandLabel,
            {
              color: command.isPrimary
                ? colors.onPrimary
                : isFocused
                  ? colors.primary
                  : colors.textMuted,
            },
          ]}
          numberOfLines={1}
        >
          {command.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [isHubVisible, setIsHubVisible] = React.useState(false);
  const isDark = theme.mode === 'dark';

  const colors = {
    bg: isDark ? '#0a0e1a' : '#FFFFFF',
    primary: theme.colors.primary,
    onPrimary: isDark ? '#dbeafe' : '#0f172a',
    textMuted: theme.colors.textSecondary,
    onSurface: theme.colors.text,
    surfaceHigh: isDark ? '#1e2435' : '#F0F5EE',
    borderTop: isDark ? 'rgba(226,232,240,0.08)' : 'rgba(0,0,0,0.06)',
  };

  const safeBottom = resolveBottomTabSafePadding(Platform.OS, insets.bottom);
  const current = state.routes[state.index]?.name ?? '';
  const mochiDockPose = resolveMoChiDockPose(current);
  const navigateTab = navigation.navigate as unknown as (name: string, params?: unknown) => void;

  const runCommand = (command: CommandItem) => {
    if (command.kind === 'hub') {
      setIsHubVisible(true);
      return;
    }

    if (command.kind === 'tab') {
      navigateTab(command.target);
      return;
    }

    const didNavigate = navigateRoot('MealDiary');
    if (!didNavigate) {
      console.warn(`[navigation] Root navigator is not ready for ${command.target} command.`);
    }
  };

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: colors.bg, borderTopColor: colors.borderTop }]}>
        <View style={[styles.row, { paddingBottom: safeBottom }]}>
          {COMMAND_ITEMS.map((command) => (
            <CommandButton
              key={command.target}
              command={command}
              colors={colors}
              dockPose={isHubVisible ? 'nutritionCoachNotice' : mochiDockPose}
              isFocused={current === command.target}
              onPress={() => runCommand(command)}
            />
          ))}
        </View>
      </View>
      <SmartAddSheet
        visible={isHubVisible}
        onClose={() => setIsHubVisible(false)}
        testID={TEST_IDS.navigation.mochiHubSheet}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
  },
  bar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
  },
  commandButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
  },
  commandInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 54,
    minHeight: 50,
  },
  primaryDock: {
    width: 86,
    height: 88,
    borderRadius: 43,
    marginTop: -34,
    backgroundColor: 'transparent',
  },
  primaryDockHalo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.22)',
  },
  primaryDockCore: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 26, 44, 0.96)',
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.62)',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryDockMascotPlate: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 32, 51, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.16)',
    overflow: 'hidden',
  },
  commandLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default CustomTabBar;
