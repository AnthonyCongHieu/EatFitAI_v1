/**
 * AppHeader - Unified Header Component (Trend 2026)
 *
 * Design: glassmorphism with a semi-transparent background and subtle border glow
 * Features: Gradient title, animated glow border, modern glass buttons
 * Layout: [Back] | [Title Center] | [Actions]
 *
 * @usage
 * <AppHeader title="Profile" subtitle="Quản lý tài khoản" />
 * <AppHeader title="Settings" showBack onBackPress={() => nav.goBack()} />
 * <AppHeader title="Stats" rightIcon="settings-outline" onRightPress={...} />
 */

import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

// ============================================================================
// Types
// ============================================================================

export type AppHeaderVariant = 'default' | 'transparent' | 'hero';
export type AppHeaderSize = 'compact' | 'default' | 'large';

export interface AppHeaderProps {
  // Content
  title?: string;
  subtitle?: string;

  // Navigation
  showBack?: boolean;
  onBackPress?: () => void;

  // Actions (right side)
  rightAction?: React.ReactNode;
  action?: React.ReactNode; // Alias for rightAction to keep backward compatibility
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;

  // Variants
  variant?: AppHeaderVariant;
  size?: AppHeaderSize;

  // Style overrides
  style?: ViewStyle;
  titleStyle?: TextStyle;

  // Animation
  animated?: boolean;

  // Gradient title (cho hero variant)
  gradientTitle?: boolean;
}

// ============================================================================
// Animated Pressable Component
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GlassButton: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
  isDark: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}> = ({ onPress, children, isDark, accessibilityLabel, accessibilityHint }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: 16, // 2025 Trend: Softer edges
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.04)',
          // Glass border with glow
          borderWidth: 1.5,
          borderColor: isDark
            ? 'rgba(74, 144, 226, 0.25)' // Primary blue glow
            : 'rgba(59, 130, 246, 0.15)',
          // Enhanced shadow with primary color glow
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#4A90D9' : '#3B82F6',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: isDark ? 0.25 : 0.15,
              shadowRadius: 8,
            },
            android: {
              elevation: 4,
            },
          }),
        },
        animatedStyle,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {children}
    </AnimatedPressable>
  );
};

// ============================================================================
// Component
// ============================================================================

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  rightAction,
  action, // Alias cho rightAction
  rightIcon,
  onRightPress,
  variant = 'default',
  size = 'default',
  style,
  titleStyle,
  animated = true,
  gradientTitle = false,
}) => {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isDark = theme.mode === 'dark';

  // Check whether navigation can go back
  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack && canGoBack;

  // Merge action props (rightAction takes priority over action)
  const actionContent = rightAction || action;

  // Back button handler with haptic feedback
  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBackPress) {
      onBackPress();
    } else if (canGoBack) {
      navigation.goBack();
    }
  };

  // Handler cho action button
  const handleRightPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRightPress?.();
  };

  // ============================================================================
  // Styles based on variant and size
  // ============================================================================

  const getBackgroundStyle = (): ViewStyle => {
    switch (variant) {
      case 'transparent':
        return {
          backgroundColor: 'transparent',
        };
      case 'hero':
        return {
          backgroundColor: isDark
            ? 'rgba(10, 22, 40, 0.94)' // Navy blue tint
            : 'rgba(248, 250, 255, 0.96)',
          // Enhanced glow border - 2025 trend
          borderBottomWidth: 1.5,
          borderBottomColor: isDark
            ? 'rgba(74, 144, 226, 0.35)' // Primary blue glow
            : 'rgba(59, 130, 246, 0.2)',
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#4A90D9' : '#3B82F6',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
            },
            android: {
              elevation: 10,
            },
          }),
        };
      default:
        // Glassmorphism effect
        return {
          backgroundColor: isDark
            ? 'rgba(18, 24, 22, 0.94)'
            : 'rgba(255, 255, 255, 0.96)',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          // Subtle shadow for depth
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 8,
            },
            android: {
              elevation: 4,
            },
          }),
        };
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'compact':
        return {
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: theme.spacing.lg,
        };
      case 'large':
        return {
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
        };
      default:
        return {
          paddingTop: insets.top + theme.spacing.sm + 4, // Compact: 2025 trend
          paddingBottom: theme.spacing.sm + 4,
          paddingHorizontal: theme.spacing.lg,
        };
    }
  };

  const getTitleSize = () => {
    switch (size) {
      case 'compact':
        return 'h3' as const;
      case 'large':
        return 'h1' as const;
      default:
        return 'h2' as const;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const styles = createStyles(theme, isDark);
  const Wrapper = animated ? Animated.View : View;
  const enteringAnimation = animated ? FadeIn.duration(250) : undefined;

  // Render gradient title or regular title
  const renderTitle = () => {
    if (!title) return null;

    const titleContent = (
      <ThemedText
        variant={getTitleSize()}
        weight="700"
        style={[styles.title, titleStyle]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </ThemedText>
    );

    // Gradient title cho hero variant
    if ((variant === 'hero' || gradientTitle) && Platform.OS !== 'web') {
      return <View style={styles.gradientTitleContainer}>{titleContent}</View>;
    }

    return titleContent;
  };

  return (
    <Wrapper
      entering={enteringAnimation}
      style={[styles.container, getBackgroundStyle(), getPadding(), style]}
    >
      {/* Main Row: Back | Title | Actions */}
      <View style={styles.mainRow}>
        {/* Left: Back Button */}
        <View style={styles.leftSection}>
          {shouldShowBack && (
            <GlassButton
              onPress={handleBackPress}
              isDark={isDark}
              accessibilityLabel="Quay lại"
              accessibilityHint="Nhấn để quay về màn hình trước"
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </GlassButton>
          )}
        </View>

        {/* Center: Title */}
        <View style={styles.centerSection}>{renderTitle()}</View>

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {actionContent ? (
            actionContent
          ) : rightIcon && onRightPress ? (
            <GlassButton
              onPress={handleRightPress}
              isDark={isDark}
              accessibilityLabel="Menu"
            >
              <Ionicons name={rightIcon} size={20} color={theme.colors.text} />
            </GlassButton>
          ) : (
            // Placeholder to keep layout balanced
            <View style={styles.iconButtonPlaceholder} />
          )}
        </View>
      </View>

      {/* Subtitle row - only when present */}
      {subtitle && (
        <Animated.View
          entering={animated ? FadeInDown.delay(100).duration(200) : undefined}
          style={styles.subtitleRow}
        >
          <View style={styles.subtitleBadge}>
            <ThemedText variant="bodySmall" color="textSecondary" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          </View>
        </Animated.View>
      )}
    </Wrapper>
  );
};

// ============================================================================
// Styles
// ============================================================================

const createStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      width: '100%',
      zIndex: 100,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48, // Slightly larger for better touch
    },
    leftSection: {
      width: 48,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    rightSection: {
      width: 48,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    title: {
      textAlign: 'center',
      letterSpacing: -0.8, // 2025: Extra tight for modern look
    },
    gradientTitleContainer: {
      // Container cho gradient title effect
    },
    subtitleRow: {
      marginTop: theme.spacing.xs + 2,
      alignItems: 'center',
    },
    subtitleBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14, // Softer
      backgroundColor: isDark
        ? 'rgba(74, 144, 226, 0.12)' // Primary tint
        : 'rgba(59, 130, 246, 0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(59, 130, 246, 0.1)',
    },
    subtitle: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '500', // Better readability
    },
    iconButtonPlaceholder: {
      width: 42,
      height: 42,
    },
  });

export default AppHeader;
