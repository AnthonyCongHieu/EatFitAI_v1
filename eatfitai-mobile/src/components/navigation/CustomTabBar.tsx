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

type CommandTarget = 'HomeTab' | 'FoodSearch' | 'AiCamera' | 'VoiceTab' | 'StatsTab';

type CommandItem = {
  target: CommandTarget;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  testID: string;
  kind: 'tab' | 'stack';
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
    target: 'FoodSearch',
    label: 'Thêm bữa',
    icon: 'restaurant-outline',
    iconFocused: 'restaurant',
    testID: TEST_IDS.navigation.addMealCommandButton,
    kind: 'stack',
  },
  {
    target: 'AiCamera',
    label: 'Scan',
    icon: 'scan-outline',
    iconFocused: 'scan',
    testID: TEST_IDS.navigation.aiScanTabButton,
    kind: 'stack',
    isPrimary: true,
  },
  {
    target: 'VoiceTab',
    label: 'Giọng nói',
    icon: 'mic-outline',
    iconFocused: 'mic',
    testID: TEST_IDS.navigation.voiceTabButton,
    kind: 'tab',
  },
  {
    target: 'StatsTab',
    label: 'Thống kê',
    icon: 'bar-chart-outline',
    iconFocused: 'bar-chart',
    testID: TEST_IDS.navigation.statsTabButton,
    kind: 'tab',
  },
];

const TAB_BAR_HEIGHT = 60;

const CommandButton = ({
  command,
  isFocused,
  onPress,
  colors,
}: {
  command: CommandItem;
  isFocused: boolean;
  onPress: () => void;
  colors: { primary: string; primaryDark: string; onPrimary: string; textMuted: string; bg: string };
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
          command.isPrimary && [styles.primaryCommand, { backgroundColor: colors.primary, shadowColor: colors.primaryDark }],
          anim,
        ]}
      >
        <Ionicons
          name={isFocused ? command.iconFocused : command.icon}
          size={command.isPrimary ? 25 : 22}
          color={iconColor}
        />
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
  const isDark = theme.mode === 'dark';

  const colors = {
    bg: isDark ? '#0a0e1a' : '#FFFFFF',
    primary: theme.colors.primary,
    primaryDark: isDark ? '#22c55e' : '#15803D',
    onPrimary: isDark ? '#003915' : '#FFFFFF',
    textMuted: theme.colors.textSecondary,
    onSurface: theme.colors.text,
    surfaceHigh: isDark ? '#1e2435' : '#F0F5EE',
    borderTop: isDark ? 'rgba(75,226,119,0.08)' : 'rgba(0,0,0,0.06)',
  };

  const safeBottom = resolveBottomTabSafePadding(Platform.OS, insets.bottom);
  const current = state.routes[state.index]?.name ?? '';
  const navigateTab = navigation.navigate as unknown as (name: string, params?: unknown) => void;

  const runCommand = (command: CommandItem) => {
    if (command.kind === 'tab') {
      if (command.target === 'VoiceTab') {
        navigateTab('VoiceTab', { source: 'command-bar' });
        return;
      }

      navigateTab(command.target);
      return;
    }

    if (command.target === 'FoodSearch') {
      const didNavigate = navigateRoot(
        'FoodSearch',
        {
          autoFocus: true,
          showQuickSuggestions: true,
          returnToDiaryOnSave: true,
        },
      );
      if (!didNavigate) {
        console.warn('[navigation] Root navigator is not ready for FoodSearch command.');
      }
      return;
    }

    const didNavigate = navigateRoot('AiCamera');
    if (!didNavigate) {
      console.warn('[navigation] Root navigator is not ready for AI scan command.');
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
              isFocused={command.kind === 'tab' && current === command.target}
              onPress={() => runCommand(command)}
            />
          ))}
        </View>
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
  primaryCommand: {
    width: 56,
    height: 56,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.34,
    shadowRadius: 10,
    elevation: 8,
  },
  commandLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default CustomTabBar;
