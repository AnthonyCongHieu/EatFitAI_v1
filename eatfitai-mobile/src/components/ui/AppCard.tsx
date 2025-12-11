import React from 'react';
import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type ShadowSize = 'none' | 'sm' | 'md' | 'lg';
type Variant = 'elevated' | 'outlined' | 'filled';

export type AppCardProps = {
  children: ReactNode;
  title?: string;
  style?: ViewStyle | ViewStyle[];
  padding?: PaddingSize;
  shadow?: ShadowSize;
  variant?: Variant;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Disable press animation */
  disableAnimation?: boolean;
};

const paddingMap: Record<PaddingSize, number> = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AppCard = ({
  children,
  title,
  style,
  padding = 'md',
  shadow = 'md',
  variant = 'elevated',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disableAnimation = false,
}: AppCardProps): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (onPress && !disableAnimation) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0.9, { duration: 100 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePressOut = () => {
    if (onPress && !disableAnimation) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 100 });
    }
  };

  const resolvedPadding = paddingMap[padding] ?? theme.spacing.md;

  // Glassmorphism shadow
  const glassmorpShadow =
    shadow === 'none'
      ? {}
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: shadow === 'lg' ? 16 : shadow === 'md' ? 12 : 8,
          elevation: shadow === 'lg' ? 8 : shadow === 'md' ? 6 : 4,
        };

  // Glassmorphism styles theo variant
  const variantStyle: ViewStyle =
    variant === 'outlined'
      ? {
          backgroundColor: isDark
            ? 'rgba(25, 30, 28, 0.75)'
            : 'rgba(255, 255, 255, 0.85)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
        }
      : variant === 'filled'
        ? {
            backgroundColor: theme.colors.primaryLight,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
          }
        : {
            // Default elevated - glassmorphism
            backgroundColor: isDark
              ? 'rgba(25, 30, 28, 0.85)'
              : 'rgba(255, 255, 255, 0.9)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          };

  const cardStyle: ViewStyle = {
    borderRadius: theme.borderRadius.card,
    padding: resolvedPadding,
    ...glassmorpShadow,
    ...variantStyle,
  };

  const content = (
    <>
      {title ? (
        <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
          {title}
        </ThemedText>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle, style]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return <View style={[cardStyle, style]}>{content}</View>;
};

export default AppCard;
