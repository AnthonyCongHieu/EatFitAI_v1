import React, { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import Icon from '../Icon';
import ProgressBar from '../ProgressBar';

type MetricCardProps = {
  icon: string;
  value: SharedValue<number>;
  label: string;
  color: 'primary' | 'secondary' | 'warning';
  progress?: number;
  targetValue?: number; // Improvement: Thêm target để hiển thị format "consumed/target"
  onPress?: () => void;
};

const MetricCardComponent = ({
  icon,
  value,
  label,
  color,
  progress,
  targetValue,
  onPress,
}: MetricCardProps) => {
  const { theme } = useAppTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(value.value, [0, 100], [1, 1.02]) }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(value.value, [0, 100], [1, 1.05]) }],
  }));

  const styles = useMemo(
    () => ({
      container: { flex: 1, alignItems: 'center' as const },
      text: {
        fontSize: theme.typography.h3.fontSize,
        fontFamily: theme.typography.h3.fontFamily,
        marginTop: theme.spacing.xs,
        color: theme.colors.text,
      },
      targetText: {
        fontSize: theme.typography.caption.fontSize,
        color: theme.colors.textSecondary,
      },
      progressContainer: { marginTop: theme.spacing.xs },
    }),
    [theme],
  );

  return (
    <Animated.View style={animatedStyle}>
      <Pressable style={styles.container} onPress={onPress} disabled={!onPress}>
        <Icon name={icon} size="lg" color={color} />
        {/* Hiển thị giá trị: consumed hoặc consumed/target */}
        <Animated.View style={[{ alignItems: 'center' }, textAnimatedStyle]}>
          {targetValue !== undefined && targetValue > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Animated.Text style={styles.text}>
                {Math.round(value.value)}
              </Animated.Text>
              <ThemedText variant="bodySmall" color="textSecondary">
                /{Math.round(targetValue)}g
              </ThemedText>
            </View>
          ) : (
            <Animated.Text style={styles.text}>
              {Math.round(value.value)}g
            </Animated.Text>
          )}
        </Animated.View>
        <ThemedText variant="caption" color="textSecondary" shrink ellipsis>
          {label}
        </ThemedText>
        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress}
              height={4}
              color={theme.colors[color]}
              animated
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

export const MetricCard = memo(MetricCardComponent);
