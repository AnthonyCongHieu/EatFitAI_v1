// Recipe Detail Screen - hiển thị chi tiết công thức
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { RecipeDetail } from '../../../types/aiEnhanced';

type RouteProps = RouteProp<RootStackParamList, 'RecipeDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RecipeDetail'>;

const RecipeDetailScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const route = useRoute<RouteProps>();
    const navigation = useNavigation<NavigationProp>();
    const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await aiService.getRecipeDetail(route.params.recipeId);
                setRecipe(data);
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [route.params.recipeId]);

    if (loading) {
        return (
            <Screen>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
                        Đang tải chi tiết công thức...
                    </ThemedText>
                </View>
            </Screen>
        );
    }

    if (!recipe) {
        return (
            <Screen>
                <ScreenHeader title="Chi tiết công thức" subtitle="Không có dữ liệu" />
                <View style={styles.center}>
                    <ThemedText variant="body" color="textSecondary">
                        Không tìm thấy công thức.
                    </ThemedText>
                </View>
            </Screen>
        );
    }

    return (
        <Screen>
            <ScreenHeader title={route.params.recipeName} subtitle="Chi tiết công thức" />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.box}>
                    <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                        Thông tin dinh dưỡng
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Calories: {recipe.totalCalories} kcal
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Protein: {recipe.totalProtein} g
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Carbs: {recipe.totalCarbs} g
                    </ThemedText>
                    <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
                        Fat: {recipe.totalFat} g
                    </ThemedText>
                </View>

                {recipe.description && (
                    <View style={styles.box}>
                        <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                            Mô tả
                        </ThemedText>
                        <ThemedText variant="body">{recipe.description}</ThemedText>
                    </View>
                )}

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <View style={styles.box}>
                        <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                            Nguyên liệu
                        </ThemedText>
                        {recipe.ingredients.map((ing, i) => (
                            <ThemedText key={i} variant="body" style={{ marginBottom: theme.spacing.xs }}>
                                • {ing.foodName}: {ing.grams}g ({ing.calories} kcal)
                            </ThemedText>
                        ))}
                    </View>
                )}

                {recipe.instructions && recipe.instructions.length > 0 && (
                    <View style={styles.box}>
                        <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                            Hướng dẫn
                        </ThemedText>
                        {recipe.instructions.map((step, i) => (
                            <ThemedText key={i} variant="body" style={{ marginBottom: theme.spacing.sm }}>
                                {i + 1}. {step}
                            </ThemedText>
                        ))}
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    content: {
        padding: 16,
        gap: 16,
    },
    box: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
});

export default RecipeDetailScreen;
