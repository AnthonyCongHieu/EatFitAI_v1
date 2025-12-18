import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { BottomSheet } from '../BottomSheet';
import Button from '../Button';
import { useAppTheme } from '../../theme/ThemeProvider';
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
}

const MEAL_TYPES: { id: MealTypeId; label: string; icon: string }[] = [
    { id: 1, label: 'Bữa sáng', icon: '🌅' },
    { id: 2, label: 'Bữa trưa', icon: '☀️' },
    { id: 3, label: 'Bữa tối', icon: '🌙' },
    { id: 4, label: 'Ăn vặt', icon: '🍵' },
];

const SERVINGS_OPTIONS = [0.5, 1, 1.5, 2, 3, 4];

export const AddRecipeToDiarySheet = ({
    visible,
    onClose,
    recipeName,
    nutrition,
    onConfirm,
}: AddRecipeToDiarySheetProps): React.ReactElement => {
    const { theme } = useAppTheme();
    const [selectedMealType, setSelectedMealType] = useState<MealTypeId>(2); // Default: lunch
    const [selectedServings, setSelectedServings] = useState(1);

    const calculatedNutrition = {
        calories: Math.round(nutrition.calories * selectedServings),
        protein: Math.round(nutrition.protein * selectedServings * 10) / 10,
        carbs: Math.round(nutrition.carbs * selectedServings * 10) / 10,
        fat: Math.round(nutrition.fat * selectedServings * 10) / 10,
    };

    const handleConfirm = () => {
        onConfirm(selectedMealType, selectedServings);
        onClose();
    };

    return (
        <BottomSheet visible={visible} onClose={onClose} height={520}>
            <View style={{ padding: theme.spacing.lg }}>
                {/* Header */}
                <ThemedText variant="h3" weight="600" style={{ marginBottom: theme.spacing.sm }}>
                    ➕ Thêm vào nhật ký
                </ThemedText>
                <ThemedText variant="body" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
                    {recipeName}
                </ThemedText>

                {/* Meal Type Selection */}
                <ThemedText variant="bodySmall" weight="600" style={{ marginBottom: theme.spacing.sm }}>
                    Chọn bữa ăn
                </ThemedText>
                <View style={styles.mealTypeGrid}>
                    {MEAL_TYPES.map((meal) => (
                        <Pressable
                            key={meal.id}
                            onPress={() => setSelectedMealType(meal.id)}
                            style={[
                                styles.mealTypeButton,
                                {
                                    backgroundColor:
                                        selectedMealType === meal.id
                                            ? theme.colors.primary + '20'
                                            : theme.colors.background,
                                    borderColor:
                                        selectedMealType === meal.id
                                            ? theme.colors.primary
                                            : theme.colors.border,
                                },
                            ]}
                        >
                            <ThemedText variant="h4">{meal.icon}</ThemedText>
                            <ThemedText
                                variant="caption"
                                weight={selectedMealType === meal.id ? '600' : '400'}
                                color={selectedMealType === meal.id ? 'primary' : 'textSecondary'}
                            >
                                {meal.label}
                            </ThemedText>
                        </Pressable>
                    ))}
                </View>

                {/* Servings Selection */}
                <ThemedText
                    variant="bodySmall"
                    weight="600"
                    style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}
                >
                    Số khẩu phần
                </ThemedText>
                <View style={styles.servingsGrid}>
                    {SERVINGS_OPTIONS.map((servings) => (
                        <Pressable
                            key={servings}
                            onPress={() => setSelectedServings(servings)}
                            style={[
                                styles.servingsButton,
                                {
                                    backgroundColor:
                                        selectedServings === servings
                                            ? theme.colors.secondary + '20'
                                            : theme.colors.background,
                                    borderColor:
                                        selectedServings === servings
                                            ? theme.colors.secondary
                                            : theme.colors.border,
                                },
                            ]}
                        >
                            <ThemedText
                                variant="body"
                                weight={selectedServings === servings ? '700' : '400'}
                            >
                                {servings}x
                            </ThemedText>
                        </Pressable>
                    ))}
                </View>

                {/* Nutrition Preview */}
                <View
                    style={[
                        styles.nutritionPreview,
                        {
                            backgroundColor: theme.colors.primaryLight + '20',
                            borderColor: theme.colors.primary + '30',
                        },
                    ]}
                >
                    <ThemedText variant="bodySmall" weight="600" style={{ marginBottom: theme.spacing.xs }}>
                        📊 Dinh dưỡng ({selectedServings} khẩu phần)
                    </ThemedText>
                    <View style={styles.nutritionRow}>
                        <ThemedText variant="caption" color="textSecondary">
                            Calories: {calculatedNutrition.calories} kcal
                        </ThemedText>
                        <ThemedText variant="caption" color="textSecondary">
                            Protein: {calculatedNutrition.protein}g
                        </ThemedText>
                    </View>
                    <View style={styles.nutritionRow}>
                        <ThemedText variant="caption" color="textSecondary">
                            Carbs: {calculatedNutrition.carbs}g
                        </ThemedText>
                        <ThemedText variant="caption" color="textSecondary">
                            Fat: {calculatedNutrition.fat}g
                        </ThemedText>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Button title="Hủy" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
                    <Button
                        title="Thêm vào nhật ký"
                        variant="primary"
                        onPress={handleConfirm}
                        style={{ flex: 1 }}
                    />
                </View>
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    mealTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    mealTypeButton: {
        width: '48%',
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        gap: 4,
    },
    servingsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    servingsButton: {
        width: '30%',
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
    },
    nutritionPreview: {
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    nutritionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
});
