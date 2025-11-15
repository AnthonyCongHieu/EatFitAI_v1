import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, SharedValue } from 'react-native-reanimated';

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
}: AiSummaryBarProps): JSX.Element => {
  const { theme } = useAppTheme();

  const mealTypeName = MEAL_TYPE_LABELS[mealType];

  const animatedCountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(selectedCount.value, [0, 10], [1, 1.1]) }],
  }));

  const animatedCaloriesStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(totalCalories.value, [0, 1000], [1, 1.05]) }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.content}>
        <View style={styles.summary}>
          <ThemedText style={styles.summaryText}>
            Sẽ thêm:{' '}
            <Animated.Text style={[styles.animatedNumber, animatedCountStyle]}>
              {selectedCount.value}
            </Animated.Text>
            {' món · '}
            <Animated.Text style={[styles.animatedNumber, animatedCaloriesStyle]}>
              {totalCalories.value}
            </Animated.Text>
            {' kcal'}
          </ThemedText>
        </View>

        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: disabled ? theme.colors.muted : theme.colors.primary,
            },
          ]}
          onPress={onAddToDiary}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <ThemedText style={[styles.buttonText, { color: disabled ? '#999' : '#fff' }]}>
            Thêm vào nhật ký bữa {mealTypeName}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24, // Extra padding for safe area
  },
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
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  animatedNumber: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
  },
});

export default AiSummaryBar;