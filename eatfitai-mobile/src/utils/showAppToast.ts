import Toast, { type ToastShowParams } from 'react-native-toast-message';

import { useMoChiSurfaceCoordinator } from '../features/mochi/mochiSurfaceCoordinator';

const DEFAULT_APP_TOAST_VISIBILITY_MS = 4500;
const TOAST_SURFACE_CLEANUP_GRACE_MS = 250;

let toastSurfaceCounter = 0;

export const showAppToast = (params: ToastShowParams): void => {
  const visibilityTime = params.visibilityTime ?? DEFAULT_APP_TOAST_VISIBILITY_MS;
  const shouldAutoHide = params.autoHide !== false;
  const unregister = useMoChiSurfaceCoordinator.getState().registerSurface({
    id: `toast:${Date.now()}:${toastSurfaceCounter += 1}`,
    surface: 'toast',
    priority: 80,
    blocks: ['topOverlay'],
    expiresAt: Date.now() + visibilityTime + TOAST_SURFACE_CLEANUP_GRACE_MS,
  });
  let didUnregister = false;
  const unregisterOnce = () => {
    if (didUnregister) {
      return;
    }

    didUnregister = true;
    unregister();
  };
  const fallbackTimer = shouldAutoHide
    ? setTimeout(
      unregisterOnce,
      visibilityTime + TOAST_SURFACE_CLEANUP_GRACE_MS,
    )
    : undefined;

  Toast.show({
    ...params,
    visibilityTime,
    onHide: () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      unregisterOnce();
      params.onHide?.();
    },
  });
};
