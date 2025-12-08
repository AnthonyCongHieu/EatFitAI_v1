/**
 * IngredientBasketFab - Floating Action Button hiển thị giỏ nguyên liệu
 * Hiển thị số lượng nguyên liệu và mở BottomSheet khi tap
 */
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../ThemedText';
import Icon from '../Icon';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useIngredientBasketStore } from '../../store/useIngredientBasketStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface IngredientBasketFabProps {
    onPress: () => void;
}

export const IngredientBasketFab: React.FC<IngredientBasketFabProps> = ({ onPress }) => {
    const { theme } = useAppTheme();
    const count = useIngredientBasketStore((s) => s.getCount());
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(0.9, { damping: 10 });
        setTimeout(() => {
            scale.value = withSpring(1, { damping: 15 });
        }, 100);
        onPress();
    };

    // Không hiển thị nếu không có nguyên liệu
    if (count === 0) {
        return null;
    }

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.container}
        >
            <AnimatedPressable onPress={handlePress} style={animatedStyle}>
                <LinearGradient
                    colors={[theme.colors.primary, theme.colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fab}
                >
                    <Icon name="basket-outline" size="lg" color="card" />

                    {/* Badge count */}
                    <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
                        <ThemedText
                            variant="caption"
                            weight="700"
                            style={{ color: '#fff', fontSize: 11 }}
                        >
                            {count > 9 ? '9+' : count}
                        </ThemedText>
                    </View>
                </LinearGradient>
            </AnimatedPressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 120,
        right: 20,
        zIndex: 100,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#fff',
    },
});

export default IngredientBasketFab;
