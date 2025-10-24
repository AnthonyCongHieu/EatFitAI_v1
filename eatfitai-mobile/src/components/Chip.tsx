import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type ChipProps = {
  label: string;
  onPress?: () => void;
  onClose?: () => void;
  selected?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
  closeIcon?: ReactNode;
  animated?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Chip = ({
  label,
  onPress,
  onClose,
  selected = false,
  disabled = false,
  variant = 'filled',
  size = 'md',
  color = 'primary',
  icon,
  closeIcon,
  animated = true
}: ChipProps): JSX.Element => {
  const { theme } = useAppTheme();

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 4, paddingHorizontal: 8, fontSize: 12, borderRadius: 12 };
      case 'lg':
        return { paddingVertical: 10, paddingHorizontal: 16, fontSize: 16, borderRadius: 20 };
      case 'md':
      default:
        return { paddingVertical: 6, paddingHorizontal: 12, fontSize: 14, borderRadius: 16 };
    }
  };

  const getColorConfig = () => {
    const colors = {
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      success: theme.colors.success || '#4CAF50',
      warning: theme.colors.warning || '#FF9800',
      danger: theme.colors.danger,
    };

    const selectedColor = colors[color];

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: selected ? selectedColor : theme.colors.muted + '20',
          borderColor: 'transparent',
          textColor: selected ? '#fff' : theme.colors.text,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderColor: selected ? selectedColor : theme.colors.border,
          textColor: selected ? selectedColor : theme.colors.text,
        };
      case 'ghost':
        return {
          backgroundColor: selected ? selectedColor + '15' : 'transparent',
          borderColor: 'transparent',
          textColor: selected ? selectedColor : theme.colors.text,
        };
      default:
        return {
          backgroundColor: theme.colors.muted + '20',
          borderColor: 'transparent',
          textColor: theme.colors.text,
        };
    }
  };

  const sizeConfig = getSizeConfig();
  const colorConfig = getColorConfig();

  const handlePressIn = () => {
    if (animated && !disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (animated && !disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleClose = () => {
    if (onClose && animated) {
      opacity.value = withTiming(0, { duration: 200 });
      setTimeout(onClose, 200);
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <AnimatedPressable
      style={[
        styles.container,
        {
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: colorConfig.backgroundColor,
          borderColor: colorConfig.borderColor,
          borderWidth: variant === 'outlined' ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected, disabled }}
    >
      <View style={styles.content}>
        {icon && (
          <View style={styles.icon}>
            {icon}
          </View>
        )}

        <ThemedText
          style={[
            styles.label,
            {
              color: colorConfig.textColor,
              fontSize: sizeConfig.fontSize,
              fontFamily: 'Inter_600SemiBold',
            },
          ]}
        >
          {label}
        </ThemedText>

        {onClose && (
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label}`}
          >
            {closeIcon || (
              <ThemedText style={[styles.closeIcon, { color: colorConfig.textColor }]}>
                ×
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 4,
    padding: 2,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Chip;
