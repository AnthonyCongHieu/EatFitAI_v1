import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
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
        <BottomSheet visible={visible} onClose={onClose} height={650}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
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
                                {servings}
                            </ThemedText>
                        </Pressable>
                    ))}
                </View>

                {/* Nutrition Preview - Clean horizontal layout */}
                <View style={[
                    styles.nutritionPreview,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
                ]}>
                    <ThemedText variant="bodySmall" weight="600" style={{ marginBottom: 12 }}>
                        Dinh dưỡng ({selectedServings} khẩu phần)
                    </ThemedText>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        {/* Calories */}
                        <View style={{ alignItems: 'center' }}>
                            <ThemedText variant="h4" weight="700" color="primary">
                                {calculatedNutrition.calories}
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">kcal</ThemedText>
                        </View>

                        {/* Protein */}
                        <View style={{ alignItems: 'center' }}>
                            <ThemedText variant="h4" weight="700" style={{ color: '#EF4444' }}>
                                {calculatedNutrition.protein}g
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Protein</ThemedText>
                        </View>

                        {/* Carbs */}
                        <View style={{ alignItems: 'center' }}>
                            <ThemedText variant="h4" weight="700" style={{ color: '#3B82F6' }}>
                                {calculatedNutrition.carbs}g
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Carbs</ThemedText>
                        </View>

                        {/* Fat */}
                        <View style={{ alignItems: 'center' }}>
                            <ThemedText variant="h4" weight="700" style={{ color: '#F59E0B' }}>
                                {calculatedNutrition.fat}g
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">Fat</ThemedText>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Button
                        title="Hủy"
                        variant="outline"
                        onPress={onClose}
                        style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                        title="Thêm"
                        variant="primary"
                        onPress={handleConfirm}
                        style={{ flex: 1.5 }}
                    />
                </View>
            </ScrollView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    mealTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    mealTypeButton: {
        width: '47%',
        padding: 14,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        gap: 6,
    },
    servingsGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    servingsButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nutritionPreview: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    nutritionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
    },
    nutritionItem: {
        width: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    nutritionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
});
