/**
 * StreakCard - Enhanced với animated fire và weekly calendar
 * Features:
 * - Animated fire icon khi streak active (pulse + scale)
 * - Weekly calendar dots (7 ngày gần nhất)
 * - Modern glassmorphism design
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  /** Array of last 7 days: true = logged, false = not logged */
  weeklyLogs?: boolean[];
  onPress?: () => void;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  currentStreak,
  longestStreak,
  weeklyLogs = [false, false, false, false, false, false, false],
  onPress,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const isActive = currentStreak > 0;

  // Animation values
  const fireScale = useSharedValue(1);
  const fireRotate = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const badgePulse = useSharedValue(1);

  // Fire animation khi streak active
  useEffect(() => {
    if (isActive) {
      // Pulse scale
      fireScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Subtle rotate
      fireRotate.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 300 }),
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        true
      );

      // Glow pulse
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
      );

      // Badge pulse
      badgePulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      fireScale.value = withTiming(1);
      fireRotate.value = withTiming(0);
      glowOpacity.value = withTiming(0);
      badgePulse.value = withTiming(1);
    }
  }, [isActive, fireScale, fireRotate, glowOpacity, badgePulse]);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fireScale.value },
      { rotate: `${fireRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  // Ngày trong tuần (T2 -> CN)
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const styles = getStyles(theme, isDark, isActive);

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isActive ? `Chuỗi ${currentStreak} ngày liên tiếp` : 'Bắt đầu chuỗi mới'}
      accessibilityHint="Nhấn để xem thành tựu"
    >
      <LinearGradient
        colors={
          isActive
            ? isDark
              // Solid colors thay vì rgba để tránh lỗi 2 màu trên Android
              ? ['#1A2A4A', '#152238'] as const
              : ['#FFF7ED', '#FFEDD5'] as const
            : isDark
              ? ['#1A2744', '#152238'] as const
              : ['#FAFAFA', '#F5F5F5'] as const
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Top row: Icon + Info + Badge */}
        <View style={styles.topRow}>
          <View style={styles.iconWrapper}>
            {/* Glow effect */}
            {isActive && (
              <Animated.View style={[styles.glow, glowStyle]} />
            )}
            <Animated.View style={[styles.iconContainer, fireStyle]}>
              <AnimatedIonicons
                name="flame"
                size={36}
                color={isActive ? '#FF9500' : theme.colors.textSecondary}
              />
            </Animated.View>
          </View>

          <View style={styles.textContainer}>
            <ThemedText variant="h3" weight="700">
              {isActive ? `${currentStreak} ngày liên tiếp!` : 'Bắt đầu chuỗi!'}
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              Kỷ lục: {longestStreak} ngày 🏆
            </ThemedText>
          </View>

          {isActive && (
            <Animated.View style={[styles.badge, badgeStyle]}>
              <ThemedText variant="caption" style={styles.badgeText}>
                🔥 ON FIRE
              </ThemedText>
            </Animated.View>
          )}
        </View>

        {/* Weekly calendar dots */}
        <View style={styles.weeklyContainer}>
          {dayLabels.map((day, index) => {
            const isLogged = weeklyLogs[index];
            const isToday = index === 6; // Giả sử index 6 là hôm nay

            return (
              <View key={day} style={styles.dayColumn}>
                <ThemedText variant="caption" color="textSecondary" style={styles.dayLabel}>
                  {day}
                </ThemedText>
                <View
                  style={[
                    styles.dot,
                    isLogged && styles.dotActive,
                    isToday && styles.dotToday,
                    { borderColor: isToday ? '#FF9500' : 'transparent' }
                  ]}
                >
                  {isLogged && (
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Streak encouragement */}
        {!isActive && (
          <View style={styles.encouragement}>
            <ThemedText variant="caption" color="textSecondary">
              👆 Ghi nhật ký ăn uống hôm nay để bắt đầu chuỗi mới!
            </ThemedText>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const getStyles = (theme: any, isDark: boolean, isActive: boolean) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
      marginVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: isActive
        ? 'rgba(255, 149, 0, 0.3)'
        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      ...theme.shadows.sm,
    },
    gradient: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconWrapper: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    glow: {
      position: 'absolute',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#FF9500',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
      gap: 2,
    },
    badge: {
      backgroundColor: '#FF9500',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.md,
    },
    badgeText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 11,
    },
    weeklyContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    dayColumn: {
      alignItems: 'center',
      gap: 4,
    },
    dayLabel: {
      fontSize: 10,
    },
    dot: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    dotActive: {
      backgroundColor: '#22C55E',
    },
    dotToday: {
      borderColor: '#FF9500',
    },
    encouragement: {
      alignItems: 'center',
      paddingTop: theme.spacing.xs,
    },
  });

