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
  testID?: string;
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
  testID,
  disableAnimation = false,
}: AppCardProps): React.ReactElement => {
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

  // Glassmorphism shadow - Giảm elevation trên Android dark mode để tránh 2 màu
  const glassmorpShadow =
    shadow === 'none'
      ? {}
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: shadow === 'lg' ? 16 : shadow === 'md' ? 12 : 8,
          // Android: giảm elevation trong dark mode để tránh hiệu ứng 2 màu
          elevation: isDark
            ? shadow === 'lg'
              ? 4
              : shadow === 'md'
                ? 2
                : 1
            : shadow === 'lg'
              ? 8
              : shadow === 'md'
                ? 6
                : 4,
        };

  // Glassmorphism styles theo variant - Solid colors để fix 2 màu trên Android
  const variantStyle: ViewStyle =
    variant === 'outlined'
      ? {
          // Solid colors thay vì rgba
          backgroundColor: isDark ? '#1A2744' : '#F8FAFF',
          borderWidth: 1,
          borderColor: isDark ? '#2A3F68' : 'rgba(0, 0, 0, 0.06)',
        }
      : variant === 'filled'
        ? {
            backgroundColor: theme.colors.primaryLight,
            borderWidth: 1,
            borderColor: isDark ? '#2A4A3A' : 'rgba(16, 185, 129, 0.2)',
          }
        : {
            // Default elevated - solid navy blue
            backgroundColor: isDark ? '#1A2744' : '#EEF4FF',
            borderWidth: 1,
            borderColor: isDark ? '#2A3F68' : 'rgba(59, 130, 246, 0.15)',
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
        testID={testID}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[cardStyle, style]} testID={testID}>
      {content}
    </View>
  );
};

export default AppCard;
