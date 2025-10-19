import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Animated, type Insets } from 'react-native';
import { useRef } from 'react';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type ButtonProps = {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  hitSlop?: number | Insets;
};

export const Button = ({
  title,
  children,
  onPress,
  disabled,
  variant = 'primary',
  fullWidth = true,
}: ButtonProps): JSX.Element => {
  const {
    theme: { colors, radius, spacing },
  } = useAppTheme();

  const bg = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.secondary : 'transparent';
  const borderColor = variant === 'outline' ? colors.border : 'transparent';
  const textColor = variant === 'outline' ? colors.text : '#fff';
  const ripple = variant === 'outline'
    ? (colors.text + '33') // ~20% alpha if supported
    : 'rgba(255,255,255,0.16)';

  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: radius.full,
          opacity: disabled ? 0.7 : pressed ? 0.9 : 1,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
      ]}
      onPressIn={() => animateTo(0.98)}
      onPressOut={() => animateTo(1)}
      android_ripple={{ color: ripple, borderless: false }}
      accessibilityRole="button"
      accessibilityLabel={title ?? undefined}
      hitSlop={8}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children ?? <ThemedText style={[styles.text, { color: textColor }]}>{title}</ThemedText>}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
  },
});

export default Button;
