import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  consumed: number;
  target?: number | null;
  targetStatus?: 'loaded' | 'missing' | 'error' | 'loading';
  burned?: number;
  size?: number;
  strokeWidth?: number;
  showMacros?: boolean;
  protein?: number;
  carbs?: number;
  fat?: number;
}

const DEFAULT_VISUAL_TARGET = 2000;

const CalorieRing: React.FC<CalorieRingProps> = ({
  consumed,
  target,
  targetStatus = 'loaded',
  burned = 0,
  size = 200,
  strokeWidth = 14,
  showMacros = true,
  protein = 0,
  carbs = 0,
  fat = 0,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const hasRealTarget = typeof target === 'number' && target > 0;
  const visualTarget = hasRealTarget ? target : DEFAULT_VISUAL_TARGET;

  const progress = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const netCalories = consumed;
  const remaining = hasRealTarget ? Math.max(0, visualTarget - netCalories) : netCalories;
  const targetProgress = Math.min(1.15, netCalories / visualTarget);
  const isOverTarget = hasRealTarget && netCalories > visualTarget;
  const isCloseToTarget = hasRealTarget && targetProgress >= 0.9 && targetProgress <= 1;

  const getProgressColors = (): [string, string] => {
    if (isOverTarget) {
      return [theme.colors.danger, '#FF6B6B'];
    }
    if (isCloseToTarget) {
      return [theme.colors.warning, '#FBBF24'];
    }
    return [theme.colors.primary, theme.colors.primaryDark];
  };

  const colors = getProgressColors();

  useEffect(() => {
    progress.value = withTiming(Math.min(1, targetProgress), {
      duration: 1200,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
  }, [progress, targetProgress]);

  useEffect(() => {
    if (isCloseToTarget && !isOverTarget) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
      return;
    }

    pulseScale.value = withTiming(1, { duration: 300 });
  }, [isCloseToTarget, isOverTarget, pulseScale]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const totalMacroGrams = protein + carbs + fat;
  const proteinPct = totalMacroGrams > 0 ? (protein / totalMacroGrams) * 100 : 33;
  const carbsPct = totalMacroGrams > 0 ? (carbs / totalMacroGrams) * 100 : 33;
  const fatPct = totalMacroGrams > 0 ? (fat / totalMacroGrams) * 100 : 34;

  const targetCaption =
    targetStatus === 'error'
      ? 'Lỗi tải mục tiêu'
      : hasRealTarget
        ? 'Mục tiêu'
        : 'Mốc hiển thị';

  const centerLabel = hasRealTarget ? (isOverTarget ? 'Vượt quá' : 'Còn lại') : 'Đã nạp';

  const styles = getStyles(theme, size, isDark);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ringContainer, pulseStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors[0]} />
              <Stop offset="100%" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>

          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? '#3D4A3D' : '#E0E0E0'}
            strokeWidth={strokeWidth}
            fill="none"
          />

          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#calorieGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>

        <View style={styles.centerContent}>
          <ThemedText
            variant="h1"
            weight="700"
            style={[styles.mainValue, isOverTarget && { color: theme.colors.danger }]}
          >
            {Math.round(remaining)}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            {centerLabel}
          </ThemedText>
        </View>
      </Animated.View>

      {!hasRealTarget && (
        <ThemedText
          variant="caption"
          color="textSecondary"
          style={{ textAlign: 'center', paddingHorizontal: theme.spacing.md }}
        >
          Chưa có mục tiêu calo. Ứng dụng dùng mốc {DEFAULT_VISUAL_TARGET} kcal để hiển
          thị.
        </ThemedText>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText variant="caption" color="textSecondary">
            Đã ăn
          </ThemedText>
          <ThemedText variant="body" weight="600">
            {Math.round(consumed)}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.statItem}>
          <ThemedText variant="caption" color="textSecondary">
            {targetCaption}
          </ThemedText>
          <ThemedText variant="body" weight="600" color="primary">
            {Math.round(visualTarget)}
          </ThemedText>
        </View>

        {burned > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <ThemedText variant="caption" color="textSecondary">
                Đốt cháy
              </ThemedText>
              <ThemedText variant="body" weight="600" color="success">
                -{Math.round(burned)}
              </ThemedText>
            </View>
          </>
        )}
      </View>

      {showMacros && totalMacroGrams > 0 && (
        <View style={styles.macroContainer}>
          <View style={styles.macroBar}>
            <View
              style={[
                styles.macroSegment,
                {
                  width: `${proteinPct}%`,
                  backgroundColor: '#22C55E',
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                },
              ]}
            />
            <View
              style={[
                styles.macroSegment,
                { width: `${carbsPct}%`, backgroundColor: '#FBBF24' },
              ]}
            />
            <View
              style={[
                styles.macroSegment,
                {
                  width: `${fatPct}%`,
                  backgroundColor: '#EC4899',
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                },
              ]}
            />
          </View>
          <View style={styles.macroLabels}>
            <View style={styles.macroLabel}>
              <View style={[styles.macroDot, { backgroundColor: '#22C55E' }]} />
              <ThemedText variant="caption" color="textSecondary">
                P {Math.round(protein)}g
              </ThemedText>
            </View>
            <View style={styles.macroLabel}>
              <View style={[styles.macroDot, { backgroundColor: '#FBBF24' }]} />
              <ThemedText variant="caption" color="textSecondary">
                C {Math.round(carbs)}g
              </ThemedText>
            </View>
            <View style={styles.macroLabel}>
              <View style={[styles.macroDot, { backgroundColor: '#EC4899' }]} />
              <ThemedText variant="caption" color="textSecondary">
                F {Math.round(fat)}g
              </ThemedText>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const getStyles = (theme: any, size: number, isDark: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    ringContainer: {
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
    mainValue: {
      fontSize: 42,
      lineHeight: 48,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    divider: {
      width: 1,
      height: 24,
    },
    macroContainer: {
      width: '100%',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    macroBar: {
      height: 8,
      borderRadius: 4,
      flexDirection: 'row',
      overflow: 'hidden',
      backgroundColor: isDark ? '#25293A' : '#F0F0F0',
    },
    macroSegment: {
      height: '100%',
    },
    macroLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    macroLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    macroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });

export default CalorieRing;
