// FavoritesList component - Displays user's favorite foods
// Horizontal scrollable list for quick access

import React from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
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
    const isDark = theme.mode === 'dark';

    return (
        <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
            <Pressable
                onPress={onPress}
                style={[
                    styles.card,
                    {
                        // Glassmorphism effect
                        backgroundColor: isDark
                            ? 'rgba(30, 35, 33, 0.75)'
                            : 'rgba(255, 255, 255, 0.85)',
                        borderColor: isDark
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.08)',
                        // Shadow for depth
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDark ? 0.3 : 0.1,
                        shadowRadius: 12,
                        elevation: 6,
                    },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.foodName}, ${item.caloriesPer100g} calories per 100g`}
            >
                {/* Food image hoặc fallback emoji */}
                <View style={[
                    styles.imageContainer,
                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }
                ]}>
                    {item.thumbNail ? (
                        <Image
                            source={{ uri: item.thumbNail }}
                            style={styles.foodImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <ThemedText style={{ fontSize: 28 }}>🍽️</ThemedText>
                    )}
                </View>

                <View style={styles.cardContent}>
                    <ThemedText
                        variant="bodySmall"
                        weight="600"
                        numberOfLines={2}
                        style={styles.foodName}
                    >
                        {item.foodName}
                    </ThemedText>
                    <ThemedText variant="caption" color="primary" weight="700">
                        {Math.round(item.caloriesPer100g)} kcal
                    </ThemedText>
                </View>

                {/* Add button */}
                <View style={[
                    styles.addButton,
                    { backgroundColor: theme.colors.primary }
                ]}>
                    <Icon name="add" size="sm" color="#fff" />
                </View>
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
        width: 130,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'column',
        alignItems: 'center',
    },
    imageContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },
    foodImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    cardContent: {
        width: '100%',
        alignItems: 'center',
    },
    foodName: {
        marginBottom: 4,
        textAlign: 'center',
    },
    addButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
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
