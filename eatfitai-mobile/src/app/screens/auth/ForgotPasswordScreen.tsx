import { useCallback, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
} from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Screen from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { t } from '../../../i18n/vi';
import { TEST_IDS } from '../../../testing/testIds';
import type { RootStackParamList } from '../../types';
import Tilt3DCard, { ParallaxLayer } from '../../../components/ui/Tilt3DCard';

/* ─── Validation schemas ─── */
const EmailSchema = z.object({
  email: z.string().email(t('auth.invalidEmail')),
});

const NewPasswordSchema = z
  .object({
    newPassword: z.string().min(6, t('auth.passwordTooShort')),
    confirm: z.string().min(6, t('auth.passwordTooShort')),
  })
  .refine((data) => data.newPassword === data.confirm, {
    path: ['confirm'],
    message: t('auth.passwordMismatch'),
  });

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;
type Step = 'email' | 'verify' | 'newPassword' | 'success';
const CODE_LENGTH = 6;

/* ─── Emerald Nebula palette (synced with Login / Register) ─── */
const C = {
  surface: '#0E1322',
  surfaceContainer: '#1A1F2F',
  surfaceContainerHigh: '#25293A',
  surfaceContainerHighest: '#2F3445',
  surfaceContainerLowest: '#090E1C',
  primary: '#4BE277',
  primaryDark: '#22C55E',
  primaryFixedDim: '#4AE176',
  onPrimary: '#003915',
  onSurface: '#DEE1F7',
  onSurfaceVariant: '#BCC8B9',
  outlineVariant: '#3D4A3D',
  glassBg: 'rgba(37, 41, 58, 0.6)',
  glassBorder: 'rgba(75, 226, 119, 0.1)',
  inputBg: '#090E1C',
  inputBorder: 'rgba(61, 74, 61, 0.3)',
};

const ForgotPasswordScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const verifyResetCode = useAuthStore((s) => s.verifyResetCode);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [devResetCode, setDevResetCode] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const emailForm = useForm({
    resolver: zodResolver(EmailSchema),
    defaultValues: { email: '' },
  });

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [countdown, setCountdown] = useState(0);

  const passwordForm = useForm({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { newPassword: '', confirm: '' },
  });

  /* ─── Pulsing Glow Animation ─── */
  const glowOpacity = useSharedValue(0.15);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.15, { duration: 1500 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: glowOpacity.value,
      borderColor: `rgba(75, 226, 119, ${glowOpacity.value})`,
      backgroundColor: `rgba(75, 226, 119, ${glowOpacity.value * 0.3})`,
    };
  });

  /* ─── Cursor Blink Animation ─── */
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );
  }, []);

  const cursorStyle = useAnimatedStyle(() => {
    return {
      opacity: cursorOpacity.value,
    };
  });

  useEffect(() => {
    if (step !== 'verify' || devResetCode) {
      return;
    }

    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 450);
    return () => clearTimeout(timer);
  }, [devResetCode, step]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /* ─── Handlers ─── */
  const onSendCode = useCallback(
    async (values: { email: string }) => {
      try {
        setLoading(true);
        setCode(Array(CODE_LENGTH).fill(''));
        setResetCode('');
        setDevResetCode('');

        const returnedResetCode = (await forgotPassword(values.email))?.trim() ?? '';
        const nextCode = returnedResetCode.replace(/\D/g, '').slice(0, CODE_LENGTH);

        setEmail(values.email);
        Toast.show({
          type: 'success',
          text1: 'Đã gửi mã xác minh',
          text2: nextCode
            ? `Chế độ dev: dùng mã ${nextCode} để tiếp tục`
            : 'Kiểm tra email của bạn để tiếp tục',
        });

        if (nextCode) {
          setDevResetCode(nextCode);
          setCode(Array.from({ length: CODE_LENGTH }, (_, index) => nextCode[index] ?? ''));
        }

        setStep('verify');
        setCountdown(45);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Không thể gửi mã';
        Toast.show({
          type: 'error',
          text1: 'Gửi mã thất bại',
          text2: msg,
        });
      } finally {
        setLoading(false);
      }
    },
    [forgotPassword],
  );

  const handleCodeChange = (value: string, index: number) => {
    if (value && !/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onVerifyCode = useCallback(async () => {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng nhập đủ 6 số' });
      return;
    }
    try {
      setLoading(true);
      await verifyResetCode(email, fullCode);
      setResetCode(fullCode);
      setStep('newPassword');
      Toast.show({
        type: 'info',
        text1: 'Mã hợp lệ',
        text2: 'Tiếp tục tạo mật khẩu mới',
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'Mã xác minh không hợp lệ';
      Toast.show({
        type: 'error',
        text1: 'Xác minh thất bại',
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [code, email, verifyResetCode]);

  const onResetPassword = useCallback(
    async (values: { newPassword: string; confirm: string }) => {
      try {
        setLoading(true);
        await resetPassword(email, resetCode, values.newPassword);
        setStep('success');
        Toast.show({
          type: 'success',
          text1: 'Đổi mật khẩu thành công',
          text2: 'Bạn có thể đăng nhập với mật khẩu mới',
        });
      } catch (e: any) {
        const msg =
          e?.response?.data?.message || e?.message || 'Không thể đổi mật khẩu';
        Toast.show({
          type: 'error',
          text1: 'Đổi mật khẩu thất bại',
          text2: msg,
        });
      } finally {
        setLoading(false);
      }
    },
    [email, resetCode, resetPassword],
  );

  const goToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  /* ─── Step helpers ─── */
  const stepIndex = ['email', 'verify', 'newPassword'].indexOf(step);

  const heroIcon = (): { name: keyof typeof Ionicons.glyphMap; label: string } => {
    switch (step) {
      case 'email':
        return { name: 'lock-closed', label: 'Quên mật khẩu?' };
      case 'verify':
        return { name: 'shield-checkmark', label: 'Xác thực tài khoản' };
      case 'newPassword':
        return { name: 'key', label: 'Tạo mật khẩu mới' };
      case 'success':
        return { name: 'checkmark-circle', label: 'Thành công!' };
    }
  };

  const hero = heroIcon();

  return (
    <GestureHandlerRootView
      testID={TEST_IDS.auth.forgotPasswordScreen}
      style={[styles.container, { backgroundColor: C.surface }]}
    >
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
        >
          {/* ─── Hero: Bioluminescent Icon ─── */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.heroSection}
          >

            {/* Glass aura circle */}
            <Animated.View style={[styles.heroGlassOuter, animatedGlowStyle]}>
              <View style={styles.heroGlassInner}>
                <Ionicons
                  name={hero.name}
                  size={48}
                  color={C.primary}
                />
              </View>
            </Animated.View>
          </Animated.View>

          {/* ─── 3D Tilt Card ─── */}
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
              {/* ─── Header — depth 0.3 ─── */}
              <ParallaxLayer depth={0.3}>
                <View style={styles.cardHeader}>
                  <ThemedText
                    variant="h2"
                    weight="700"
                    lines={2}
                    shrink={true}
                    style={{ color: '#FFFFFF', fontSize: 24, textAlign: 'center' }}
                  >
                    {hero.label}
                  </ThemedText>

                  {step === 'email' && (
                    <ThemedText
                      variant="body"
                      style={{
                        color: '#94A3B8',
                        textAlign: 'center',
                        marginTop: 12,
                        lineHeight: 24,
                        fontSize: 15,
                      }}
                    >
                      Đừng lo lắng! Vui lòng nhập địa chỉ email liên kết với tài khoản
                      của bạn để nhận mã khôi phục.
                    </ThemedText>
                  )}

                  {step === 'verify' && (
                    <ThemedText
                      variant="body"
                      style={{
                        color: '#94A3B8',
                        textAlign: 'center',
                        marginTop: 12,
                        lineHeight: 24,
                        fontSize: 15,
                      }}
                    >
                      Hãy nhập mã OTP gồm 6 chữ số vừa được AI gửi đến email <ThemedText variant="body" weight="600" style={{ color: C.onSurface }}>{email}</ThemedText> của bạn.
                    </ThemedText>
                  )}

                  {step === 'newPassword' && (
                    <ThemedText
                      variant="body"
                      style={{
                        color: '#94A3B8',
                        textAlign: 'center',
                        marginTop: 12,
                        lineHeight: 24,
                        fontSize: 15,
                      }}
                    >
                      Để bảo mật, mật khẩu mới của bạn phải khác với các mật khẩu đã sử dụng trước đây.
                    </ThemedText>
                  )}

                  {step === 'success' && (
                    <ThemedText
                      variant="body"
                      style={{
                        color: '#94A3B8',
                        textAlign: 'center',
                        marginTop: 12,
                        lineHeight: 24,
                        fontSize: 15,
                      }}
                    >
                      Mật khẩu của bạn đã được đổi thành công.{'\n'}Hãy đăng nhập với
                      mật khẩu mới.
                    </ThemedText>
                  )}
                </View>
              </ParallaxLayer>

              {/* ─── Step Indicator — depth 0.4 ─── */}
              {step !== 'success' && (
                <ParallaxLayer depth={0.4}>
                  <View style={styles.stepIndicator}>
                    {['email', 'verify', 'newPassword'].map((item, index) => {
                      const isActive = index <= stepIndex;
                      const isCompleted = index < stepIndex;

                      return (
                        <View key={item} style={styles.stepItem}>
                          <View
                            style={[
                              styles.stepDot,
                              {
                                backgroundColor: isActive
                                  ? C.primary
                                  : C.outlineVariant + '66',
                                borderWidth: isActive ? 0 : 1,
                                borderColor: C.outlineVariant + '66',
                              },
                            ]}
                          >
                            {isCompleted && (
                              <Ionicons name="checkmark" size={12} color={C.onPrimary} />
                            )}
                          </View>
                          {index < 2 && (
                            <View
                              style={[
                                styles.stepLine,
                                {
                                  backgroundColor:
                                    index < stepIndex
                                      ? C.primary
                                      : C.outlineVariant + '4D',
                                },
                              ]}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </ParallaxLayer>
              )}

              {/* ══════════ STEP: EMAIL ══════════ */}
              {step === 'email' && (
                <ParallaxLayer depth={0.5}>
                  <Animated.View entering={FadeInRight.duration(400)}>
                    {/* Label */}
                    <ThemedText
                      variant="caption"
                      weight="700"
                      style={styles.fieldLabel}
                    >
                      ĐỊA CHỈ EMAIL
                    </ThemedText>

                    {/* Email input */}
                    <Controller
                      control={emailForm.control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View>
                          <View
                            style={[
                              styles.inputContainer,
                              {
                                backgroundColor: C.inputBg,
                                borderColor: emailForm.formState.errors.email
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
                              testID={TEST_IDS.auth.forgotPasswordEmailInput}
                              placeholder="Ví dụ: nam@gmail.com"
                              placeholderTextColor="#475569"
                              autoCapitalize="none"
                              keyboardType="email-address"
                              onBlur={onBlur}
                              onChangeText={onChange}
                              value={value}
                              style={[styles.input, { color: C.onSurface }]}
                            />
                          </View>
                          {emailForm.formState.errors.email && (
                            <ThemedText
                              variant="bodySmall"
                              style={{
                                color: theme.colors.danger,
                                marginTop: 4,
                                marginLeft: 4,
                              }}
                            >
                              {emailForm.formState.errors.email.message}
                            </ThemedText>
                          )}
                        </View>
                      )}
                    />

                    {/* CTA Button */}
                    <Pressable
                      testID={TEST_IDS.auth.forgotPasswordSendCodeButton}
                      onPress={emailForm.handleSubmit(onSendCode)}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.ctaButton,
                        pressed && { opacity: 0.7 },
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
                        {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                      </ThemedText>
                    </Pressable>
                  </Animated.View>
                </ParallaxLayer>
              )}

              {/* ══════════ STEP: VERIFY ══════════ */}
              {step === 'verify' && (
                <ParallaxLayer depth={0.5}>
                  <Animated.View entering={FadeInRight.duration(400)}>
                     <View style={styles.otpContainer}>
                      {code.map((digit, index) => {
                        const isActive = activeSlot === index;
                        return (
                          <Pressable
                            key={index}
                            testID={`${TEST_IDS.auth.forgotPasswordVerifyCodeSlotPrefix}-${index}`}
                            onPress={() => inputRefs.current[index]?.focus()}
                            style={[
                              styles.otpSlot,
                              isActive && styles.otpSlotActive,
                              digit ? { borderColor: C.primary } : {},
                            ]}
                          >
                            <TextInput
                              testID={`${TEST_IDS.auth.forgotPasswordVerifyCodeInputPrefix}-${index}`}
                              ref={(ref) => {
                                inputRefs.current[index] = ref;
                              }}
                              style={styles.hiddenInput}
                              value={digit}
                              onChangeText={(value) => handleCodeChange(value, index)}
                              onKeyPress={(e) => handleKeyPress(e, index)}
                              onFocus={() => setActiveSlot(index)}
                              onBlur={() => setActiveSlot(-1)}
                              keyboardType="number-pad"
                              maxLength={1}
                              caretHidden={true}
                            />
                            {/* Display */}
                            {digit ? (
                              <ThemedText variant="h2" weight="700" style={{ color: C.onSurface, fontSize: 24 }}>
                                {digit}
                              </ThemedText>
                            ) : isActive ? (
                              <Animated.View style={[styles.cursorBlink, cursorStyle]} />
                            ) : (
                              <ThemedText variant="h2" weight="700" style={{ color: '#475569', fontSize: 24, fontStyle: 'italic' }}>
                                _
                              </ThemedText>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>

                    {devResetCode ? (
                      <View
                        style={{
                          marginBottom: 20,
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: 'rgba(75, 226, 119, 0.28)',
                          backgroundColor: 'rgba(75, 226, 119, 0.08)',
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                        }}
                      >
                        <ThemedText
                          variant="caption"
                          weight="700"
                          style={{ color: C.primary, marginBottom: 6 }}
                        >
                          MÃ DEV
                        </ThemedText>
                        <ThemedText
                          variant="body"
                          weight="700"
                          style={{ color: C.onSurface, fontSize: 20, letterSpacing: 3 }}
                        >
                          {devResetCode}
                        </ThemedText>
                        <ThemedText
                          variant="bodySmall"
                          style={{ color: C.onSurfaceVariant, marginTop: 6, lineHeight: 20 }}
                        >
                          Backend đang chạy ở chế độ dev nên app đã tự điền mã để bạn tiếp tục
                          test reset mật khẩu mà không cần chờ email.
                        </ThemedText>
                      </View>
                    ) : null}

                    {/* CTA */}
                    <Pressable
                      testID={TEST_IDS.auth.forgotPasswordVerifyButton}
                      onPress={onVerifyCode}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.ctaButton,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <LinearGradient
                        colors={['#6BFF8F', '#4BE277', '#22C55E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
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
                        {loading ? 'Đang xác minh...' : 'Xác nhận'}
                      </ThemedText>
                    </Pressable>

                    {/* Resend */}
                    <Pressable
                      testID={TEST_IDS.auth.forgotPasswordResendButton}
                      onPress={() => onSendCode({ email })}
                      disabled={loading || countdown > 0}
                      style={({ pressed }) => [
                        styles.outlineButton,
                        pressed && { opacity: 0.7 },
                        (loading || countdown > 0) && { opacity: 0.4 },
                      ]}
                    >
                      <ThemedText
                        variant="body"
                        weight="600"
                        style={{ color: C.primary, fontSize: 16 }}
                      >
                        {countdown > 0
                          ? `Gửi lại (${countdown.toString().padStart(2, '0')}s)`
                          : 'Gửi lại mã'}
                      </ThemedText>
                    </Pressable>
                  </Animated.View>
                </ParallaxLayer>
              )}

              {/* ══════════ STEP: NEW PASSWORD ══════════ */}
              {step === 'newPassword' && (
                <ParallaxLayer depth={0.5}>
                  <Animated.View entering={FadeInRight.duration(400)}>
                    {/* New password */}
                    <ThemedText
                      variant="caption"
                      weight="700"
                      style={styles.fieldLabel}
                    >
                      MẬT KHẨU MỚI
                    </ThemedText>
                    <Controller
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View>
                          <View
                            style={[
                              styles.inputContainer,
                              {
                                backgroundColor: C.inputBg,
                                borderColor: passwordForm.formState.errors.newPassword
                                  ? theme.colors.danger
                                  : C.inputBorder,
                              },
                            ]}
                          >
                            <TextInput
                              testID={TEST_IDS.auth.forgotPasswordNewPasswordInput}
                              placeholder="••••••••"
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
                                name={
                                  passwordVisible ? 'eye-off-outline' : 'eye-outline'
                                }
                                size={20}
                                color={C.onSurfaceVariant}
                              />
                            </Pressable>
                          </View>
                          {/* Hide redundant error since we use validationBox */}
                        </View>
                      )}
                    />

                    {/* Confirm password */}
                    <ThemedText
                      variant="caption"
                      weight="700"
                      style={[styles.fieldLabel, { marginTop: 20 }]}
                    >
                      NHẬP LẠI MẬT KHẨU MỚI
                    </ThemedText>
                    <Controller
                      control={passwordForm.control}
                      name="confirm"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View>
                          <View
                            style={[
                              styles.inputContainer,
                              {
                                backgroundColor: C.inputBg,
                                borderColor: passwordForm.formState.errors.confirm
                                  ? theme.colors.danger
                                  : C.inputBorder,
                              },
                            ]}
                          >
                            <TextInput
                              testID={TEST_IDS.auth.forgotPasswordConfirmPasswordInput}
                              placeholder="••••••••"
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
                                name={
                                  confirmVisible ? 'eye-off-outline' : 'eye-outline'
                                }
                                size={20}
                                color={C.onSurfaceVariant}
                              />
                            </Pressable>
                          </View>
                          {/* Hide redundant error since we use validationBox */}
                        </View>
                      )}
                    />

                    {/* ─── Validation Checklist ─── */}
                    {(() => {
                      const pw = passwordForm.watch('newPassword') || '';
                      const hasLength = pw.length >= 6;
                      const hasUpperLowerNum = /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);

                      return (
                        <View style={styles.validationBox}>
                          {/* Rule 1 */}
                          <View style={styles.validationRow}>
                            <View style={[
                              styles.validationDot,
                              hasLength ? styles.validationDotActive : styles.validationDotInactive,
                            ]}>
                              {hasLength ? (
                                <Ionicons name="checkmark" size={12} color={C.primary} />
                              ) : (
                                <Ionicons name="close" size={12} color="#475569" />
                              )}
                            </View>
                            <ThemedText
                              variant="bodySmall"
                              style={{
                                color: hasLength ? C.onSurface : '#64748B',
                                fontSize: 13,
                              }}
                            >
                              Ít nhất có 6 ký tự
                            </ThemedText>
                          </View>
                          {/* Rule 2 */}
                          <View style={styles.validationRow}>
                            <View style={[
                              styles.validationDot,
                              hasUpperLowerNum ? styles.validationDotActive : styles.validationDotInactive,
                            ]}>
                              {hasUpperLowerNum ? (
                                <Ionicons name="checkmark" size={12} color={C.primary} />
                              ) : (
                                <Ionicons name="close" size={12} color="#475569" />
                              )}
                            </View>
                            <ThemedText
                              variant="bodySmall"
                              style={{
                                color: hasUpperLowerNum ? C.onSurface : '#64748B',
                                fontSize: 13,
                              }}
                            >
                              Ít nhất có 1 chữ hoa, chữ thường và số
                            </ThemedText>
                          </View>
                        </View>
                      );
                    })()}

                    {/* CTA */}
                    <Pressable
                      testID={TEST_IDS.auth.forgotPasswordResetButton}
                      onPress={passwordForm.handleSubmit(onResetPassword)}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.ctaButton,
                        pressed && { opacity: 0.7 },
                        loading && { opacity: 0.6 },
                      ]}
                    >
                      <LinearGradient
                        colors={['#6BFF8F', '#4BE277', '#22C55E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
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
                        {loading ? 'Đang xử lý...' : 'Lưu mật khẩu mới'}
                      </ThemedText>
                    </Pressable>
                  </Animated.View>
                </ParallaxLayer>
              )}

              {/* ══════════ STEP: SUCCESS ══════════ */}
              {step === 'success' && (
                <ParallaxLayer depth={0.5}>
                  <Animated.View entering={FadeInRight.duration(400)}>
                    {/* Success icon */}
                    <View style={styles.successIconWrap}>
                      <Ionicons
                        name="checkmark-circle"
                        size={56}
                        color={C.primary}
                      />
                    </View>

                    {/* CTA */}
                    <Pressable
                      testID={TEST_IDS.auth.forgotPasswordLoginButton}
                      onPress={goToLogin}
                      style={({ pressed }) => [
                        styles.ctaButton,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <LinearGradient
                        colors={['#6BFF8F', '#4BE277', '#22C55E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
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
                        Đăng nhập ngay
                      </ThemedText>
                    </Pressable>
                  </Animated.View>
                </ParallaxLayer>
              )}
            </Animated.View>
          </Tilt3DCard>

          {/* ─── Footer ─── */}
          {step === 'email' && (
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              style={styles.footer}
            >
              <ThemedText variant="bodySmall" style={{ color: '#64748B' }}>
                Bạn nhớ ra mật khẩu?{' '}
              </ThemedText>
              <ThemedText
                variant="bodySmall"
                weight="700"
                onPress={goToLogin}
                style={{ color: C.primary }}
              >
                Quay lại đăng nhập
              </ThemedText>
            </Animated.View>
          )}

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



  /* Hero section */
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  heroGlassOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(37, 41, 58, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(61, 74, 61, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    // Bioluminescent glow shadow
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
  },
  heroGlassInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(47, 52, 69, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
  },

  /* Step indicator */
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 44,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
  },

  /* Field label */
  fieldLabel: {
    color: '#4AE176',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },

  /* Form inputs */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
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

  /* Validation Checklist */
  validationBox: {
    marginTop: 20,
    backgroundColor: 'rgba(22, 27, 43, 0.3)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(61, 74, 61, 0.1)',
    gap: 12,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  validationDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationDotActive: {
    backgroundColor: 'rgba(75, 226, 119, 0.2)',
  },
  validationDotInactive: {
    backgroundColor: 'rgba(71, 85, 105, 0.2)',
  },

  /* OTP Inputs */
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 8,
  },
  otpSlot: {
    width: 44,
    height: 60,
    borderRadius: 12,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(61, 74, 61, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  otpSlotActive: {
    borderColor: C.primary,
    borderWidth: 2,
    shadowColor: C.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 10,
    textAlign: 'center',
    fontSize: 24,
  },
  cursorBlink: {
    width: 2,
    height: 32,
    backgroundColor: C.primary,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },

  /* CTA Button */
  ctaButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 6,
  },

  /* Outline secondary button */
  outlineButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(61, 74, 61, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  /* Success */
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(75, 226, 119, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },


});

export default ForgotPasswordScreen;
