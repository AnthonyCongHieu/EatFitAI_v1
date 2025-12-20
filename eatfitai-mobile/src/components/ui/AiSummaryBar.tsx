import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { MealTypeId } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';

type AiSummaryBarProps = {
  selectedCount: SharedValue<number>;
  totalCalories: SharedValue<number>;
  mealType: MealTypeId;
  onAddToDiary: () => void;
  disabled?: boolean;
};

export const AiSummaryBar = ({
  selectedCount,
  totalCalories,
  mealType,
  onAddToDiary,
  disabled = false,
}: AiSummaryBarProps): React.ReactElement => {
  const { theme } = useAppTheme();

  const mealTypeName = MEAL_TYPE_LABELS[mealType];

  // Dynamic styles using theme
  const dynamicStyles = {
    container: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.xxl, // Extra padding for safe area
      backgroundColor: theme.colors.card,
    },
    button: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.button,
      minWidth: 120,
      alignItems: 'center' as const,
      backgroundColor: disabled ? theme.colors.muted : theme.colors.primary,
    },
    buttonText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: disabled ? theme.colors.textSecondary : '#fff',
    },
    animatedNumber: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.colors.primary,
    },
  };

  const animatedCountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(selectedCount.value, [0, 10], [1, 1.1]) }],
  }));

  const animatedCaloriesStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(totalCalories.value, [0, 1000], [1, 1.05]) }],
  }));

  return (
    <View style={dynamicStyles.container}>
      <View style={styles.content}>
        <View style={styles.summary}>
          <ThemedText style={styles.summaryText}>
            Sẽ thêm:{' '}
            <Animated.Text style={[dynamicStyles.animatedNumber, animatedCountStyle]}>
              {selectedCount.value}
            </Animated.Text>
            {' món · '}
            <Animated.Text style={[dynamicStyles.animatedNumber, animatedCaloriesStyle]}>
              {totalCalories.value}
            </Animated.Text>
            {' kcal'}
          </ThemedText>
        </View>

        <Pressable
          style={dynamicStyles.button}
          onPress={onAddToDiary}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          accessibilityLabel={`Thêm ${selectedCount.value} món vào bữa ${mealTypeName}`}
        >
          <ThemedText style={dynamicStyles.buttonText}>
            Thêm vào nhật ký bữa {mealTypeName}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: {
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});

export default AiSummaryBar;

