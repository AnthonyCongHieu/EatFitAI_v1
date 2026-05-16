import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { TEST_IDS } from '../../testing/testIds';
import { useOptionalAppTheme } from '../../theme/ThemeProvider';
import { darkTheme } from '../../theme/themes';

export type ErrorType = 'network' | 'server' | 'auth' | 'generic';

interface ErrorScreenProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  inline?: boolean;
}

interface ErrorPreset {
  icon: string;
  title: string;
  message: string;
}

const ERROR_PRESETS: Record<ErrorType, ErrorPreset> = {
  network: {
    icon: 'wifi-outline',
    title: 'Không có kết nối mạng',
    message: 'Vui lòng kiểm tra kết nối internet và thử lại.',
  },
  server: {
    icon: 'server-outline',
    title: 'Lỗi máy chủ',
    message: 'Hệ thống đang bảo trì. Vui lòng thử lại sau.',
  },
  auth: {
    icon: 'lock-closed-outline',
    title: 'Phiên đăng nhập hết hạn',
    message: 'Vui lòng đăng nhập lại để tiếp tục.',
  },
  generic: {
    icon: 'alert-circle-outline',
    title: 'Đã xảy ra lỗi',
    message: 'Vui lòng thử lại sau.',
  },
};

export const ErrorScreen = ({
  type = 'generic',
  title,
  message,
  onRetry,
  onGoBack,
  inline = false,
}: ErrorScreenProps): React.ReactElement => {
  const themeContext = useOptionalAppTheme();
  const theme = themeContext?.theme ?? darkTheme;
  const isDark = theme.mode === 'dark';
  const preset = ERROR_PRESETS[type];
  const displayTitle = title ?? preset.title;
  const displayMessage = message ?? preset.message;
  const shake = useSharedValue(0);

  React.useEffect(() => {
    shake.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(0, { duration: 100 }),
      ),
      2,
      false,
    );
  }, [shake]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const styles = StyleSheet.create({
    container: {
      flex: inline ? 0 : 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
      backgroundColor: inline ? 'transparent' : theme.colors.background,
    },
    iconContainer: {
      width: inline ? 80 : 120,
      height: inline ? 80 : 120,
      borderRadius: inline ? 40 : 60,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      color: theme.colors.text,
      ...(inline ? theme.typography.h3 : theme.typography.h2),
      fontWeight: '600',
    },
    message: {
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      maxWidth: 280,
      color: theme.colors.textSecondary,
      ...theme.typography.body,
    },
    actions: {
      gap: theme.spacing.md,
      width: '100%',
      maxWidth: 280,
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: theme.borderRadius.button,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      ...theme.typography.button,
      fontWeight: '600',
    },
    secondaryButton: {
      minHeight: 48,
      borderRadius: theme.borderRadius.button,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    secondaryButtonText: {
      color: theme.colors.text,
      ...theme.typography.button,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.75,
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInUp.springify()}
        style={[styles.iconContainer, shakeStyle]}
      >
        <Ionicons name={preset.icon as keyof typeof Ionicons.glyphMap} size={inline ? 40 : 56} color={theme.colors.danger} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <Text style={styles.title}>
          {displayTitle}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <Text style={styles.message}>
          {displayMessage}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.actions}>
        {onRetry && (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            testID={TEST_IDS.error.retryButton}
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </Pressable>
        )}
        {onGoBack && (
          <Pressable
            accessibilityRole="button"
            onPress={onGoBack}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back-outline" size={20} color={theme.colors.text} />
            <Text style={styles.secondaryButtonText}>Quay lại</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
};

export default ErrorScreen;
