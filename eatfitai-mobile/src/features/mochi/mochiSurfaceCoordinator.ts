import { create } from 'zustand';

import type { MoChiPetEventType } from './mochiPetEngine';

export type MoChiRenderedSurface =
  | 'tutorial'
  | 'modal'
  | 'sheet'
  | 'toast'
  | 'topOverlay'
  | 'inlineNotice'
  | 'bottomDock'
  | 'systemBanner'
  | 'manualBlock';

export type ActiveMoChiRenderedSurface = {
  id: string;
  surface: MoChiRenderedSurface;
  routeName?: string | null;
  eventType?: MoChiPetEventType;
  priority: number;
  blocks?: MoChiRenderedSurface[];
  expiresAt?: number;
};

export type ActiveMoChiSurfaceRegistry = Record<string, ActiveMoChiRenderedSurface>;

type CanShowMoChiTopOverlayInput = {
  active: ActiveMoChiSurfaceRegistry;
  routeName?: string | null;
  eventType?: MoChiPetEventType;
  ignoredSurfaceId?: string;
  now?: number;
};

type MoChiSurfaceCoordinatorState = {
  active: ActiveMoChiSurfaceRegistry;
  registerSurface: (surface: ActiveMoChiRenderedSurface) => () => void;
  unregisterSurface: (id: string) => void;
  pruneExpired: (now?: number) => void;
  canShowTopOverlay: (
    routeName?: string | null,
    eventType?: MoChiPetEventType,
    ignoredSurfaceId?: string,
  ) => boolean;
  isBusy: (routeName?: string | null) => boolean;
};

const GLOBAL_TOP_OVERLAY_BLOCKERS = new Set<MoChiRenderedSurface>([
  'tutorial',
  'modal',
  'sheet',
  'toast',
  'systemBanner',
  'manualBlock',
]);

const isSurfaceActive = (
  surface: ActiveMoChiRenderedSurface,
  now: number,
): boolean => !surface.expiresAt || surface.expiresAt > now;

const pruneSurfaceRegistry = (
  active: ActiveMoChiSurfaceRegistry,
  now: number,
): ActiveMoChiSurfaceRegistry =>
  Object.fromEntries(
    Object.entries(active).filter(([, surface]) => isSurfaceActive(surface, now)),
  );

const blocksTopOverlayOnRoute = ({
  surface,
  routeName,
}: {
  surface: ActiveMoChiRenderedSurface;
  routeName?: string | null;
}): boolean => {
  if (surface.surface === 'bottomDock') {
    return false;
  }

  if (surface.surface === 'topOverlay') {
    return true;
  }

  if (surface.surface === 'inlineNotice') {
    return Boolean(
      routeName
        && surface.routeName === routeName
        && surface.blocks?.includes('topOverlay'),
    );
  }

  return (
    GLOBAL_TOP_OVERLAY_BLOCKERS.has(surface.surface)
    || Boolean(surface.blocks?.includes('topOverlay'))
  );
};

export const canShowMoChiTopOverlay = ({
  active,
  routeName,
  ignoredSurfaceId,
  now = Date.now(),
}: CanShowMoChiTopOverlayInput): boolean =>
  !Object.values(active).some((surface) => {
    if (surface.id === ignoredSurfaceId) {
      return false;
    }

    if (!isSurfaceActive(surface, now)) {
      return false;
    }

    return blocksTopOverlayOnRoute({ surface, routeName });
  });

export const isMoChiBusy = (
  active: ActiveMoChiSurfaceRegistry,
  now: number = Date.now(),
  routeName?: string | null,
): boolean =>
  Object.values(active).some((surface) => {
    if (!isSurfaceActive(surface, now) || surface.surface === 'bottomDock') {
      return false;
    }

    if (surface.surface === 'inlineNotice' && routeName) {
      return surface.routeName === routeName;
    }

    return true;
  });

export const useMoChiSurfaceCoordinator = create<MoChiSurfaceCoordinatorState>()(
  (set, get) => ({
    active: {},
    registerSurface: (surface) => {
      set((state) => ({
        active: {
          ...pruneSurfaceRegistry(state.active, Date.now()),
          [surface.id]: surface,
        },
      }));

      return () => {
        useMoChiSurfaceCoordinator.getState().unregisterSurface(surface.id);
      };
    },
    unregisterSurface: (id) => {
      set((state) => {
        const { [id]: _removed, ...remaining } = state.active;
        return { active: remaining };
      });
    },
    pruneExpired: (now = Date.now()) => {
      set((state) => ({
        active: pruneSurfaceRegistry(state.active, now),
      }));
    },
    canShowTopOverlay: (routeName, eventType, ignoredSurfaceId) =>
      canShowMoChiTopOverlay({
        active: get().active,
        routeName,
        eventType,
        ignoredSurfaceId,
      }),
    isBusy: (routeName) => isMoChiBusy(get().active, Date.now(), routeName),
  }),
);
