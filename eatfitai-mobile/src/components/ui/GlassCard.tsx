/**
 * GlassCard - Glassmorphism card component with blur effect
 * Creates a modern frosted glass appearance
 */

import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { AppTheme } from '../../theme/themes';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number; // Blur intensity (0-100)
  borderRadius?: number;
  gradient?: boolean; // Add gradient border
  animated?: boolean;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 40,
  borderRadius = 24,
  gradient = true,
  animated = true,
  padding = 16,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const containerStyle: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
  };

  const glassStyle: ViewStyle = {
    padding,
    borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  };

  const content = (
    <View style={[containerStyle, style]}>
      {gradient && (
        <LinearGradient
          colors={
            isDark
              ? [theme.colors.glass.border, theme.colors.glass.borderAlt]
              : [theme.colors.glass.background, theme.colors.glass.backgroundAlt]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      )}
      <BlurView
        intensity={isDark ? intensity : intensity * 0.6}
        tint={isDark ? 'dark' : 'light'}
        style={glassStyle}
      >
        {children}
      </BlurView>
    </View>
  );

  if (animated) {
    return <Animated.View entering={FadeIn.duration(300)}>{content}</Animated.View>;
  }

  return content;
};

/**
 * GlassSurface - Lighter glass surface for smaller elements
 */
export const GlassSurface: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.glass.backgroundAlt,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.glass.borderAlt,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * createGlassStyles - Modern glassmorphism styles using theme colors
 * @param theme - AppTheme object for centralized, consistent colors
 * Recommended for new code
 */
export const createGlassStyles = (theme: AppTheme) => {
  const isDark = theme.mode === 'dark';
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.glass.background,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
      padding: theme.spacing.lg,
      // Shadow for depth
      ...theme.shadows.lg,
    },
    cardSmall: {
      backgroundColor: theme.colors.glass.backgroundAlt,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.glass.borderAlt,
      padding: theme.spacing.md,
    },
    pill: {
      backgroundColor: isDark ? theme.colors.glass.border : theme.colors.glass.borderAlt,
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    statCard: {
      backgroundColor: theme.colors.glass.background,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.glass.borderAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

/**
 * glassStyles - Glassmorphism styles (backward compatible)
 * @param isDark - Boolean for dark mode detection
 * For new code, prefer createGlassStyles(theme) instead
 */
export const glassStyles = (isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 24,
      elevation: 8,
    },
    cardSmall: {
      backgroundColor: isDark ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      padding: 12,
    },
    pill: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    statCard: {
      backgroundColor: isDark ? 'rgba(60, 60, 80, 0.6)' : 'rgba(255, 255, 255, 0.8)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      padding: 16,
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default GlassCard;
