import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type ActionSheetOption = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  cancelText?: string;
  animated?: boolean;
};

export const ActionSheet = ({
  visible,
  onClose,
  title,
  message,
  options,
  cancelText = 'Hủy',
  animated = true
}: ActionSheetProps): JSX.Element => {
  const { theme } = useAppTheme();

  const scale = useSharedValue(1);

  const handleOptionPress = (option: ActionSheetOption) => {
    if (!option.disabled) {
      option.onPress();
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
    ? SlideInUp.springify().damping(20).stiffness(200)
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
      <Pressable
        style={[
          styles.backdrop,
          { backgroundColor: 'rgba(0,0,0,0.6)' },
        ]}
        onPress={onClose}
      />

      {/* Action Sheet Content */}
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
            },
          ]}
          entering={enteringAnimation}
          exiting={exitingAnimation}
        >
          {/* Header */}
          {(title || message) && (
            <View style={styles.header}>
              {title && (
                <ThemedText variant="h4" style={styles.title}>
                  {title}
                </ThemedText>
              )}
              {message && (
                <ThemedText style={[styles.message, { color: theme.colors.muted }]}>
                  {message}
                </ThemedText>
              )}
            </View>
          )}

          {/* Options */}
          <View style={styles.options}>
            {options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => handleOptionPress(option)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={option.disabled}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderBottomWidth: index < options.length - 1 ? 0.5 : 0,
                    borderBottomColor: theme.colors.border,
                    opacity: option.disabled ? 0.5 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.optionContent}>
                  {option.icon && (
                    <View style={styles.optionIcon}>
                      {option.icon}
                    </View>
                  )}
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      {
                        color: option.destructive
                          ? theme.colors.danger
                          : option.disabled
                          ? theme.colors.muted
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Cancel Button */}
          <View style={styles.cancelContainer}>
            <Pressable
              onPress={onClose}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.lg,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText variant="button" style={{ color: theme?.colors?.text || '#000' }}>
                {cancelText}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
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
    marginHorizontal: 8,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    textAlign: 'center',
    fontSize: 14,
  },
  options: {
    marginHorizontal: 8,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
  cancelContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 20,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});

export default ActionSheet;
