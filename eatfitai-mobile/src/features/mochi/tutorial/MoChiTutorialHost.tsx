import React, { useEffect, useMemo, useState } from 'react';
import {
  type LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { ThemedText } from '../../../components/ThemedText';
import MoChiSprite from '../MoChiSprite';
import {
  MOCHI_TUTORIAL_FLOWS,
  type MoChiTutorialStep,
  getMoChiTutorialFlowIndex,
} from './mochiTutorialCatalog';
import {
  type MoChiTutorialFrame,
  useMoChiTutorial,
} from './MoChiTutorialContext';
import {
  areMoChiTutorialFramesStable,
  getMoChiTutorialSpotlightLayout,
  type MoChiTutorialSpotlightLayout,
} from './mochiTutorialLayout';

const MEASURE_RETRY_MS = 80;
const MEASURE_MAX_ATTEMPTS = 16;
const DEFAULT_COACH_CARD_HEIGHT = 128;
const MIN_TARGET_SIZE = 24;

type MoChiTutorialHostProps = {
  currentRouteName?: string | null;
};

const StepProgress = ({
  currentFlowIndex,
}: {
  currentFlowIndex: number;
}): React.ReactElement => (
  <View style={styles.progressRail} accessibilityRole="progressbar">
    {MOCHI_TUTORIAL_FLOWS.map((flow, index) => (
      <View
        key={flow.id}
        style={[
          styles.progressDot,
          index <= currentFlowIndex && styles.progressDotActive,
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

const SpotlightMask = ({
  ring,
  screenWidth,
  screenHeight,
  color,
}: {
  ring: MoChiTutorialSpotlightLayout['ring'];
  screenWidth: number;
  screenHeight: number;
  color: string;
}): React.ReactElement => (
  <Svg pointerEvents="none" width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFill}>
    <Defs>
      <Mask id="mochiTutorialSpotlightMask">
        <Rect x="0" y="0" width={screenWidth} height={screenHeight} fill="white" />
        <Rect
          x={ring.left}
          y={ring.top}
          width={ring.width}
          height={ring.height}
          rx={ring.borderRadius}
          ry={ring.borderRadius}
          fill="black"
        />
      </Mask>
    </Defs>
    <Rect
      x="0"
      y="0"
      width={screenWidth}
      height={screenHeight}
      fill={color}
      mask="url(#mochiTutorialSpotlightMask)"
    />
  </Svg>
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
        <MoChiSprite poseKey="nutritionCoachNotice" size={82} variant="full" animated />
      </View>
      <ThemedText style={styles.overviewTitle}>MoChi: 4 điểm chính</ThemedText>
      <ThemedText style={styles.overviewBody}>
        Chạm thử từng điểm. Có thể bỏ qua bất cứ lúc nào.
      </ThemedText>

      <View style={styles.stepList}>
        {MOCHI_TUTORIAL_FLOWS.map((flow, index) => (
          <View key={flow.id} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
            </View>
            <ThemedText style={styles.stepRowText}>{flow.miniPathLabel}</ThemedText>
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
  currentFlowIndex,
  onContinue,
  onMeasured,
}: {
  step: MoChiTutorialStep;
  currentFlowIndex: number;
  onContinue?: () => void;
  onMeasured?: (height: number) => void;
}): React.ReactElement => {
  const handleLayout = (event: LayoutChangeEvent) => {
    const measuredHeight = event.nativeEvent.layout.height;
    if (measuredHeight > 0) {
      onMeasured?.(measuredHeight);
    }
  };

  return (
  <View style={styles.coachCard} onLayout={handleLayout}>
    <View style={styles.coachHeader}>
      <MoChiSprite poseKey={step.poseKey} size={38} variant="full" animated />
      <View style={styles.coachCopy}>
        <ThemedText style={styles.coachStep}>
          {currentFlowIndex + 1}/{MOCHI_TUTORIAL_FLOWS.length}
        </ThemedText>
        <ThemedText style={styles.coachTitle}>{step.title}</ThemedText>
      </View>
    </View>
    <ThemedText style={styles.coachBody}>{step.body}</ThemedText>
    <StepProgress currentFlowIndex={currentFlowIndex} />
    {onContinue && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={step.primaryActionLabel}
        onPress={onContinue}
        style={({ pressed }) => [
          styles.inlineButton,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.inlineButtonText}>{step.primaryActionLabel}</ThemedText>
        <Ionicons name="chevron-forward" size={16} color="#D9FBE5" />
      </Pressable>
    )}
  </View>
  );
};

const TransitionNote = ({
  step,
  currentFlowIndex,
  onSkip,
  onContinue,
  topInset,
}: {
  step: MoChiTutorialStep;
  currentFlowIndex: number;
  onSkip: () => void;
  onContinue: () => void;
  topInset: number;
}): React.ReactElement => (
  <View pointerEvents="box-none" style={styles.transitionRoot}>
    <SkipButton onPress={onSkip} top={topInset + 12} />
    <View style={[styles.transitionNote, { top: topInset + 72 }]}>
      <View style={styles.transitionCopy}>
        <ThemedText style={styles.coachStep}>
          {currentFlowIndex + 1}/{MOCHI_TUTORIAL_FLOWS.length}
        </ThemedText>
        <ThemedText style={styles.transitionTitle}>{step.title}</ThemedText>
        <ThemedText style={styles.transitionText}>
          {step.transitionNote}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={step.transitionActionLabel ?? 'Tiếp tục hướng dẫn'}
        onPress={onContinue}
        style={({ pressed }) => [
          styles.transitionButton,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.transitionButtonText}>
          {step.transitionActionLabel ?? 'Tiếp tục'}
        </ThemedText>
        <Ionicons
          name={step.completionBehavior === 'complete' ? 'checkmark' : 'home'}
          size={16}
          color="#D9FBE5"
        />
      </Pressable>
    </View>
  </View>
);

const isValidTargetFrame = (
  frame: MoChiTutorialFrame | null,
  screenWidth: number,
  screenHeight: number,
  topInset: number,
  bottomInset: number,
): frame is MoChiTutorialFrame => {
  if (!frame) {
    return false;
  }

  const values = [frame.x, frame.y, frame.width, frame.height];
  if (values.some((value) => !Number.isFinite(value))) {
    return false;
  }

  if (frame.width < MIN_TARGET_SIZE || frame.height < MIN_TARGET_SIZE) {
    return false;
  }

  const frameRight = frame.x + frame.width;
  const frameBottom = frame.y + frame.height;

  return (
    frameRight > 0
    && frame.x < screenWidth
    && frameBottom > topInset
    && frame.y < screenHeight - bottomInset
  );
};

const MoChiTutorialHost = ({
  currentRouteName,
}: MoChiTutorialHostProps): React.ReactElement | null => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const {
    phase,
    currentStep,
    isTutorialVisible,
    nextStep,
    advanceInformationalStep,
    continueFromTransition,
    skipTutorial,
    measureTarget,
    activateCurrentTarget,
  } = useMoChiTutorial();
  const [targetFrame, setTargetFrame] = useState<MoChiTutorialFrame | null>(null);
  const [coachCardHeight, setCoachCardHeight] = useState(DEFAULT_COACH_CARD_HEIGHT);

  useEffect(() => {
    if (
      phase !== 'spotlight'
      || !currentStep
      || currentStep.surface !== 'root'
    ) {
      setTargetFrame(null);
      return;
    }

    let isActive = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let previousFrame: MoChiTutorialFrame | null = null;
    let lastValidFrame: MoChiTutorialFrame | null = null;

    const runMeasure = async () => {
      const measuredFrame = await measureTarget(currentStep.targetId);
      if (!isActive) {
        return;
      }

      const frame = isValidTargetFrame(
        measuredFrame,
        width,
        height,
        insets.top,
        insets.bottom,
      )
        ? measuredFrame
        : null;

      if (frame) {
        lastValidFrame = frame;

        if (areMoChiTutorialFramesStable(previousFrame, frame)) {
          setTargetFrame(frame);
          return;
        }

        previousFrame = frame;
      } else {
        previousFrame = null;
      }

      attempt += 1;
      if (attempt >= MEASURE_MAX_ATTEMPTS) {
        setTargetFrame(lastValidFrame);
        return;
      }

      retryTimer = setTimeout(runMeasure, MEASURE_RETRY_MS);
    };

    setTargetFrame(null);
    retryTimer = setTimeout(runMeasure, 40);

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
    insets.bottom,
    insets.top,
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
      highlightProfile: currentStep?.highlightProfile,
      cardHeight: coachCardHeight,
    });
  }, [coachCardHeight, currentStep?.highlightProfile, height, insets.bottom, insets.top, targetFrame, width]);

  if (!isTutorialVisible) {
    return null;
  }

  if (phase === 'overview') {
    return (
      <Modal
        transparent
        visible
        animationType="fade"
        onRequestClose={skipTutorial}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalRoot}>
          <View style={styles.overviewScrim} />
          <OverviewCard
            onStart={nextStep}
            onSkip={skipTutorial}
            topInset={insets.top}
          />
        </View>
      </Modal>
    );
  }

  const currentFlowIndex = currentStep
    ? Math.max(0, getMoChiTutorialFlowIndex(currentStep.flowId))
    : 0;

  if (phase === 'transition' && currentStep) {
    if (
      currentStep.destinationRouteName
      && currentRouteName !== currentStep.destinationRouteName
    ) {
      return null;
    }

    return (
      <TransitionNote
        step={currentStep}
        currentFlowIndex={currentFlowIndex}
        onSkip={skipTutorial}
        onContinue={continueFromTransition}
        topInset={insets.top}
      />
    );
  }

  if (
    phase !== 'spotlight'
    || !currentStep
    || currentStep.surface === 'smart_add_sheet'
  ) {
    return null;
  }

  const needsContinue = currentStep.activationMode === 'info_continue';

  if (!spotlightLayout) {
    return (
      <View pointerEvents="box-none" style={styles.rootOverlay}>
        <View pointerEvents="none" style={styles.pendingScrim} />
        <SkipButton onPress={skipTutorial} top={insets.top + 12} />
      </View>
    );
  }

  const coachLayout = spotlightLayout.card;

  return (
    <View pointerEvents="box-none" style={styles.rootOverlay}>
      <SpotlightMask
        ring={spotlightLayout.ring}
        screenWidth={width}
        screenHeight={height}
        color="rgba(4, 8, 18, 0.68)"
      />
      {!needsContinue && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chạm vào ${currentStep?.title || 'mục tiêu'}`}
          onPress={activateCurrentTarget}
          style={{
            position: 'absolute',
            left: spotlightLayout.ring.left,
            top: spotlightLayout.ring.top,
            width: spotlightLayout.ring.width,
            height: spotlightLayout.ring.height,
            borderRadius: spotlightLayout.ring.borderRadius,
            backgroundColor: 'rgba(0, 0, 0, 0.01)',
            zIndex: 42,
          }}
        />
      )}
      <SkipButton onPress={skipTutorial} top={insets.top + 12} />
      <View
        pointerEvents={needsContinue ? 'auto' : 'none'}
        style={[
          styles.spotlightCardWrap,
          {
            left: coachLayout.left,
            top: coachLayout.top,
            width: coachLayout.width,
            minHeight: coachLayout.height,
          },
        ]}
      >
        <SpotlightCard
          step={currentStep}
          currentFlowIndex={currentFlowIndex}
          onContinue={needsContinue ? advanceInformationalStep : undefined}
          onMeasured={(measuredHeight) => {
            setCoachCardHeight((previousHeight) => (
              Math.abs(previousHeight - measuredHeight) > 2
                ? measuredHeight
                : previousHeight
            ));
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  rootOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  overviewScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 18, 0.78)',
  },
  pendingScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 18, 0.28)',
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  transitionRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 44,
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
    fontFamily: 'BeVietnamPro_700Bold',
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
    width: 96,
    height: 96,
    borderRadius: 48,
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
    fontFamily: 'BeVietnamPro_700Bold',
    textAlign: 'center',
    letterSpacing: 0,
  },
  overviewBody: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'BeVietnamPro_600SemiBold',
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
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  stepRowText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
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
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  spotlightCardWrap: {
    position: 'absolute',
    zIndex: 12,
  },
  coachCard: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coachCopy: {
    flex: 1,
    minWidth: 0,
  },
  coachStep: {
    color: '#8FE7AE',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  coachTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  coachBody: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginTop: 6,
    letterSpacing: 0,
  },
  transitionNote: {
    position: 'absolute',
    left: 18,
    right: 18,
    zIndex: 16,
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.24)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  transitionCopy: {
    flex: 1,
    minWidth: 0,
  },
  transitionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  transitionText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
    letterSpacing: 0,
  },
  transitionButton: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(75, 226, 119, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.32)',
  },
  transitionButtonText: {
    color: '#D9FBE5',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  progressRail: {
    minHeight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.30)',
  },
  progressDotActive: {
    backgroundColor: '#4BE277',
  },
  inlineButton: {
    minHeight: 36,
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(75, 226, 119, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.32)',
  },
  inlineButtonText: {
    color: '#D9FBE5',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});

export default MoChiTutorialHost;
