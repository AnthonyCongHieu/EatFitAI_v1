import { useCallback, useState, useEffect } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { glassStyles } from '../../../components/ui/GlassCard';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import apiClient from '../../../services/apiClient';
import type { RootStackParamList } from '../../types';
import { t } from '../../../i18n/vi';
import { TEST_IDS } from '../../../testing/testIds';

const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z
      .string()
      .min(6, 'Mật khẩu tối thiểu 6 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        'Mật khẩu phải có chữ hoa, chữ thường và số',
      ),
    confirmPassword: z.string().min(6, 'Nhập lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof RegisterSchema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let score = 0;
    if (password.length >= 6) score++;
    if (password.match(/[A-Z]/) && password.match(/[0-9]/)) score++;
    if (password.length >= 8 && password.match(/[^A-Za-z0-9]/)) score++;
    setPasswordStrength(score);
  }, [password]);

  const getStrengthColor = () => {
    if (passwordStrength === 0) return theme.colors.border;
    if (passwordStrength === 1) return theme.colors.danger;
    if (passwordStrength === 2) return theme.colors.warning;
    return theme.colors.success;
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Yếu';
    if (passwordStrength === 2) return 'Trung bình';
    return 'Mạnh';
  };

  interface RegisterResponse {
    success: boolean;
    message: string;
    email: string;
    verificationCodeExpiresAt: string;
    verificationCode?: string;
  }

  const onSubmit = useCallback(
    async (values: RegisterValues) => {
      try {
        setLoading(true);
        const resp = await apiClient.post<RegisterResponse>(
          '/api/auth/register-with-verification',
          {
            DisplayName: values.name,
            Email: values.email,
            Password: values.password,
          },
        );

        const data = resp.data;

        Toast.show({
          type: 'success',
          text1: '🎉 Đăng ký thành công!',
          text2: 'Kiểm tra email để lấy mã xác minh',
        });

        navigation.navigate('VerifyEmail', {
          email: values.email,
          verificationCode: data.verificationCode,
        });
      } catch (e: any) {
        console.error('Registration error:', e);
        let message = t('auth.registerFailed');
        const responseData = e?.response?.data;
        if (responseData?.detail) {
          message = responseData.detail;
        } else if (responseData?.title) {
          message = responseData.title;
        } else if (responseData?.message) {
          message = responseData.message;
        } else if (e?.message) {
          message = e.message;
        }
        if (message.includes('Email')) {
          message = 'Email này đã được sử dụng hoặc không hợp lệ.';
        }
        Toast.show({
          type: 'error',
          text1: 'Đăng ký thất bại',
          text2: message,
          visibilityTime: 4000,
        });
      } finally {
        setLoading(false);
      }
    },
    [navigation],
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 80,
      paddingBottom: 40,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 20,
    },
    formCard: {
      ...glass.card,
      padding: 24,
      marginBottom: 24,
    },
    inputGroup: {
      gap: 10,
      marginBottom: 16,
    },
    passwordFieldGroup: {
      marginBottom: -4,
    },
    passwordStrengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 2,
      gap: 10,
    },
    passwordStrengthTrack: {
      width: 92,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 999,
      overflow: 'hidden',
    },
    passwordStrengthLabel: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: 16,
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
        <Screen
          scroll={true}
          contentContainerStyle={styles.scrollContent}
          testID={TEST_IDS.auth.registerScreen}
        >
          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoContainer}
          >
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logo}
            />
          </Animated.View>

          {/* Register Form Card */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.formCard}
          >
            <View style={styles.inputGroup}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label={t('auth.displayName')}
                    placeholder="Nguyễn Văn A"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                    testID={TEST_IDS.auth.registerNameInput}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label={t('auth.email')}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    required
                    testID={TEST_IDS.auth.registerEmailInput}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.passwordFieldGroup}>
                    <ThemedTextInput
                      label={t('auth.password')}
                      placeholder="••••••••"
                      secureTextEntry
                      secureToggle
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      required
                      testID={TEST_IDS.auth.registerPasswordInput}
                    />
                    {/* Password Strength Meter */}
                    {value && value.length > 0 && (
                      <View style={styles.passwordStrengthRow}>
                        <View style={styles.passwordStrengthTrack}>
                          <View
                            style={{
                              width: `${(passwordStrength / 3) * 100}%`,
                              height: '100%',
                              backgroundColor: getStrengthColor(),
                            }}
                          />
                        </View>
                        <ThemedText
                          variant="caption"
                          style={[
                            styles.passwordStrengthLabel,
                            { color: getStrengthColor() },
                          ]}
                        >
                          {getStrengthLabel()}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label={t('auth.passwordConfirm')}
                    placeholder="••••••••"
                    secureTextEntry
                    secureToggle
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    required
                    testID={TEST_IDS.auth.registerConfirmPasswordInput}
                  />
                )}
              />
            </View>

            {/* Register Button */}
            <Button
              variant="primary"
              loading={loading}
              disabled={loading}
              onPress={handleSubmit(onSubmit)}
              title={loading ? t('auth.processing') : t('auth.createAccount')}
              fullWidth
              testID={TEST_IDS.auth.registerSubmitButton}
            />

                        {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <ThemedText
                variant="caption"
                color="textSecondary"
                style={styles.dividerText}
              >
                Đã có tài khoản?
              </ThemedText>
              <View style={styles.dividerLine} />
            </View>

            {/* Login Button */}
            <Button
              variant="outline"
              disabled={loading}
              onPress={() => navigation.navigate('Login')}
              title="Đăng nhập"
              icon="log-in-outline"
              iconPosition="left"
              size="lg"
              fullWidth
            />
          </Animated.View>
        </Screen>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default RegisterScreen;
