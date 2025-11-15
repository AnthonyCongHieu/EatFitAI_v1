import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
              <ThemedText style={styles.teachLabel}>Chọn món đúng</ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.nutrition}>
        <ThemedText style={styles.calories}>
          {calories} kcal / 100 g
        </ThemedText>
        <ThemedText style={styles.macros}>
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
          <ThemedText style={styles.gramsLabel}>g</ThemedText>
        </View>

        <AppChip
          label={getMealTypeLabel(mealType)}
          selected={false}
          onPress={handleMealTypePress}
        />
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#fff',
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
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  nutrition: {
    marginBottom: 12,
  },
  calories: {
    fontSize: 14,
    marginBottom: 4,
  },
  macros: {
    fontSize: 12,
    color: '#666',
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
    marginLeft: 8,
    fontSize: 14,
  },
});

export const AiDetectionCard = memo(AiDetectionCardComponent);
export default AiDetectionCard;