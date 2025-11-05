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
      <Card padding="lg" shadow="lg">
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <ThemedText variant="h1" style={{ marginBottom: theme.spacing.sm }}>
            EatFit AI
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">
            {t('auth.loginTitle')}
          </ThemedText>
        </View>

        <Controller
          control={control}
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

        <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
          <Button
            variant="primary"
            loading={loading}
            disabled={loading}
            onPress={handleSubmit(onSubmit)}
            title={loading ? t('auth.processing') : t('auth.login')}
            fullWidth
          />
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="bodySmall" color="textSecondary">
              hoặc
            </ThemedText>
          </View>
          <Button
            variant="outline"
            disabled={loading}
            onPress={onGoogle}
            title={t('auth.loginWithGoogle')}
            fullWidth
          />
        </View>

        <View style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
          <ThemedText variant="body" color="textSecondary">
            {t('auth.registerQuestion')}{' '}
            <ThemedText 
              variant="body" 
              color="primary" 
              weight="600"
              onPress={() => navigation.navigate('Register')}
            >
              Đăng ký
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

export default LoginScreen;

