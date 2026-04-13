import { useCallback, useState, useEffect } from 'react';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Tilt3DCard, { ParallaxLayer } from '../../../components/ui/Tilt3DCard';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
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
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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
    if (passwordStrength === 0) return C.outlineVariant;
    if (passwordStrength === 1) return '#EF4444';
    if (passwordStrength === 2) return C.primary;
    return '#22C55E';
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'YẾU';
    if (passwordStrength === 2) return 'TRUNG BÌNH';
    return 'MẠNH';
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

  /* ─── Colors (Emerald Nebula — synced with LoginScreen) ─── */
  const C = {
    surface: '#0E1322',
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
      <View style={[styles.blob, styles.blobTopRight, { backgroundColor: C.primary + '0D' }]} />
      <View style={[styles.blob, styles.blobBottomLeft, { backgroundColor: C.primary + '0D' }]} />

      {/* Back button */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </Pressable>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Screen
          scroll={true}
          useGradient={false}
          horizontalPadding={false}
          contentContainerStyle={styles.scrollContent}
          testID={TEST_IDS.auth.registerScreen}
        >
          {/* ─── Logo (icon only, no circle) ─── */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoSection}
          >
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logoImage}
            />
          </Animated.View>

          {/* ─── Registration Card (3D tilt interaction) ─── */}
          <Tilt3DCard maxTilt={6} perspective={900}>
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
            {/* Header — depth 0.3 */}
            <ParallaxLayer depth={0.3}>
              <View style={styles.cardHeader}>
                <ThemedText
                  variant="h2"
                  weight="700"
                  style={{ color: '#FFFFFF', fontSize: 24 }}
                >
                  Đăng ký tài khoản
                </ThemedText>
                <ThemedText
                  variant="bodySmall"
                  style={{ color: C.onSurfaceVariant, marginTop: 4 }}
                >
                  Bắt đầu hành trình sức khỏe của bạn
                </ThemedText>
              </View>
            </ParallaxLayer>

            {/* ─── Form — depth 0.5 (mid-float) ─── */}
            <ParallaxLayer depth={0.5}>
              <View style={styles.formGroup}>
                {/* Full Name */}
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <View
                        style={[
                          styles.inputContainer,
                          {
                            backgroundColor: C.inputBg,
                            borderColor: errors.name ? theme.colors.danger : C.inputBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={C.onSurfaceVariant}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          testID={TEST_IDS.auth.registerNameInput}
                          placeholder="Họ và tên"
                          placeholderTextColor="#475569"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          style={[styles.input, { color: C.onSurface }]}
                        />
                      </View>
                      {errors.name && (
                        <ThemedText
                          variant="bodySmall"
                          style={{ color: theme.colors.danger, marginTop: 4, marginLeft: 4 }}
                        >
                          {errors.name.message}
                        </ThemedText>
                      )}
                    </View>
                  )}
                />

                {/* Email */}
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <View
                        style={[
                          styles.inputContainer,
                          {
                            backgroundColor: C.inputBg,
                            borderColor: errors.email ? theme.colors.danger : C.inputBorder,
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
                          testID={TEST_IDS.auth.registerEmailInput}
                          placeholder="Địa chỉ Email"
                          placeholderTextColor="#475569"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          style={[styles.input, { color: C.onSurface }]}
                        />
                      </View>
                      {errors.email && (
                        <ThemedText
                          variant="bodySmall"
                          style={{ color: theme.colors.danger, marginTop: 4, marginLeft: 4 }}
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
                    <View>
                      <View
                        style={[
                          styles.inputContainer,
                          {
                            backgroundColor: C.inputBg,
                            borderColor: errors.password ? theme.colors.danger : C.inputBorder,
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
                          testID={TEST_IDS.auth.registerPasswordInput}
                          placeholder="Mật khẩu"
                          placeholderTextColor="#475569"
                          secureTextEntry={!passwordVisible}
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
                          style={{ color: theme.colors.danger, marginTop: 4, marginLeft: 4 }}
                        >
                          {errors.password.message}
                        </ThemedText>
                      )}
                      {/* Password Strength Meter */}
                      {value && value.length > 0 && (
                        <View style={styles.strengthRow}>
                          <View style={[styles.strengthTrack, { backgroundColor: C.surfaceContainerHighest }]}>
                            <View
                              style={{
                                width: `${(passwordStrength / 3) * 100}%`,
                                height: '100%',
                                backgroundColor: getStrengthColor(),
                                borderRadius: 999,
                              }}
                            />
                          </View>
                          <ThemedText
                            variant="caption"
                            weight="700"
                            style={{
                              color: getStrengthColor(),
                              fontSize: 10,
                              letterSpacing: 1.5,
                            }}
                          >
                            {getStrengthLabel()}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                />

                {/* Confirm Password */}
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <View
                        style={[
                          styles.inputContainer,
                          {
                            backgroundColor: C.inputBg,
                            borderColor: errors.confirmPassword ? theme.colors.danger : C.inputBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={20}
                          color={C.onSurfaceVariant}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          testID={TEST_IDS.auth.registerConfirmPasswordInput}
                          placeholder="Xác nhận mật khẩu"
                          placeholderTextColor="#475569"
                          secureTextEntry={!confirmVisible}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          style={[styles.input, { color: C.onSurface }]}
                        />
                        <Pressable
                          onPress={() => setConfirmVisible((v) => !v)}
                          hitSlop={12}
                          style={styles.eyeButton}
                        >
                          <Ionicons
                            name={confirmVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={C.onSurfaceVariant}
                          />
                        </Pressable>
                      </View>
                      {errors.confirmPassword && (
                        <ThemedText
                          variant="bodySmall"
                          style={{ color: theme.colors.danger, marginTop: 4, marginLeft: 4 }}
                        >
                          {errors.confirmPassword.message}
                        </ThemedText>
                      )}
                    </View>
                  )}
                />

                {/* Terms & Conditions */}
                <Pressable
                  onPress={() => setTermsAccepted((v) => !v)}
                  style={styles.termsRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: termsAccepted ? C.primary : C.outlineVariant + '4D',
                        backgroundColor: termsAccepted ? C.primary + '33' : 'transparent',
                      },
                    ]}
                  >
                    {termsAccepted && (
                      <Ionicons name="checkmark" size={12} color={C.primary} />
                    )}
                  </View>
                  <ThemedText
                    variant="bodySmall"
                    style={{ color: C.onSurfaceVariant, fontSize: 12, lineHeight: 18, flex: 1 }}
                  >
                    Tôi đồng ý với{' '}
                    <ThemedText
                      variant="bodySmall"
                      weight="600"
                      style={{ color: C.primary, fontSize: 12 }}
                    >
                      Điều khoản dịch vụ
                    </ThemedText>
                    {' '}và{' '}
                    <ThemedText
                      variant="bodySmall"
                      weight="600"
                      style={{ color: C.primary, fontSize: 12 }}
                    >
                      Chính sách bảo mật
                    </ThemedText>
                  </ThemedText>
                </Pressable>
              </View>
            </ParallaxLayer>

            {/* ─── Register Button — depth 0.8 (highest float) ─── */}
            <ParallaxLayer depth={0.8}>
              <Animated.View entering={FadeInDown.delay(350).springify()}>
                <Pressable
                  testID={TEST_IDS.auth.registerSubmitButton}
                  onPress={handleSubmit(onSubmit)}
                  disabled={loading || !termsAccepted}
                  style={({ pressed }) => [
                    styles.registerButton,
                    pressed && { transform: [{ scale: 0.96 }] },
                    (loading || !termsAccepted) && { opacity: 0.5 },
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
                    colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)', 'transparent']}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ThemedText
                    variant="body"
                    weight="700"
                    style={{ color: C.onPrimary, fontSize: 18 }}
                  >
                    {loading ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            </ParallaxLayer>

            {/* ─── Sign-in link — depth 0.6 ─── */}
            <ParallaxLayer depth={0.6}>
              <View style={styles.signInRow}>
                <ThemedText
                  variant="bodySmall"
                  style={{ color: C.onSurfaceVariant }}
                >
                  Đã có tài khoản?{' '}
                </ThemedText>
                <ThemedText
                  variant="bodySmall"
                  weight="700"
                  onPress={() => navigation.navigate('Login')}
                  style={{ color: C.primary }}
                >
                  Đăng nhập
                </ThemedText>
              </View>
            </ParallaxLayer>
          </Animated.View>
          </Tilt3DCard>
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
    paddingTop: 100,
    paddingBottom: 40,
  },

  /* Background blobs */
  blob: {
    position: 'absolute',
    borderRadius: 9999,
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

  /* Back button */
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Logo */
  logoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
  },

  /* Card */
  card: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  cardHeader: {
    marginBottom: 24,
  },

  /* Form */
  formGroup: {
    gap: 16,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
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

  /* Password strength */
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  /* Terms */
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  /* Register button */
  registerButton: {
    height: 56,
    borderRadius: 9999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },

  /* Sign-in link */
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});

export default RegisterScreen;
