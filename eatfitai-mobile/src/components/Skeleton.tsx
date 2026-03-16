import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../theme/ThemeProvider';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

/**
 * ShimmerSkeleton - Enhanced skeleton with shimmer gradient effect
 */
interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const ShimmerSkeleton = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: ShimmerSkeletonProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const translateX = useSharedValue(-SCREEN_WIDTH);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const baseColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const shimmerColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerGradient, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', shimmerColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SCREEN_WIDTH, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
};

interface SkeletonListProps {
  count: number;
  itemHeight?: number;
  spacing?: number;
  style?: any;
  /** Use shimmer effect instead of opacity pulse */
  shimmer?: boolean;
}

export const SkeletonList = ({
  count,
  itemHeight = 60,
  spacing = 8,
  style,
  shimmer = false,
}: SkeletonListProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const SkeletonComponent = shimmer ? ShimmerSkeleton : Skeleton;

  return (
    <View style={style}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonItem,
            {
              height: itemHeight,
              marginBottom: index < count - 1 ? spacing : 0,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <SkeletonComponent width="60%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonComponent width="40%" height={12} />
          <SkeletonComponent width="80%" height={12} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  shimmerContainer: {
    overflow: 'hidden',
  },
  shimmerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  skeletonItem: {
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
  },
});

export default Skeleton;

