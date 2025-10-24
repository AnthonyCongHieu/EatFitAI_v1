import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '../theme/ThemeProvider';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps): JSX.Element => {
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

interface SkeletonListProps {
  count: number;
  itemHeight?: number;
  spacing?: number;
  style?: any;
}

export const SkeletonList = ({ count, itemHeight = 60, spacing = 8, style }: SkeletonListProps): JSX.Element => {
  const { theme } = useAppTheme();

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
          <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
          <Skeleton width="80%" height={12} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    // Base skeleton styles
  },
  skeletonItem: {
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
  },
});

export default Skeleton;
