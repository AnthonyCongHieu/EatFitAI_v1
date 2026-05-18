import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import { useEN } from '../../../theme/emeraldNebula';
import MoChiSprite from '../MoChiSprite';
import {
  MOCHI_TUTORIAL_STEPS,
  type MoChiTutorialStep,
} from './mochiTutorialCatalog';
import {
  type MoChiTutorialFrame,
  useMoChiTutorial,
} from './MoChiTutorialContext';
import { getMoChiTutorialSpotlightLayout } from './mochiTutorialLayout';

const MEASURE_RETRY_MS = 90;
const MEASURE_MAX_ATTEMPTS = 8;
const SHEET_MODAL_SETTLE_MS = 260;

type MoChiTutorialHostProps = {
  currentRouteName?: string | null;
};

const StepProgress = ({
  currentStepIndex,
}: {
  currentStepIndex: number;
}): React.ReactElement => (
  <View style={styles.progressRail} accessibilityRole="progressbar">
    {MOCHI_TUTORIAL_STEPS.map((step, index) => (
      <View
        key={step.id}
        style={[
          styles.progressDot,
          index <= currentStepIndex && styles.progressDotActive,
        ]}
      />
    ))}
  </View>
);

const SkipButton = ({
  onPress,
  top,
}: {
  onPress: () => void;
  top: number;
}): React.ReactElement => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Bỏ qua hướng dẫn MoChi"
    onPress={onPress}
    hitSlop={10}
    style={({ pressed }) => [
      styles.skipButton,
      { top },
      pressed && styles.pressed,
    ]}
  >
    <Ionicons name="close" size={16} color="#E5E7EB" />
    <ThemedText style={styles.skipText}>Bỏ qua</ThemedText>
  </Pressable>
);

const OverviewCard = ({
  onStart,
  onSkip,
  topInset,
}: {
  onStart: () => void;
  onSkip: () => void;
  topInset: number;
}): React.ReactElement => (
  <View style={styles.centerStage}>
    <SkipButton onPress={onSkip} top={topInset + 12} />
    <View style={styles.overviewCard}>
      <View style={styles.overviewMascot}>
        <MoChiSprite poseKey="nutritionCoachNotice" size={86} variant="full" animated />
      </View>
      <ThemedText style={styles.overviewTitle}>MoChi dẫn bạn qua 5 thao tác chính</ThemedText>
      <ThemedText style={styles.overviewBody}>
        Đi từng bước ngắn để bạn biết chạm ở đâu khi bắt đầu dùng EatFitAI.
      </ThemedText>

      <View style={styles.stepList}>
        {MOCHI_TUTORIAL_STEPS.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
            </View>
            <ThemedText style={styles.stepRowText}>{step.miniPathLabel}</ThemedText>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bắt đầu hướng dẫn MoChi"
        onPress={onStart}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.primaryButtonText}>Bắt đầu</ThemedText>
        <Ionicons name="arrow-forward" size={18} color="#082112" />
      </Pressable>
    </View>
  </View>
);

const SpotlightCard = ({
  step,
  currentStepIndex,
  onNext,
}: {
  step: MoChiTutorialStep;
  currentStepIndex: number;
  onNext: () => void;
}): React.ReactElement => (
  <View style={styles.coachCard}>
    <View style={styles.coachHeader}>
      <MoChiSprite poseKey={step.poseKey} size={58} variant="full" animated />
      <View style={styles.coachCopy}>
        <ThemedText style={styles.coachStep}>
          Bước {currentStepIndex + 1}/{MOCHI_TUTORIAL_STEPS.length}
        </ThemedText>
        <ThemedText style={styles.coachTitle}>{step.title}</ThemedText>
      </View>
    </View>
    <ThemedText style={styles.coachBody}>{step.body}</ThemedText>
    <StepProgress currentStepIndex={currentStepIndex} />
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={step.primaryActionLabel}
      onPress={onNext}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={styles.secondaryButtonText}>{step.primaryActionLabel}</ThemedText>
      <Ionicons name="chevron-forward" size={18} color="#D9FBE5" />
    </Pressable>
  </View>
);

const MissingTargetCard = ({
  step,
  currentStepIndex,
  onNext,
}: {
  step: MoChiTutorialStep;
  currentStepIndex: number;
  onNext: () => void;
}): React.ReactElement => (
  <View style={styles.centerStage}>
    <View style={styles.coachCard}>
      <View style={styles.coachHeader}>
        <MoChiSprite poseKey={step.poseKey} size={58} variant="full" animated />
        <View style={styles.coachCopy}>
          <ThemedText style={styles.coachStep}>
            Bước {currentStepIndex + 1}/{MOCHI_TUTORIAL_STEPS.length}
          </ThemedText>
          <ThemedText style={styles.coachTitle}>{step.title}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.coachBody}>
        MoChi chưa thấy đúng vị trí trên màn hình này. Bạn vẫn có thể xem bước tiếp theo.
      </ThemedText>
      <StepProgress currentStepIndex={currentStepIndex} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={step.primaryActionLabel}
        onPress={onNext}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.secondaryButtonText}>{step.primaryActionLabel}</ThemedText>
      </Pressable>
    </View>
  </View>
);

const MeasuringTargetCard = ({
  step,
  currentStepIndex,
}: {
  step: MoChiTutorialStep;
  currentStepIndex: number;
}): React.ReactElement => (
  <View style={styles.centerStage}>
    <View style={styles.coachCard}>
      <View style={styles.coachHeader}>
        <MoChiSprite poseKey={step.poseKey} size={58} variant="full" animated />
        <View style={styles.coachCopy}>
          <ThemedText style={styles.coachStep}>
            Bước {currentStepIndex + 1}/{MOCHI_TUTORIAL_STEPS.length}
          </ThemedText>
          <ThemedText style={styles.coachTitle}>MoChi đang tìm điểm chạm</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.coachBody}>
        Chờ một nhịp để MoChi đặt khung sáng đúng vị trí.
      </ThemedText>
      <StepProgress currentStepIndex={currentStepIndex} />
    </View>
  </View>
);

const MoChiTutorialHost = ({
  currentRouteName,
}: MoChiTutorialHostProps): React.ReactElement | null => {
  const EN = useEN();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const {
    phase,
    currentStep,
    currentStepIndex,
    isTutorialVisible,
    nextStep,
    skipTutorial,
    measureTarget,
  } = useMoChiTutorial();
  const [targetFrame, setTargetFrame] = useState<MoChiTutorialFrame | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [isModalReady, setIsModalReady] = useState(true);

  useEffect(() => {
    if (!isTutorialVisible) {
      setIsModalReady(true);
      return;
    }

    if (phase === 'spotlight' && currentStep?.requiresQuickAddSheet) {
      setIsModalReady(false);
      const timer = setTimeout(() => setIsModalReady(true), SHEET_MODAL_SETTLE_MS);
      return () => clearTimeout(timer);
    }

    setIsModalReady(true);
  }, [currentStep?.id, currentStep?.requiresQuickAddSheet, isTutorialVisible, phase]);

  useEffect(() => {
    if (phase !== 'spotlight' || !currentStep) {
      setTargetFrame(null);
      setTargetMissing(false);
      return;
    }

    let isActive = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const runMeasure = async () => {
      const frame = await measureTarget(currentStep.targetId);
      if (!isActive) {
        return;
      }

      if (frame) {
        setTargetFrame(frame);
        setTargetMissing(false);
        return;
      }

      attempt += 1;
      if (attempt >= MEASURE_MAX_ATTEMPTS) {
        setTargetFrame(null);
        setTargetMissing(true);
        return;
      }

      retryTimer = setTimeout(runMeasure, MEASURE_RETRY_MS);
    };

    setTargetFrame(null);
    setTargetMissing(false);
    retryTimer = setTimeout(runMeasure, currentStep.requiresQuickAddSheet ? 160 : 30);

    return () => {
      isActive = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [
    currentRouteName,
    currentStep,
    height,
    measureTarget,
    phase,
    width,
  ]);

  const spotlightLayout = useMemo(() => {
    if (!targetFrame) {
      return null;
    }

    return getMoChiTutorialSpotlightLayout({
      frame: targetFrame,
      screenWidth: width,
      screenHeight: height,
      topInset: insets.top,
      bottomInset: insets.bottom,
    });
  }, [height, insets.bottom, insets.top, targetFrame, width]);

  if (!isTutorialVisible || !isModalReady) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isTutorialVisible}
      animationType="fade"
      onRequestClose={skipTutorial}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalRoot}>
        <View
          style={[
            styles.scrim,
            {
              backgroundColor: EN.bg === '#0e1322'
                ? 'rgba(4, 8, 18, 0.74)'
                : 'rgba(7, 13, 25, 0.62)',
            },
          ]}
        />

        {phase === 'overview' && (
          <OverviewCard
            onStart={nextStep}
            onSkip={skipTutorial}
            topInset={insets.top}
          />
        )}

        {phase === 'spotlight' && currentStep && (
          <SkipButton onPress={skipTutorial} top={insets.top + 12} />
        )}

        {phase === 'spotlight' && currentStep && spotlightLayout && (
          <>
            <View pointerEvents="none" style={[styles.spotlightRing, spotlightLayout.ring]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={currentStep.primaryActionLabel}
              onPress={nextStep}
              style={[styles.targetHitArea, spotlightLayout.ring]}
            />
            <View style={[styles.spotlightCardWrap, spotlightLayout.card]}>
              <SpotlightCard
                step={currentStep}
                currentStepIndex={currentStepIndex}
                onNext={nextStep}
              />
            </View>
          </>
        )}

        {phase === 'spotlight' && currentStep && targetMissing && (
          <MissingTargetCard
            step={currentStep}
            currentStepIndex={currentStepIndex}
            onNext={nextStep}
          />
        )}

        {phase === 'spotlight' && currentStep && !spotlightLayout && !targetMissing && (
          <MeasuringTargetCard
            step={currentStep}
            currentStepIndex={currentStepIndex}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  skipButton: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.18)',
  },
  skipText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  overviewCard: {
    width: '100%',
    maxWidth: 374,
    borderRadius: 26,
    padding: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 22,
  },
  overviewMascot: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(75, 226, 119, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.24)',
    marginBottom: 12,
  },
  overviewTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  overviewBody: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0,
  },
  stepList: {
    gap: 8,
    marginTop: 18,
  },
  stepRow: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4BE277',
  },
  stepNumberText: {
    color: '#082112',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  stepRowText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: 18,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4BE277',
  },
  primaryButtonText: {
    color: '#082112',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  spotlightRing: {
    position: 'absolute',
    zIndex: 8,
    borderWidth: 3,
    borderColor: '#4BE277',
    backgroundColor: 'rgba(75, 226, 119, 0.08)',
    shadowColor: '#4BE277',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  targetHitArea: {
    position: 'absolute',
    zIndex: 9,
  },
  spotlightCardWrap: {
    position: 'absolute',
    zIndex: 12,
  },
  coachCard: {
    width: '100%',
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coachCopy: {
    flex: 1,
    minWidth: 0,
  },
  coachStep: {
    color: '#8FE7AE',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  coachTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  coachBody: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 0,
  },
  progressRail: {
    minHeight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.30)',
  },
  progressDotActive: {
    backgroundColor: '#4BE277',
  },
  secondaryButton: {
    minHeight: 42,
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(75, 226, 119, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.32)',
  },
  secondaryButtonText: {
    color: '#D9FBE5',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});

export default MoChiTutorialHost;
