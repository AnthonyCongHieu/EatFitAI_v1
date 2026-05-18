import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';

export type MoChiTopOverlayBlockReason = 'toast' | 'systemBanner' | 'tutorial' | 'manual';

type MoChiTopOverlayBlock = {
  reason: MoChiTopOverlayBlockReason;
  expiresAt: number;
};

type MoChiTransientGateState = {
  blocks: Record<string, MoChiTopOverlayBlock>;
  blockTopOverlay: (reason: MoChiTopOverlayBlockReason, ttlMs?: number) => () => void;
  clearTopOverlayBlock: (token: string) => void;
  pruneExpired: (now?: number) => void;
};

const DEFAULT_TOP_OVERLAY_BLOCK_TTL_MS = 4500;
let blockTokenCounter = 0;

export const hasActiveMoChiTopOverlayBlock = (
  blocks: Record<string, MoChiTopOverlayBlock>,
  now: number = Date.now(),
): boolean => Object.values(blocks).some((block) => block.expiresAt > now);

export const useMoChiTransientGateStore = create<MoChiTransientGateState>()((set) => ({
  blocks: {},
  blockTopOverlay: (reason, ttlMs = DEFAULT_TOP_OVERLAY_BLOCK_TTL_MS) => {
    const token = `${reason}-${Date.now()}-${blockTokenCounter += 1}`;
    const expiresAt = Date.now() + ttlMs;

    set((state) => ({
      blocks: {
        ...Object.fromEntries(
          Object.entries(state.blocks).filter(([, block]) => block.expiresAt > Date.now()),
        ),
        [token]: { reason, expiresAt },
      },
    }));

    return () => {
      useMoChiTransientGateStore.getState().clearTopOverlayBlock(token);
    };
  },
  clearTopOverlayBlock: (token) =>
    set((state) => {
      const { [token]: _removed, ...remaining } = state.blocks;
      return { blocks: remaining };
    }),
  pruneExpired: (now = Date.now()) =>
    set((state) => ({
      blocks: Object.fromEntries(
        Object.entries(state.blocks).filter(([, block]) => block.expiresAt > now),
      ),
    })),
}));

export const blockMoChiTopOverlay = (
  reason: MoChiTopOverlayBlockReason,
  ttlMs = DEFAULT_TOP_OVERLAY_BLOCK_TTL_MS,
): (() => void) => useMoChiTransientGateStore.getState().blockTopOverlay(reason, ttlMs);

export const useIsMoChiTopOverlayBlocked = (): boolean => {
  const blocks = useMoChiTransientGateStore((state) => state.blocks);
  const pruneExpired = useMoChiTransientGateStore((state) => state.pruneExpired);
  const [now, setNow] = useState(() => Date.now());
  const hasBlocks = Object.keys(blocks).length > 0;

  useEffect(() => {
    if (!hasBlocks) {
      return undefined;
    }

    const timer = setInterval(() => {
      const nextNow = Date.now();
      pruneExpired(nextNow);
      setNow(nextNow);
    }, 500);

    return () => clearInterval(timer);
  }, [hasBlocks, pruneExpired]);

  return useMemo(() => hasActiveMoChiTopOverlayBlock(blocks, now), [blocks, now]);
};
