import { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
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

const EmailSchema = z.object({
  email: z.string().email(t('auth.invalidEmail')),
});

const VerifySchema = z.object({
  resetCode: z.string().min(4, t('auth.resetCodeRequired')),
});

const NewPasswordSchema = z
  .object({
    newPassword: z.string().min(6, t('auth.passwordTooShort')),
    confirm: z.string().min(6, t('auth.passwordTooShort')),
  })
  .refine((data) => data.newPassword === data.confirm, {
    path: ['confirm'],
    message: t('auth.passwordMismatch'),
  });

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;
type Step = 'email' | 'verify' | 'newPassword' | 'success';

const ForgotPasswordScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');

  const emailForm = useForm({
    resolver: zodResolver(EmailSchema),
    defaultValues: { email: '' },
  });

  const verifyForm = useForm({
    resolver: zodResolver(VerifySchema),
    defaultValues: { resetCode: '' },
  });

  const passwordForm = useForm({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { newPassword: '', confirm: '' },
  });

  const onSendCode = useCallback(
    async (values: { email: string }) => {
      try {
        setLoading(true);
        await forgotPassword(values.email);
        setEmail(values.email);
        Toast.show({
          type: 'success',
          text1: 'Đã gửi mã xác minh',
          text2: 'Kiểm tra email của bạn để tiếp tục',
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
    },
    [forgotPassword],
  );

  const onVerifyCode = useCallback((values: { resetCode: string }) => {
    setResetCode(values.resetCode);
    setStep('newPassword');
    Toast.show({
      type: 'info',
      text1: 'Mã hợp lệ',
      text2: 'Tiếp tục tạo mật khẩu mới',
    });
  }, []);

  const onResetPassword = useCallback(
    async (values: { newPassword: string; confirm: string }) => {
      try {
        setLoading(true);
        await resetPassword(email, resetCode, values.newPassword);
        setStep('success');
        Toast.show({
          type: 'success',
          text1: 'Đổi mật khẩu thành công',
          text2: 'Bạn có thể đăng nhập với mật khẩu mới',
        });
      } catch (e: any) {
        const msg =
          e?.response?.data?.message || e?.message || 'Không thể đổi mật khẩu';
        Toast.show({
          type: 'error',
          text1: 'Đổi mật khẩu thất bại',
          text2: msg,
        });
      } finally {
        setLoading(false);
      }
    },
    [email, resetCode, resetPassword],
  );

  const goToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const StepIndicator = () => {
    const currentIndex = ['email', 'verify', 'newPassword'].indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {['email', 'verify', 'newPassword'].map((item, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = item === step;

          return (
            <View key={item} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : theme.colors.border,
                    transform: [{ scale: isCurrent ? 1.15 : 1 }],
                  },
                ]}
              >
                {index < currentIndex && (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                )}
              </View>
              {index < 2 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor:
                        index < currentIndex
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 100,
      paddingBottom: 40,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    logo: {
      width: 100,
      height: 100,
      borderRadius: 24,
    },
    formCard: {
      ...glass.card,
      padding: 24,
    },
    title: {
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: 30,
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      marginTop: 4,
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
      width: 44,
      height: 2,
      marginHorizontal: 4,
    },
    successIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.success + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
      alignSelf: 'center',
    },
    secondaryButton: {
      marginTop: theme.spacing.lg,
    },
    resendButton: {
      marginTop: theme.spacing.md,
    },
  });

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Screen scroll={true} contentContainerStyle={styles.scrollContent}>
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoContainer}
          >
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logo}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.formCard}
          >
            <ThemedText variant="h2" style={styles.title}>
              {step === 'success' ? 'Thành công!' : t('auth.forgotPasswordTitle')}
            </ThemedText>

            {step !== 'success' && <StepIndicator />}

            {step === 'email' && (
              <Animated.View entering={FadeInRight.duration(400)}>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={styles.subtitle}
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
                  style={styles.secondaryButton}
                  fullWidth
                />

                <Button
                  title="Quay lại đăng nhập"
                  onPress={goToLogin}
                  variant="outline"
                  icon="log-in-outline"
                  style={styles.secondaryButton}
                  fullWidth
                />
              </Animated.View>
            )}

            {step === 'verify' && (
              <Animated.View entering={FadeInRight.duration(400)}>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={styles.subtitle}
                >
                  Nhập mã xác minh đã gửi đến{'\n'}
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
                  style={styles.secondaryButton}
                  fullWidth
                />

                <Button
                  title="Gửi lại mã"
                  onPress={() => onSendCode({ email })}
                  loading={loading}
                  variant="ghost"
                  style={styles.resendButton}
                  fullWidth
                />

                <Button
                  title="Quay lại đăng nhập"
                  onPress={goToLogin}
                  variant="outline"
                  icon="log-in-outline"
                  style={styles.secondaryButton}
                  fullWidth
                />
              </Animated.View>
            )}

            {step === 'newPassword' && (
              <Animated.View entering={FadeInRight.duration(400)}>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={styles.subtitle}
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
                  style={styles.secondaryButton}
                  fullWidth
                />

                <Button
                  title="Quay lại đăng nhập"
                  onPress={goToLogin}
                  variant="outline"
                  icon="log-in-outline"
                  style={styles.secondaryButton}
                  fullWidth
                />
              </Animated.View>
            )}

            {step === 'success' && (
              <Animated.View entering={FadeInRight.duration(400)}>
                <View style={styles.successIconWrap}>
                  <Ionicons
                    name="checkmark-circle"
                    size={48}
                    color={theme.colors.success}
                  />
                </View>

                <ThemedText
                  variant="body"
                  color="textSecondary"
                  style={styles.subtitle}
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
          </Animated.View>
        </Screen>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default ForgotPasswordScreen;
