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
import {
  markMoChiTutorialCompleted,
  markMoChiTutorialSkipped,
  shouldAutoStartMoChiTutorial,
} from './mochiTutorialStorage';

export type MoChiTutorialPhase = 'idle' | 'overview' | 'spotlight';

export type MoChiTutorialFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MoChiTutorialTargetHandle = {
  measure: () => Promise<MoChiTutorialFrame | null>;
};

export type MoChiTutorialStartOptions = {
  source?: 'auto' | 'manual';
};

type MoChiTutorialContextValue = {
  phase: MoChiTutorialPhase;
  source: 'auto' | 'manual' | null;
  currentStepIndex: number;
  currentStep: MoChiTutorialStep | null;
  isTutorialVisible: boolean;
  activeSheetTarget: MoChiTutorialTargetId | null;
  startTutorial: (options?: MoChiTutorialStartOptions) => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  nextStep: () => void;
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
  isTutorialVisible: false,
  activeSheetTarget: null,
  startTutorial: () => undefined,
  skipTutorial: () => undefined,
  completeTutorial: () => undefined,
  nextStep: () => undefined,
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
    isTutorialVisible: phase !== 'idle',
    activeSheetTarget,
    startTutorial,
    skipTutorial,
    completeTutorial,
    nextStep,
    registerTarget,
    measureTarget,
  }), [
    activeSheetTarget,
    completeTutorial,
    currentStep,
    currentStepIndex,
    measureTarget,
    nextStep,
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
