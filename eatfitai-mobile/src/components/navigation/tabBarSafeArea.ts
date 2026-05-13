import type { PlatformOSType } from 'react-native';

export const MIN_ANDROID_TAB_SAFE_BOTTOM = 16;

export const resolveBottomTabSafePadding = (
  platform: PlatformOSType,
  bottomInset: number,
): number => {
  if (platform === 'ios') {
    return Math.max(bottomInset, 0);
  }

  return Math.max(bottomInset, MIN_ANDROID_TAB_SAFE_BOTTOM);
};
