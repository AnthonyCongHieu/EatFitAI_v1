import { create } from 'zustand';

import type { MoChiPetEventType } from './mochiPetEngine';

type MoChiVisibleTargetsState = {
  visibleTargets: Record<string, boolean>;
  setVisibleTarget: (
    routeName: string,
    eventType: MoChiPetEventType,
    visible: boolean,
  ) => void;
};

export const makeMoChiVisibleTargetKey = (
  routeName: string,
  eventType: MoChiPetEventType,
): string => `${routeName}:${eventType}`;

export const useMoChiVisibleTargetsStore = create<MoChiVisibleTargetsState>()((set) => ({
  visibleTargets: {},
  setVisibleTarget: (routeName, eventType, visible) =>
    set((state) => {
      const key = makeMoChiVisibleTargetKey(routeName, eventType);
      if (state.visibleTargets[key] === visible) {
        return state;
      }

      return {
        visibleTargets: {
          ...state.visibleTargets,
          [key]: visible,
        },
      };
    }),
}));

export const isMoChiVisibleTargetInline = ({
  visibleTargets,
  routeName,
  eventType,
}: {
  visibleTargets: Record<string, boolean>;
  routeName?: string | null;
  eventType: MoChiPetEventType;
}): boolean => {
  if (!routeName) {
    return false;
  }

  return Boolean(visibleTargets[makeMoChiVisibleTargetKey(routeName, eventType)]);
};
