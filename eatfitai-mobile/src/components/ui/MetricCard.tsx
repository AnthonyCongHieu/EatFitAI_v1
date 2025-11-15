import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import Icon from '../../../components/Icon';
import ProgressBar from '../../../components/ProgressBar';

type MetricCardProps = {
  icon: string;
  value: SharedValue<number>;
  label: string;
  color: 'primary' | 'secondary' | 'warning';
  progress?: number;
  onPress?: () => void;
};

export const MetricCard = ({ icon, value, label, color, progress, onPress }: MetricCardProps) => {
  const { theme } = useAppTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(value.value, [0, 100], [1, 1.02]) }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(value.value, [0, 100], [1, 1.05]) }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={{ flex: 1, alignItems: 'center' }}
        onPress={onPress}
        disabled={!onPress}
      >
        <Icon name={icon} size="lg" color={color} />
        <Animated.Text
          style={[
            {
              fontSize: theme.typography.h3.fontSize,
              fontFamily: theme.typography.h3.fontFamily,
              marginTop: theme.spacing.xs,
              color: theme.colors.text,
            },
            textAnimatedStyle,
          ]}
        >
          {Math.round(value.value)}
        </Animated.Text>
        <ThemedText variant="caption" color="textSecondary">
          {label}
        </ThemedText>
        {progress !== undefined && (
          <View style={{ marginTop: theme.spacing.xs }}>
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