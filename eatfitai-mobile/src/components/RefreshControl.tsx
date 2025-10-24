import { RefreshControl as RNRefreshControl, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type RefreshControlProps = {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  title?: string;
  titleColor?: string;
  progressBackgroundColor?: string;
  size?: 'small' | 'large';
  animated?: boolean;
};

export const RefreshControl = ({
  refreshing,
  onRefresh,
  tintColor,
  title,
  titleColor,
  progressBackgroundColor,
  size = 'large',
  animated = true
}: RefreshControlProps): JSX.Element => {
  const { theme } = useAppTheme();

  const progressValue = useSharedValue(0);

  const finalTintColor = tintColor || theme.colors.primary;
  const finalTitleColor = titleColor || theme.colors.muted;
  const finalProgressBackgroundColor = progressBackgroundColor || theme.colors.background;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progressValue.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progressValue.value, [0, 1], [0.8, 1]) }],
  }));

  const handleRefresh = () => {
    if (animated) {
      progressValue.value = withTiming(1, { duration: 200 });
    }
    onRefresh();
  };

  const handleRefreshEnd = () => {
    if (animated) {
      progressValue.value = withTiming(0, { duration: 200 });
    }
  };

  return (
    <RNRefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={finalTintColor}
      progressBackgroundColor={finalProgressBackgroundColor}
      size={size === 'large' ? 1 : 0}
      title={title}
      titleColor={finalTitleColor}
    />
  );
};

export default RefreshControl;
