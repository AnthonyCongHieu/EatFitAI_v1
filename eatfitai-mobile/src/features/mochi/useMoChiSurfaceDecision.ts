import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  createEmptyMoChiPolicyMemory,
  normalizeMoChiPolicyMemory,
  recordMoChiPolicyEvent,
  resolveMoChiSurfaceDecision,
  type MoChiPolicyAction,
  type MoChiPolicyMemory,
  type MoChiPolicySession,
  type MoChiSurfaceDecision,
} from './mochiNudgePolicy';
import type { MoChiNudgeCandidate } from './useMoChiNudgeContext';

const MOCHI_POLICY_MEMORY_KEY = '@eatfitai_mochi_policy_memory_v1';

const readPolicyMemory = async (): Promise<MoChiPolicyMemory | null> => {
  const raw = await AsyncStorage.getItem(MOCHI_POLICY_MEMORY_KEY);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as MoChiPolicyMemory;
};

const persistPolicyMemory = async (memory: MoChiPolicyMemory): Promise<void> => {
  await AsyncStorage.setItem(MOCHI_POLICY_MEMORY_KEY, JSON.stringify(memory));
};

export const useMoChiSurfaceDecision = (
  candidate: MoChiNudgeCandidate | null,
): {
  decision: MoChiSurfaceDecision | null;
  recordDecision: (decision: MoChiSurfaceDecision, action: MoChiPolicyAction) => void;
} => {
  const [memory, setMemory] = useState<MoChiPolicyMemory>(() =>
    createEmptyMoChiPolicyMemory(),
  );
  const [memoryReady, setMemoryReady] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const sessionRef = useRef<MoChiPolicySession>({
    overlayCount: 0,
    messageCount: 0,
  });

  useEffect(() => {
    let cancelled = false;

    readPolicyMemory()
      .then((stored) => {
        if (!cancelled) {
          setMemory(normalizeMoChiPolicyMemory(stored));
          setMemoryReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMemory(createEmptyMoChiPolicyMemory());
          setMemoryReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        sessionRef.current = { overlayCount: 0, messageCount: 0 };
        setSessionVersion((version) => version + 1);
      }
    });

    return () => subscription.remove();
  }, []);

  const decision = useMemo(() => {
    if (!memoryReady || !candidate) {
      return null;
    }

    return resolveMoChiSurfaceDecision({
      eventType: candidate.eventType,
      routeName: candidate.routeName,
      preferredSurface: candidate.preferredSurface,
      hasStrongTiming: candidate.hasStrongTiming,
      isCollisionSafe: candidate.isCollisionSafe,
      bypassOverlayCooldown: candidate.bypassOverlayCooldown,
      memory,
      session: sessionRef.current,
    });
  }, [candidate, memory, memoryReady, sessionVersion]);

  const recordDecision = useCallback((
    surfaceDecision: MoChiSurfaceDecision,
    action: MoChiPolicyAction,
  ) => {
    if (action === 'shown') {
      if (surfaceDecision.surface === 'overlay') {
        sessionRef.current.overlayCount += 1;
      }
      if (['overlay', 'toast', 'systemNotification'].includes(surfaceDecision.surface)) {
        sessionRef.current.messageCount += 1;
      }
      setSessionVersion((version) => version + 1);
    }

    setMemory((current) => {
      const next = recordMoChiPolicyEvent(current, surfaceDecision, action);
      void persistPolicyMemory(next).catch(() => {});
      return next;
    });
  }, []);

  return { decision, recordDecision };
};
