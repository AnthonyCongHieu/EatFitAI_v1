import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import Button from '../Button';
import Icon from '../Icon';
import { ThemedText } from '../ThemedText';
import { TEST_IDS } from '../../testing/testIds';
import { useAppTheme } from '../../theme/ThemeProvider';

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
  const { theme } = useAppTheme();
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
    },
    message: {
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      maxWidth: 280,
    },
    actions: {
      gap: theme.spacing.md,
      width: '100%',
      maxWidth: 280,
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInUp.springify()}
        style={[styles.iconContainer, shakeStyle]}
      >
        <Icon name={preset.icon} size={inline ? 40 : 56} color="danger" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <ThemedText variant={inline ? 'h3' : 'h2'} weight="600" style={styles.title}>
          {displayTitle}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <ThemedText variant="body" color="textSecondary" style={styles.message}>
          {displayMessage}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.actions}>
        {onRetry && (
          <Button
            title="Thử lại"
            onPress={onRetry}
            variant="primary"
            icon="refresh-outline"
            fullWidth
            testID={TEST_IDS.error.retryButton}
          />
        )}
        {onGoBack && (
          <Button
            title="Quay lại"
            onPress={onGoBack}
            variant="ghost"
            icon="arrow-back-outline"
            fullWidth
          />
        )}
      </Animated.View>
    </View>
  );
};

export default ErrorScreen;
