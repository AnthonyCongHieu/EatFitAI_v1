/**
 * IngredientBasketSheet - Bottom Sheet hiển thị danh sách nguyên liệu
 * Cho phép xóa nguyên liệu và gợi ý công thức
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { BottomSheet } from '../BottomSheet';
import { ThemedText } from '../ThemedText';
import { Button } from '../Button';
import Icon from '../Icon';
import { AppCard } from '../ui/AppCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useIngredientBasketStore, ScannedIngredient } from '../../store/useIngredientBasketStore';
import { aiService } from '../../services/aiService';
import type { RootStackParamList } from '../../app/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface IngredientBasketSheetProps {
    visible: boolean;
    onClose: () => void;
}

export const IngredientBasketSheet: React.FC<IngredientBasketSheetProps> = ({
    visible,
    onClose,
}) => {
    const { theme } = useAppTheme();
    const navigation = useNavigation<NavigationProp>();
    const ingredients = useIngredientBasketStore((s) => s.ingredients);
    const removeIngredient = useIngredientBasketStore((s) => s.removeIngredient);
    const clearBasket = useIngredientBasketStore((s) => s.clearBasket);
    const getIngredientNames = useIngredientBasketStore((s) => s.getIngredientNames);

    const [isLoading, setIsLoading] = useState(false);

    const handleRemove = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        removeIngredient(id);
    }, [removeIngredient]);

    const handleClear = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        clearBasket();
        onClose();
    }, [clearBasket, onClose]);

    const handleSuggestRecipes = useCallback(async () => {
        const names = getIngredientNames();
        if (names.length === 0) {
            Toast.show({
                type: 'info',
                text1: 'Chưa có nguyên liệu',
                text2: 'Quét thêm nguyên liệu để gợi ý công thức',
            });
            return;
        }

        setIsLoading(true);
        try {
            const recipes = await aiService.suggestRecipes(names);

            if (recipes.length === 0) {
                Toast.show({
                    type: 'info',
                    text1: 'Không tìm thấy công thức',
                    text2: 'Thử thêm nguyên liệu khác',
                });
                return;
            }

            // Navigate to recipe list with suggested recipes
            onClose();
            navigation.navigate('RecipeSuggestions', {
                ingredients: names,
                recipes: recipes,
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Lỗi gợi ý công thức',
                text2: 'Vui lòng thử lại',
            });
        } finally {
            setIsLoading(false);
        }
    }, [getIngredientNames, navigation, onClose]);

    const renderIngredient = useCallback(({ item }: { item: ScannedIngredient }) => (
        <Animated.View
            entering={FadeInRight.duration(200)}
            exiting={FadeOutLeft.duration(200)}
        >
            <AppCard style={styles.ingredientCard}>
                <View style={styles.ingredientContent}>
                    <View style={[styles.iconBg, { backgroundColor: theme.colors.primaryLight }]}>
                        <Icon name="leaf-outline" size="md" color="primary" />
                    </View>
                    <View style={styles.ingredientInfo}>
                        <ThemedText variant="body" weight="600">
                            {item.name}
                        </ThemedText>
                        <ThemedText variant="caption" color="textSecondary">
                            Độ tin cậy: {Math.round(item.confidence * 100)}%
                        </ThemedText>
                    </View>
                    <Pressable
                        onPress={() => handleRemove(item.id)}
                        style={[styles.removeBtn, { backgroundColor: theme.colors.danger + '20' }]}
                        hitSlop={8}
                    >
                        <Icon name="close" size="sm" color="danger" />
                    </Pressable>
                </View>
            </AppCard>
        </Animated.View>
    ), [handleRemove, theme]);

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title={`Giỏ nguyên liệu (${ingredients.length})`}
            height={450}
        >
            <View style={styles.container}>
                {ingredients.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="basket-outline" size="xl" color="muted" />
                        <ThemedText
                            variant="body"
                            color="textSecondary"
                            style={{ textAlign: 'center', marginTop: theme.spacing.md }}
                        >
                            Chưa có nguyên liệu nào.{'\n'}Quét để thêm nguyên liệu!
                        </ThemedText>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={ingredients}
                            keyExtractor={(item) => item.id}
                            renderItem={renderIngredient}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                        />

                        <View style={styles.actions}>
                            <Button
                                variant="outline"
                                title="Xóa tất cả"
                                onPress={handleClear}
                                style={{ flex: 1 }}
                                size="sm"
                            />
                            <Button
                                variant="primary"
                                title={isLoading ? 'Đang tìm...' : 'Gợi ý công thức'}
                                onPress={handleSuggestRecipes}
                                loading={isLoading}
                                disabled={isLoading}
                                style={{ flex: 2 }}
                                size="sm"
                            />
                        </View>
                    </>
                )}
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        paddingBottom: 16,
        gap: 8,
    },
    ingredientCard: {
        padding: 12,
        marginBottom: 0,
    },
    ingredientContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ingredientInfo: {
        flex: 1,
    },
    removeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
});

export default IngredientBasketSheet;
