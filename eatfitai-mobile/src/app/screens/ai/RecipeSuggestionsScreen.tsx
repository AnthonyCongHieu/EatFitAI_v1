import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ThemedText } from '../../../components/ThemedText';
import { ThemedTextInput } from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { RecipeSuggestion } from '../../../types/aiEnhanced';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecipeSuggestions'>;

const RecipeSuggestionsScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteProps>();

    const [ingredients, setIngredients] = useState<string[]>([]);
    const [newIngredient, setNewIngredient] = useState('');
    const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (route.params?.ingredients) {
            setIngredients(route.params.ingredients);
        }
    }, [route.params?.ingredients]);

    const addIngredient = () => {
        if (newIngredient.trim()) {
            if (!ingredients.includes(newIngredient.trim())) {
                setIngredients([...ingredients, newIngredient.trim()]);
            }
            setNewIngredient('');
        }
    };

    const removeIngredient = (ing: string) => {
        setIngredients(ingredients.filter(i => i !== ing));
    };

    const searchRecipes = async () => {
        if (ingredients.length === 0) return;

        setLoading(true);
        setError(null);
        try {
            const results = await aiService.suggestRecipesEnhanced({
                availableIngredients: ingredients,
                maxResults: 10,
                minMatchedIngredients: 1
            });
            setRecipes(results);
            if (results.length === 0) {
                setError('Không tìm thấy công thức nào phù hợp.');
            }
        } catch (err: any) {
            setError(err?.message || 'Lỗi khi tìm công thức');
        } finally {
            setLoading(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        content: {
            padding: theme.spacing.md,
        },
        inputContainer: {
            flexDirection: 'row',
            marginBottom: theme.spacing.md,
            gap: theme.spacing.sm,
        },
        input: {
            flex: 1,
        },
        chipsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
        },
        chip: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.secondaryLight,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.full,
            gap: theme.spacing.xs,
        },
        recipeCard: {
            marginBottom: theme.spacing.md,
            padding: theme.spacing.md,
        },
        recipeHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing.sm,
        },
        matchBadge: {
            backgroundColor: theme.colors.primaryLight,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            borderRadius: theme.radius.sm,
        },
        nutritionRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: theme.spacing.sm,
            paddingTop: theme.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
        },
        nutritionItem: {
            alignItems: 'center',
        },
        missingIngredients: {
            marginTop: theme.spacing.sm,
            fontStyle: 'italic',
        },
        center: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
    });

    const renderRecipeItem = ({ item }: { item: RecipeSuggestion }) => (
        <Card
            style={styles.recipeCard}
            onPress={() => navigation.navigate('RecipeDetail', {
                recipeId: item.recipeId,
                recipeName: item.recipeName
            })}
        >
            <View style={styles.recipeHeader}>
                <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                    <ThemedText variant="h3">{item.recipeName}</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                        {item.matchedIngredientsCount}/{item.totalIngredientsCount} nguyên liệu
                    </ThemedText>
                </View>
                <View style={styles.matchBadge}>
                    <ThemedText variant="caption" color="primary" style={{ fontWeight: 'bold' }}>
                        {Math.round(item.matchPercentage)}% Match
                    </ThemedText>
                </View>
            </View>

            {item.missingIngredients.length > 0 && (
                <ThemedText variant="caption" color="textSecondary" style={styles.missingIngredients}>
                    Thiếu: {item.missingIngredients.join(', ')}
                </ThemedText>
            )}

            <View style={styles.nutritionRow}>
                <View style={styles.nutritionItem}>
                    <ThemedText variant="caption" color="textSecondary">Calo</ThemedText>
                    <ThemedText variant="bodySmall" style={{ fontWeight: 'bold' }}>{Math.round(item.totalCalories)}</ThemedText>
                </View>
                <View style={styles.nutritionItem}>
                    <ThemedText variant="caption" color="textSecondary">Đạm</ThemedText>
                    <ThemedText variant="bodySmall" style={{ fontWeight: 'bold' }}>{Math.round(item.totalProtein)}g</ThemedText>
                </View>
                <View style={styles.nutritionItem}>
                    <ThemedText variant="caption" color="textSecondary">Carb</ThemedText>
                    <ThemedText variant="bodySmall" style={{ fontWeight: 'bold' }}>{Math.round(item.totalCarbs)}g</ThemedText>
                </View>
                <View style={styles.nutritionItem}>
                    <ThemedText variant="caption" color="textSecondary">Béo</ThemedText>
                    <ThemedText variant="bodySmall" style={{ fontWeight: 'bold' }}>{Math.round(item.totalFat)}g</ThemedText>
                </View>
            </View>
        </Card>
    );

    return (
        <Screen style={styles.container}>
            <ScreenHeader
                title="Gợi ý món ăn"
                subtitle="Tìm công thức dựa trên nguyên liệu bạn có"
            />

            <View style={styles.content}>
                <View style={styles.inputContainer}>
                    <View style={styles.input}>
                        <ThemedTextInput
                            placeholder="Thêm nguyên liệu (vd: gà, trứng...)"
                            value={newIngredient}
                            onChangeText={setNewIngredient}
                            onSubmitEditing={addIngredient}
                        />
                    </View>
                    <View style={{ width: 80 }}>
                        <Button
                            title="Thêm"
                            onPress={addIngredient}
                            variant="secondary"
                            size="sm"
                        />
                    </View>
                </View>

                {ingredients.length > 0 && (
                    <View style={styles.chipsContainer}>
                        {ingredients.map((ing, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.chip}
                                onPress={() => removeIngredient(ing)}
                            >
                                <ThemedText variant="caption">{ing}</ThemedText>
                                <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ marginBottom: theme.spacing.lg }}>
                    <Button
                        title="Tìm công thức"
                        onPress={searchRecipes}
                        disabled={ingredients.length === 0 || loading}
                        variant="primary"
                    />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <ThemedText style={{ marginTop: theme.spacing.sm }}>Đang tìm công thức...</ThemedText>
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <ThemedText color="danger">{error}</ThemedText>
                    </View>
                ) : (
                    <FlatList
                        data={recipes}
                        renderItem={renderRecipeItem}
                        keyExtractor={(item) => item.recipeId.toString()}
                        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            recipes.length === 0 && !loading ? (
                                <View style={styles.center}>
                                    <ThemedText color="textSecondary">
                                        Nhập nguyên liệu và nhấn tìm kiếm để xem gợi ý
                                    </ThemedText>
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>
        </Screen>
    );
};

export default RecipeSuggestionsScreen;
