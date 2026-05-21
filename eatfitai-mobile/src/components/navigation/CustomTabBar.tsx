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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { TEST_IDS } from '../../testing/testIds';
import { resolveBottomTabSafePadding } from './tabBarSafeArea';
import { useAppTheme } from '../../theme/ThemeProvider';
import MoChiSprite from '../../features/mochi/MoChiSprite';
import SmartAddSheet from '../ui/SmartAddSheet';
import type { MoChiPoseKey } from '../../assets/mascot/mochi/mochiAssets';
import MoChiTutorialTarget from '../../features/mochi/tutorial/MoChiTutorialTarget';
import { useMoChiTutorial } from '../../features/mochi/tutorial/MoChiTutorialContext';
import type { MoChiTutorialTargetId } from '../../features/mochi/tutorial/mochiTutorialCatalog';
import { useMoChiSurfaceCoordinator } from '../../features/mochi/mochiSurfaceCoordinator';
import { useMoChiSurfacePresence } from '../../features/mochi/useMoChiSurfacePresence';

type CommandTarget = 'HomeTab' | 'MealDiary' | 'MoChiHub' | 'StatsTab' | 'ProfileTab';

type CommandItem = {
  target: CommandTarget;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  testID: string;
  kind: 'tab' | 'hub';
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
    kind: 'tab',
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

const TAB_BAR_HEIGHT = 58;
const SHEET_BLOCKS = ['topOverlay'] as const;

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
  isHubOpen,
  isMoChiBusy,
}: {
  command: CommandItem;
  isFocused: boolean;
  onPress: () => void;
  dockPose: MoChiPoseKey;
  isHubOpen: boolean;
  isMoChiBusy: boolean;
  colors: { primary: string; onPrimary: string; textMuted: string; bg: string };
}) => {
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(isFocused ? 1 : 0);
  const hubProgress = useSharedValue(isHubOpen ? 1 : 0);
  const { notifyTargetActivated } = useMoChiTutorial();
  const anim = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: command.isPrimary
          ? -4 * hubProgress.value
          : -2 * activeProgress.value,
      },
      {
        scale:
          scale.value *
          (command.isPrimary
            ? 1 + hubProgress.value * 0.05
            : 1 + activeProgress.value * 0.04),
      },
    ],
  }));
  const activeIndicatorAnim = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [{ scaleX: 0.72 + activeProgress.value * 0.28 }],
  }));
  const iconColor = command.isPrimary
    ? colors.onPrimary
    : isFocused
      ? colors.primary
      : colors.textMuted;

  React.useEffect(() => {
    activeProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeProgress, isFocused]);

  React.useEffect(() => {
    hubProgress.value = withTiming(isHubOpen ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [hubProgress, isHubOpen]);

  const tutorialTargetId: MoChiTutorialTargetId | null = command.target === 'MoChiHub'
    ? 'mochi_hub'
    : command.target === 'StatsTab'
      ? 'stats_tab'
      : null;
  const handlePress = () => {
    if (tutorialTargetId) {
      notifyTargetActivated(tutorialTargetId);
    }

    onPress();
  };
  const inner = (
    <Animated.View
      style={[
        styles.commandInner,
        command.isPrimary && (tutorialTargetId ? styles.primaryDockInner : styles.primaryDock),
        anim,
      ]}
    >
      {command.isPrimary ? (
        <View
          style={[
            styles.primaryDockHalo,
            isMoChiBusy && !isHubOpen && styles.primaryDockHaloQuiet,
          ]}
        >
          <View style={styles.primaryDockCore}>
            <View style={styles.primaryDockMascotPlate}>
              {isMoChiBusy && !isHubOpen ? (
                <Ionicons
                  name="sparkles"
                  size={26}
                  color={colors.onPrimary}
                  testID="mochi-dock-quiet-icon"
                />
              ) : (
                <MoChiSprite
                  poseKey={dockPose}
                  size={62}
                  animated={false}
                />
              )}
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
      {!command.isPrimary && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeIndicator,
            { backgroundColor: colors.primary },
            activeIndicatorAnim,
          ]}
        />
      )}
      {!command.isPrimary && (
        <Text
          style={[
            styles.commandLabel,
            {
              color: isFocused ? colors.primary : colors.textMuted,
            },
          ]}
          numberOfLines={1}
        >
          {command.label}
        </Text>
      )}
    </Animated.View>
  );

  const button = (
    <Pressable
      style={styles.commandButton}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      accessibilityRole={command.kind === 'tab' ? 'tab' : 'button'}
      accessibilityLabel={command.label}
      accessibilityState={{ selected: isFocused }}
      testID={command.testID}
      nativeID={command.testID}
    >
      {tutorialTargetId ? (
        <MoChiTutorialTarget
          targetId={tutorialTargetId}
          highlightProfile={command.isPrimary ? 'dock' : 'tab'}
          style={command.isPrimary ? styles.primaryDock : undefined}
          onTutorialActivate={handlePress}
        >
          {inner}
        </MoChiTutorialTarget>
      ) : inner}
    </Pressable>
  );

  return button;
};

type CustomTabBarProps = BottomTabBarProps & {
  isOverlay?: boolean;
};

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, navigation, isOverlay = false }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [isHubVisible, setIsHubVisible] = React.useState(false);
  const { activeSheetTarget } = useMoChiTutorial();
  const sheetOpenedByTutorialRef = React.useRef(false);
  const isDark = theme.mode === 'dark';

  const colors = {
    bg: isDark ? '#05070d' : '#FFFFFF',
    primary: theme.colors.primary,
    onPrimary: isDark ? '#dbeafe' : '#0f172a',
    textMuted: theme.colors.textSecondary,
    onSurface: theme.colors.text,
    surfaceHigh: isDark ? '#252b3f' : '#F0F5EE',
    borderTop: isDark ? 'rgba(226,232,240,0.08)' : 'rgba(0,0,0,0.06)',
  };

  const safeBottom = 0; // Centered since outerWrapper is raised above home indicator
  const current = state.routes[state.index]?.name ?? '';
  const isMoChiBusy = useMoChiSurfaceCoordinator((store) => store.isBusy(current));
  const mochiDockPose = resolveMoChiDockPose(current);
  const navigateTab = navigation.navigate as unknown as (name: string, params?: unknown) => void;

  useMoChiSurfacePresence({
    id: 'bottomDock:main',
    surface: 'bottomDock',
    routeName: current,
    priority: 10,
  });

  useMoChiSurfacePresence({
    id: 'sheet:mochiHub',
    surface: 'sheet',
    routeName: current,
    priority: 90,
    blocks: SHEET_BLOCKS,
    enabled: isHubVisible,
  });

  const runCommand = (command: CommandItem) => {
    if (command.kind === 'hub') {
      setIsHubVisible(true);
      return;
    }

    const route = state.routes.find((item) => item.name === command.target);
    if (!route) {
      console.warn(`[navigation] Tab route is not available for ${command.target} command.`);
      return;
    }

    if (isOverlay) {
      (navigation.navigate as (...args: unknown[]) => void)('AppTabs', {
        screen: command.target,
        params: route.params,
      });
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (current !== command.target && !event?.defaultPrevented) {
      navigateTab(command.target, route.params);
    }
  };

  React.useEffect(() => {
    const tutorialNeedsSheet =
      activeSheetTarget === 'quick_add_search' || activeSheetTarget === 'quick_add_scan';

    if (tutorialNeedsSheet && !isHubVisible) {
      sheetOpenedByTutorialRef.current = true;
      setIsHubVisible(true);
      return;
    }

    if (!tutorialNeedsSheet && sheetOpenedByTutorialRef.current) {
      sheetOpenedByTutorialRef.current = false;
      setIsHubVisible(false);
    }
  }, [activeSheetTarget, isHubVisible]);

  return (
    <View style={[styles.outerWrapper, { bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 16 }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: isDark ? 'rgba(9, 14, 28, 0.92)' : 'rgba(255, 255, 255, 0.95)', borderColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 0, 0, 0.06)' }]}>
        <View style={styles.row}>
          {COMMAND_ITEMS.map((command) => (
            <CommandButton
              key={command.target}
              command={command}
              colors={colors}
              dockPose={isHubVisible ? 'nutritionCoachNotice' : mochiDockPose}
              isHubOpen={isHubVisible}
              isMoChiBusy={isMoChiBusy}
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
    left: 16,
    right: 16,
  },
  bar: {
    borderRadius: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 16,
  },
  commandButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  commandInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 54,
    minHeight: 52,
  },
  primaryDock: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginTop: -30,
    backgroundColor: 'transparent',
  },
  primaryDockInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
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
  primaryDockHaloQuiet: {
    opacity: 0.72,
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
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 32, 51, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.16)',
    overflow: 'hidden',
  },
  commandLabel: {
    fontSize: 9,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 34,
    height: 3,
    borderRadius: 2,
  },
});

export default CustomTabBar;
