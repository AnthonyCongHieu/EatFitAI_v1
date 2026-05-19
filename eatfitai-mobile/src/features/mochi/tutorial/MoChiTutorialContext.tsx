import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  MOCHI_TUTORIAL_STEPS,
  type MoChiTutorialStep,
  type MoChiTutorialTargetId,
} from './mochiTutorialCatalog';
import { navigateRoot } from '../../../app/navigation/navigationRef';
import {
  markMoChiTutorialCompleted,
  markMoChiTutorialSkipped,
  shouldAutoStartMoChiTutorial,
} from './mochiTutorialStorage';

export type MoChiTutorialPhase = 'idle' | 'overview' | 'spotlight' | 'transition';

export type MoChiTutorialFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MoChiTutorialTargetHandle = {
  measure: () => Promise<MoChiTutorialFrame | null>;
  activateTarget?: () => void;
};

export type MoChiTutorialStartOptions = {
  source?: 'auto' | 'manual';
};

type MoChiTutorialContextValue = {
  phase: MoChiTutorialPhase;
  source: 'auto' | 'manual' | null;
  currentStepIndex: number;
  currentStep: MoChiTutorialStep | null;
  currentFlowId: MoChiTutorialStep['flowId'] | null;
  isTutorialVisible: boolean;
  activeSheetTarget: MoChiTutorialTargetId | null;
  startTutorial: (options?: MoChiTutorialStartOptions) => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  nextStep: () => void;
  activateCurrentTarget: () => void;
  notifyTargetActivated: (targetId: MoChiTutorialTargetId) => void;
  advanceInformationalStep: () => void;
  continueFromTransition: () => void;
  registerTarget: (
    targetId: MoChiTutorialTargetId,
    handle: MoChiTutorialTargetHandle,
  ) => () => void;
  measureTarget: (targetId: MoChiTutorialTargetId) => Promise<MoChiTutorialFrame | null>;
};

const defaultContextValue: MoChiTutorialContextValue = {
  phase: 'idle',
  source: null,
  currentStepIndex: 0,
  currentStep: null,
  currentFlowId: null,
  isTutorialVisible: false,
  activeSheetTarget: null,
  startTutorial: () => undefined,
  skipTutorial: () => undefined,
  completeTutorial: () => undefined,
  nextStep: () => undefined,
  activateCurrentTarget: () => undefined,
  notifyTargetActivated: () => undefined,
  advanceInformationalStep: () => undefined,
  continueFromTransition: () => undefined,
  registerTarget: () => () => undefined,
  measureTarget: async () => null,
};

const MoChiTutorialContext = createContext<MoChiTutorialContextValue>(defaultContextValue);

export const useMoChiTutorial = (): MoChiTutorialContextValue =>
  useContext(MoChiTutorialContext);

export const MoChiTutorialProvider = ({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}): React.ReactElement => {
  const [phase, setPhase] = useState<MoChiTutorialPhase>('idle');
  const [source, setSource] = useState<'auto' | 'manual' | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const targetsRef = useRef(new Map<MoChiTutorialTargetId, MoChiTutorialTargetHandle>());
  const autoStartCheckedRef = useRef(false);

  const currentStep = phase === 'idle'
    ? null
    : MOCHI_TUTORIAL_STEPS[currentStepIndex] ?? null;
  const activeSheetTarget =
    phase === 'spotlight' && currentStep?.requiresQuickAddSheet
      ? currentStep.targetId
      : null;
  const currentFlowId = currentStep?.flowId ?? null;

  const startTutorial = useCallback((options?: MoChiTutorialStartOptions) => {
    if (!enabled) {
      return;
    }

    setSource(options?.source ?? 'manual');
    setCurrentStepIndex(0);
    setPhase('overview');
  }, [enabled]);

  const resetState = useCallback(() => {
    setPhase('idle');
    setSource(null);
    setCurrentStepIndex(0);
  }, []);

  const skipTutorial = useCallback(() => {
    resetState();
    markMoChiTutorialSkipped().catch(() => undefined);
  }, [resetState]);

  const completeTutorial = useCallback(() => {
    resetState();
    markMoChiTutorialCompleted().catch(() => undefined);
  }, [resetState]);

  const nextStep = useCallback(() => {
    if (phase === 'overview') {
      navigateRoot('AppTabs', { screen: 'HomeTab' } as never);
      setCurrentStepIndex(0);
      setPhase('spotlight');
      return;
    }

    if (phase !== 'spotlight') {
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= MOCHI_TUTORIAL_STEPS.length) {
      completeTutorial();
      return;
    }

    setCurrentStepIndex(nextIndex);
  }, [completeTutorial, currentStepIndex, phase]);

  const activateTarget = useCallback((targetId: MoChiTutorialTargetId): boolean => {
    const handler = targetsRef.current.get(targetId)?.activateTarget;
    if (!handler) {
      return false;
    }

    handler();
    return true;
  }, []);

  const getNextFlowStepIndex = useCallback(() => {
    if (!currentStep) {
      return -1;
    }

    const nextFlowStepIndex = MOCHI_TUTORIAL_STEPS.findIndex(
      (step, index) => index > currentStepIndex && step.flowId !== currentStep.flowId,
    );

    return nextFlowStepIndex;
  }, [currentStep, currentStepIndex]);

  const navigateHomeForNextStep = useCallback((nextStepIndex: number) => {
    const nextFlowStep = MOCHI_TUTORIAL_STEPS[nextStepIndex];
    const params = nextFlowStep?.targetId === 'home_water'
      ? { screen: 'HomeTab', params: { focusWaterRequestId: Date.now() } }
      : { screen: 'HomeTab' };

    navigateRoot('AppTabs', params as never);
  }, []);

  const continueFromTransition = useCallback(() => {
    if (phase !== 'transition') {
      return;
    }

    if (!currentStep) {
      resetState();
      return;
    }

    if (currentStep.completionBehavior === 'complete') {
      completeTutorial();
      return;
    }

    const nextFlowStepIndex = getNextFlowStepIndex();

    if (nextFlowStepIndex < 0) {
      completeTutorial();
      return;
    }

    if (currentStep.completionBehavior === 'navigate_then_wait') {
      navigateHomeForNextStep(nextFlowStepIndex);
    }

    setCurrentStepIndex(nextFlowStepIndex);
    setPhase('spotlight');
  }, [
    completeTutorial,
    currentStep,
    getNextFlowStepIndex,
    navigateHomeForNextStep,
    phase,
    resetState,
  ]);

  const notifyTargetActivated = useCallback((targetId: MoChiTutorialTargetId) => {
    if (phase !== 'spotlight' || !currentStep || currentStep.targetId !== targetId) {
      return;
    }

    if (currentStep.activationMode === 'target_press_advance') {
      setCurrentStepIndex((index) => Math.min(index + 1, MOCHI_TUTORIAL_STEPS.length - 1));
      return;
    }

    if (
      currentStep.activationMode === 'target_press_destination'
      || currentStep.activationMode === 'target_press_complete'
    ) {
      setPhase('transition');
    }
  }, [currentStep, phase]);

  const advanceInformationalStep = useCallback(() => {
    if (phase !== 'spotlight' || !currentStep || currentStep.activationMode !== 'info_continue') {
      return;
    }

    const nextFlowStepIndex = getNextFlowStepIndex();
    if (nextFlowStepIndex < 0) {
      completeTutorial();
      return;
    }

    setCurrentStepIndex(nextFlowStepIndex);
    setPhase('spotlight');
  }, [completeTutorial, currentStep, getNextFlowStepIndex, phase]);

  const activateCurrentTarget = useCallback(() => {
    if (phase !== 'spotlight' || !currentStep) {
      return;
    }

    if (currentStep.targetId === 'mochi_hub') {
      activateTarget(currentStep.targetId);
      notifyTargetActivated(currentStep.targetId);
      return;
    }

    if (currentStep.id === 'scan_choose_action') {
      if (!activateTarget(currentStep.targetId)) {
        navigateRoot('AiCamera');
      }
      notifyTargetActivated(currentStep.targetId);
      return;
    }

    if (currentStep.id === 'add_meal_choose_action') {
      if (!activateTarget(currentStep.targetId)) {
        navigateRoot('FoodSearch', {
          autoFocus: true,
          showQuickSuggestions: true,
          returnToDiaryOnSave: true,
        });
      }
      notifyTargetActivated(currentStep.targetId);
      return;
    }

    if (currentStep.id === 'stats_open_tab') {
      if (!activateTarget(currentStep.targetId)) {
        navigateRoot('AppTabs', { screen: 'StatsTab' } as never);
      }
      notifyTargetActivated(currentStep.targetId);
      return;
    }

    activateTarget(currentStep.targetId);
    if (currentStep.activationMode === 'info_continue') {
      advanceInformationalStep();
      return;
    }

    notifyTargetActivated(currentStep.targetId);
  }, [
    activateTarget,
    advanceInformationalStep,
    currentStep,
    notifyTargetActivated,
    phase,
  ]);

  const registerTarget = useCallback((
    targetId: MoChiTutorialTargetId,
    handle: MoChiTutorialTargetHandle,
  ) => {
    targetsRef.current.set(targetId, handle);

    return () => {
      if (targetsRef.current.get(targetId) === handle) {
        targetsRef.current.delete(targetId);
      }
    };
  }, []);

  const measureTarget = useCallback(async (targetId: MoChiTutorialTargetId) => {
    const handle = targetsRef.current.get(targetId);
    return handle ? handle.measure() : null;
  }, []);

  useEffect(() => {
    if (!enabled || autoStartCheckedRef.current) {
      return;
    }

    autoStartCheckedRef.current = true;
    let isActive = true;

    shouldAutoStartMoChiTutorial()
      .then((shouldStart) => {
        if (isActive && shouldStart) {
          startTutorial({ source: 'auto' });
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [enabled, startTutorial]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    autoStartCheckedRef.current = false;
    resetState();
  }, [enabled, resetState]);

  const value = useMemo<MoChiTutorialContextValue>(() => ({
    phase,
    source,
    currentStepIndex,
    currentStep,
    currentFlowId,
    isTutorialVisible: phase !== 'idle',
    activeSheetTarget,
    startTutorial,
    skipTutorial,
    completeTutorial,
    nextStep,
    activateCurrentTarget,
    notifyTargetActivated,
    advanceInformationalStep,
    continueFromTransition,
    registerTarget,
    measureTarget,
  }), [
    activeSheetTarget,
    completeTutorial,
    currentStep,
    currentFlowId,
    currentStepIndex,
    activateCurrentTarget,
    advanceInformationalStep,
    continueFromTransition,
    measureTarget,
    nextStep,
    notifyTargetActivated,
    phase,
    registerTarget,
    skipTutorial,
    source,
    startTutorial,
  ]);

  return (
    <MoChiTutorialContext.Provider value={value}>
      {children}
    </MoChiTutorialContext.Provider>
  );
};
