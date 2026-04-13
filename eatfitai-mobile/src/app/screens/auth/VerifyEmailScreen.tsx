import { useCallback, useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Image,
  TextInput,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Tilt3DCard, { ParallaxLayer } from '../../../components/ui/Tilt3DCard';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import type { RootStackParamList } from '../../types';
import apiClient from '../../../services/apiClient';
import { tokenStorage } from '../../../services/secureStore';
import { setAccessTokenMem } from '../../../services/authTokens';
import { AUTH_NEEDS_ONBOARDING_KEY, useAuthStore } from '../../../store/useAuthStore';
import { handleApiError } from '../../../utils/errorHandler';
import { TEST_IDS } from '../../../testing/testIds';

const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

// Response từ verify-email endpoint
interface VerifyEmailResponse {
  userId: string;
  email: string;
  displayName: string;
  accessToken?: string;
  token: string;
  accessTokenExpiresAt?: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  needsOnboarding: boolean;
}

const resolveNeedsOnboarding = (
  payload: Partial<VerifyEmailResponse> & { NeedsOnboarding?: boolean },
): boolean => {
  if (typeof payload.needsOnboarding === 'boolean') {
    return payload.needsOnboarding;
  }

  if (typeof payload.NeedsOnboarding === 'boolean') {
    return payload.NeedsOnboarding;
  }

  return true;
};

const VerifyEmailScreen = ({ navigation, route }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const { email, verificationCode: devCode } = route.params;

  /* ─── Colors (Emerald Nebula palette) ─── */
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

  // State
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Pulse glow animation for mail icon
  const glowValue = useSharedValue(0.5);

  useEffect(() => {
    glowValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.5, { duration: 1200 }),
      ),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowValue.value,
      transform: [{ scale: 1 + (glowValue.value - 0.5) * 0.8 }], // Tăng độ phóng to của vòng ngoài
    };
  });

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus ô đầu tiên
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  // Dev code toast
  useEffect(() => {
    if (devCode) {
      Toast.show({
        type: 'info',
        text1: 'Mã xác minh (Dev Mode)',
        text2: devCode,
        visibilityTime: 5000,
      });
    }
  }, [devCode]);

  const handleCodeChange = (value: string, index: number) => {
    if (value && !/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < CODE_LENGTH - 1) {
      // Nhập số -> nhảy tiến
      inputRefs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      // Xóa số -> nhảy lùi
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    Keyboard.dismiss();
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng nhập đủ 6 số' });
      return;
    }

    setLoading(true);
    try {
      const resp = await apiClient.post<VerifyEmailResponse>('/api/auth/verify-email', {
        Email: email,
        VerificationCode: fullCode,
      });

      const data = resp.data;

      const backendNeedsOnboarding = resolveNeedsOnboarding(
        data as VerifyEmailResponse & { NeedsOnboarding?: boolean },
      );
      const needsOnboarding = true;
      const nextUser = {
        id: data.userId,
        email: data.email,
        name: data.displayName,
      };

      if (__DEV__) {
        console.log('[VerifyEmail] Verification succeeded:', {
          email: data.email,
          needsOnboarding,
          backendNeedsOnboarding,
          rawNeedsOnboarding: (
            data as VerifyEmailResponse & { NeedsOnboarding?: boolean }
          ).needsOnboarding,
          rawPascalNeedsOnboarding: (
            data as VerifyEmailResponse & { NeedsOnboarding?: boolean }
          ).NeedsOnboarding,
        });
      }

      const accessToken = data.accessToken || data.token;
      const accessTokenExpiresAt = data.accessTokenExpiresAt || data.expiresAt;

      await tokenStorage.saveTokensFull({
        accessToken,
        accessTokenExpiresAt,
        refreshToken: data.refreshToken,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
      });
      await AsyncStorage.setItem(
        AUTH_NEEDS_ONBOARDING_KEY,
        needsOnboarding ? 'true' : 'false',
      );
      await AsyncStorage.setItem('onboarding_complete', 'false');
      setAccessTokenMem(accessToken);
      useAuthStore.setState({
        isAuthenticated: false,
        needsOnboarding,
        user: nextUser,
      });

      Toast.show({
        type: 'success',
        text1: 'Xác minh thành công!',
        text2: 'Tiếp tục thiết lập thông tin của bạn',
      });

      setTimeout(() => {
        navigation.replace('Onboarding');
      }, 50);
    } catch (err: any) {
      const message = err?.response?.data?.message || handleApiError(err);
      Toast.show({ type: 'error', text1: 'Xác minh thất bại', text2: message });
    } finally {
      setLoading(false);
    }
  }, [code, email, navigation]);

  const handleResend = useCallback(async () => {
    if (countdown > 0) return;

    setResendLoading(true);
    try {
      const resp = await apiClient.post('/api/auth/resend-verification', {
        Email: email,
      });
      const data = resp.data as any;

      if (data?.verificationCode) {
        Toast.show({
          type: 'info',
          text1: 'Mã mới (Dev Mode)',
          text2: data.verificationCode,
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Đã gửi lại mã',
          text2: 'Kiểm tra email của bạn',
        });
      }

      setCountdown(60);
      setCode(Array(CODE_LENGTH).fill(''));
    } catch (err: any) {
      const message = err?.response?.data?.message || handleApiError(err);
      Toast.show({ type: 'error', text1: 'Gửi lại thất bại', text2: message });
    } finally {
      setResendLoading(false);
    }
  }, [email, countdown]);

  const isCodeComplete = code.every((d) => d !== '');

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
          testID={TEST_IDS.auth.verifyScreen}
        >
          {/* ─── Logo (icon only) ─── */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoSection}
          >
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logoImage}
            />
          </Animated.View>

          {/* ─── Verification Card (3D tilt interaction) ─── */}
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
                  {/* Mail icon with bordered pulsing glow */}
                  <View style={styles.iconWrapper}>
                    <Animated.View
                      style={[styles.glowRing, { borderColor: C.primary }, glowStyle]}
                    />
                    <View
                      style={[
                        styles.mailIconContainer,
                        { backgroundColor: 'transparent' },
                      ]}
                    >
                      <Ionicons name="mail-open-outline" size={32} color={C.primary} />
                    </View>
                  </View>

                  <ThemedText
                    variant="h2"
                    weight="700"
                    style={{
                      color: '#FFFFFF',
                      fontSize: 28,
                      textAlign: 'center',
                      lineHeight: 34,
                    }}
                  >
                    Kiểm tra hộp thư{'\n'}của bạn!
                  </ThemedText>
                  <ThemedText
                    variant="body"
                    style={{
                      color: C.onSurfaceVariant,
                      marginTop: 12,
                      textAlign: 'center',
                      lineHeight: 24,
                    }}
                  >
                    Chúng tôi đã gửi mã xác thực{'\n'}gồm 6 chữ số đến
                  </ThemedText>
                  <ThemedText
                    variant="body"
                    weight="700"
                    style={{
                      color: '#FFFFFF',
                      marginTop: 4,
                      textAlign: 'center',
                      fontSize: 16,
                    }}
                  >
                    {email}
                  </ThemedText>
                </View>
              </ParallaxLayer>

              {/* OTP Input — depth 0.5 */}
              <ParallaxLayer depth={0.5}>
                <View style={styles.otpContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.otpInput,
                        {
                          backgroundColor: C.inputBg,
                          borderColor: digit ? C.primary : C.inputBorder,
                        },
                      ]}
                      value={digit}
                      onChangeText={(value) => handleCodeChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      placeholderTextColor={C.onSurfaceVariant}
                      selectionColor={C.primary}
                      testID={`${TEST_IDS.auth.verifyCodeInputPrefix}-${index}`}
                    />
                  ))}
                </View>
              </ParallaxLayer>

              {/* Verify Button — depth 0.8 */}
              <ParallaxLayer depth={0.8}>
                <Animated.View entering={FadeInDown.delay(350).springify()}>
                  <Pressable
                    testID={TEST_IDS.auth.verifySubmitButton}
                    onPress={handleVerify}
                    disabled={loading || !isCodeComplete}
                    style={({ pressed }) => [
                      styles.verifyButton,
                      pressed && { transform: [{ scale: 0.96 }] },
                      (loading || !isCodeComplete) && { opacity: 0.5 },
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
                      {loading ? 'Đang xác minh...' : 'Xác nhận Email'}
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              </ParallaxLayer>

              {/* Resend section — depth 0.6 */}
              <ParallaxLayer depth={0.6}>
                <View style={styles.resendSection}>
                  <View style={styles.resendRow}>
                    <ThemedText variant="bodySmall" style={{ color: C.onSurfaceVariant }}>
                      Bạn không nhận được mã?{' '}
                    </ThemedText>
                    {countdown > 0 ? (
                      <ThemedText
                        variant="bodySmall"
                        weight="600"
                        style={{ color: C.primary }}
                      >
                        Gửi lại sau {Math.floor(countdown / 60)}:
                        {(countdown % 60).toString().padStart(2, '0')}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={handleResend}
                    disabled={countdown > 0 || resendLoading}
                    style={({ pressed }) => [
                      styles.resendButton,
                      {
                        backgroundColor: C.surfaceContainerHighest + '33',
                        borderColor: C.outlineVariant + '33',
                      },
                      (countdown > 0 || resendLoading) && { opacity: 0.4 },
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <ThemedText
                      variant="bodySmall"
                      weight="500"
                      style={{ color: C.onSurfaceVariant }}
                    >
                      {resendLoading ? 'Đang gửi...' : 'Gửi lại mã xác nhận'}
                    </ThemedText>
                  </Pressable>
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

  /* Background blobs */
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  blobTopRight: {
    top: -80,
    right: -100,
  },
  blobBottomLeft: {
    bottom: -60,
    left: -100,
  },

  /* Back button */
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll */
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  /* Logo */
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },

  /* Card */
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    overflow: 'hidden',
  },

  /* Card Header */
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },

  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: 64,
    height: 64,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 3, // Viền dày hơn
    opacity: 0.8,
  },

  /* Mail icon container */
  mailIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* OTP */
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },

  /* Verify Button */
  verifyButton: {
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

  /* Resend */
  resendSection: {
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
});

export default VerifyEmailScreen;
