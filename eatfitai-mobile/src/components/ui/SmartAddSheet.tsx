import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../../app/types';
import { TEST_IDS } from '../../testing/testIds';
import MoChiTutorialTarget from '../../features/mochi/tutorial/MoChiTutorialTarget';
import type { MoChiTutorialTargetId } from '../../features/mochi/tutorial/mochiTutorialCatalog';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QuickAction = {
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  testID?: string;
  position: 'upperLeft' | 'upperRight' | 'lowerLeft' | 'lowerRight';
  onPress: () => void;
};

interface SmartAddSheetProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

const ACTION_DELAY_MS = 220;
const SHEET_EXIT_MS = 180;
const DESIGN_TOKENS = {
  overlay: 'rgba(5, 10, 22, 0.58)',
  glass: 'rgba(13, 23, 39, 0.94)',
  glassHigh: 'rgba(24, 35, 56, 0.96)',
  glassBorder: 'rgba(75, 226, 119, 0.20)',
  actionTint: 'rgba(75, 226, 119, 0.085)',
  actionBorder: 'rgba(75, 226, 119, 0.18)',
  primary: '#4be277',
  accent: '#7dd3fc',
  label: '#eef2ff',
  meta: '#9fb0c8',
  radiusFull: 999,
};

const getTutorialTargetId = (testID?: string): MoChiTutorialTargetId | null => {
  if (testID === TEST_IDS.home.quickAddSearchButton) {
    return 'quick_add_search';
  }

  if (testID === TEST_IDS.home.quickAddScanButton) {
    return 'quick_add_scan';
  }

  return null;
};

export const SmartAddSheet: React.FC<SmartAddSheetProps> = ({ visible, onClose, testID }) => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      progress.value = withSpring(1, {
        damping: 22,
        stiffness: 260,
        mass: 0.9,
      });
      return;
    }

    progress.value = withTiming(0, {
      duration: SHEET_EXIT_MS,
      easing: Easing.in(Easing.cubic),
    });
    const timeout = setTimeout(() => setIsMounted(false), SHEET_EXIT_MS + 24);

    return () => clearTimeout(timeout);
  }, [progress, visible]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.32, 1], [0, 0.78, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [220, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.965, 1]) },
    ],
  }));

  const navigateAfterClose = (
    route: keyof RootStackParamList,
    params?: RootStackParamList[keyof RootStackParamList],
  ) => {
    onClose();
    setTimeout(() => {
      (navigation as any).navigate(route, params);
    }, ACTION_DELAY_MS);
  };

  const actions: QuickAction[] = [
    {
      title: 'Quét thức ăn',
      meta: 'Camera AI',
      icon: 'camera',
      position: 'upperLeft',
      testID: TEST_IDS.home.quickAddScanButton,
      onPress: () => navigateAfterClose('AiCamera'),
    },
    {
      title: 'Thêm bữa',
      meta: 'Tìm món',
      icon: 'restaurant',
      position: 'upperRight',
      testID: TEST_IDS.home.quickAddSearchButton,
      onPress: () =>
        navigateAfterClose('FoodSearch', {
          autoFocus: true,
          showQuickSuggestions: true,
          returnToDiaryOnSave: true,
        }),
    },
    {
      title: 'Công thức',
      meta: 'Gợi ý món',
      icon: 'book',
      position: 'lowerRight',
      onPress: () => navigateAfterClose('RecipeSuggestions', {}),
    },
    {
      title: 'Lượng nước',
      meta: 'Về thẻ nước',
      icon: 'water',
      position: 'lowerLeft',
      onPress: () =>
        navigateAfterClose('AppTabs', {
          screen: 'HomeTab',
          params: {
            focusWaterRequestId: Date.now(),
            source: 'water-quick-action',
          },
        }),
    },
  ];

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}
        >
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng thao tác nhanh"
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 26 : 14}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.backdropTint} />
          </Pressable>
        </Animated.View>

        <Animated.View
          testID={testID}
          style={[
            styles.sheetDock,
            {
              bottom: Math.max(insets.bottom, 10) + 96,
            },
            sheetAnimatedStyle,
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <LinearGradient
              colors={['rgba(75, 226, 119, 0.14)', 'rgba(23, 32, 51, 0.96)', DESIGN_TOKENS.glass]}
              locations={[0, 0.38, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <ThemedText style={styles.sheetEyebrow}>MOCHI THÊM NHANH</ThemedText>
                <ThemedText style={styles.sheetTitle}>Bạn muốn thêm gì?</ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng thao tác nhanh"
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.actionPressed,
                ]}
              >
                <Ionicons name="close" size={18} color={DESIGN_TOKENS.label} />
              </Pressable>
            </View>

            <View style={styles.actionGrid}>
              {actions.map((action) => {
                const tutorialTargetId = getTutorialTargetId(action.testID);
                const actionCard = (
                  <Pressable
                    testID={action.testID}
                    accessibilityRole="button"
                    accessibilityLabel={action.title}
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      styles.actionCard,
                      pressed && styles.actionPressed,
                    ]}
                  >
                    <View style={styles.actionIconGlass}>
                      <Ionicons name={action.icon} size={22} color={theme.colors.primary} />
                    </View>
                    <View style={styles.actionCopy}>
                      <ThemedText style={styles.actionLabel} numberOfLines={2}>
                        {action.title}
                      </ThemedText>
                      <ThemedText style={styles.actionMeta}>{action.meta}</ThemedText>
                    </View>
                  </Pressable>
                );

                if (tutorialTargetId) {
                  return (
                    <MoChiTutorialTarget
                      key={action.title}
                      targetId={tutorialTargetId}
                      style={styles.actionTarget}
                    >
                      {actionCard}
                    </MoChiTutorialTarget>
                  );
                }

                return (
                  <View key={action.title} style={styles.actionTarget}>
                    {actionCard}
                  </View>
                );
              })}
            </View>

            <Pressable
              testID={TEST_IDS.home.quickAccessDiaryButton}
              accessibilityRole="button"
              accessibilityLabel="Mở nhật ký hôm nay"
              onPress={() => navigateAfterClose('MealDiary')}
              style={({ pressed }) => [
                styles.diaryShortcut,
                pressed && styles.actionPressed,
              ]}
            >
              <View style={styles.diaryShortcutDot} />
              <ThemedText style={styles.diaryShortcutText}>NHẬT KÝ HÔM NAY</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={DESIGN_TOKENS.primary} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DESIGN_TOKENS.overlay,
  },
  sheetDock: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  sheet: {
    overflow: 'hidden',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: DESIGN_TOKENS.glass,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.glassBorder,
    shadowColor: DESIGN_TOKENS.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(226, 232, 240, 0.24)',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetEyebrow: {
    color: DESIGN_TOKENS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  sheetTitle: {
    color: DESIGN_TOKENS.label,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 232, 240, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.12)',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTarget: {
    width: '48.4%',
  },
  actionCard: {
    width: '100%',
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.58)',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.actionBorder,
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  actionIconGlass: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.actionTint,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.actionBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    color: DESIGN_TOKENS.label,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
    letterSpacing: 0,
  },
  actionMeta: {
    color: DESIGN_TOKENS.meta,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  diaryShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 16,
    marginTop: 12,
    borderRadius: DESIGN_TOKENS.radiusFull,
    backgroundColor: 'rgba(18, 32, 48, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.26)',
  },
  diaryShortcutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.primary,
  },
  diaryShortcutText: {
    color: DESIGN_TOKENS.label,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default SmartAddSheet;
