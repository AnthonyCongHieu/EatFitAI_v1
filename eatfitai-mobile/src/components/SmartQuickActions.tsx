// SmartQuickActions component - Hiển thị quick action dựa theo thời gian trong ngày
// Inspired by Lifesum & Yazio smart suggestions

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import Icon from './Icon';
import type { MealTypeId } from '../types';

interface MealSuggestion {
    type: MealTypeId;
    label: string;
    icon: string;
    greeting: string;
}

interface SmartQuickActionsProps {
    onAddMeal: (mealType: MealTypeId) => void;
    onScanFood?: () => void;
    onSearchFood?: () => void;
}

const getMealSuggestion = (hour: number): MealSuggestion => {
    if (hour >= 5 && hour < 10) {
        return { type: 1, label: 'Bữa sáng', icon: '🌅', greeting: 'Chào buổi sáng!' };
    }
    if (hour >= 10 && hour < 14) {
        return { type: 2, label: 'Bữa trưa', icon: '☀️', greeting: 'Đến giờ ăn trưa!' };
    }
    if (hour >= 14 && hour < 18) {
        return { type: 4, label: 'Bữa xế', icon: '🍵', greeting: 'Thời gian nghỉ ngơi!' };
    }
    if (hour >= 18 && hour < 22) {
        return { type: 3, label: 'Bữa tối', icon: '🌙', greeting: 'Chào buổi tối!' };
    }
    return { type: 4, label: 'Ăn đêm', icon: '🌃', greeting: 'Khuya rồi!' };
};

const getAllMealOptions = (): MealSuggestion[] => [
    { type: 1, label: 'Bữa sáng', icon: '🌅', greeting: '' },
    { type: 2, label: 'Bữa trưa', icon: '☀️', greeting: '' },
    { type: 3, label: 'Bữa tối', icon: '🌙', greeting: '' },
    { type: 4, label: 'Ăn vặt', icon: '🍪', greeting: '' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const QuickActionButton = ({
    icon,
    label,
    onPress,
    isPrimary = false,
    delay = 0,
}: {
    icon: string;
    label: string;
    onPress: () => void;
    isPrimary?: boolean;
    delay?: number;
}) => {
    const { theme } = useAppTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    return (
        <Animated.View entering={FadeInRight.delay(delay).springify()}>
            <AnimatedPressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    animatedStyle,
                    styles.actionButton,
                    {
                        backgroundColor: isPrimary ? theme.colors.primary : theme.colors.card,
                        borderColor: isPrimary ? theme.colors.primary : theme.colors.border,
                        ...theme.shadows.sm,
                    },
                ]}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                <ThemedText style={styles.actionIcon}>{icon}</ThemedText>
                <ThemedText
                    variant="bodySmall"
                    weight="600"
                    style={[styles.actionLabel, isPrimary && { color: '#FFFFFF' }]}
                >
                    {label}
                </ThemedText>
            </AnimatedPressable>
        </Animated.View>
    );
};

const SmartQuickActions: React.FC<SmartQuickActionsProps> = ({
    onAddMeal,
    onScanFood,
    onSearchFood,
}) => {
    const { theme } = useAppTheme();

    const currentSuggestion = useMemo(() => {
        const hour = new Date().getHours();
        return getMealSuggestion(hour);
    }, []);

    // Lấy 3 bữa chính (không bao gồm bữa xế/ăn vặt)
    const mainMeals = useMemo(() => {
        return getAllMealOptions().filter((m) => m.type !== 4); // 4 = snack
    }, []);

    // Bữa xế riêng
    const snackMeal = useMemo(() => {
        return getAllMealOptions().find((m) => m.type === 4);
    }, []);

    return (
        <View style={styles.container}>
            {/* Greeting & Primary Suggestion */}
            <View style={styles.header}>
                <ThemedText variant="bodySmall" color="textSecondary">
                    {currentSuggestion.greeting}
                </ThemedText>
                <ThemedText variant="h3" weight="600" style={{ marginTop: theme.spacing.xs }}>
                    Thêm món ăn
                </ThemedText>
            </View>

            {/* Primary Action Row - Bữa ăn theo thời gian + Tìm kiếm */}
            <View style={styles.primaryRow}>
                <QuickActionButton
                    icon={currentSuggestion.icon}
                    label={`Thêm ${currentSuggestion.label}`}
                    onPress={() => onAddMeal(currentSuggestion.type)}
                    isPrimary
                    delay={0}
                />
                {onSearchFood && (
                    <QuickActionButton
                        icon="🔍"
                        label="Tìm kiếm"
                        onPress={onSearchFood}
                        delay={100}
                    />
                )}
            </View>

            {/* Main Meals Row - Bữa sáng, trưa, tối */}
            <View style={styles.secondaryRow}>
                {mainMeals.map((meal, index) => (
                    <Pressable
                        key={meal.type}
                        onPress={() => onAddMeal(meal.type)}
                        style={[
                            styles.secondaryButton,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Thêm ${meal.label}`}
                    >
                        <ThemedText style={styles.secondaryIcon}>{meal.icon}</ThemedText>
                        <ThemedText variant="caption" color="textSecondary">
                            {meal.label}
                        </ThemedText>
                    </Pressable>
                ))}
            </View>

            {/* Snack/Bữa xế Row - riêng ở dưới */}
            {snackMeal && (
                <View style={styles.secondaryRow}>
                    <Pressable
                        onPress={() => onAddMeal(snackMeal.type)}
                        style={[
                            styles.snackButton,
                            {
                                backgroundColor: theme.colors.warning + '10',
                                borderColor: theme.colors.warning + '30',
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Thêm ${snackMeal.label}`}
                    >
                        <ThemedText style={styles.secondaryIcon}>{snackMeal.icon}</ThemedText>
                        <ThemedText variant="bodySmall" weight="600" style={{ color: theme.colors.warning }}>
                            {snackMeal.label}
                        </ThemedText>
                        <ThemedText variant="caption" color="textSecondary">
                            Ăn vặt, đồ uống...
                        </ThemedText>
                    </Pressable>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    header: {
        marginBottom: 4,
    },
    primaryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    actionIcon: {
        fontSize: 20,
    },
    actionLabel: {
        textAlign: 'center',
    },
    secondaryRow: {
        flexDirection: 'row',
        gap: 8,
    },
    secondaryButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    secondaryIcon: {
        fontSize: 18,
    },
    snackButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
});

export default SmartQuickActions;
