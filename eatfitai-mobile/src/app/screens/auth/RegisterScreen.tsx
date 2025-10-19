import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(6, 'Nhập lại mật khẩu'),
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
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      Alert.alert(t('auth.registerTitle'), e?.message ?? t('auth.processing'));
    } finally {
      setLoading(false);
    }
  }, [registerFn, navigation]);

  return (
    <Screen scroll={false} style={styles.container}>
      <Card>
        <ThemedText variant="title">{t('auth.registerTitle')}</ThemedText>

        <ThemedText style={styles.label}>{t('auth.displayName')}</ThemedText>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput placeholder="Nguyễn Văn A" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.name} />
          )}
        />
        {errors.name && (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.name.message}
          </ThemedText>
        )}

        <ThemedText style={styles.label}>{t('auth.email')}</ThemedText>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.email} />
          )}
        />
        {errors.email && (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.email.message}
          </ThemedText>
        )}

        <ThemedText style={styles.label}>{t('auth.password')}</ThemedText>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput placeholder="••••••••" secureTextEntry secureToggle onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.password} />
          )}
        />
        {errors.password && (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.password.message}
          </ThemedText>
        )}

        <ThemedText style={styles.label}>{t('auth.passwordConfirm')}</ThemedText>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput placeholder="••••••••" secureTextEntry secureToggle onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.confirmPassword} />
          )}
        />
        {errors.confirmPassword && (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.confirmPassword.message}
          </ThemedText>
        )}

        <View style={{ marginTop: 20 }}>
          <Button variant="primary" disabled={loading} onPress={handleSubmit(onSubmit)} title={t('auth.createAccount')}>
            <ThemedText style={styles.buttonText}>{loading ? t('auth.processing') : t('auth.createAccount')}</ThemedText>
          </Button>
        </View>

        <View style={{ marginTop: 16 }}>
          <ThemedText onPress={() => navigation.navigate('Login')}>{t('auth.hasAccount')}</ThemedText>
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  label: { marginTop: 16 },
  error: { marginTop: 6 },
  buttonText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
});

export default RegisterScreen;

