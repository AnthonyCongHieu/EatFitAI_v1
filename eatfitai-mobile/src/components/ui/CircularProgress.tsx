// CircularProgress component - Biểu đồ tròn cho calories
// Inspired by Lifesum's beautiful circular progress design

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  /** Current value */
  value: number;
  /** Maximum value (target) */
  maxValue: number;
  /** Size of the circle */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Label text below value */
  label?: string;
  /** Unit text after value (e.g., 'kcal') */
  unit?: string;
  /** Show remaining instead of consumed */
  showRemaining?: boolean;
  /** Gradient colors [start, end] */
  gradientColors?: [string, string];
  /** Animation duration in ms */
  animationDuration?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  maxValue,
  size = 180,
  strokeWidth = 12,
  label = 'remaining',
  unit = 'kcal',
  showRemaining = true,
  gradientColors,
  animationDuration = 1000,
}) => {
  const { theme } = useAppTheme();
  const progress = useSharedValue(0);

  // Calculate dimensions
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate progress percentage (0-1)
  const targetProgress = Math.min(1, Math.max(0, value / maxValue));
  const displayValue = showRemaining ? Math.max(0, maxValue - value) : value;

  // Use theme gradient or custom gradient
  const colors = gradientColors || [theme.colors.primary, theme.colors.primaryDark];

  useEffect(() => {
    progress.value = withTiming(targetProgress, {
      duration: animationDuration,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
  }, [targetProgress, animationDuration, progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  // Determine color based on progress
  const getProgressColor = (): string => {
    if (targetProgress > 1) return theme.colors.danger;
    if (targetProgress > 0.9) return theme.colors.warning;
    return 'url(#gradient)';
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>

        {/* Background Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />

        {/* Progress Circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Center Content */}
      <View style={styles.centerContent}>
        <ThemedText variant="h1" weight="700" style={styles.valueText}>
          {Math.round(displayValue)}
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary">
          {unit}
        </ThemedText>
        <ThemedText
          variant="caption"
          color="textSecondary"
          style={{ marginTop: theme.spacing.xs }}
        >
          {label}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 36,
    lineHeight: 42,
  },
});

export default CircularProgress;
