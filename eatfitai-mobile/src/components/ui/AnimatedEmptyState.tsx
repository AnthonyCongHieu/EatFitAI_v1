/**
 * AnimatedEmptyState - Enhanced empty state with animated illustrations
 * Provides engaging, actionable empty states for better UX
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ThemedText } from '../ThemedText';
import Button from '../Button';
import { useAppTheme } from '../../theme/ThemeProvider';

export type EmptyStateVariant =
  | 'no-food'
  | 'no-search-results'
  | 'no-favorites'
  | 'no-history'
  | 'no-achievements'
  | 'error'
  | 'offline'
  | 'custom';

interface AnimatedEmptyStateProps {
  /** Predefined variant for common empty states */
  variant?: EmptyStateVariant;
  /** Custom emoji for display */
  emoji?: string;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onPress: () => void;
    icon?: string;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  /** Container style */
  style?: ViewStyle;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

// Emoji presets for each variant
const VARIANT_EMOJIS: Record<EmptyStateVariant, string> = {
  'no-food': '🍽️',
  'no-search-results': '🔍',
  'no-favorites': '⭐',
  'no-history': '📅',
  'no-achievements': '🏆',
  error: '😅',
  offline: '📡',
  custom: '📭',
};

export const AnimatedEmptyState = ({
  variant = 'custom',
  emoji,
  title,
  description,
  primaryAction,
  secondaryAction,
  style,
  compact = false,
}: AnimatedEmptyStateProps): JSX.Element => {
  const { theme } = useAppTheme();

  // Animation values
  const bounce = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Subtle bounce animation for the emoji
    bounce.value = withRepeat(
      withSequence(withTiming(-8, { duration: 1000 }), withTiming(0, { duration: 1000 })),
      -1,
      true,
    );

    // Subtle pulse for the container
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000 }),
        withTiming(1, { duration: 2000 }),
      ),
      -1,
      true,
    );
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const displayEmoji = emoji || VARIANT_EMOJIS[variant];

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: compact ? theme.spacing.xl : theme.spacing.xxl * 2,
      paddingHorizontal: theme.spacing.lg,
    },
    emojiContainer: {
      width: compact ? 80 : 120,
      height: compact ? 80 : 120,
      borderRadius: compact ? 40 : 60,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
      ...theme.shadows.md,
    },
    emoji: {
      fontSize: compact ? 36 : 56,
    },
    textContainer: {
      alignItems: 'center',
      maxWidth: 300,
    },
    title: {
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    description: {
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    actionsContainer: {
      gap: theme.spacing.md,
      alignItems: 'center',
      width: '100%',
    },
    secondaryButton: {
      padding: theme.spacing.sm,
    },
  });

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      style={[styles.container, containerAnimStyle, style]}
    >
      {/* Animated Emoji */}
      <Animated.View style={[styles.emojiContainer, emojiStyle]}>
        <ThemedText style={styles.emoji}>{displayEmoji}</ThemedText>
      </Animated.View>

      {/* Text Content */}
      <View style={styles.textContainer}>
        <ThemedText variant="h3" weight="600" style={styles.title}>
          {title}
        </ThemedText>

        {description && (
          <ThemedText variant="body" color="textSecondary" style={styles.description}>
            {description}
          </ThemedText>
        )}
      </View>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <View style={styles.actionsContainer}>
          {primaryAction && (
            <Button
              title={primaryAction.label}
              onPress={primaryAction.onPress}
              icon={primaryAction.icon}
              variant="primary"
              fullWidth
            />
          )}
          {secondaryAction && (
            <Button
              title={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant="ghost"
              style={styles.secondaryButton}
            />
          )}
        </View>
      )}
    </Animated.View>
  );
};

export default AnimatedEmptyState;
