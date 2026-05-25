import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ThemedText } from '../ThemedText';
import { BottomSheet } from '../BottomSheet';
import { useEN } from '../../theme/emeraldNebula';
import { Ionicons } from '@expo/vector-icons';
import type { MealTypeId } from '../../types';

interface AddRecipeToDiarySheetProps {
  visible: boolean;
  onClose: () => void;
  recipeName: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onConfirm: (mealTypeId: MealTypeId, servings: number) => void;
  defaultMealType?: number;
  diaryEntryId?: string;
  currentGrams?: number;
  baseGrams?: number;
}

const MEAL_TYPES: { id: MealTypeId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 1, label: 'Bữa sáng', icon: 'sunny-outline' },
  { id: 2, label: 'Bữa trưa', icon: 'restaurant-outline' },
  { id: 3, label: 'Bữa tối', icon: 'moon-outline' },
  { id: 4, label: 'Ăn vặt', icon: 'cafe-outline' },
];

const SERVINGS_OPTIONS = [0.5, 1, 1.5, 2, 3, 4];

export const AddRecipeToDiarySheet = ({
  visible,
  onClose,
  nutrition,
  onConfirm,
  defaultMealType,
  diaryEntryId,
  currentGrams,
  baseGrams = 100,
}: AddRecipeToDiarySheetProps): React.ReactElement => {
  const P = useEN();
  const [selectedMealType, setSelectedMealType] = useState<MealTypeId | undefined>(defaultMealType as MealTypeId | undefined);
  const [selectedServings, setSelectedServings] = useState(currentGrams ? currentGrams / baseGrams : 1);

  const calculatedNutrition = {
    calories: Math.round(nutrition.calories * selectedServings),
    protein: Math.round(nutrition.protein * selectedServings * 10) / 10,
    carbs: Math.round(nutrition.carbs * selectedServings * 10) / 10,
    fat: Math.round(nutrition.fat * selectedServings * 10) / 10,
  };

  const handleConfirm = () => {
    if (selectedMealType === undefined) return;
    onConfirm(selectedMealType, selectedServings);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} height={600}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Type Selection */}
        <ThemedText style={[styles.sectionTitle, { color: P.onSurfaceVariant }]}>
          Chọn bữa ăn
        </ThemedText>
        <View style={styles.mealTypeGrid}>
          {MEAL_TYPES.map((meal) => {
            const isSelected = selectedMealType === meal.id;
            return (
              <Pressable
                key={meal.id}
                onPress={() => setSelectedMealType(meal.id)}
                style={[
                  styles.mealTypeButton,
                  {
                    backgroundColor: isSelected
                      ? P.primary + '15'
                      : 'rgba(226, 232, 240, 0.04)',
                    borderColor: isSelected ? P.primary : P.glassBorder,
                  },
                ]}
              >
                <Ionicons
                  name={meal.icon}
                  size={20}
                  color={isSelected ? P.primary : P.onSurfaceVariant}
                />
                <ThemedText
                  style={[
                    styles.mealLabel,
                    {
                      color: isSelected ? P.primary : P.onSurfaceVariant,
                      fontFamily: isSelected ? 'BeVietnamPro_700Bold' : 'BeVietnamPro_500Medium',
                    },
                  ]}
                >
                  {meal.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Servings Selection */}
        <ThemedText
          style={[styles.sectionTitle, { marginTop: 24, color: P.onSurfaceVariant }]}
        >
          Số khẩu phần
        </ThemedText>
        <View style={styles.servingsGrid}>
          {SERVINGS_OPTIONS.map((servings) => {
            const isSelected = selectedServings === servings;
            return (
              <Pressable
                key={servings}
                onPress={() => setSelectedServings(servings)}
                style={[
                  styles.servingsButton,
                  {
                    backgroundColor: isSelected
                      ? P.primary + '15'
                      : 'rgba(226, 232, 240, 0.04)',
                    borderColor: isSelected ? P.primary : P.glassBorder,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.servingsText,
                    {
                      color: isSelected ? P.primary : P.onSurface,
                      fontFamily: isSelected ? 'BeVietnamPro_700Bold' : 'BeVietnamPro_500Medium',
                    },
                  ]}
                >
                  {servings}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Nutrition Preview */}
        <View
          style={[
            styles.nutritionPreview,
            { backgroundColor: P.surfaceLow, borderColor: P.glassBorder },
          ]}
        >
          <ThemedText style={[styles.nutritionTitle, { color: P.onSurfaceVariant }]}>
            Dinh dưỡng ({selectedServings} khẩu phần)
          </ThemedText>

          <View style={styles.nutritionRow}>
            {/* Calories */}
            <View style={styles.nutritionBox}>
              <ThemedText style={[styles.nutritionVal, { color: P.primary }]}>
                {calculatedNutrition.calories}
              </ThemedText>
              <ThemedText style={[styles.nutritionLabel, { color: P.textMuted }]}>
                kcal
              </ThemedText>
            </View>

            {/* Protein */}
            <View style={styles.nutritionBox}>
              <ThemedText style={[styles.nutritionVal, { color: '#34d399' }]}>
                {calculatedNutrition.protein}g
              </ThemedText>
              <ThemedText style={[styles.nutritionLabel, { color: P.textMuted }]}>
                Đạm
              </ThemedText>
            </View>

            {/* Carbs */}
            <View style={styles.nutritionBox}>
              <ThemedText style={[styles.nutritionVal, { color: '#f7c052' }]}>
                {calculatedNutrition.carbs}g
              </ThemedText>
              <ThemedText style={[styles.nutritionLabel, { color: P.textMuted }]}>
                Tinh bột
              </ThemedText>
            </View>

            {/* Fat */}
            <View style={styles.nutritionBox}>
              <ThemedText style={[styles.nutritionVal, { color: '#f87171' }]}>
                {calculatedNutrition.fat}g
              </ThemedText>
              <ThemedText style={[styles.nutritionLabel, { color: P.textMuted }]}>
                Chất béo
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.76 },
            ]}
            onPress={onClose}
          >
            <ThemedText style={[styles.cancelText, { color: P.onSurface }]}>
              Hủy
            </ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: P.primary },
              pressed && { opacity: 0.76 },
              selectedMealType === undefined && { opacity: 0.5 },
            ]}
            onPress={handleConfirm}
            disabled={selectedMealType === undefined}
          >
            <ThemedText style={styles.confirmText}>
              {diaryEntryId ? 'Cập nhật' : 'Thêm'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'BeVietnamPro_700Bold',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mealTypeButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  mealLabel: {
    fontSize: 14,
  },
  servingsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  servingsButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsText: {
    fontSize: 14,
  },
  nutritionPreview: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  nutritionTitle: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionBox: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionVal: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  nutritionLabel: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(226, 232, 240, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1.5,
    minHeight: 46,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#003915',
  },
});
