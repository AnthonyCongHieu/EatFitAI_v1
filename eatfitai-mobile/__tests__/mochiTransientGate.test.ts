import {
  blockMoChiTopOverlay,
  hasActiveMoChiTopOverlayBlock,
  useMoChiTransientGateStore,
} from '../src/features/mochi/mochiTransientGate';

describe('MoChi transient gate', () => {
  beforeEach(() => {
    useMoChiTransientGateStore.setState({ blocks: {} });
    jest.useRealTimers();
  });

  it('blocks top overlays while a toast transient is active', () => {
    const now = Date.now();
    const cleanup = blockMoChiTopOverlay('toast', 4500);
    const blocks = useMoChiTransientGateStore.getState().blocks;

    expect(hasActiveMoChiTopOverlayBlock(blocks, now)).toBe(true);

    cleanup();
    expect(hasActiveMoChiTopOverlayBlock(useMoChiTransientGateStore.getState().blocks)).toBe(false);
  });

  it('prunes expired blockers without clearing active blockers', () => {
    const state = useMoChiTransientGateStore.getState();
    state.blockTopOverlay('toast', 1000);
    state.blockTopOverlay('manual', 6000);

    useMoChiTransientGateStore.getState().pruneExpired(Date.now() + 1500);

    const activeBlocks = Object.values(useMoChiTransientGateStore.getState().blocks);
    expect(activeBlocks).toHaveLength(1);
    expect(activeBlocks[0]?.reason).toBe('manual');
  });
});
