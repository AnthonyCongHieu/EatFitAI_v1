import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useAppTheme } from '../theme/ThemeProvider';

type ProgressBarProps = {
  progress: number; // 0-1
  height?: number;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  showPercentage?: boolean;
  rounded?: boolean;
  variant?: 'linear' | 'rounded';
};

export const ProgressBar = ({
  progress,
  height = 4,
  color,
  backgroundColor,
  animated = true,
  showPercentage = false,
  rounded = true,
  variant = 'linear'
}: ProgressBarProps): JSX.Element => {
  const { theme } = useAppTheme();

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(progress, { duration: theme.animation.normal });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated, theme.animation.normal]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const finalColor = color || theme.colors.primary;
  const finalBackgroundColor = backgroundColor || theme.colors.muted + '30';

  const borderRadius = rounded ? height / 2 : 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: finalBackgroundColor,
            borderRadius,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progress,
            {
              height,
              backgroundColor: finalColor,
              borderRadius,
            },
            progressStyle,
          ]}
        />
      </View>
      {showPercentage && (
        <View style={styles.percentageContainer}>
          <Animated.Text
            style={[
              styles.percentageText,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.caption.fontFamily,
                fontSize: theme.typography.caption.fontSize,
              },
            ]}
          >
            {Math.round(progress * 100)}%
          </Animated.Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  percentageContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  percentageText: {
    fontWeight: '500',
  },
});

export default ProgressBar;
