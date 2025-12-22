/**
 * FoodEntryCard - Card hiển thị food entry với swipe actions
 * Features:
 * - Food image hoặc emoji placeholder
 * - Macro chips (P/C/F)
 * - Swipe-to-delete
 * - Source badge (AI/Manual)
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeIn,
    FadeOut,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText } from '../ThemedText';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FoodEntryCardProps {
    id: string;
    foodName: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    quantityText?: string;
    sourceMethod?: 'ai' | 'manual' | 'search';
    imageUrl?: string;
    onPress?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
}

// Emoji mapping cho các loại thực phẩm phổ biến (mở rộng)
const getFoodEmoji = (foodName: string): string => {
    const name = foodName.toLowerCase();

    // Cơm, xôi, cháo
    if (name.includes('cơm') || name.includes('rice')) return '🍚';
    if (name.includes('xôi')) return '🍙';
    if (name.includes('cháo')) return '🥣';

    // Phở, mì, bún
    if (name.includes('phở') || name.includes('noodle')) return '🍜';
    if (name.includes('mì') || name.includes('pasta')) return '🍝';
    if (name.includes('bún')) return '🍜';

    // Thịt
    if (name.includes('gà') || name.includes('chicken')) return '🍗';
    if (name.includes('bò') || name.includes('beef')) return '🥩';
    if (name.includes('heo') || name.includes('lợn') || name.includes('pork')) return '🥓';
    if (name.includes('vịt') || name.includes('duck')) return '🦆';

    // Hải sản
    if (name.includes('cá') || name.includes('fish')) return '🐟';
    if (name.includes('tôm') || name.includes('shrimp')) return '🦐';
    if (name.includes('cua') || name.includes('crab')) return '🦀';
    if (name.includes('mực') || name.includes('squid')) return '🦑';
    if (name.includes('hải sản') || name.includes('seafood')) return '🦞';

    // Trứng, đậu
    if (name.includes('trứng') || name.includes('egg')) return '🥚';
    if (name.includes('đậu') || name.includes('tofu') || name.includes('bean')) return '🫘';

    // Rau củ
    if (name.includes('rau') || name.includes('salad') || name.includes('vegetable')) return '🥗';
    if (name.includes('khoai') || name.includes('potato')) return '🥔';
    if (name.includes('cà rốt') || name.includes('carrot')) return '🥕';
    if (name.includes('bắp') || name.includes('corn')) return '🌽';

    // Trái cây
    if (name.includes('trái cây') || name.includes('fruit')) return '🍎';
    if (name.includes('chuối') || name.includes('banana')) return '🍌';
    if (name.includes('cam') || name.includes('orange')) return '🍊';
    if (name.includes('xoài') || name.includes('mango')) return '🥭';
    if (name.includes('dưa') || name.includes('watermelon')) return '🍉';
    if (name.includes('nho') || name.includes('grape')) return '🍇';

    // Bánh
    if (name.includes('bánh mì') || name.includes('bread')) return '🍞';
    if (name.includes('bánh') || name.includes('cake')) return '🍰';
    if (name.includes('pizza')) return '🍕';
    if (name.includes('hamburger') || name.includes('burger')) return '🍔';
    if (name.includes('sandwich')) return '🥪';

    // Đồ uống
    if (name.includes('sữa') || name.includes('milk')) return '🥛';
    if (name.includes('coffee') || name.includes('cà phê')) return '☕';
    if (name.includes('trà') || name.includes('tea')) return '🍵';
    if (name.includes('nước') || name.includes('water') || name.includes('juice')) return '🧃';
    if (name.includes('sinh tố') || name.includes('smoothie')) return '🥤';

    // Canh, súp
    if (name.includes('canh') || name.includes('soup') || name.includes('súp')) return '🍲';

    // Snacks
    if (name.includes('snack') || name.includes('chips')) return '🍿';
    if (name.includes('kẹo') || name.includes('candy')) return '🍬';
    if (name.includes('kem') || name.includes('ice cream')) return '🍦';

    return '🍽️';
};

export const FoodEntryCard: React.FC<FoodEntryCardProps> = ({
    id,
    foodName,
    calories,
    protein = 0,
    carbs = 0,
    fat = 0,
    quantityText,
    sourceMethod = 'manual',
    imageUrl,
    onPress,
    onDelete,
    onEdit,
}) => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const translateX = useSharedValue(0);
    const isSwipedOpen = useSharedValue(false);

    const ACTION_THRESHOLD = -60;
    const SWIPE_OPEN_THRESHOLD = -50;

    // Swipe gesture
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            // Chỉ cho phép swipe sang trái
            if (event.translationX < 0) {
                translateX.value = Math.max(event.translationX, ACTION_THRESHOLD);
            } else if (isSwipedOpen.value) {
                translateX.value = Math.min(0, SWIPE_OPEN_THRESHOLD + event.translationX);
            }
        })
        .onEnd((event) => {
            if (translateX.value < SWIPE_OPEN_THRESHOLD / 2) {
                // Open action buttons
                translateX.value = withSpring(SWIPE_OPEN_THRESHOLD, {
                    damping: 20,
                    stiffness: 200,
                });
                isSwipedOpen.value = true;
            } else {
                // Close action buttons
                translateX.value = withSpring(0, {
                    damping: 20,
                    stiffness: 200,
                });
                isSwipedOpen.value = false;
            }
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const handleDelete = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        translateX.value = withSpring(0);
        isSwipedOpen.value = false;
        onDelete?.();
    }, [onDelete, translateX, isSwipedOpen]);

    const handleEdit = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        translateX.value = withSpring(0);
        isSwipedOpen.value = false;
        onEdit?.();
    }, [onEdit, translateX, isSwipedOpen]);

    const foodEmoji = getFoodEmoji(foodName);

    const styles = getStyles(theme, isDark);

    return (
        <View style={styles.container}>
            {/* Main card */}
            <Pressable
                style={styles.card}
                onPress={onPress}
            >
                {/* Food image / emoji */}
                <View style={styles.imageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.foodImage} />
                    ) : (
                        <View style={styles.emojiContainer}>
                            <ThemedText style={styles.emoji}>{foodEmoji}</ThemedText>
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <ThemedText
                        variant="body"
                        weight="600"
                        numberOfLines={1}
                        style={styles.foodName}
                    >
                        {foodName}
                    </ThemedText>

                    {/* Quantity + Calories */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {quantityText && (
                            <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
                                {quantityText}
                            </ThemedText>
                        )}
                        <ThemedText variant="caption" color="textSecondary">·</ThemedText>
                        <ThemedText variant="caption" weight="600" color="primary">
                            {Math.round(calories)} kcal
                        </ThemedText>
                    </View>

                    {/* Macro chips */}
                    <View style={styles.macroRow}>
                        {/* Solid colors để fix 2 màu trên Android */}
                        <View style={[styles.macroChip, { backgroundColor: isDark ? '#1A2A50' : '#E0F2FE' }]}>
                            <ThemedText variant="caption" style={{ color: '#3B82F6' }}>
                                P {Math.round(protein)}g
                            </ThemedText>
                        </View>
                        <View style={[styles.macroChip, { backgroundColor: isDark ? '#2A2818' : '#FEF3C7' }]}>
                            <ThemedText variant="caption" style={{ color: '#D97706' }}>
                                C {Math.round(carbs)}g
                            </ThemedText>
                        </View>
                        <View style={[styles.macroChip, { backgroundColor: isDark ? '#2A1A28' : '#FCE7F3' }]}>
                            <ThemedText variant="caption" style={{ color: '#DB2777' }}>
                                F {Math.round(fat)}g
                            </ThemedText>
                        </View>
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actionsColumn}>
                    <Pressable style={styles.editButton} onPress={handleEdit}>
                        <Ionicons name="pencil" size={16} color="#FFF" />
                    </Pressable>
                    <Pressable style={styles.deleteButton} onPress={handleDelete}>
                        <Ionicons name="trash" size={16} color="#FFF" />
                    </Pressable>
                </View>
            </Pressable>
        </View>
    );
};

const getStyles = (theme: any, isDark: boolean) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            marginBottom: theme.spacing.sm,
        },
        actionsBackground: {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 50,
            flexDirection: 'column',
            borderRadius: theme.radius.lg,
            overflow: 'hidden',
        },
        actionsColumn: {
            flexDirection: 'column',
            gap: 4,
            marginLeft: 'auto',
        },
        editButton: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#3B82F6',
            alignItems: 'center',
            justifyContent: 'center',
        },
        deleteButton: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#EF4444',
            alignItems: 'center',
            justifyContent: 'center',
        },
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: theme.spacing.md,
            // Solid colors để fix 2 màu trên Android
            backgroundColor: isDark ? '#1A2744' : '#FFF',
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: isDark ? '#2A3F68' : 'rgba(0,0,0,0.05)',
            gap: theme.spacing.md,
            ...theme.shadows.sm,
        },
        imageContainer: {
            width: 52,
            height: 52,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
        },
        foodImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        emojiContainer: {
            width: '100%',
            height: '100%',
            // Solid colors để fix 2 màu trên Android
            backgroundColor: isDark ? '#1E3050' : '#F5F5F5',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.md,
        },
        emoji: {
            fontSize: 28,
        },
        content: {
            flex: 1,
            gap: 2,
        },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
        },
        foodName: {
            flex: 1,
        },
        badge: {
            paddingHorizontal: theme.spacing.xs,
            paddingVertical: 2,
            borderRadius: theme.radius.sm,
        },
        macroRow: {
            flexDirection: 'row',
            gap: theme.spacing.xs,
            marginTop: 4,
        },
        macroChip: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        caloriesInline: {
            marginLeft: 'auto',
        },
        caloriesContainer: {
            alignItems: 'flex-end',
        },
    });

export default FoodEntryCard;
