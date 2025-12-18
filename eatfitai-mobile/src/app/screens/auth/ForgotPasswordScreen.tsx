import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Screen from '../../../components/Screen';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { glassStyles } from '../../../components/ui/GlassCard';
import { t } from '../../../i18n/vi';
import type { RootStackParamList } from '../../types';

// Schema cho từng step
const EmailSchema = z.object({
  email: z.string().email(t('auth.invalidEmail')),
});

const VerifySchema = z.object({
  resetCode: z.string().min(4, t('auth.resetCodeRequired')),
});

const NewPasswordSchema = z.object({
  newPassword: z.string().min(6, t('auth.passwordTooShort')),
  confirm: z.string().min(6, t('auth.passwordTooShort')),
}).refine((data) => data.newPassword === data.confirm, {
  path: ['confirm'],
  message: t('auth.passwordMismatch'),
});

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

// Các bước trong flow
type Step = 'email' | 'verify' | 'newPassword' | 'success';

/**
 * ForgotPasswordScreen - Multi-step flow:
 * 1. Nhập email
 * 2. Xác minh mã từ email
 * 3. Đặt mật khẩu mới
 * 4. Thành công -> quay về Login
 */
const ForgotPasswordScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  // State cho multi-step
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');

  // Form cho step 1: Email
  const emailForm = useForm({
    resolver: zodResolver(EmailSchema),
    defaultValues: { email: '' },
  });

  // Form cho step 2: Verify code
  const verifyForm = useForm({
    resolver: zodResolver(VerifySchema),
    defaultValues: { resetCode: '' },
  });

  // Form cho step 3: New password
  const passwordForm = useForm({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { newPassword: '', confirm: '' },
  });

  // Step 1: Gửi mã xác minh
  const onSendCode = useCallback(async (values: { email: string }) => {
    try {
      setLoading(true);
      await forgotPassword(values.email);
      setEmail(values.email);
      Toast.show({
        type: 'success',
        text1: '📧 Đã gửi mã xác minh!',
        text2: 'Kiểm tra email của bạn',
      });
      setStep('verify');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không thể gửi mã';
      Toast.show({
        type: 'error',
        text1: 'Gửi mã thất bại',
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [forgotPassword]);

  // Step 2: Xác minh mã
  const onVerifyCode = useCallback(async (values: { resetCode: string }) => {
    // Lưu mã để dùng ở step 3
    setResetCode(values.resetCode);
    setStep('newPassword');
    Toast.show({
      type: 'info',
      text1: '✅ Mã hợp lệ',
      text2: 'Nhập mật khẩu mới của bạn',
    });
  }, []);

  // Step 3: Đổi mật khẩu
  const onResetPassword = useCallback(async (values: { newPassword: string; confirm: string }) => {
    try {
      setLoading(true);
      await resetPassword(email, resetCode, values.newPassword);
      setStep('success');
      Toast.show({
        type: 'success',
        text1: '🎉 Đổi mật khẩu thành công!',
        text2: 'Bạn có thể đăng nhập với mật khẩu mới',
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không thể đổi mật khẩu';
      Toast.show({
        type: 'error',
        text1: 'Đổi mật khẩu thất bại',
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [email, resetCode, resetPassword]);

  // Quay về đăng nhập
  const goToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  // Progress indicator
  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['email', 'verify', 'newPassword'].map((s, i) => {
        const stepIndex = ['email', 'verify', 'newPassword'].indexOf(step);
        const isActive = i <= stepIndex;
        const isCurrent = s === step;
        return (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.border,
                  transform: [{ scale: isCurrent ? 1.2 : 1 }],
                },
              ]}
            >
              {i < stepIndex && (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              )}
            </View>
            {i < 2 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: i < stepIndex ? theme.colors.primary : theme.colors.border },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={theme.colors.screenGradient}
        style={StyleSheet.absoluteFill}
      />
      <Screen scroll style={styles.container}>
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <View style={glass.card}>
            {/* Header */}
            <ThemedText style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>
              🔐
            </ThemedText>
            <ThemedText
              variant="h2"
              style={{ marginBottom: theme.spacing.sm, textAlign: 'center' }}
            >
              {step === 'success' ? 'Thành công!' : t('auth.forgotPasswordTitle')}
            </ThemedText>

            {/* Step Indicator */}
            {step !== 'success' && <StepIndicator />}

            {/* Step 1: Email */}
            {step === 'email' && (
              <Animated.View entering={FadeInRight.duration(400)}>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={{ marginBottom: theme.spacing.lg, textAlign: 'center' }}
                >
                  Nhập email đã đăng ký để nhận mã xác minh
                </ThemedText>

                <Controller
                  control={emailForm.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ThemedTextInput
                      label={t('auth.email')}
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!emailForm.formState.errors.email}
                      helperText={emailForm.formState.errors.email?.message}
                      required
                    />
                  )}
                />

                <Button
                  title={loading ? 'Đang gửi...' : 'Gửi mã xác minh'}
                  onPress={emailForm.handleSubmit(onSendCode)}
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  icon="mail-outline"
                  style={{ marginTop: theme.spacing.lg }}
                  fullWidth
                />
              </Animated.View>
            )}

            {/* Step 2: Verify Code */}
            {step === 'verify' && (
              <Animated.View entering={FadeInRight.duration(400)}>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={{ marginBottom: theme.spacing.lg, textAlign: 'center' }}
                >
                  Nhập mã 6 số đã gửi đến{'\n'}
                  <ThemedText variant="bodySmall" color="primary" weight="600">
                    {email}
                  </ThemedText>
                </ThemedText>

                <Controller
                  control={verifyForm.control}
                  name="resetCode"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ThemedTextInput
                      label="Mã xác minh"
                      placeholder="123456"
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!verifyForm.formState.errors.resetCode}
                      helperText={verifyForm.formState.errors.resetCode?.message}
                      required
                    />
                  )}
                />

                <Button
                  title="Xác nhận mã"
                  onPress={verifyForm.handleSubmit(onVerifyCode)}
                  variant="primary"
                  icon="checkmark-circle-outline"
                  style={{ marginTop: theme.spacing.lg }}
                  fullWidth
                />

                <Button
                  title="Gửi lại mã"
                  onPress={() => onSendCode({ email })}
                  loading={loading}
                  variant="ghost"
                  style={{ marginTop: theme.spacing.md }}
                  fullWidth
                />
              </Animated.View>
            )}

            {/* Step 3: New Password */}
            {step === 'newPassword' && (
              <Animated.View entering={FadeInRight.duration(400)}>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={{ marginBottom: theme.spacing.lg, textAlign: 'center' }}
                >
                  Tạo mật khẩu mới cho tài khoản của bạn
                </ThemedText>

                <Controller
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ThemedTextInput
                      label={t('auth.newPassword')}
                      placeholder="••••••••"
                      secureTextEntry
                      secureToggle
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!passwordForm.formState.errors.newPassword}
                      helperText={passwordForm.formState.errors.newPassword?.message}
                      required
                    />
                  )}
                />

                <Controller
                  control={passwordForm.control}
                  name="confirm"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ThemedTextInput
                      label={t('auth.confirmNewPassword')}
                      placeholder="••••••••"
                      secureTextEntry
                      secureToggle
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!passwordForm.formState.errors.confirm}
                      helperText={passwordForm.formState.errors.confirm?.message}
                      required
                    />
                  )}
                />

                <Button
                  title={loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                  onPress={passwordForm.handleSubmit(onResetPassword)}
                  loading={loading}
                  disabled={loading}
                  variant="primary"
                  icon="lock-closed-outline"
                  style={{ marginTop: theme.spacing.lg }}
                  fullWidth
                />
              </Animated.View>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <Animated.View entering={FadeInRight.duration(400)} style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: theme.colors.success + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: theme.spacing.lg,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                </View>

                <ThemedText
                  variant="body"
                  color="textSecondary"
                  style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}
                >
                  Mật khẩu của bạn đã được đổi thành công.{'\n'}
                  Hãy đăng nhập với mật khẩu mới.
                </ThemedText>

                <Button
                  title="Đăng nhập ngay"
                  onPress={goToLogin}
                  variant="primary"
                  icon="log-in-outline"
                  fullWidth
                />
              </Animated.View>
            )}

            {/* Back button */}
            {step !== 'success' && (
              <Button
                title="Quay lại đăng nhập"
                onPress={goToLogin}
                variant="ghost"
                style={{ marginTop: theme.spacing.lg }}
                fullWidth
              />
            )}
          </View>
        </Animated.View>
      </Screen>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingVertical: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
});

export default ForgotPasswordScreen;
