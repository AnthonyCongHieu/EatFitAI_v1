import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { MoChiIslandMode } from './mochiIslandEngine';

type MoChiIslandLayoutSnapshot = {
  mode: MoChiIslandMode;
  height: number;
  topOffset: number;
  isExpanded: boolean;
};

type MoChiIslandLayoutContextValue = MoChiIslandLayoutSnapshot & {
  setIslandLayout: (nextLayout: MoChiIslandLayoutSnapshot) => void;
};

const DEFAULT_LAYOUT: MoChiIslandLayoutSnapshot = {
  mode: 'compact',
  height: 0,
  topOffset: 0,
  isExpanded: false,
};

const MoChiIslandLayoutContext = createContext<MoChiIslandLayoutContextValue>({
  ...DEFAULT_LAYOUT,
  setIslandLayout: () => undefined,
});

export const MoChiIslandLayoutProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const [layout, setLayout] = useState<MoChiIslandLayoutSnapshot>(DEFAULT_LAYOUT);

  const setIslandLayout = useCallback((nextLayout: MoChiIslandLayoutSnapshot) => {
    setLayout((current) => {
      if (
        current.mode === nextLayout.mode &&
        current.height === nextLayout.height &&
        current.topOffset === nextLayout.topOffset &&
        current.isExpanded === nextLayout.isExpanded
      ) {
        return current;
      }

      return nextLayout;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...layout,
      setIslandLayout,
    }),
    [layout, setIslandLayout],
  );

  return (
    <MoChiIslandLayoutContext.Provider value={value}>
      {children}
    </MoChiIslandLayoutContext.Provider>
  );
};

export const useMoChiIslandLayout = (): MoChiIslandLayoutContextValue =>
  useContext(MoChiIslandLayoutContext);

export const useMoChiIslandLayoutController = (): MoChiIslandLayoutContextValue =>
  useContext(MoChiIslandLayoutContext);
