/**
 * IngredientBasketFab - Floating Action Button hiển thị giỏ nguyên liệu
 * Có thể kéo thả tự do, hiển thị số lượng nguyên liệu và mở BottomSheet khi tap
 */
import React, { useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../ThemedText';
import Icon from '../Icon';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useIngredientBasketStore } from '../../store/useIngredientBasketStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FAB_SIZE = 52;

interface IngredientBasketFabProps {
  onPress: () => void;
}

export const IngredientBasketFab: React.FC<IngredientBasketFabProps> = ({ onPress }) => {
  const { theme } = useAppTheme();
  const count = useIngredientBasketStore((s) => s.getCount());
  const scale = useSharedValue(1);

  // Position values for dragging
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Callback để xử lý tap - chạy trên JS thread
  const handleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  // Tap gesture for opening sheet
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      if (!isDragging.value) {
        // Animate: scale down rồi scale up
        scale.value = withSequence(
          withSpring(0.9, { damping: 18, stiffness: 400 }),
          withSpring(1, { damping: 18, stiffness: 400 })
        );
        // Gọi JS function qua runOnJS
        runOnJS(handleTap)();
      }
    });

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      isDragging.value = false;
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationX) > 5 || Math.abs(event.translationY) > 5) {
        isDragging.value = true;
      }

      // Calculate new position with boundaries
      const newX = contextX.value + event.translationX;
      const newY = contextY.value + event.translationY;

      // Limit to screen bounds (FAB starts at bottom-right)
      // Container is positioned at bottom: 175, right: 20
      const maxX = 20; // Can go left up to SCREEN_WIDTH - FAB_SIZE - 20
      const minX = -(SCREEN_WIDTH - FAB_SIZE - 40);
      const maxY = 175 - FAB_SIZE; // Can go down
      const minY = -(SCREEN_HEIGHT - 175 - FAB_SIZE - 100); // Can go up

      translateX.value = Math.max(minX, Math.min(maxX, newX));
      translateY.value = Math.max(minY, Math.min(maxY, newY));
    })
    .onEnd(() => {
      // Snap to edges
      const snapToRight = translateX.value > -(SCREEN_WIDTH / 2 - FAB_SIZE);
      translateX.value = withSpring(snapToRight ? 0 : -(SCREEN_WIDTH - FAB_SIZE - 40));
      isDragging.value = false;
    });

  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Không hiển thị nếu không có nguyên liệu
  if (count === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, animatedStyle]}
    >
      <GestureDetector gesture={composedGesture}>
        <Animated.View>
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
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 175,
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
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

