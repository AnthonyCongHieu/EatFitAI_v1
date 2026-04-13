import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';

interface StatsHeroCardProps {
  value: number;
  target?: number | null;
  targetStatus?: 'loaded' | 'missing' | 'error' | 'loading';
  unit?: string;
  label?: string;
}

const DEFAULT_VISUAL_TARGET = 2000;

export const StatsHeroCard: React.FC<StatsHeroCardProps> = ({
  value,
  target,
  targetStatus = 'loaded',
  unit = 'kcal',
  label = 'Hôm nay',
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const hasRealTarget = typeof target === 'number' && target > 0;
  const visualTarget = hasRealTarget ? target : DEFAULT_VISUAL_TARGET;
  const progress = Math.min(value / visualTarget, 1);
  const percentage = Math.round(progress * 100);
  const highlightValue = hasRealTarget ? Math.max(visualTarget - value, 0) : value;
  const highlightLabel = hasRealTarget ? 'Còn lại' : 'Đã nạp';
  const targetLabel =
    targetStatus === 'error'
      ? 'Lỗi tải mục tiêu'
      : hasRealTarget
        ? 'Mục tiêu'
        : 'Mốc hiển thị';

  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: isDark ? '#1A2744' : '#EEF4FF',
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: isDark ? '#2A3F68' : '#D0E4FF',
      gap: theme.spacing.sm,
    },
    progressContainer: {
      position: 'relative',
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerContent: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#2A3F68' : '#E0E0E0',
    },
    statItem: {
      alignItems: 'center',
      gap: 4,
    },
  });

  return (
    <Animated.View entering={FadeInUp.springify()} style={styles.container}>
      <ThemedText variant="bodySmall" color="textSecondary">
        {label}
      </ThemedText>

      <View style={styles.progressContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primary} />
              <Stop offset="100%" stopColor={theme.colors.secondary} />
            </LinearGradient>
          </Defs>

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? '#2A3F68' : '#E0E0E0'}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        <View style={styles.centerContent}>
          <ThemedText variant="h1" weight="700">
            {Math.round(highlightValue).toLocaleString()}
          </ThemedText>
          <ThemedText variant="body" color="textSecondary">
            {highlightLabel}
          </ThemedText>
        </View>
      </View>

      {!hasRealTarget && (
        <ThemedText
          variant="caption"
          color="textSecondary"
          style={{ textAlign: 'center' }}
        >
          Chưa có mục tiêu cá nhân. Ứng dụng dùng mốc {DEFAULT_VISUAL_TARGET} {unit} để
          hiển thị.
        </ThemedText>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText variant="h4" weight="700">
            {Math.round(visualTarget).toLocaleString()}
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            {targetLabel}
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText variant="h4" weight="700" color="primary">
            {Math.round(value).toLocaleString()}
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            Đã nạp
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText variant="h4" weight="700" color="success">
            {percentage}%
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            Tiến độ
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
};

export default StatsHeroCard;
