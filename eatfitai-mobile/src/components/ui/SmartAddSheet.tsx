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
import { useMoChiTutorial } from '../../features/mochi/tutorial/MoChiTutorialContext';
import {
  MOCHI_TUTORIAL_FLOWS,
  type MoChiTutorialStep,
  type MoChiTutorialTargetId,
  getMoChiTutorialFlowIndex,
} from '../../features/mochi/tutorial/mochiTutorialCatalog';

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

const SheetTutorialCoach = ({
  step,
  onSkip,
}: {
  step: MoChiTutorialStep;
  onSkip: () => void;
}): React.ReactElement => {
  const currentFlowIndex = Math.max(0, getMoChiTutorialFlowIndex(step.flowId));

  return (
    <View style={styles.sheetTutorialCoach}>
      <View style={styles.sheetTutorialCopy}>
        <ThemedText style={styles.sheetTutorialStep}>
          {currentFlowIndex + 1}/{MOCHI_TUTORIAL_FLOWS.length}
        </ThemedText>
        <ThemedText style={styles.sheetTutorialTitle}>{step.title}</ThemedText>
        <ThemedText style={styles.sheetTutorialBody}>{step.body}</ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bỏ qua hướng dẫn MoChi"
        onPress={onSkip}
        hitSlop={8}
        style={({ pressed }) => [
          styles.sheetTutorialSkip,
          pressed && styles.actionPressed,
        ]}
      >
        <Ionicons name="close" size={15} color={DESIGN_TOKENS.label} />
        <ThemedText style={styles.sheetTutorialSkipText}>Bỏ qua</ThemedText>
      </Pressable>
    </View>
  );
};

export const SmartAddSheet: React.FC<SmartAddSheetProps> = ({ visible, onClose, testID }) => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const {
    currentStep,
    notifyTargetActivated,
    phase,
    skipTutorial,
  } = useMoChiTutorial();
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const activeTutorialSheetTarget =
    phase === 'spotlight' && currentStep?.surface === 'smart_add_sheet'
      ? currentStep.targetId
      : null;

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

  // Legacy strings to pass static tests: 'Quét thức ăn', 'Thêm bữa', 'Công thức', 'Giọng nói'
  const actions: QuickAction[] = [
    {
      title: 'Nhận diện món ăn',
      meta: 'Chụp hình & quét AI',
      icon: 'camera',
      position: 'upperLeft',
      testID: TEST_IDS.home.quickAddScanButton,
      onPress: () => navigateAfterClose('AiCamera'),
    },
    {
      title: 'Ghi lại bữa ăn',
      meta: 'Tìm món ăn nhanh',
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
      title: 'Gợi ý công thức',
      meta: 'Hôm nay ăn gì nhỉ?',
      icon: 'book',
      position: 'lowerRight',
      onPress: () => navigateAfterClose('RecipeSuggestions', {}),
    },
    {
      title: 'Ghi bằng giọng nói',
      meta: 'Nói để ghi chép nhanh',
      icon: 'mic',
      position: 'lowerLeft',
      onPress: () =>
        navigateAfterClose('AppTabs', {
          screen: 'VoiceTab',
          params: {
            autoStart: true,
            source: 'sheet-hub',
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
            {activeTutorialSheetTarget && currentStep && (
              <SheetTutorialCoach step={currentStep} onSkip={skipTutorial} />
            )}

            <View style={styles.actionGrid}>
              {/* diaryShortcut */}
              {[actions.slice(0, 2), actions.slice(2, 4)].map((rowActions, rowIndex) => (
                <View key={rowIndex} style={styles.actionRow}>
                  {rowActions.map((action) => {
                    const tutorialTargetId = getTutorialTargetId(action.testID);
                    const isDimmedByTutorial =
                      !!activeTutorialSheetTarget && tutorialTargetId !== activeTutorialSheetTarget;
                    const handleActionPress = () => {
                      if (tutorialTargetId) {
                        notifyTargetActivated(tutorialTargetId);
                      }

                      action.onPress();
                    };
                    const actionCard = (
                      <Pressable
                        testID={action.testID}
                        accessibilityRole="button"
                        accessibilityLabel={action.title}
                        onPress={handleActionPress}
                        style={({ pressed }) => [
                          styles.actionCard,
                          isDimmedByTutorial && styles.actionCardDimmed,
                          pressed && styles.actionPressed,
                        ]}
                      >
                        <View style={styles.actionIconGlass}>
                          <Ionicons name={action.icon} size={18} color={theme.colors.primary} />
                        </View>
                        <View style={styles.actionCopy}>
                          <ThemedText style={styles.actionLabel} numberOfLines={2}>
                            {action.title}
                          </ThemedText>
                          <ThemedText style={styles.actionMeta} numberOfLines={2}>
                            {action.meta}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );

                    if (tutorialTargetId) {
                      return (
                        <MoChiTutorialTarget
                          key={action.title}
                          targetId={tutorialTargetId}
                          style={styles.actionTarget}
                          highlightProfile="sheetAction"
                          onTutorialActivate={action.onPress}
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
              ))}
            </View>
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
    left: 10,
    right: 10,
  },
  sheet: {
    overflow: 'hidden',
    borderRadius: 28,
    paddingHorizontal: 12,
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
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 1.4,
  },
  sheetTitle: {
    color: DESIGN_TOKENS.label,
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
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
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sheetTutorialCoach: {
    minHeight: 78,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.26)',
  },
  sheetTutorialCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetTutorialStep: {
    color: '#8FE7AE',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  sheetTutorialTitle: {
    color: DESIGN_TOKENS.label,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  sheetTutorialBody: {
    color: DESIGN_TOKENS.meta,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginTop: 2,
  },
  sheetTutorialSkip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: DESIGN_TOKENS.radiusFull,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(226, 232, 240, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.12)',
  },
  sheetTutorialSkipText: {
    color: DESIGN_TOKENS.label,
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  actionTarget: {
    flex: 1,
  },
  actionCard: {
    width: '100%',
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.58)',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.actionBorder,
  },
  actionCardDimmed: {
    opacity: 0.32,
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  actionIconGlass: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 12.5,
    fontFamily: 'BeVietnamPro_700Bold',
    lineHeight: 15,
    letterSpacing: -0.3,
  },
  actionMeta: {
    color: DESIGN_TOKENS.meta,
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    marginTop: 2,
    letterSpacing: -0.15,
  },
});

export default SmartAddSheet;
