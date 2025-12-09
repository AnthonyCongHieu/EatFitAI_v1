// FavoriteButton component - Toggle favorite status for food items
// Animated heart button with press feedback

import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Icon from './Icon';
import { useAppTheme } from '../theme/ThemeProvider';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => Promise<void> | void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const ICON_SIZES = {
  sm: 20,
  md: 24,
  lg: 32,
};

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  size = 'md',
  disabled = false,
}) => {
  const { theme } = useAppTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  const handlePress = useCallback(async () => {
    if (disabled || isLoading) return;

    // Trigger animations
    scale.value = withSpring(0.9, { damping: 10, stiffness: 400 });

    // Heart bounce animation when favoriting
    if (!isFavorite) {
      heartScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
    }

    setIsLoading(true);
    try {
      await onToggle();
    } finally {
      setIsLoading(false);
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  }, [disabled, isLoading, isFavorite, onToggle, scale, heartScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const iconSize = ICON_SIZES[size];

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPress={handlePress}
        disabled={disabled || isLoading}
        style={[
          styles.button,
          {
            width: iconSize + 16,
            height: iconSize + 16,
            borderRadius: (iconSize + 16) / 2,
            backgroundColor: isFavorite
              ? theme.colors.danger + '15'
              : theme.colors.background,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        accessibilityState={{ selected: isFavorite }}
      >
        <Animated.View style={heartStyle}>
          <Icon
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={size}
            color={isFavorite ? 'danger' : 'muted'}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FavoriteButton;
