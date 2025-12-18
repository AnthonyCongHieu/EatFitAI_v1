import type { ReactNode } from 'react';
import { Pressable, ActivityIndicator, type Insets } from 'react-native';
import { memo, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

// expo-linear-gradient sometimes has types that don't line up with JSX in certain TS configs.
// Create a safely-typed alias to use in JSX.
const ExpoLinearGradient = LinearGradient as unknown as React.ComponentType<any>;

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
  accessibilityHint?: string;
  hitSlop?: number | Insets;
  icon?: ReactNode | string;
  iconPosition?: 'left' | 'right';
  style?: import('react-native').ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = memo(
  ({
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
    accessibilityLabel,
    accessibilityHint,
    style,
  }: ButtonProps): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    // Memoize style calculations
    const styles = useMemo(() => {
      // Determine colors based on variant
      let bg = 'transparent';
      let borderColor = 'transparent';
      let textColor = theme.colors.primary;
      let rippleColor = theme.colors.primary + '15';
      let useGradient = false;

      if (variant === 'primary') {
        useGradient = true;
        textColor = '#FFFFFF';
        rippleColor = 'rgba(255,255,255,0.2)';
      } else if (variant === 'secondary') {
        // Glassmorphism secondary
        bg = isDark ? 'rgba(30, 35, 33, 0.8)' : 'rgba(255, 255, 255, 0.9)';
        borderColor = theme.colors.primary;
        textColor = theme.colors.primary;
      } else if (variant === 'ghost') {
        bg = 'transparent';
        borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
        textColor = theme.colors.primary;
      } else if (variant === 'outline') {
        // Glassmorphism outline
        bg = isDark ? 'rgba(30, 35, 33, 0.6)' : 'rgba(255, 255, 255, 0.8)';
        borderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
        textColor = theme.colors.text;
        rippleColor = theme.colors.primary + '15';
      } else if (variant === 'danger') {
        bg = theme.colors.danger;
        textColor = '#FFFFFF';
        rippleColor = 'rgba(255,255,255,0.2)';
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

      return {
        bg,
        borderColor,
        textColor,
        rippleColor,
        paddingVertical,
        paddingHorizontal,
        fontSize,
        useGradient,
      };
    }, [theme, variant, size]);

    // Animation values
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.96, { damping: 18, stiffness: 400 });
      opacity.value = withTiming(0.9, { duration: theme.animation.fast });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 18, stiffness: 400 });
      opacity.value = withTiming(1, { duration: theme.animation.fast });
    };

    const isDisabled = disabled || loading;

    const staticButtonStyle = {
      borderColor: styles.borderColor,
      borderWidth:
        variant === 'outline'
          ? 1.5
          : variant === 'secondary' || variant === 'ghost'
            ? 1
            : 0,
      borderRadius: theme.borderRadius.button,
      opacity: isDisabled ? 0.5 : 1,
      paddingVertical: styles.paddingVertical,
      paddingHorizontal: styles.paddingHorizontal,
      alignSelf: (fullWidth ? 'stretch' : 'auto') as 'stretch' | 'auto',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: theme.spacing.sm,
      minHeight: size === 'sm' ? 36 : size === 'lg' ? 56 : 48,
    };

    // Hàm helper để render icon - xử lý cả string và ReactNode
    const renderIcon = (iconProp: ReactNode) => {
      if (typeof iconProp === 'string') {
        // Nếu icon là string, dùng Ionicons
        return (
          <Ionicons
            name={iconProp as any}
            size={size === 'sm' ? 18 : size === 'lg' ? 24 : 20}
            color={styles.textColor}
          />
        );
      }
      // Nếu là ReactNode, render trực tiếp
      return iconProp;
    };

    const buttonContent = (
      <>
        {loading ? (
          <ActivityIndicator color={styles.textColor} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && renderIcon(icon)}
            {children ?? (
              <ThemedText
                variant="body"
                style={{
                  color: styles.textColor,
                  fontSize: styles.fontSize,
                  fontWeight: '600',
                }}
              >
                {title}
              </ThemedText>
            )}
            {icon && iconPosition === 'right' && renderIcon(icon)}
          </>
        )}
      </>
    );

    if (styles.useGradient) {
      return (
        <Animated.View style={[animatedStyle, staticButtonStyle, style]}>
          <ExpoLinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: theme.borderRadius.button,
            }}
          />
          <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: theme.spacing.sm,
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            android_ripple={{ color: styles.rippleColor, borderless: false }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title ?? undefined}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: isDisabled }}
            hitSlop={8}
          >
            {buttonContent}
          </Pressable>
        </Animated.View>
      );
    }

    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        style={[
          animatedStyle,
          staticButtonStyle,
          style,
          {
            backgroundColor: styles.bg,
          },
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: styles.rippleColor, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title ?? undefined}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled }}
        hitSlop={8}
      >
        {buttonContent}
      </AnimatedPressable>
    );
  },
);

export default Button;
