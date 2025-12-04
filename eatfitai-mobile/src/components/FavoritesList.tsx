// FavoritesList component - Displays user's favorite foods
// Horizontal scrollable list for quick access

import React from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from './ThemedText';
import { AppCard } from './ui/AppCard';
import Icon from './Icon';
import { useAppTheme } from '../theme/ThemeProvider';
import { favoritesService, FavoriteItem } from '../services/favoritesService';
import type { RootStackParamList } from '../app/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FavoritesListProps {
    onItemPress?: (item: FavoriteItem) => void;
    maxItems?: number;
}

const FavoriteCard = ({
    item,
    onPress,
    index,
}: {
    item: FavoriteItem;
    onPress: () => void;
    index: number;
}) => {
    const { theme } = useAppTheme();

    return (
        <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
            <Pressable
                onPress={onPress}
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        ...theme.shadows.sm,
                    },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.foodName}, ${item.caloriesPer100g} calories per 100g`}
            >
                <View style={styles.cardContent}>
                    <ThemedText
                        variant="bodySmall"
                        weight="600"
                        numberOfLines={2}
                        style={styles.foodName}
                    >
                        {item.foodName}
                    </ThemedText>
                    <View style={styles.macroRow}>
                        <ThemedText variant="caption" color="primary" weight="600">
                            {Math.round(item.caloriesPer100g)} kcal
                        </ThemedText>
                    </View>
                    <View style={styles.macroDetails}>
                        <ThemedText variant="caption" color="textSecondary">
                            P: {Math.round(item.proteinPer100g)}g
                        </ThemedText>
                        <ThemedText variant="caption" color="textSecondary">
                            C: {Math.round(item.carbPer100g)}g
                        </ThemedText>
                    </View>
                </View>
                <Icon name="add-circle" size="md" color="primary" />
            </Pressable>
        </Animated.View>
    );
};

const FavoritesList: React.FC<FavoritesListProps> = ({
    onItemPress,
    maxItems = 10,
}) => {
    const { theme } = useAppTheme();
    const navigation = useNavigation<NavigationProp>();

    const {
        data: favorites = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ['favorites'],
        queryFn: () => favoritesService.getFavorites(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const handleItemPress = (item: FavoriteItem) => {
        if (onItemPress) {
            onItemPress(item);
        } else {
            navigation.navigate('FoodDetail', { foodId: String(item.foodItemId) });
        }
    };

    // Don't render if no favorites and not loading
    if (!isLoading && favorites.length === 0) {
        return null;
    }

    const displayedFavorites = favorites.slice(0, maxItems);

    return (
        <AppCard title="❤️ Yêu thích của bạn" padding="sm">
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={theme.colors.primary} size="small" />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <ThemedText variant="caption" color="textSecondary">
                        Không thể tải yêu thích
                    </ThemedText>
                </View>
            ) : (
                <FlatList
                    horizontal
                    data={displayedFavorites}
                    keyExtractor={(item) => String(item.foodItemId)}
                    renderItem={({ item, index }) => (
                        <FavoriteCard
                            item={item}
                            index={index}
                            onPress={() => handleItemPress(item)}
                        />
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                />
            )}
        </AppCard>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingVertical: 4,
    },
    card: {
        width: 120,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    cardContent: {
        flex: 1,
        width: '100%',
        marginBottom: 8,
    },
    foodName: {
        marginBottom: 6,
        minHeight: 32,
    },
    macroRow: {
        marginBottom: 4,
    },
    macroDetails: {
        flexDirection: 'row',
        gap: 8,
    },
});

export default FavoritesList;
