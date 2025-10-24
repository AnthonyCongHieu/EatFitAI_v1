import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'center' | 'bottom';
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  animated?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Modal = ({
  visible,
  onClose,
  children,
  title,
  size = 'md',
  position = 'center',
  showCloseButton = true,
  closeOnBackdropPress = true,
  animated = true
}: ModalProps): JSX.Element => {
  const { theme } = useAppTheme();

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { maxWidth: 320, width: '90%' };
      case 'lg':
        return { maxWidth: 480, width: '95%' };
      case 'full':
        return { width: '100%', height: '100%' };
      case 'md':
      default:
        return { maxWidth: 400, width: '85%' };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return {
          justifyContent: 'flex-end',
          paddingBottom: 0,
        };
      case 'center':
      default:
        return {
          justifyContent: 'center',
          paddingBottom: theme.spacing.xl,
        };
    }
  };

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const enteringAnimation = animated
    ? position === 'bottom'
      ? SlideInDown.springify().damping(20).stiffness(200)
      : FadeIn.duration(theme.animation.normal)
    : undefined;

  const exitingAnimation = animated
    ? position === 'bottom'
      ? SlideOutDown.duration(theme.animation.fast)
      : FadeOut.duration(theme.animation.fast)
    : undefined;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Backdrop */}
        <AnimatedPressable
          style={[
            styles.backdrop,
            backdropAnimatedStyle,
            { backgroundColor: 'rgba(0,0,0,0.6)' },
          ]}
          onPress={handleBackdropPress}
          entering={animated ? FadeIn.duration(theme.animation.fast) : undefined}
          exiting={animated ? FadeOut.duration(theme.animation.fast) : undefined}
        />

        {/* Modal Content */}
        <View style={[styles.contentContainer, getPositionStyles()]}>
          <Animated.View
            style={[
              styles.content,
              {
                backgroundColor: theme.colors.card,
                borderRadius: position === 'bottom' ? theme.radius.xl : theme.radius.lg,
                ...getSizeStyles(),
              },
              contentAnimatedStyle,
            ]}
            entering={enteringAnimation}
            exiting={exitingAnimation}
          >
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
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
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
        </View>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
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

export default Modal;
