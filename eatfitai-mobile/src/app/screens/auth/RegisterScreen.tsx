import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAuthStore } from '../../../store/useAuthStore';
import type { RootStackParamList } from '../../types';
import { t } from '../../../i18n/vi';

const RegisterSchema = z
  .object({
    name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z
      .string()
      .min(6, 'Mật khẩu tối thiểu 6 ký tự')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Mật khẩu phải có chữ hoa, chữ thường và số'),
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
  const registerFn = useAuthStore((s) => s.register);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(async (values: RegisterValues) => {
    try {
      setLoading(true);
      await registerFn(values.name, values.email, values.password);
      Toast.show({ type: 'success', text1: 'Đăng ký tài khoản thành công', text2: 'Bắt đầu hành trình ăn uống lành mạnh!' });
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        Toast.show({ type: 'error', text1: 'Email đã được sử dụng', text2: 'Vui lòng sử dụng email khác hoặc đăng nhập' });
      } else if (status === 422) {
        Toast.show({ type: 'error', text1: 'Dữ liệu không hợp lệ', text2: 'Vui lòng kiểm tra thông tin đã nhập' });
      } else if (status >= 500) {
        Toast.show({ type: 'error', text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' });
      } else if (!navigator.onLine) {
        Toast.show({ type: 'error', text1: 'Không có kết nối mạng', text2: 'Kiểm tra kết nối và thử lại' });
      } else {
        Toast.show({ type: 'error', text1: 'Đăng ký thất bại', text2: 'Vui lòng thử lại hoặc liên hệ hỗ trợ' });
      }
    } finally {
      setLoading(false);
    }
  }, [registerFn, navigation]);

  return (
    <Screen scroll={false} style={styles.container}>
      <Card padding="lg" shadow="lg">
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <ThemedText variant="h1" style={{ marginBottom: theme.spacing.sm }}>
            EatFit AI
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
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

        <View style={{ marginTop: theme.spacing.xl }}>
          <Button
            variant="primary"
            loading={loading}
            disabled={loading}
            onPress={handleSubmit(onSubmit)}
            title={loading ? t('auth.processing') : t('auth.createAccount')}
            fullWidth
          />
        </View>

        <View style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
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
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
});

export default RegisterScreen;

