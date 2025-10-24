import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: number | 'auto';
  showHandle?: boolean;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  animated?: boolean;
  snapPoints?: number[];
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BottomSheet = ({
  visible,
  onClose,
  children,
  title,
  height = 'auto',
  showHandle = true,
  showCloseButton = true,
  closeOnBackdropPress = true,
  animated = true,
  snapPoints = [0.5, 0.8]
}: BottomSheetProps): JSX.Element => {
  const { theme } = useAppTheme();

  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const enteringAnimation = animated
    ? SlideInDown.springify().damping(20).stiffness(200)
    : undefined;

  const exitingAnimation = animated
    ? SlideOutDown.duration(theme.animation.normal)
    : undefined;

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      entering={visible ? FadeIn.duration(theme.animation.fast) : undefined}
      exiting={visible ? FadeOut.duration(theme.animation.fast) : undefined}
    >
      {/* Backdrop */}
      <AnimatedPressable
        style={[
          styles.backdrop,
          backdropAnimatedStyle,
          { backgroundColor: 'rgba(0,0,0,0.6)' },
        ]}
        onPress={handleBackdropPress}
      />

      {/* Bottom Sheet Content */}
      <View style={styles.container}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.content,
              {
                backgroundColor: theme.colors.card,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                height: height === 'auto' ? undefined : height,
                maxHeight: '90%',
              },
              animatedStyle,
            ]}
            entering={enteringAnimation}
            exiting={exitingAnimation}
          >
            {/* Handle */}
            {showHandle && (
              <View style={styles.handle}>
                <View style={[styles.handleBar, { backgroundColor: theme.colors.muted }]} />
              </View>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <View style={styles.header}>
                {title && (
                  <ThemedText variant="h4" style={styles.title}>
                    {title}
                  </ThemedText>
                )}
                {showCloseButton && (
                  <Pressable
                    onPress={onClose}
                    style={styles.closeButton}
                    hitSlop={8}
                  >
                    <ThemedText style={{ color: theme.colors.muted, fontSize: 24 }}>×</ThemedText>
                  </Pressable>
                )}
              </View>
            )}

            {/* Body */}
            <View style={styles.body}>
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flex: 1,
  },
});

export default BottomSheet;
