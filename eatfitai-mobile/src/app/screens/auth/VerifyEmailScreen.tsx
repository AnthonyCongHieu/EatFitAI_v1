import { useCallback, useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View, TextInput, Pressable, Keyboard } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { glassStyles } from '../../../components/ui/GlassCard';
import Button from '../../../components/Button';
import type { RootStackParamList } from '../../types';
import apiClient from '../../../services/apiClient';
import { tokenStorage } from '../../../services/secureStore';
import { setAccessTokenMem } from '../../../services/authTokens';
import { AUTH_NEEDS_ONBOARDING_KEY, useAuthStore } from '../../../store/useAuthStore';
import { handleApiError } from '../../../utils/errorHandler';

const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

// Response từ verify-email endpoint
interface VerifyEmailResponse {
  userId: string;
  email: string;
  displayName: string;
  accessToken?: string;
  token: string;
  accessTokenExpiresAt?: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  needsOnboarding: boolean;
}

const resolveNeedsOnboarding = (
  payload: Partial<VerifyEmailResponse> & { NeedsOnboarding?: boolean },
): boolean => {
  if (typeof payload.needsOnboarding === 'boolean') {
    return payload.needsOnboarding;
  }

  if (typeof payload.NeedsOnboarding === 'boolean') {
    return payload.NeedsOnboarding;
  }

  return true;
};

const VerifyEmailScreen = ({ navigation, route }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const { email, verificationCode: devCode } = route.params;

  // Luôn bắt đầu với mảng rỗng - user phải tự nhập mã
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer cho nút gửi lại
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus vào ô đầu tiên
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  // Hiển thị dev code nếu có
  useEffect(() => {
    if (devCode) {
      Toast.show({
        type: 'info',
        text1: 'Mã xác minh (Dev Mode)',
        text2: devCode,
        visibilityTime: 5000,
      });
    }
  }, [devCode]);

  const handleCodeChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Chỉ cho phép số

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus sang ô tiếp theo
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    Keyboard.dismiss();
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng nhập đủ 6 số' });
      return;
    }

    setLoading(true);
    try {
      const resp = await apiClient.post<VerifyEmailResponse>('/api/auth/verify-email', {
        Email: email,
        VerificationCode: fullCode,
      });

      const data = resp.data;

      // Sau verify của tài khoản mới, app luôn phải đi vào onboarding
      // dù backend có trả thiếu/sai cờ needsOnboarding.
      const backendNeedsOnboarding = resolveNeedsOnboarding(
        data as VerifyEmailResponse & { NeedsOnboarding?: boolean },
      );
      const needsOnboarding = true;
      const nextUser = {
        id: data.userId,
        email: data.email,
        name: data.displayName,
      };

      if (__DEV__) {
        console.log('[VerifyEmail] Verification succeeded:', {
          email: data.email,
          needsOnboarding,
          backendNeedsOnboarding,
          rawNeedsOnboarding: (data as VerifyEmailResponse & { NeedsOnboarding?: boolean })
            .needsOnboarding,
          rawPascalNeedsOnboarding: (data as VerifyEmailResponse & { NeedsOnboarding?: boolean })
            .NeedsOnboarding,
        });
      }

      // Lưu tokens vào secure storage
      const accessToken = data.accessToken || data.token;
      const accessTokenExpiresAt = data.accessTokenExpiresAt || data.expiresAt;

      await tokenStorage.saveTokensFull({
        accessToken,
        accessTokenExpiresAt,
        refreshToken: data.refreshToken,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
      });
      await AsyncStorage.setItem(
        AUTH_NEEDS_ONBOARDING_KEY,
        needsOnboarding ? 'true' : 'false',
      );
      await AsyncStorage.setItem('onboarding_complete', 'false');
      setAccessTokenMem(accessToken);
      useAuthStore.setState({
        // Giữ app ở auth guest flow thêm một bước để chuyển thẳng sang Onboarding
        // thay vì remount toàn bộ navigator ngay sau verify rồi có thể rơi vào màn đen.
        isAuthenticated: false,
        needsOnboarding,
        user: nextUser,
      });

      Toast.show({
        type: 'success',
        text1: 'Xác minh thành công!',
        text2: 'Tiếp tục thiết lập thông tin của bạn',
      });
      navigation.replace('Onboarding');

    } catch (err: any) {
      const message = err?.response?.data?.message || handleApiError(err);
      Toast.show({ type: 'error', text1: 'Xác minh thất bại', text2: message });
    } finally {
      setLoading(false);
    }
  }, [code, email, navigation]);

  const handleResend = useCallback(async () => {
    if (countdown > 0) return;

    setResendLoading(true);
    try {
      const resp = await apiClient.post('/api/auth/resend-verification', {
        Email: email,
      });
      const data = resp.data as any;

      // Nếu dev mode có trả về mã mới
      if (data?.verificationCode) {
        Toast.show({
          type: 'info',
          text1: 'Mã mới (Dev Mode)',
          text2: data.verificationCode,
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Đã gửi lại mã',
          text2: 'Kiểm tra email của bạn',
        });
      }

      setCountdown(60); // Chờ 60s trước khi cho phép gửi lại
      setCode(Array(CODE_LENGTH).fill('')); // Reset code
    } catch (err: any) {
      const message = err?.response?.data?.message || handleApiError(err);
      Toast.show({ type: 'error', text1: 'Gửi lại thất bại', text2: message });
    } finally {
      setResendLoading(false);
    }
  }, [email, countdown]);

  const styles = StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
      paddingBottom: 48,
    },
    icon: {
      marginBottom: theme.spacing.lg,
    },
    title: {
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      opacity: 0.8,
    },
    codeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    codeInput: {
      width: 48,
      height: 56,
      borderRadius: theme.borderRadius.input,
      backgroundColor: theme.colors.card,
      borderWidth: 2,
      borderColor: theme.colors.border,
      textAlign: 'center',
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
    },
    codeInputFilled: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '15',
    },
    buttonContainer: {
      width: '100%',
      gap: theme.spacing.md,
    },
    resendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    resendText: {
      opacity: 0.7,
    },
    resendLink: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    backButton: {
      position: 'absolute',
      top: 60,
      left: theme.spacing.lg,
      zIndex: 10,
    },
  });

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary + '20', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Nút quay lại */}
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-circle" size={40} color={theme.colors.text} />
      </Pressable>

      {/* Icon email */}
      <Animated.View entering={ZoomIn.delay(200).duration(500)} style={styles.icon}>
        <View style={[glass.card, { padding: theme.spacing.lg, borderRadius: 50 }]}>
          <Ionicons name="mail-open-outline" size={48} color={theme.colors.primary} />
        </View>
      </Animated.View>

      {/* Tiêu đề */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <ThemedText variant="h2" weight="700" style={styles.title}>
          Xác minh Email
        </ThemedText>
        <ThemedText variant="body" style={styles.subtitle}>
          Nhập mã 6 số đã gửi đến{'\n'}
          <ThemedText variant="body" weight="600">
            {email}
          </ThemedText>
        </ThemedText>
      </Animated.View>

      {/* OTP Input */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={styles.codeContainer}
      >
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </Animated.View>

      {/* Nút xác minh */}
      <Animated.View
        entering={FadeInUp.delay(500).duration(500)}
        style={styles.buttonContainer}
      >
        <Button
          title="Xác minh"
          variant="primary"
          size="lg"
          onPress={handleVerify}
          loading={loading}
          disabled={code.some((d) => !d)}
        />
      </Animated.View>

      {/* Gửi lại mã */}
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        style={styles.resendContainer}
      >
        <ThemedText variant="body" style={styles.resendText}>
          Không nhận được mã?{' '}
        </ThemedText>
        <Pressable onPress={handleResend} disabled={countdown > 0 || resendLoading}>
          <ThemedText variant="body" style={styles.resendLink}>
            {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại'}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Screen>
  );
};

export default VerifyEmailScreen;
