import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type SwipeAction = {
  key: string;
  label: string;
  color: string;
  icon?: ReactNode;
  onPress: () => void;
};

type SwipeableProps = {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  friction?: number;
  threshold?: number;
};

export const Swipeable = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeStart,
  onSwipeEnd,
  friction = 1,
  threshold = 100
}: SwipeableProps): JSX.Element => {
  const { theme } = useAppTheme();

  const translateX = useSharedValue(0);
  const isSwiping = useSharedValue(false);

  const maxLeftSwipe = leftActions.length * 80;
  const maxRightSwipe = rightActions.length * 80;

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      if (onSwipeStart) {
        runOnJS(onSwipeStart)();
      }
      isSwiping.value = true;
    },
    onActive: (event) => {
      const translationX = event.translationX / friction;

      if (leftActions.length > 0 && translationX > 0) {
        translateX.value = Math.min(translationX, maxLeftSwipe);
      } else if (rightActions.length > 0 && translationX < 0) {
        translateX.value = Math.max(translationX, -maxRightSwipe);
      }
    },
    onEnd: (event) => {
      const velocityX = event.velocityX;

      if (Math.abs(translateX.value) > threshold || Math.abs(velocityX) > 500) {
        // Snap to actions
        if (translateX.value > 0) {
          translateX.value = withSpring(maxLeftSwipe, { damping: 20, stiffness: 200 });
        } else if (translateX.value < 0) {
          translateX.value = withSpring(-maxRightSwipe, { damping: 20, stiffness: 200 });
        }
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }

      isSwiping.value = false;
      if (onSwipeEnd) {
        runOnJS(onSwipeEnd)();
      }
    },
    onFail: () => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      isSwiping.value = false;
      if (onSwipeEnd) {
        runOnJS(onSwipeEnd)();
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const renderActions = (actions: SwipeAction[], isLeft: boolean) => {
    return actions.map((action, index) => {
      const actionStyle = {
        backgroundColor: action.color,
        width: 80,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        position: 'absolute' as const,
        top: 0,
        bottom: 0,
        [isLeft ? 'right' : 'left']: index * 80,
      };

      return (
        <Animated.View key={action.key} style={actionStyle}>
          {action.icon && (
            <View style={styles.actionIcon}>
              {action.icon}
            </View>
          )}
          <ThemedText
            style={[
              styles.actionLabel,
              {
                color: '#fff',
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
              },
            ]}
          >
            {action.label}
          </ThemedText>
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={styles.actionsContainer}>
        {/* Left Actions */}
        {renderActions(leftActions, true)}

        {/* Right Actions */}
        {renderActions(rightActions, false)}
      </View>

      {/* Foreground Content */}
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-5, 5]}
      >
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  content: {
    zIndex: 1,
  },
  actionIcon: {
    marginBottom: 4,
  },
  actionLabel: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Swipeable;
