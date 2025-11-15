import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import { AppCard } from './AppCard';
import { AppChip } from './AppChip';
import { AppStepper } from './AppStepper';
import type { MappedFoodItem } from '../../types/ai';
import type { MealTypeId } from '../../types';

type AiDetectionCardProps = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
  mealType: MealTypeId;
  onSelectionChange: (selected: boolean) => void;
  onGramsChange: (grams: number) => void;
  onMealTypeChange: (mealType: MealTypeId) => void;
  onTeachLabel?: () => void;
};

const AiDetectionCardComponent = ({
  item,
  selected,
  grams,
  mealType,
  onSelectionChange,
  onGramsChange,
  onMealTypeChange,
  onTeachLabel,
}: AiDetectionCardProps): JSX.Element => {
  const { theme } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: theme.radius.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    checkmark: {
      color: theme.colors.card,
      fontSize: 16,
      fontWeight: 'bold',
    },
    titleContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    teachLabel: {
      textDecorationLine: 'underline',
    },
    nutrition: {
      marginBottom: theme.spacing.md,
    },
    calories: {
      marginBottom: theme.spacing.xs,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    gramsLabel: {
      marginLeft: theme.spacing.sm,
    },
  }), [theme]);

  // Animation values
  const scaleValue = useSharedValue(1);

  // Animate selection feedback
  useEffect(() => {
    scaleValue.value = withSpring(selected ? 0.97 : 1, { damping: 15, stiffness: 300 });
  }, [selected, scaleValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handleMealTypePress = () => {
    // Cycle through meal types: 1 -> 2 -> 3 -> 4 -> 1
    const nextMealType = ((mealType % 4) + 1) as MealTypeId;
    onMealTypeChange(nextMealType);
  };

  const getMealTypeLabel = (type: MealTypeId): string => {
    const labels = {
      1: 'Sáng',
      2: 'Trưa',
      3: 'Tối',
      4: 'Vặt',
    };
    return labels[type] || 'Sáng';
  };

  const calories = item.caloriesPer100g ?? 0;
  const protein = item.proteinPer100g ?? 0;
  const carbs = item.carbPer100g ?? 0;
  const fat = item.fatPer100g ?? 0;

  return (
    <Animated.View style={animatedStyle}>
      <AppCard style={styles.card}>
        <View style={styles.header}>
        <Pressable
          style={[styles.checkbox, selected && { backgroundColor: theme.colors.primary }]}
          onPress={() => onSelectionChange(!selected)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
        >
          {selected && (
            <ThemedText style={styles.checkmark}>✓</ThemedText>
          )}
        </Pressable>

        <View style={styles.titleContainer}>
          <ThemedText variant="h4" style={styles.title}>
            {item.foodName || item.label}
          </ThemedText>
          {!item.isMatched && onTeachLabel && (
            <Pressable onPress={onTeachLabel}>
              <ThemedText variant="bodySmall" color="primary" style={styles.teachLabel}>Chọn món đúng</ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.nutrition}>
        <ThemedText variant="bodySmall" style={styles.calories}>
          {calories} kcal / 100 g
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary">
          P {protein}g · C {carbs}g · F {fat}g
        </ThemedText>
      </View>

      <View style={styles.controls}>
        <View style={styles.stepperContainer}>
          <AppStepper
            value={grams}
            onChange={onGramsChange}
            min={1}
            max={2000}
            step={10}
          />
          <ThemedText variant="bodySmall" color="textSecondary" style={styles.gramsLabel}>g</ThemedText>
        </View>

        <AppChip
          label={getMealTypeLabel(mealType)}
          selected={false}
          onPress={handleMealTypePress}
        />
      </View>
    </AppCard>
    </Animated.View>
  );
};


export const AiDetectionCard = memo(AiDetectionCardComponent);
export default AiDetectionCard;