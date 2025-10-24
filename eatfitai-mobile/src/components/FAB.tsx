import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type FABProps = {
  onPress: () => void;
  icon?: ReactNode;
  label?: string;
  variant?: 'primary' | 'secondary' | 'extended';
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  disabled?: boolean;
  loading?: boolean;
  animated?: boolean;
  hapticFeedback?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FAB = ({
  onPress,
  icon,
  label,
  variant = 'primary',
  size = 'md',
  position = 'bottom-right',
  disabled = false,
  loading = false,
  animated = true,
  hapticFeedback = true
}: FABProps): JSX.Element => {
  const { theme } = useAppTheme();

  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { size: 40, iconSize: 16, fontSize: 12, paddingHorizontal: 12 };
      case 'lg':
        return { size: 72, iconSize: 24, fontSize: 16, paddingHorizontal: 20 };
      case 'md':
      default:
        return { size: 56, iconSize: 20, fontSize: 14, paddingHorizontal: 16 };
    }
  };

  const sizeConfig = getSizeConfig();

  const getPositionStyles = () => {
    const basePosition = {
      position: 'absolute' as const,
      margin: 16,
    };

    switch (position) {
      case 'bottom-right':
        return { ...basePosition, bottom: 16, right: 16 };
      case 'bottom-left':
        return { ...basePosition, bottom: 16, left: 16 };
      case 'top-right':
        return { ...basePosition, top: 16, right: 16 };
      case 'top-left':
        return { ...basePosition, top: 16, left: 16 };
      default:
        return { ...basePosition, bottom: 16, right: 16 };
    }
  };

  const handlePressIn = () => {
    if (animated && !disabled && !loading) {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (animated && !disabled && !loading) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (disabled || loading) return;

    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  // Loading animation
  if (loading && animated) {
    rotate.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      -1,
      false
    );
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const renderIcon = () => {
    if (loading) {
      return (
        <View style={styles.loadingIcon}>
          <ThemedText style={[styles.iconText, { fontSize: sizeConfig.iconSize, color: '#fff' }]}>
            ⟳
          </ThemedText>
        </View>
      );
    }

    if (icon) {
      return icon;
    }

    return (
      <View style={styles.defaultIcon}>
        <ThemedText style={[styles.iconText, { fontSize: sizeConfig.iconSize, color: '#fff' }]}>
          +
        </ThemedText>
      </View>
    );
  };

  const fabContent = (
    <View style={styles.content}>
      {renderIcon()}

      {label && variant === 'extended' && (
        <ThemedText
          style={[
            styles.label,
            {
              fontSize: sizeConfig.fontSize,
              color: '#fff',
              fontFamily: 'Inter_600SemiBold',
              marginLeft: 8,
            },
          ]}
        >
          {label}
        </ThemedText>
      )}
    </View>
  );

  return (
    <AnimatedPressable
      style={[
        styles.container,
        getPositionStyles(),
        {
          width: variant === 'extended' && label ? undefined : sizeConfig.size,
          height: sizeConfig.size,
          backgroundColor: variant === 'primary' ? theme.colors.primary : theme.colors.secondary,
          borderRadius: sizeConfig.size / 2,
          paddingHorizontal: variant === 'extended' && label ? sizeConfig.paddingHorizontal : 0,
          opacity: disabled ? 0.6 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        },
        animatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label || 'Floating action button'}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {fabContent}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
  },
});

export default FAB;
