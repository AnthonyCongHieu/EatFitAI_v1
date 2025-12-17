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
    scale.value = withSpring(0.9, { damping: 18, stiffness: 400 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 18, stiffness: 400 });
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
    bottom: 175,
    right: 44,
    zIndex: 100,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default IngredientBasketFab;
