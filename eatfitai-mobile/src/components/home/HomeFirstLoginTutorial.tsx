import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import MascotCharacter, { type MascotState } from '../MascotCharacter';
import { ThemedText } from '../ThemedText';
import { TEST_IDS } from '../../testing/testIds';

export const HOME_TUTORIAL_SEEN_KEY = 'home_tutorial_v1_seen';

type TutorialStep = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  mascotState: MascotState;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Chào mừng bạn đến với EatFitAI',
    description: 'Mầm Fit sẽ đồng hành cùng bạn trong các thao tác ghi món, quét ảnh và theo dõi mục tiêu mỗi ngày.',
    icon: 'sparkles',
    mascotState: 'wave',
  },
  {
    title: 'Quét món bằng AI',
    description: 'Dùng camera để nhận diện món ăn nhanh hơn, sau đó kiểm tra lại khẩu phần trước khi lưu.',
    icon: 'camera',
    mascotState: 'pointing',
  },
  {
    title: 'Thêm món thủ công',
    description: 'Khi muốn chính xác hơn, bạn có thể tìm món có sẵn hoặc tự tạo món nhà làm.',
    icon: 'restaurant',
    mascotState: 'thinking',
  },
  {
    title: 'Nhật ký hôm nay',
    description: 'Theo dõi calories, bữa ăn và lượng nước trong ngày để biết mình còn thiếu gì.',
    icon: 'calendar',
    mascotState: 'success',
  },
];

type HomeFirstLoginTutorialProps = {
  isAuthenticated: boolean;
  needsOnboarding: boolean;
};

const HomeFirstLoginTutorial = ({
  isAuthenticated,
  needsOnboarding,
}: HomeFirstLoginTutorialProps): React.ReactElement | null => {
  const [visible, setVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    let active = true;

    const loadTutorialState = async () => {
      if (!isAuthenticated || needsOnboarding) {
        setVisible(false);
        return;
      }

      try {
        const storedValue = await AsyncStorage.getItem(HOME_TUTORIAL_SEEN_KEY);
        if (active && storedValue !== 'true') {
          setVisible(true);
        }
      } catch {
        if (active) {
          setVisible(true);
        }
      }
    };

    loadTutorialState();

    return () => {
      active = false;
    };
  }, [isAuthenticated, needsOnboarding]);

  const currentStep = TUTORIAL_STEPS[currentStepIndex] ?? TUTORIAL_STEPS[0]!;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const progressText = useMemo(
    () => `${currentStepIndex + 1}/${TUTORIAL_STEPS.length}`,
    [currentStepIndex],
  );

  const completeTutorial = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem(HOME_TUTORIAL_SEEN_KEY, 'true');
    } finally {
      setVisible(false);
    }
  }, []);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      completeTutorial();
      return;
    }

    setCurrentStepIndex((value) => Math.min(value + 1, TUTORIAL_STEPS.length - 1));
  }, [completeTutorial, isLastStep]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={completeTutorial}
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
        testID={TEST_IDS.home.tutorialOverlay}
      >
        <View style={styles.scrim} />

        <Animated.View
          entering={FadeInDown.delay(100).duration(260)}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <View style={styles.progressPill}>
              <ThemedText style={styles.progressText}>{progressText}</ThemedText>
            </View>
            <Pressable
              testID={TEST_IDS.home.tutorialSkipButton}
              accessibilityRole="button"
              accessibilityLabel="Bỏ qua hướng dẫn"
              onPress={completeTutorial}
              hitSlop={10}
            >
              <ThemedText style={styles.skipText}>Bỏ qua</ThemedText>
            </Pressable>
          </View>

          <View style={styles.mascotStage}>
            <MascotCharacter state={currentStep.mascotState} size={104} />
          </View>

          <View style={styles.copyBlock}>
            <View style={styles.iconBadge}>
              <Ionicons name={currentStep.icon} size={20} color="#052E16" />
            </View>
            <ThemedText style={styles.title}>{currentStep.title}</ThemedText>
            <ThemedText style={styles.description}>{currentStep.description}</ThemedText>
          </View>

          <View style={styles.dotsRow}>
            {TUTORIAL_STEPS.map((step, index) => (
              <View
                key={step.title}
                style={[
                  styles.dot,
                  index === currentStepIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <Pressable
            testID={
              isLastStep
                ? TEST_IDS.home.tutorialFinishButton
                : TEST_IDS.home.tutorialNextButton
            }
            accessibilityRole="button"
            accessibilityLabel={isLastStep ? 'Hoàn tất hướng dẫn' : 'Tiếp tục hướng dẫn'}
            onPress={handleNext}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
          >
            <ThemedText style={styles.primaryText}>
              {isLastStep ? 'Xong' : 'Tiếp tục'}
            </ThemedText>
            <Ionicons
              name={isLastStep ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#052E16"
            />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 22, 0.72)',
  },
  card: {
    marginHorizontal: 18,
    marginBottom: 28,
    borderRadius: 28,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.24)',
    padding: 20,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPill: {
    minWidth: 46,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(75, 226, 119, 0.13)',
    alignItems: 'center',
  },
  progressText: {
    color: '#86EFAC',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  skipText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  mascotStage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 112,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
  },
  description: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#4BE277',
  },
  dotInactive: {
    width: 7,
    backgroundColor: 'rgba(203, 213, 225, 0.34)',
  },
  primaryButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#4BE277',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  primaryText: {
    color: '#052E16',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});

export default HomeFirstLoginTutorial;
