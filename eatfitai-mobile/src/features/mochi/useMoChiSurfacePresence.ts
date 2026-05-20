import { useEffect, useMemo } from 'react';

import {
  useMoChiSurfaceCoordinator,
  type MoChiRenderedSurface,
} from './mochiSurfaceCoordinator';
import type { MoChiPetEventType } from './mochiPetEngine';

type UseMoChiSurfacePresenceOptions = {
  id: string;
  surface: MoChiRenderedSurface;
  routeName?: string | null;
  eventType?: MoChiPetEventType;
  priority?: number;
  blocks?: readonly MoChiRenderedSurface[];
  ttlMs?: number;
  enabled?: boolean;
};

const EMPTY_BLOCKS: readonly MoChiRenderedSurface[] = [];

export const useMoChiSurfacePresence = ({
  id,
  surface,
  routeName,
  eventType,
  priority = 50,
  blocks = EMPTY_BLOCKS,
  ttlMs,
  enabled = true,
}: UseMoChiSurfacePresenceOptions): void => {
  const registerSurface = useMoChiSurfaceCoordinator((state) => state.registerSurface);
  const pruneExpired = useMoChiSurfaceCoordinator((state) => state.pruneExpired);
  const registeredBlocks = useMemo(
    () => (blocks.length > 0 ? [...blocks] : undefined),
    [blocks],
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unregister = registerSurface({
      id,
      surface,
      routeName,
      eventType,
      priority,
      blocks: registeredBlocks,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });

    if (!ttlMs) {
      return unregister;
    }

    const timer = setTimeout(() => {
      unregister();
      pruneExpired(Date.now());
    }, ttlMs);

    return () => {
      clearTimeout(timer);
      unregister();
    };
  }, [
    id,
    surface,
    routeName,
    eventType,
    priority,
    registeredBlocks,
    ttlMs,
    enabled,
    registerSurface,
    pruneExpired,
  ]);
};
