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

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginValues = z.infer<typeof LoginSchema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props): JSX.Element => {
  const { theme } = useAppTheme();
  const login = useAuthStore((s) => s.login);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(async (values: LoginValues) => {
    try {
      setLoading(true);
      await login(values.email, values.password);
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      Alert.alert(t('auth.loginTitle'), e?.message ?? t('auth.processing'));
    } finally {
      setLoading(false);
    }
  }, [login, navigation]);

  const onGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      Alert.alert('Google Sign-in', e?.message ?? t('auth.loginWithGoogle'));
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, navigation]);

  return (
    <Screen scroll={false} style={styles.container}>
      <Card>
        <ThemedText variant="title">{t('auth.loginTitle')}</ThemedText>

        <ThemedText style={styles.label}>{t('auth.email')}</ThemedText>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.email}
            />
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
            <ThemedTextInput
              placeholder="••••••••"
              secureTextEntry
              secureToggle
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.password}
            />
          )}
        />
        {errors.password && (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.password.message}
          </ThemedText>
        )}

        <View style={{ marginTop: 20 }}>
          <Button variant="primary" disabled={loading} onPress={handleSubmit(onSubmit)} title={t('auth.login')}>
            <ThemedText style={styles.buttonText}>{loading ? t('auth.processing') : t('auth.login')}</ThemedText>
          </Button>
        </View>

        <View style={{ height: 10 }} />
        <Button variant="secondary" disabled={loading} onPress={onGoogle} title={t('auth.loginWithGoogle')}>
          <ThemedText style={styles.buttonText}>{t('auth.loginWithGoogle')}</ThemedText>
        </Button>

        <View style={{ marginTop: 16 }}>
          <ThemedText onPress={() => navigation.navigate('Register')}>{t('auth.registerQuestion')}</ThemedText>
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

export default LoginScreen;

