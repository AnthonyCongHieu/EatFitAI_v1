import { useEffect, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';

export const MOCHI_OVERLAY_ROUTE_SETTLE_MS = 800;

export const useMoChiOverlayReadiness = (
  routeName?: string | null,
): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!routeName) {
      setReady(false);
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    setReady(false);

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (AppState.currentState === 'active') {
          setReady(true);
        }
      }, MOCHI_OVERLAY_ROUTE_SETTLE_MS);
    });

    return () => {
      interactionTask.cancel();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [routeName]);

  return ready;
};
