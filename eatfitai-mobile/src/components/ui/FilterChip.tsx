// FilterChip component - Pill-shaped filter buttons
// Theo style Eat Up UI Kit từ Dribbble

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

export type FilterChipProps = {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
};

export const FilterChip = ({
  label,
  isActive = false,
  onPress,
  icon,
}: FilterChipProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const styles = StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999, // Pill shape
      gap: 6,
      backgroundColor: isActive
        ? theme.colors.primary
        : isDark
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isActive
        ? theme.colors.primary
        : isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.08)',
    },
    label: {
      color: isActive ? '#fff' : theme.colors.text,
    },
  });

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[styles.chip, animatedStyle]}>
        {icon && <View>{icon}</View>}
        <ThemedText variant="bodySmall" weight="600" style={styles.label}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
};

export default FilterChip;
