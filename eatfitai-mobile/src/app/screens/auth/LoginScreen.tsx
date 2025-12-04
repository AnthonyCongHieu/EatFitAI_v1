import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { useAuthStore } from '../../../store/useAuthStore';
import type { RootStackParamList } from '../../types';
import { t } from '../../../i18n/vi';
import { handleApiError } from '../../../utils/errorHandler';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginValues = z.infer<typeof LoginSchema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const login = useAuthStore((s) => s.login);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (values: LoginValues) => {
      try {
        setLoading(true);
        await login(values.email, values.password);
        Toast.show({
          type: 'success',
          text1: '👋 Chào mừng trở lại!',
          text2: 'Đăng nhập thành công',
        });
        navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
      } catch (e: any) {
        handleApiError(e);
      } finally {
        setLoading(false);
      }
    },
    [login, navigation],
  );

  const onGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      Toast.show({
        type: 'success',
        text1: 'Đăng nhập với Google thành công',
        text2: 'Chào mừng bạn!',
      });
      navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
    } catch (e: any) {
      if (!navigator.onLine) {
        Toast.show({
          type: 'error',
          text1: 'Không có kết nối mạng',
          text2: 'Kiểm tra kết nối và thử lại',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Đăng nhập Google thất bại',
          text2: 'Vui lòng thử lại hoặc sử dụng đăng nhập thông thường',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, navigation]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#1a1a2e'] : ['#f0f9ff', '#e0f2fe']}
        style={StyleSheet.absoluteFill}
      />
      <Screen scroll={false} style={styles.container}>
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <View style={glass.card}>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
              <ThemedText style={{ fontSize: 40, marginBottom: 8 }}>🥗</ThemedText>
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
            <View style={{ marginTop: theme.spacing.xs, alignItems: 'flex-end' }}>
              <ThemedText
                variant="bodySmall"
                color="primary"
                weight="600"
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                {t('auth.forgotPassword')}
              </ThemedText>
            </View>

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
          </View>
        </Animated.View>
      </Screen>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
});

export default LoginScreen;

