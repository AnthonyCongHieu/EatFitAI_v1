import { useCallback, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import apiClient from '../../../services/apiClient';
import type { RootStackParamList } from '../../types';
import { t } from '../../../i18n/vi';
import { handleApiError } from '../../../utils/errorHandler';

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
    passwordHint: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof RegisterSchema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props): JSX.Element => {
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-3

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

  // Response từ register-with-verification
  interface RegisterResponse {
    success: boolean;
    message: string;
    email: string;
    verificationCodeExpiresAt: string;
    verificationCode?: string; // Chỉ có trong dev mode
  }

  const onSubmit = useCallback(
    async (values: RegisterValues) => {
      try {
        setLoading(true);

        // Gọi API đăng ký với xác minh email
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

        // Navigate đến VerifyEmailScreen với email và mã (nếu dev mode)
        navigation.navigate('VerifyEmail', {
          email: values.email,
          verificationCode: data.verificationCode, // undefined nếu production
        });
      } catch (e: any) {
        console.error('Registration error:', e);
        console.error('Response data:', e?.response?.data);

        let message = t('auth.registerFailed');
        if (e?.response?.data?.message) {
          message = e.response.data.message;
        } else if (e?.message) {
          message = e.message;
        }

        // Handle specific error cases if needed
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

  return (
    <Screen scroll={true} contentContainerStyle={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.primary + '10']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={FadeInDown.duration(600).springify()}
        style={{ padding: 24 }}
      >
        <AppCard
          padding="lg"
          shadow="lg"
          style={{ backgroundColor: theme.colors.card + 'F5' }}
        >
          {/* Card content */}
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.colors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.md,
              }}
            >
              <Ionicons name="person-add" size={32} color={theme.colors.primary} />
            </View>
            <ThemedText
              variant="h2"
              style={{ marginBottom: theme.spacing.xs, textAlign: 'center' }}
            >
              Tạo tài khoản
            </ThemedText>
            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ textAlign: 'center' }}
            >
              {t('auth.registerTitle')}
            </ThemedText>
          </View>
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
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
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
                />
                {/* Password Strength Meter */}
                {value && value.length > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: -8,
                      marginBottom: 12,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        height: 4,
                        backgroundColor: theme.colors.border,
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
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
                      style={{ color: getStrengthColor(), width: 60, textAlign: 'right' }}
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
              />
            )}
          />
          <View style={{ marginTop: theme.spacing.lg }}>
            <Button
              variant="primary"
              loading={loading}
              disabled={loading}
              onPress={handleSubmit(onSubmit)}
              title={loading ? t('auth.processing') : t('auth.createAccount')}
              fullWidth
              size="lg"
            />
          </View>
          <View style={{ marginTop: theme.spacing.xl, alignItems: 'center' }}>
            <ThemedText variant="body" color="textSecondary">
              {t('auth.hasAccount')}{' '}
              <ThemedText
                variant="body"
                color="primary"
                weight="600"
                onPress={() => navigation.navigate('Login')}
              >
                Đăng nhập
              </ThemedText>
            </ThemedText>
          </View>
        </AppCard>
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40, // Đảm bảo không bị cắt trên/dưới
  },
});

export default RegisterScreen;
