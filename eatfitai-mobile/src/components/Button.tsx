import type { ReactNode } from 'react';
import { Pressable, ActivityIndicator, type Insets } from 'react-native';
import { useRef, memo, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type ButtonProps = {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  hitSlop?: number | Insets;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = memo(({
  title,
  children,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  icon,
  iconPosition = 'left',
}: ButtonProps): JSX.Element => {
  const { theme } = useAppTheme();

  // Memoize style calculations
  const styles = useMemo(() => {
    // Determine colors based on variant
    let bg = theme.colors.primary;
    let borderColor = 'transparent';
    let textColor = '#FFFFFF';
    let rippleColor = 'rgba(255,255,255,0.2)';

    if (variant === 'secondary') {
      bg = theme.colors.secondary;
    } else if (variant === 'outline') {
      bg = 'transparent';
      borderColor = theme.colors.border;
      textColor = theme.colors.text;
      rippleColor = theme.colors.primary + '15';
    } else if (variant === 'ghost') {
      bg = 'transparent';
      borderColor = 'transparent';
      textColor = theme.colors.primary;
      rippleColor = theme.colors.primary + '15';
    } else if (variant === 'danger') {
      bg = theme.colors.danger;
    }

    // Determine size
    let paddingVertical = theme.spacing.sm + 4;
    let paddingHorizontal = theme.spacing.lg;
    let fontSize = theme.typography.button.fontSize;

    if (size === 'sm') {
      paddingVertical = theme.spacing.sm;
      paddingHorizontal = theme.spacing.md;
      fontSize = 14;
    } else if (size === 'lg') {
      paddingVertical = theme.spacing.md;
      paddingHorizontal = theme.spacing.xl;
      fontSize = 18;
    }

    return { bg, borderColor, textColor, rippleColor, paddingVertical, paddingHorizontal, fontSize };
  }, [theme, variant, size]);

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.8, { duration: theme.animation.fast });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: theme.animation.fast });
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        animatedStyle,
        {
          backgroundColor: styles.bg,
          borderColor: styles.borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderRadius: theme.radius.full,
          opacity: isDisabled ? 0.5 : 1,
          paddingVertical: styles.paddingVertical,
          paddingHorizontal: styles.paddingHorizontal,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          minHeight: size === 'sm' ? 36 : size === 'lg' ? 56 : 48,
        },
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: styles.rippleColor, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={title ?? undefined}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={8}
    >
      {loading ? (
        <ActivityIndicator color={styles.textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children ?? (
            <ThemedText
              variant="button"
              style={{
                color: styles.textColor,
                fontSize: styles.fontSize,
              }}
            >
              {title}
            </ThemedText>
          )}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </AnimatedPressable>
  );
});

export default Button;
