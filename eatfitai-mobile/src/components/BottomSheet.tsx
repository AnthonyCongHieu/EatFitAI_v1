import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  animated: _animated = true,
}: BottomSheetProps): React.ReactElement | null => {
  const { theme } = useAppTheme();

  const translateY = useSharedValue(0);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow drag down to close (positive values)
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        // Drag down - close sheet
        runOnJS(onClose)();
      } else {
        // Return to original position
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <AnimatedPressable
        style={[
          styles.backdrop,
          { backgroundColor: 'rgba(0,0,0,0.6)' },
        ]}
        onPress={handleBackdropPress}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        pointerEvents="box-none"
      >
        {/* Bottom Sheet Content */}
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
        >
          {/* Handle - only this is draggable */}
          <GestureDetector gesture={panGesture}>
            <View>
              {showHandle && (
                <View style={styles.handle}>
                  <View
                    style={[styles.handleBar, { backgroundColor: theme.colors.muted }]}
                  />
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
                    <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
                      <ThemedText style={{ color: theme.colors.muted, fontSize: 24 }}>
                        ×
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </GestureDetector>

          {/* Body - can contain ScrollView */}
          <View style={[styles.body, height !== 'auto' && { flex: 1 }]}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
  },
});

export default BottomSheet;
