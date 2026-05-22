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
import Svg, {
  Circle,
  Defs,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { ThemedText } from '../../../components/ThemedText';
import MoChiSprite from '../MoChiSprite';
import {
  MOCHI_TUTORIAL_FLOWS,
  type MoChiTutorialStep,
  type MoChiTutorialTargetId,
  getMoChiTutorialStepPosition,
} from './mochiTutorialCatalog';
import { type MoChiTutorialFrame, useMoChiTutorial } from './MoChiTutorialContext';
import {
  areMoChiTutorialFramesStable,
  getMoChiTutorialSpotlightLayout,
  type MoChiTutorialSpotlightLayout,
} from './mochiTutorialLayout';

const MEASURE_RETRY_MS = 80;
const MEASURE_MAX_ATTEMPTS = 16;
const DEFAULT_COACH_CARD_HEIGHT = 128;
const MIN_TARGET_SIZE = 24;
const TAB_ROUTE_NAMES = new Set(['HomeTab', 'MealDiary', 'VoiceTab', 'StatsTab', 'ProfileTab']);

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
    style={({ pressed }) => [styles.skipButton, { top }, pressed && styles.pressed]}
  >
    <Ionicons name="close" size={16} color="#E5E7EB" />
    <ThemedText style={styles.skipText}>Bỏ qua</ThemedText>
  </Pressable>
);

const getRoundedRectPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string => {
  const r = Math.min(radius, width / 2, height / 2);
  if (r <= 0) {
    return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
  }
  return `M ${x + r} ${y} h ${width - 2 * r} a ${r} ${r} 0 0 1 ${r} ${r} v ${height - 2 * r} a ${r} ${r} 0 0 1 ${-r} ${r} h ${-(width - 2 * r)} a ${r} ${r} 0 0 1 ${-r} ${-r} v ${-(height - 2 * r)} a ${r} ${r} 0 0 1 ${r} ${-r} Z`;
};

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
}): React.ReactElement => {
  const shouldRenderCircle =
    Math.abs(ring.width - ring.height) < 0.5
    && ring.borderRadius >= ring.width / 2 - 0.5;
  const maskFeather = shouldRenderCircle ? Math.max(0, ring.maskFeather ?? 0) : 0;
  const circleRadius = ring.width / 2;
  const circleCenterX = ring.left + circleRadius;
  const circleCenterY = ring.top + ring.height / 2;
  const featherStart = circleRadius > 0
    ? Math.max(0, Math.min(1, (circleRadius - maskFeather) / circleRadius))
    : 1;

  const maskHeight = screenHeight + 200;

  return (
    <Svg
      pointerEvents="none"
      width={screenWidth}
      height={maskHeight}
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        {shouldRenderCircle && maskFeather > 0 && (
          <RadialGradient
            id="mochiTutorialSpotlightFeather"
            cx={circleCenterX}
            cy={circleCenterY}
            r={circleRadius}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="black" stopOpacity="1" />
            <Stop
              offset={`${Math.round(featherStart * 100)}%`}
              stopColor="black"
              stopOpacity="1"
            />
            <Stop offset="100%" stopColor="white" stopOpacity="1" />
          </RadialGradient>
        )}
        <Mask id="mochiTutorialSpotlightMask">
          <Rect x="0" y="0" width={screenWidth} height={maskHeight} fill="white" />
          {shouldRenderCircle ? (
            <Circle
              cx={circleCenterX}
              cy={circleCenterY}
              r={circleRadius}
              fill={maskFeather > 0 ? 'url(#mochiTutorialSpotlightFeather)' : 'black'}
            />
          ) : (
            <Path
              d={getRoundedRectPath(
                ring.left,
                ring.top,
                ring.width,
                ring.height,
                ring.borderRadius,
              )}
              fill="black"
            />
          )}
        </Mask>
      </Defs>
      <Rect
        x="0"
        y="0"
        width={screenWidth}
        height={maskHeight}
        fill={color}
        mask="url(#mochiTutorialSpotlightMask)"
      />
    </Svg>
  );
};

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
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <ThemedText style={styles.primaryButtonText}>Bắt đầu</ThemedText>
        <Ionicons name="arrow-forward" size={18} color="#082112" />
      </Pressable>
    </View>
  </View>
);

const SpotlightCard = ({
  step,
  onContinue,
  onMeasured,
}: {
  step: MoChiTutorialStep;
  onContinue?: () => void;
  onMeasured?: (height: number) => void;
}): React.ReactElement => {
  const stepPosition = getMoChiTutorialStepPosition(step);
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
          <ThemedText style={styles.coachStep}>{stepPosition.displayLabel}</ThemedText>
          <ThemedText style={styles.coachTitle}>{step.title}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.coachBody}>{step.body}</ThemedText>
      <StepProgress currentFlowIndex={stepPosition.flowIndex} />
      {onContinue && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step.primaryActionLabel}
          onPress={onContinue}
          style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
        >
          <ThemedText style={styles.inlineButtonText}>
            {step.primaryActionLabel}
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color="#D9FBE5" />
        </Pressable>
      )}
    </View>
  );
};

const TransitionNote = ({
  step,
  onSkip,
  onContinue,
  topInset,
}: {
  step: MoChiTutorialStep;
  onSkip: () => void;
  onContinue: () => void;
  topInset: number;
}): React.ReactElement => {
  const stepPosition = getMoChiTutorialStepPosition(step);

  return (
    <View pointerEvents="box-none" style={styles.transitionRoot}>
      {step.coachPlacement === 'routeChip' ? (
        <View style={[styles.routeChip, { top: topInset + 18 }]}>
          <View style={styles.routeChipCopy}>
            <ThemedText style={styles.routeChipStep}>
              {stepPosition.displayLabel}
            </ThemedText>
            <ThemedText style={styles.routeChipTitle} numberOfLines={1}>
              {step.title}
            </ThemedText>
            <ThemedText style={styles.routeChipText} numberOfLines={1}>
              {step.transitionNote}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step.transitionActionLabel ?? 'Continue tutorial'}
            onPress={onContinue}
            style={({ pressed }) => [styles.routeChipAction, pressed && styles.pressed]}
          >
            <ThemedText style={styles.routeChipActionText} numberOfLines={1}>
              {step.transitionActionLabel ?? 'Continue'}
            </ThemedText>
            <Ionicons
              name={step.completionBehavior === 'complete' ? 'checkmark' : 'home'}
              size={15}
              color="#082112"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip MoChi tutorial"
            onPress={onSkip}
            hitSlop={8}
            style={({ pressed }) => [styles.routeChipSkip, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={16} color="#E5E7EB" />
          </Pressable>
        </View>
      ) : (
        <>
          <SkipButton onPress={onSkip} top={topInset + 12} />
          <View style={[styles.transitionNote, { top: topInset + 72 }]}>
            <View style={styles.transitionCopy}>
              <ThemedText style={styles.coachStep}>
                {stepPosition.displayLabel}
              </ThemedText>
              <ThemedText style={styles.transitionTitle}>{step.title}</ThemedText>
              <ThemedText style={styles.transitionText}>{step.transitionNote}</ThemedText>
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
        </>
      )}
    </View>
  );
};

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
    frameRight > 0 &&
    frame.x < screenWidth &&
    frameBottom > topInset &&
    frame.y < screenHeight - bottomInset
  );
};

const isRouteReadyForRootTarget = (
  targetId: MoChiTutorialTargetId,
  currentRouteName?: string | null,
): boolean => {
  if (!currentRouteName) {
    return false;
  }

  if (targetId === 'home_water') {
    return currentRouteName === 'HomeTab';
  }

  if (targetId === 'mochi_hub' || targetId === 'stats_tab') {
    return TAB_ROUTE_NAMES.has(currentRouteName);
  }

  return true;
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
    targetRegistryRevision,
  } = useMoChiTutorial();
  const [targetFrame, setTargetFrame] = useState<MoChiTutorialFrame | null>(null);
  const [coachCardHeight, setCoachCardHeight] = useState(DEFAULT_COACH_CARD_HEIGHT);
  const [hasReachedDestination, setHasReachedDestination] = useState(false);

  useEffect(() => {
    if (phase !== 'transition') {
      setHasReachedDestination(false);
      return;
    }
    if (currentStep?.destinationRouteName && currentRouteName === currentStep.destinationRouteName) {
      setHasReachedDestination(true);
    }
  }, [phase, currentRouteName, currentStep]);

  useEffect(() => {
    if (phase === 'transition' && currentRouteName && TAB_ROUTE_NAMES.has(currentRouteName)) {
      const hasDestination = !!currentStep?.destinationRouteName;
      if (!hasDestination || hasReachedDestination) {
        continueFromTransition();
      }
    }
  }, [phase, currentRouteName, currentStep, hasReachedDestination, continueFromTransition]);

  useEffect(() => {
    if (
      phase !== 'spotlight'
      || !currentStep
      || currentStep.surface !== 'root'
      || !isRouteReadyForRootTarget(currentStep.targetId, currentRouteName)
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
    targetRegistryRevision,
    width,
  ]);

  const spotlightBottomInset =
    currentStep?.targetId === 'mochi_hub' || currentStep?.targetId === 'stats_tab'
      ? 0
      : insets.bottom;

  const spotlightLayout = useMemo(() => {
    if (!targetFrame) {
      return null;
    }

    return getMoChiTutorialSpotlightLayout({
      frame: targetFrame,
      screenWidth: width,
      screenHeight: height,
      topInset: insets.top,
      bottomInset: spotlightBottomInset,
      highlightProfile: currentStep?.highlightProfile,
      cardHeight: coachCardHeight,
    });
  }, [
    coachCardHeight,
    currentStep?.highlightProfile,
    height,
    insets.top,
    spotlightBottomInset,
    targetFrame,
    width,
  ]);

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
          <OverviewCard onStart={nextStep} onSkip={skipTutorial} topInset={insets.top} />
        </View>
      </Modal>
    );
  }

  if (phase === 'transition' && currentStep) {
    if (
      currentStep.destinationRouteName &&
      currentRouteName !== currentStep.destinationRouteName
    ) {
      return null;
    }

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
          <TransitionNote
            step={currentStep}
            onSkip={skipTutorial}
            onContinue={continueFromTransition}
            topInset={insets.top}
          />
        </View>
      </Modal>
    );
  }

  if (
    phase !== 'spotlight' ||
    !currentStep ||
    currentStep.surface === 'smart_add_sheet'
  ) {
    return null;
  }

  const needsContinue = currentStep.activationMode === 'info_continue';

  if (!spotlightLayout) {
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
          <View pointerEvents="box-none" style={styles.rootOverlay}>
            <View pointerEvents="none" style={styles.pendingScrim} />
            <SkipButton onPress={skipTutorial} top={insets.top + 12} />
          </View>
        </View>
      </Modal>
    );
  }

  const coachLayout = spotlightLayout.card;
  const shouldRenderFocusOutline = currentStep.highlightProfile !== 'dock';

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
        <View pointerEvents="box-none" style={styles.rootOverlay}>
          <SpotlightMask
            ring={spotlightLayout.ring}
            screenWidth={width}
            screenHeight={height}
            color="rgba(4, 8, 18, 0.68)"
          />
          {shouldRenderFocusOutline && (
            <View
              pointerEvents="none"
              style={[
                styles.focusTargetOutline,
                {
                  left: spotlightLayout.ring.left,
                  top: spotlightLayout.ring.top,
                  width: spotlightLayout.ring.width,
                  height: spotlightLayout.ring.height,
                  borderRadius: spotlightLayout.ring.borderRadius,
                },
              ]}
            />
          )}
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
              onContinue={needsContinue ? advanceInformationalStep : undefined}
              onMeasured={(measuredHeight) => {
                setCoachCardHeight((previousHeight) =>
                  Math.abs(previousHeight - measuredHeight) > 2
                    ? measuredHeight
                    : previousHeight,
                );
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
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
  focusTargetOutline: {
    position: 'absolute',
    zIndex: 40,
    borderWidth: 2,
    borderColor: '#4BE277',
    backgroundColor: 'rgba(75, 226, 119, 0.055)',
    shadowColor: '#4BE277',
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
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
  routeChip: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 18,
    minHeight: 48,
    borderRadius: 18,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.30)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  routeChipCopy: {
    flex: 1,
    minWidth: 0,
  },
  routeChipStep: {
    color: '#8FE7AE',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  routeChipTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  routeChipText: {
    display: 'none',
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'BeVietnamPro_600SemiBold',
    letterSpacing: 0,
  },
  routeChipAction: {
    minHeight: 34,
    maxWidth: 138,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4BE277',
  },
  routeChipActionText: {
    color: '#082112',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0,
  },
  routeChipSkip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.16)',
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
