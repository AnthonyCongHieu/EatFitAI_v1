import { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Tilt3DCard, { ParallaxLayer } from '../../../components/ui/Tilt3DCard';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { trackEvent } from '../../../services/analytics';
import { useAuthStore } from '../../../store/useAuthStore';
import type { RootStackParamList } from '../../types';
import { handleApiError } from '../../../utils/errorHandler';
import { TEST_IDS } from '../../../testing/testIds';
import logger from '../../../utils/logger';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginValues = z.infer<typeof LoginSchema>;
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

/* ─── Google "G" logo as inline SVG ─── */
const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const LoginScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const login = useAuthStore((s) => s.login);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

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
      trackEvent('auth_login_submit', {
        flow: 'auth',
        step: 'login',
        status: 'submitted',
        metadata: { method: 'password' },
      });
      try {
        setLoading(true);
        const result = await login(values.email, values.password);
        trackEvent('auth_login_success', {
          flow: 'auth',
          step: 'login',
          status: 'success',
          metadata: {
            method: 'password',
            needsOnboarding: Boolean(result.needsOnboarding),
          },
        });
        Toast.show({
          type: 'success',
          text1: 'Chào mừng trở lại!',
          text2: 'Đăng nhập thành công',
        });

        if (result.needsOnboarding) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        }
      } catch (e: any) {
        trackEvent('auth_login_failure', {
          category: 'error',
          flow: 'auth',
          step: 'login',
          status: 'failure',
          metadata: {
            method: 'password',
            message: e?.message,
          },
        });
        handleApiError(e);
      } finally {
        setLoading(false);
      }
    },
    [login, navigation],
  );

  const onGoogle = useCallback(async () => {
    trackEvent('auth_login_submit', {
      flow: 'auth',
      step: 'login',
      status: 'submitted',
      metadata: { method: 'google' },
    });
    try {
      setLoading(true);
      logger.info('[LoginScreen] Starting Google Sign-In...');
      const result = await signInWithGoogle();
      trackEvent('auth_login_success', {
        flow: 'auth',
        step: 'login',
        status: 'success',
        metadata: {
          method: 'google',
          needsOnboarding: Boolean(result.needsOnboarding),
        },
      });
      Toast.show({
        type: 'success',
        text1: 'Đăng nhập với Google thành công',
        text2: 'Chào mừng bạn!',
      });

      if (result.needsOnboarding) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch (e: any) {
      logger.error('[LoginScreen] Google Sign-In error:', e);
      trackEvent('auth_login_failure', {
        category: 'error',
        flow: 'auth',
        step: 'login',
        status: 'failure',
        metadata: {
          method: 'google',
          message: e?.message,
        },
      });

      Toast.show({
        type: 'error',
        text1: 'Đăng nhập Google thất bại',
        text2: e?.message || 'Vui lòng thử lại',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  }, [navigation, signInWithGoogle]);

  /* ─── Colors (Emerald Nebula palette from the reference) ─── */
  const C = {
    surface: '#0E1322',
    surfaceContainer: '#1A1F2F',
    surfaceContainerHigh: '#25293A',
    surfaceContainerHighest: '#2F3445',
    surfaceContainerLowest: '#090E1C',
    primary: '#4BE277',
    primaryDark: '#22C55E',
    onPrimary: '#003915',
    onSurface: '#DEE1F7',
    onSurfaceVariant: '#BCC8B9',
    outlineVariant: '#3D4A3D',
    glassBg: 'rgba(37, 41, 58, 0.6)',
    glassBorder: 'rgba(75, 226, 119, 0.1)',
    inputBg: '#090E1C',
    inputBorder: 'rgba(61, 74, 61, 0.3)',
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: C.surface }]}>
      {/* Background glow blobs */}
      <View
        style={[styles.blob, styles.blobTopRight, { backgroundColor: C.primary + '0D' }]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottomLeft,
          { backgroundColor: C.primary + '0D' },
        ]}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Screen
          scroll={true}
          useGradient={false}
          horizontalPadding={false}
          contentContainerStyle={styles.scrollContent}
          testID={TEST_IDS.auth.loginScreen}
        >
          {/* ─── Logo (icon only, no surrounding circle) ─── */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoSection}
          >
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logoImage}
            />
          </Animated.View>

          {/* ─── Login Card (3D tilt interaction) ─── */}
          <Tilt3DCard maxTilt={6} perspective={900} useDeviceMotion={true} showReflection={false}>
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={[
                styles.card,
                {
                  backgroundColor: C.glassBg,
                  borderColor: C.glassBorder,
                },
              ]}
            >
              {/* Header — depth 0.3 (slightly floats) */}
              <ParallaxLayer depth={0.3}>
                <View style={styles.cardHeader}>
                  <ThemedText
                    variant="h2"
                    weight="700"
                    style={{ color: '#FFFFFF', fontSize: 24 }}
                  >
                    Chào mừng trở lại
                  </ThemedText>
                  <ThemedText
                    variant="bodySmall"
                    style={{ color: C.onSurfaceVariant, marginTop: 4 }}
                  >
                    Đăng nhập để tiếp tục
                  </ThemedText>
                </View>
              </ParallaxLayer>

              {/* ─── Form — depth 0.5 (mid-float) ─── */}
              <ParallaxLayer depth={0.5}>
                <View style={styles.formGroup}>
                  {/* Email */}
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={styles.inputWrapper}>
                        <View
                          style={[
                            styles.inputContainer,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: errors.email
                                ? theme.colors.danger
                                : C.inputBorder,
                            },
                          ]}
                        >
                          <Ionicons
                            name="mail-outline"
                            size={20}
                            color={C.onSurfaceVariant}
                            style={styles.inputIcon}
                          />
                          <TextInput
                            testID={TEST_IDS.auth.emailInput}
                            placeholder="Địa chỉ Email"
                            placeholderTextColor="#475569"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            keyboardType="email-address"
                            textContentType="username"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            style={[styles.input, { color: C.onSurface }]}
                          />
                        </View>
                        {errors.email && (
                          <ThemedText
                            variant="bodySmall"
                            style={{
                              color: theme.colors.danger,
                              marginTop: 4,
                              marginLeft: 4,
                            }}
                          >
                            {errors.email.message}
                          </ThemedText>
                        )}
                      </View>
                    )}
                  />

                  {/* Password */}
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={styles.inputWrapper}>
                        <View
                          style={[
                            styles.inputContainer,
                            {
                              backgroundColor: C.inputBg,
                              borderColor: errors.password
                                ? theme.colors.danger
                                : C.inputBorder,
                            },
                          ]}
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={20}
                            color={C.onSurfaceVariant}
                            style={styles.inputIcon}
                          />
                          <TextInput
                            testID={TEST_IDS.auth.passwordInput}
                            placeholder="Mật khẩu"
                            placeholderTextColor="#475569"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            secureTextEntry={!passwordVisible}
                            textContentType="password"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            style={[styles.input, { color: C.onSurface }]}
                          />
                          <Pressable
                            onPress={() => setPasswordVisible((v) => !v)}
                            hitSlop={12}
                            style={styles.eyeButton}
                          >
                            <Ionicons
                              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                              size={20}
                              color={C.onSurfaceVariant}
                            />
                          </Pressable>
                        </View>
                        {errors.password && (
                          <ThemedText
                            variant="bodySmall"
                            style={{
                              color: theme.colors.danger,
                              marginTop: 4,
                              marginLeft: 4,
                            }}
                          >
                            {errors.password.message}
                          </ThemedText>
                        )}
                      </View>
                    )}
                  />

                  {/* Forgot Password */}
                  <View style={styles.forgotRow}>
                    <ThemedText
                      variant="bodySmall"
                      weight="600"
                      onPress={() => navigation.navigate('ForgotPassword')}
                      testID={TEST_IDS.auth.forgotPasswordButton}
                      style={{ color: C.primary }}
                    >
                      Quên mật khẩu?
                    </ThemedText>
                  </View>
                </View>
              </ParallaxLayer>

              {/* ─── Sign In Button — depth 0.8 (highest float) ─── */}
              <ParallaxLayer depth={0.8}>
                <Animated.View entering={FadeInDown.delay(350).springify()}>
                  <Pressable
                    testID={TEST_IDS.auth.submitButton}
                    onPress={handleSubmit(onSubmit)}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.signInButton,
                      pressed && { transform: [{ scale: 0.96 }] },
                      loading && { opacity: 0.6 },
                    ]}
                  >
                    <LinearGradient
                      colors={['#6BFF8F', '#4BE277', '#22C55E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {/* Glossy highlight */}
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.25)',
                        'rgba(255,255,255,0.05)',
                        'transparent',
                      ]}
                      start={{ x: 0.2, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <ThemedText
                      variant="body"
                      weight="700"
                      style={{ color: C.onPrimary, fontSize: 18 }}
                    >
                      {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              </ParallaxLayer>

              {/* ─── Divider + Google — depth 0.6 ─── */}
              <ParallaxLayer depth={0.6}>
                <View style={styles.dividerRow}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: C.outlineVariant + '4D' },
                    ]}
                  />
                  <ThemedText variant="caption" weight="700" style={styles.dividerText}>
                    HOẶC TIẾP TỤC VỚI
                  </ThemedText>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: C.outlineVariant + '4D' },
                    ]}
                  />
                </View>

                <Pressable
                  testID={TEST_IDS.auth.googleButton}
                  onPress={onGoogle}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.googleButton,
                    {
                      backgroundColor: C.surfaceContainerHighest + '4D',
                      borderColor: C.outlineVariant + '33',
                    },
                    pressed && { transform: [{ scale: 0.96 }] },
                    loading && { opacity: 0.6 },
                  ]}
                >
                  <GoogleLogo />
                  <ThemedText
                    variant="body"
                    weight="600"
                    style={{ color: '#FFFFFF', fontSize: 16 }}
                  >
                    Tiếp tục với Google
                  </ThemedText>
                </Pressable>
              </ParallaxLayer>
            </Animated.View>
          </Tilt3DCard>

          {/* ─── Footer ─── */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.footer}
          >
            <ThemedText variant="bodySmall" style={{ color: C.onSurfaceVariant }}>
              Bạn chưa có tài khoản?{' '}
            </ThemedText>
            <ThemedText
              variant="bodySmall"
              weight="700"
              onPress={() => navigation.navigate('Register')}
              testID={TEST_IDS.auth.registerLink}
              style={{ color: C.primary }}
            >
              Đăng ký
            </ThemedText>
          </Animated.View>
        </Screen>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  /* Background blobs */
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    ...Platform.select({
      ios: {},
      android: {},
    }),
  },
  blobTopRight: {
    top: '-10%',
    right: '-20%',
    width: '60%',
    height: '40%',
  },
  blobBottomLeft: {
    bottom: '-10%',
    left: '-20%',
    width: '60%',
    height: '40%',
  },

  /* Logo */
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },

  /* Card */
  card: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 28,
    // Backdrop blur simulated via solid bg
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  cardHeader: {
    marginBottom: 28,
  },

  /* Form */
  formGroup: {
    gap: 20,
    marginBottom: 24,
  },
  inputWrapper: {},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    // Inset shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },

  /* Sign in button */
  signInButton: {
    height: 56,
    borderRadius: 9999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#BCC8B9',
    textTransform: 'uppercase',
  },

  /* Google button */
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 12,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

export default LoginScreen;
