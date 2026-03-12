import { useCallback, useState } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

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
import { TEST_IDS } from '../../../testing/testIds';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginValues = z.infer<typeof LoginSchema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props): React.ReactElement => {
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
        const result = await login(values.email, values.password);
        Toast.show({
          type: 'success',
          text1: '👋 Chào mừng trở lại!',
          text2: 'Đăng nhập thành công',
        });

        // Navigate based on onboarding status
        if (result.needsOnboarding) {
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
        }
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
      console.log('[LoginScreen] Starting Google Sign-In...');
      const result = await signInWithGoogle();
      Toast.show({
        type: 'success',
        text1: 'Đăng nhập với Google thành công',
        text2: 'Chào mừng bạn!',
      });

      // Check onboarding status - user mới cần hoàn tất onboarding
      if (result.needsOnboarding) {
        navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
      }
    } catch (e: any) {
      console.error('[LoginScreen] Google Sign-In error:', e);
      console.error('[LoginScreen] Error message:', e?.message);

      // Hiển thị lỗi thực tế thay vì check navigator.onLine (Web API không hoạt động trong RN)
      Toast.show({
        type: 'error',
        text1: 'Đăng nhập Google thất bại',
        text2: e?.message || 'Vui lòng thử lại',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, navigation]);

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
    appName: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    tagline: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    formCard: {
      ...glass.card,
      padding: 24,
      marginBottom: 24,
    },
    inputGroup: {
      gap: 16,
      marginBottom: 8,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: 4,
      marginBottom: 24,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: 16,
    },
    registerSection: {
      alignItems: 'center',
      marginTop: 16,
    },
    registerText: {
      marginBottom: 12,
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
          testID={TEST_IDS.auth.loginScreen}
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

          {/* Login Form Card */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.formCard}
          >
            <View style={styles.inputGroup}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    testID={TEST_IDS.auth.emailInput}
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
                    testID={TEST_IDS.auth.passwordInput}
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
            </View>

            <View style={styles.forgotPassword}>
              <ThemedText
                variant="bodySmall"
                color="primary"
                weight="600"
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                {t('auth.forgotPassword')}
              </ThemedText>
            </View>

            {/* Login Button */}
            <Button
              variant="primary"
              loading={loading}
              disabled={loading}
              onPress={handleSubmit(onSubmit)}
              title={loading ? t('auth.processing') : t('auth.login')}
              fullWidth
              testID={TEST_IDS.auth.submitButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <ThemedText
                variant="caption"
                color="textSecondary"
                style={styles.dividerText}
              >
                hoặc
              </ThemedText>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <Button
              variant="outline"
              disabled={loading}
              onPress={onGoogle}
              title="Tiếp tục với Google"
              icon="logo-google"
              fullWidth
            />
          </Animated.View>

          {/* Register Section */}
          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            style={styles.registerSection}
          >
            <ThemedText
              variant="body"
              color="textSecondary"
              style={styles.registerText}
            >
              Chưa có tài khoản?
            </ThemedText>
            <Button
              variant="ghost"
              title="Đăng ký miễn phí"
              onPress={() => navigation.navigate('Register')}
              fullWidth
            />
          </Animated.View>
        </Screen>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default LoginScreen;
