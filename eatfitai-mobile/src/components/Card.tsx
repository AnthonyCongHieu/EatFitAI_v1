import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../theme/ThemeProvider';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  variant?: 'elevated' | 'outlined' | 'filled' | 'gradient';
  gradient?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success';
  interactive?: boolean;
  onPress?: () => void;
  animated?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card = ({
  children,
  style,
  padding = 'md',
  shadow = 'md',
  variant = 'elevated',
  gradient,
  interactive = false,
  onPress,
  animated = true
}: CardProps): JSX.Element => {
  const { theme } = useAppTheme();

  // Animation values for interactive cards
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Determine padding
  let pad = theme.spacing.md;
  if (padding === 'sm') pad = theme.spacing.sm;
  else if (padding === 'lg') pad = theme.spacing.lg;
  else if (padding === 'xl') pad = theme.spacing.xl;

  // Determine shadow
  const shadowStyle = shadow === 'none' ? {} : theme.shadows[shadow];

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: theme.colors.card,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
        };
      case 'filled':
        return {
          backgroundColor: theme.colors.primaryLight,
        };
      case 'gradient':
        return {}; // Gradient handled separately
      case 'elevated':
      default:
        return {
          backgroundColor: theme.colors.card,
        };
    }
  };

  const baseStyle = [
    {
      borderRadius: theme.radius.lg,
      padding: pad,
      ...shadowStyle,
      ...getVariantStyles(),
    },
    style,
  ];

  const handlePressIn = () => {
    if (interactive) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0.9, { duration: theme.animation.fast });
    }
  };

  const handlePressOut = () => {
    if (interactive) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: theme.animation.fast });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const cardContent = (
    <Animated.View
      entering={animated ? FadeInUp.duration(theme.animation.normal) : undefined}
      layout={Layout.springify()}
      style={baseStyle}
    >
      {children}
    </Animated.View>
  );

  // Wrap in gradient if needed
  const gradientCard = gradient ? (
    <Animated.View
      entering={animated ? FadeInUp.duration(theme.animation.normal) : undefined}
      layout={Layout.springify()}
      style={baseStyle}
    >
      <LinearGradient
        colors={theme.gradients[gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: theme.radius.lg, flex: 1 }}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  ) : cardContent;

  // Wrap in animation/pressable if needed
  if (interactive) {
    return (
      <AnimatedPressable
        style={animatedStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {gradientCard}
      </AnimatedPressable>
    );
  }

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {gradientCard}
      </Pressable>
    );
  }

  return gradientCard;
};

export default Card;
