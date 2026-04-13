/**
 * OnboardingScreen - First-time user setup wizard
 * 5 steps: Basic Info → Body Metrics → Goal → Activity → AI Calculate
 *
 * Emerald Nebula design system + 3D Parallax tilt on Step 0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useProfileStore } from '../../../store/useProfileStore';
import { AUTH_NEEDS_ONBOARDING_KEY, useAuthStore } from '../../../store/useAuthStore';
import apiClient, { aiApiClient } from '../../../services/apiClient';
import { profileService } from '../../../services/profileService';
import { showSuccess } from '../../../utils/errorHandler';
import { t } from '../../../i18n/vi';
import { TEST_IDS } from '../../../testing/testIds';
import Tilt3DCard, { ParallaxLayer } from '../../../components/ui/Tilt3DCard';

const { width } = Dimensions.get('window');

interface OnboardingData {
  fullName: string;
  gender: 'male' | 'female' | null; // Đã bỏ 'other'
  age: string;
  heightCm: string;
  weightKg: string;
  goal: 'lose' | 'maintain' | 'gain' | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

interface NutritionCalculationResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: string;
  offlineMode?: boolean;
  explanation?: string | null;
  message?: string | null;
}

/* ─── Emerald Nebula palette ─── */
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

const STEPS = [
  {
    title: t('onboarding.step1_title'),
    subtitle: t('onboarding.step1_subtitle'),
    icon: '👋',
  },
  {
    title: t('onboarding.step2_title'),
    subtitle: t('onboarding.step2_subtitle'),
    icon: '📏',
  },
  {
    title: t('onboarding.step3_title'),
    subtitle: t('onboarding.step3_subtitle'),
    icon: '🎯',
  },
  {
    title: t('onboarding.step4_title'),
    subtitle: t('onboarding.step4_subtitle'),
    icon: '🏃',
  },
  {
    title: t('onboarding.step5_title'),
    subtitle: t('onboarding.step5_subtitle'),
    icon: '✨',
  },
];

const GENDER_OPTIONS = [
  { value: 'male', label: t('onboarding.gender_male'), icon: '👨' },
  { value: 'female', label: t('onboarding.gender_female'), icon: '👩' },
  // Đã bỏ giới tính "Khác" theo yêu cầu
];

const GOAL_OPTIONS = [
  {
    value: 'lose',
    label: t('onboarding.goal_lose'),
    icon: '📉',
    desc: t('onboarding.goal_lose_desc'),
    colorKey: 'danger' as const,
  },
  {
    value: 'maintain',
    label: t('onboarding.goal_maintain'),
    icon: '⚖️',
    desc: t('onboarding.goal_maintain_desc'),
    colorKey: 'info' as const,
  },
  {
    value: 'gain',
    label: t('onboarding.goal_gain'),
    icon: '📈',
    desc: t('onboarding.goal_gain_desc'),
    colorKey: 'success' as const,
  },
];

const ACTIVITY_OPTIONS = [
  {
    value: 'sedentary',
    label: t('onboarding.activity_sedentary'),
    desc: t('onboarding.activity_sedentary_desc'),
    multiplier: 1.2,
    icon: '🪑',
  },
  {
    value: 'light',
    label: t('onboarding.activity_light'),
    desc: t('onboarding.activity_light_desc'),
    multiplier: 1.375,
    icon: '🚶',
  },
  {
    value: 'moderate',
    label: t('onboarding.activity_moderate'),
    desc: t('onboarding.activity_moderate_desc'),
    multiplier: 1.55,
    icon: '🏃',
  },
  {
    value: 'active',
    label: t('onboarding.activity_active'),
    desc: t('onboarding.activity_active_desc'),
    multiplier: 1.725,
    icon: '🏋️',
  },
  {
    value: 'very_active',
    label: t('onboarding.activity_very_active'),
    desc: t('onboarding.activity_very_active_desc'),
    multiplier: 1.9,
    icon: '🏆',
  },
];

const OnboardingScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const insets = useSafeAreaInsets();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const invalidateProfile = useProfileStore((s) => s.invalidateProfile);

  const [currentStep, setCurrentStep] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    fullName: '',
    gender: null,
    age: '',
    heightCm: '',
    weightKg: '',
    goal: null,
    activityLevel: 'moderate',
  });

  const [aiResult, setAiResult] = useState<NutritionCalculationResult | null>(null);

  // Waving hand animation
  const waveRotation = useSharedValue(0);

  useEffect(() => {
    waveRotation.value = withRepeat(
      withSequence(
        withTiming(25, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(-15, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(20, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(-10, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 1500 }) // Pause
      ),
      -1,
      false
    );
  }, []);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveRotation.value}deg` }],
  }));

  // Glowing pulse animation for icons
  const glowPulse = useSharedValue(1);
  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
    opacity: 0.3 + (glowPulse.value - 1) * 2,
  }));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return data.fullName.length >= 2 && data.gender !== null && data.age !== '';
      case 1:
        return data.heightCm !== '' && data.weightKg !== '';
      case 2:
        return data.goal !== null;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep < 4) {
      if (currentStep === 3) {
        // Last data step - calculate AI
        setAiResult(null);
        setCalculationError(null);
        setCurrentStep(4);
        calculateNutrition();
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const calculateNutrition = async () => {
    setIsCalculating(true);
    setCalculationError(null);
    try {
      // Gọi qua backend API thay vì AI provider trực tiếp
      // Backend sẽ proxy đến AI Provider (Ollama)
      const activityMultiplier =
        ACTIVITY_OPTIONS.find((option) => option.value === data.activityLevel)?.multiplier ?? 1.55;

      const response = await aiApiClient.post<NutritionCalculationResult>('/api/ai/nutrition/recalculate', {
        sex: data.gender,
        age: Number(data.age),
        heightCm: Number(data.heightCm),
        weightKg: Number(data.weightKg),
        activityLevel: activityMultiplier,
        goal: data.goal,
      });

      if (response.data?.calories > 0) {
        setAiResult(response.data);
        if (response.data.offlineMode) {
          Toast.show({
            type: 'info',
            text1: 'Offline mode',
            text2: 'AI đang tạm thời không khả dụng. App dùng công thức chuẩn để hoàn tất onboarding.',
          });
        }
      } else {
        setAiResult(null);
        setCalculationError('Không thể tính mục tiêu dinh dưỡng lúc này. Vui lòng thử lại.');
        Toast.show({
          type: 'error',
          text1: 'Dịch vụ AI hiện không khả dụng',
          text2: 'Hãy đảm bảo Ollama đang chạy và thử lại.',
        });
      }
    } catch (error) {
      setAiResult(null);
      setCalculationError('Không thể kết nối AI. Kiểm tra backend rồi thử lại.');
      // KHÔNG fallback - hiển thị lỗi kết nối
      Toast.show({
        type: 'error',
        text1: 'Không thể kết nối AI',
        text2: 'Kiểm tra AI Provider và Ollama đang chạy.',
      });
    } finally {
      setIsCalculating(false);
    }
  };


  const handleComplete = async () => {
    try {
      // Map activityLevel string sang activityLevelId
      const activityLevelMap: Record<string, number> = {
        sedentary: 1,
        light: 2,
        moderate: 3,
        active: 4,
        very_active: 5,
      };

      // Tính dateOfBirth từ age
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - Number(data.age);
      const dateOfBirth = `${birthYear}-01-01`; // Giả định ngày 1/1
      let profileSavedWithFallback = false;

      try {
        // Save profile với đầy đủ thông tin
        await updateProfile({
          fullName: data.fullName,
          heightCm: Number(data.heightCm),
          weightKg: Number(data.weightKg),
          gender: data.gender || undefined,
          dateOfBirth: dateOfBirth,
          activityLevelId: activityLevelMap[data.activityLevel] || 3,
          goal: data.goal || undefined,
        });
      } catch (profileError) {
        // Cloud /api/profile đang không ổn định; giữ onboarding tiếp tục bằng cách
        // ít nhất lưu body metrics để home/diary và nutrition lane không bị chặn.
        if (__DEV__) {
          console.warn('[Onboarding] updateProfile failed, falling back to body metrics only:', profileError);
        }

        await profileService.createBodyMetrics({
          heightCm: Number(data.heightCm),
          weightKg: Number(data.weightKg),
          note: 'Onboarding fallback while profile API is degraded',
        });
        profileSavedWithFallback = true;
      }

      // Lưu NutritionTarget từ aiResult vào backend
      if (aiResult) {
        try {
          await apiClient.post('/api/ai/nutrition/apply', {
            calories: aiResult.calories,
            protein: aiResult.protein,
            carb: aiResult.carbs,
            fat: aiResult.fat,
          });
          // Log only in development mode
          if (__DEV__) {
            console.log('[Onboarding] NutritionTarget created successfully');
          }
        } catch (nutritionError) {
          if (__DEV__) {
            console.warn(
              '[Onboarding] Failed to create NutritionTarget:',
              nutritionError,
            );
          }
          // Vẫn tiếp tục vì đây không phải critical error
        }
      }

      // Mark onboarding complete in local storage
      await AsyncStorage.multiSet([
        ['onboarding_complete', 'true'],
        [AUTH_NEEDS_ONBOARDING_KEY, 'false'],
      ]);

      // Gọi API đánh dấu onboarding hoàn tất trên server
      try {
        await apiClient.post('/api/auth/mark-onboarding-completed');
        if (__DEV__) {
          console.log('[Onboarding] Server onboarding status updated');
        }
      } catch (apiError) {
        if (__DEV__) {
          console.warn('[Onboarding] Failed to update server:', apiError);
        }
        // Vẫn tiếp tục vì đã lưu locally
      }

      if (profileSavedWithFallback) {
        Toast.show({
          type: 'info',
          text1: 'Đã hoàn tất thiết lập',
          text2: 'Một phần hồ sơ sẽ được đồng bộ lại sau.',
        });
      } else {
        showSuccess('settings_saved', { text1: '🎉 Thiết lập hoàn tất!' });
      }

      invalidateProfile();
      try {
        await fetchProfile({ force: true });
      } catch (profileRefreshError) {
        if (__DEV__) {
          console.warn('[Onboarding] Failed to refresh profile after completion:', profileRefreshError);
        }
      }

      // Auth state change will cause AppNavigator to swap from onboarding to AppTabs.
      useAuthStore.setState({ isAuthenticated: true, needsOnboarding: false });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    }
  };

  /* ─── Age as a number for slider ─── */
  const ageNum = data.age ? parseInt(data.age, 10) : 24;

  /* ─── Render Step 0 — Emerald Nebula "Basic Info" ─── */
  const renderStep0Nebula = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step0">
      <Tilt3DCard maxTilt={6} perspective={900}>
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[
            s.card,
            {
              backgroundColor: C.glassBg,
              borderColor: C.glassBorder,
            },
          ]}
        >
          {/* Header — depth 0.3 */}
          <ParallaxLayer depth={0.3}>
            <View style={s.cardHeader}>
              {/* Waving hand emoji */}
              <View style={[s.iconBox, { backgroundColor: C.surfaceContainerHigh }]}>
                <Animated.Text style={[{ fontSize: 36 }, waveStyle]}>👋</Animated.Text>
              </View>
              <ThemedText
                variant="h2"
                weight="700"
                style={{ color: '#FFFFFF', fontSize: 28, textAlign: 'center', fontFamily: 'Inter_700Bold' }}
              >
                Thông tin cơ bản
              </ThemedText>
              <ThemedText
                variant="body"
                style={{
                  color: C.onSurfaceVariant,
                  marginTop: 6,
                  textAlign: 'center',
                  lineHeight: 22,
                  maxWidth: 280,
                  fontFamily: 'Inter_500Medium'
                }}
              >
                Hãy cho chúng tôi biết một chút{'\n'}về bản thân bạn
              </ThemedText>
            </View>
          </ParallaxLayer>

          {/* Form — depth 0.5 */}
          <ParallaxLayer depth={0.5}>
            <View style={s.formGroup}>
              {/* Name */}
              <View style={s.fieldBlock}>
                <ThemedText
                  variant="caption"
                  weight="700"
                  style={s.label}
                >
                  HỌ VÀ TÊN
                </ThemedText>
                <View
                  style={[
                    s.inputContainer,
                    { backgroundColor: C.inputBg, borderColor: C.inputBorder },
                  ]}
                >
                  <TextInput
                    testID={TEST_IDS.auth.onboardingNameInput}
                    placeholder="Nhập họ và tên của bạn"
                    placeholderTextColor={C.surfaceContainerHighest}
                    value={data.fullName}
                    onChangeText={(text) => setData({ ...data, fullName: text })}
                    style={[s.input, { color: C.onSurface }]}
                  />
                </View>
              </View>

              {/* Age — slider */}
              <View style={s.fieldBlock}>
                <View style={s.ageHeadRow}>
                  <ThemedText variant="caption" weight="700" style={s.label}>
                    TUỔI
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <ThemedText
                      variant="h2"
                      weight="700"
                      style={{ color: C.primary, fontSize: 30 }}
                    >
                      {data.age || '24'}
                    </ThemedText>
                    <ThemedText
                      variant="bodySmall"
                      weight="600"
                      style={{ color: C.onSurfaceVariant, marginLeft: 4 }}
                    >
                      tuổi
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    s.sliderBox,
                    { backgroundColor: C.glassBg, borderColor: C.glassBorder },
                  ]}
                >
                  {/* Hidden input for testID */}
                  <TextInput
                    testID={TEST_IDS.auth.onboardingAgeInput}
                    style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                    value={data.age}
                    onChangeText={(text) =>
                      setData({ ...data, age: text.replace(/[^0-9]/g, '') })
                    }
                    keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                  />
                  {/* Native draggable slider */}
                  <Slider
                    style={{ width: '100%', height: 36 }}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={ageNum}
                    onValueChange={(v: number) => setData({ ...data, age: String(Math.round(v)) })}
                    minimumTrackTintColor={C.primary}
                    maximumTrackTintColor={C.surfaceContainerHighest}
                    thumbTintColor={C.primary}
                  />
                  <View style={s.sliderLabels}>
                    <ThemedText
                      variant="caption"
                      style={{ color: C.onSurfaceVariant, fontSize: 13, letterSpacing: 0.5, fontFamily: 'Inter_600SemiBold' }}
                    >
                      0
                    </ThemedText>
                    <ThemedText
                      variant="caption"
                      style={{ color: C.onSurfaceVariant, fontSize: 13, letterSpacing: 0.5, fontFamily: 'Inter_600SemiBold' }}
                    >
                      100
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Gender */}
              <View style={s.fieldBlock}>
                <ThemedText variant="caption" weight="700" style={s.label}>
                  GIỚI TÍNH
                </ThemedText>
                <View style={s.genderRow}>
                  {GENDER_OPTIONS.map((opt) => {
                    const selected = data.gender === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        testID={
                          opt.value === 'male'
                            ? TEST_IDS.auth.onboardingGenderMaleButton
                            : TEST_IDS.auth.onboardingGenderFemaleButton
                        }
                        onPress={() => setData({ ...data, gender: opt.value as any })}
                        style={({ pressed }) => [
                          s.genderCard,
                          {
                            backgroundColor: selected ? C.primary + '15' : C.glassBg,
                            borderColor: selected ? C.primary : C.glassBorder,
                            borderWidth: selected ? 2 : 1,
                          },
                          pressed && { transform: [{ scale: 0.95 }] },
                        ]}
                        accessibilityRole="radio"
                        accessibilityLabel={opt.label}
                        accessibilityState={{ checked: selected }}
                      >
                        <Ionicons
                          name={opt.value === 'male' ? 'male' : 'female'}
                          size={28}
                          color={selected ? C.primary : C.onSurfaceVariant}
                        />
                        <ThemedText
                          weight={selected ? '700' : '500'}
                          style={{ color: selected ? C.primary : C.onSurface, marginTop: 2, fontSize: 13, fontFamily: selected ? 'Inter_700Bold' : 'Inter_500Medium' }}
                        >
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>


            </View>
          </ParallaxLayer>
        </Animated.View>
      </Tilt3DCard>
    </Animated.View>
  );

  /* ─── Render Step 1 — Emerald Nebula "Body Metrics" ─── */
  const heightNum = data.heightCm ? parseInt(data.heightCm, 10) : 170;
  const weightNum = data.weightKg ? parseFloat(data.weightKg) : 65;
  const rulerScrollRef = useRef<ScrollView>(null);
  const rulerInitialized = useRef(false);
  const [rulerContainerWidth, setRulerContainerWidth] = useState(0);
  const weightRulerRef = useRef<ScrollView>(null);
  const weightRulerInitialized = useRef(false);
  const [weightRulerWidth, setWeightRulerWidth] = useState(0);

  const renderStep1Nebula = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step1">
      <Tilt3DCard maxTilt={6} perspective={900} height={650}>
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[s.card, { backgroundColor: C.glassBg, borderColor: C.glassBorder }]}
        >
          {/* Header */}
          <ParallaxLayer depth={0.3}>
            <View style={s.cardHeader}>
              <ThemedText
                variant="h2"
                weight="700"
                style={{ color: '#FFFFFF', fontSize: 28, textAlign: 'center', fontFamily: 'Inter_700Bold', paddingTop: 8 }}
              >
                Chỉ số cơ thể
              </ThemedText>
              <ThemedText
                variant="body"
                style={{
                  color: C.onSurfaceVariant,
                  marginTop: 6,
                  textAlign: 'center',
                  lineHeight: 22,
                  maxWidth: 280,
                  fontFamily: 'Inter_500Medium',
                }}
              >
                Cung cấp chỉ số cơ thể chính xác để chúng tôi tính toán lộ trình tối ưu
              </ThemedText>
            </View>
          </ParallaxLayer>

          {/* Metric cards */}
          <ParallaxLayer depth={0.5}>
            <View style={s.formGroup}>

              {/* Height */}
              <View style={[s1.metricCard, { backgroundColor: C.inputBg, borderColor: C.glassBorder }]}>
                <View style={s1.metricHeader}>
                  <View>
                    <ThemedText style={[s.label, { marginLeft: 0 }]}>CHIỀU CAO</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                      <ThemedText weight="700" style={{ color: '#FFFFFF', fontSize: 36, fontFamily: 'Inter_700Bold', lineHeight: 42 }}>
                        {data.heightCm || '170'}
                      </ThemedText>
                      <ThemedText style={{ color: C.onSurfaceVariant, fontSize: 16, fontFamily: 'Inter_500Medium' }}>
                        cm
                      </ThemedText>
                    </View>
                  </View>
                  <View style={s1.metricIconBox}>
                    <MaterialCommunityIcons name="arrow-up-down" size={24} color={C.primary} />
                  </View>
                </View>
                <TextInput
                  testID={TEST_IDS.auth.onboardingHeightInput}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                  value={data.heightCm}
                  onChangeText={(text) => setData({ ...data, heightCm: text.replace(/[^0-9]/g, '') })}
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                />

                {/* Custom Horizontal Ruler Selector */}
                <View
                  style={{ marginTop: 20, height: 80, alignItems: 'center', justifyContent: 'center' }}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    setRulerContainerWidth(w);
                    // Initialize scroll position once we know the width
                    if (!rulerInitialized.current && rulerScrollRef.current && w > 0) {
                      const initVal = data.heightCm ? parseInt(data.heightCm, 10) : 170;
                      setTimeout(() => {
                        rulerScrollRef.current?.scrollTo({ x: (initVal - 100) * 12, animated: false });
                        rulerInitialized.current = true;
                      }, 100);
                    }
                  }}
                >
                  {/* Center Indicator — only covers the tick area */}
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    height: 44,
                    width: 3,
                    backgroundColor: C.primary,
                    borderRadius: 2,
                    zIndex: 10,
                    shadowColor: C.primary,
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                  }} />

                  {rulerContainerWidth > 0 && (
                    <ScrollView
                      ref={rulerScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={12}
                      decelerationRate="fast"
                      contentContainerStyle={{
                        paddingLeft: rulerContainerWidth / 2 - 6,
                        paddingRight: rulerContainerWidth / 2 - 6,
                        height: 80,
                        alignItems: 'flex-end',
                      }}
                      onMomentumScrollEnd={(e) => {
                        const offset = e.nativeEvent.contentOffset.x;
                        const val = Math.round(offset / 12) + 100;
                        const clamped = Math.max(100, Math.min(250, val));
                        setData((prev) => ({ ...prev, heightCm: String(clamped) }));
                      }}
                      onScrollEndDrag={(e) => {
                        const offset = e.nativeEvent.contentOffset.x;
                        const val = Math.round(offset / 12) + 100;
                        const clamped = Math.max(100, Math.min(250, val));
                        setData((prev) => ({ ...prev, heightCm: String(clamped) }));
                      }}
                      scrollEventThrottle={64}
                    >
                      {Array.from({ length: 151 }).map((_, i) => {
                        const val = 100 + i;
                        const isMajor = val % 10 === 0;
                        const isMedium = val % 5 === 0;

                        return (
                          <View key={i} style={{ width: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
                            {isMajor && (
                              <ThemedText style={{
                                fontSize: 11,
                                color: 'rgba(188, 200, 185, 0.6)',
                                marginBottom: 6,
                                fontFamily: 'Inter_600SemiBold',
                                width: 40,
                                textAlign: 'center'
                              }}>
                                {val}
                              </ThemedText>
                            )}
                            <View style={{
                              width: isMajor ? 2 : 1,
                              height: isMajor ? 32 : (isMedium ? 20 : 12),
                              backgroundColor: isMajor ? C.primary : 'rgba(188, 200, 185, 0.4)',
                              borderRadius: 1,
                            }} />
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* Weight */}
              <View style={[s1.metricCard, { backgroundColor: C.inputBg, borderColor: C.glassBorder }]}>
                <View style={s1.metricHeader}>
                  <View>
                    <ThemedText style={[s.label, { marginLeft: 0 }]}>CÂN NẶNG</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                      <ThemedText weight="700" style={{ color: '#FFFFFF', fontSize: 36, fontFamily: 'Inter_700Bold', lineHeight: 42 }}>
                        {data.weightKg || '65'}
                      </ThemedText>
                      <ThemedText style={{ color: C.onSurfaceVariant, fontSize: 16, fontFamily: 'Inter_500Medium' }}>
                        kg
                      </ThemedText>
                    </View>
                  </View>
                  <View style={s1.metricIconBox}>
                    <Ionicons name="scale-outline" size={24} color={C.primary} />
                  </View>
                </View>
                <TextInput
                  testID={TEST_IDS.auth.onboardingWeightInput}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                  value={data.weightKg}
                  onChangeText={(text) => setData({ ...data, weightKg: text.replace(/[^0-9.]/g, '') })}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                />

                {/* Custom Horizontal Ruler Selector for Weight */}
                <View
                  style={{ marginTop: 20, height: 80, alignItems: 'center', justifyContent: 'center' }}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    setWeightRulerWidth(w);
                    if (!weightRulerInitialized.current && weightRulerRef.current && w > 0) {
                      const initVal = data.weightKg ? parseFloat(data.weightKg) : 65;
                      setTimeout(() => {
                        weightRulerRef.current?.scrollTo({ x: (initVal - 30) * 100, animated: false });
                        weightRulerInitialized.current = true;
                      }, 100);
                    }
                  }}
                >
                  {/* Center Indicator */}
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    height: 44,
                    width: 3,
                    backgroundColor: C.primary,
                    borderRadius: 2,
                    zIndex: 10,
                    shadowColor: C.primary,
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                  }} />

                  {weightRulerWidth > 0 && (
                    <ScrollView
                      ref={weightRulerRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={10}
                      decelerationRate="fast"
                      contentContainerStyle={{
                        paddingLeft: weightRulerWidth / 2 - 5,
                        paddingRight: weightRulerWidth / 2 - 5,
                        height: 80,
                        alignItems: 'flex-end',
                      }}
                      onMomentumScrollEnd={(e) => {
                        const offset = e.nativeEvent.contentOffset.x;
                        const val = Math.round((offset / 100 + 30) * 10) / 10;
                        const clamped = Math.max(30, Math.min(200, val));
                        setData((prev) => ({ ...prev, weightKg: String(clamped) }));
                      }}
                      onScrollEndDrag={(e) => {
                        const offset = e.nativeEvent.contentOffset.x;
                        const val = Math.round((offset / 100 + 30) * 10) / 10;
                        const clamped = Math.max(30, Math.min(200, val));
                        setData((prev) => ({ ...prev, weightKg: String(clamped) }));
                      }}
                      scrollEventThrottle={64}
                    >
                      {Array.from({ length: 1701 }).map((_, i) => {
                        const val = 30 + i * 0.1;
                        const isMajor = i % 10 === 0;
                        const isMedium = i % 5 === 0;

                        return (
                          <View key={i} style={{ width: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
                            {isMajor && (
                              <ThemedText style={{
                                fontSize: 11,
                                color: 'rgba(188, 200, 185, 0.6)',
                                marginBottom: 6,
                                fontFamily: 'Inter_600SemiBold',
                                width: 40,
                                textAlign: 'center'
                              }}>
                                {Math.round(val)}
                              </ThemedText>
                            )}
                            <View style={{
                              width: isMajor ? 2 : 1,
                              height: isMajor ? 32 : (isMedium ? 20 : 12),
                              backgroundColor: isMajor ? C.primary : 'rgba(188, 200, 185, 0.4)',
                              borderRadius: 1,
                            }} />
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              </View>

            </View>
          </ParallaxLayer>
        </Animated.View>
      </Tilt3DCard>
    </Animated.View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderStep0Nebula();

      case 1: // Body Metrics — Emerald Nebula redesign
        return renderStep1Nebula();

      case 2: // Goal
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step2">
            <View style={oldStyles.optionGrid} accessibilityRole="radiogroup" accessibilityLabel="Chọn mục tiêu">
              {GOAL_OPTIONS.map((goal) => {
                const goalColor = theme.colors[goal.colorKey];
                return (
                  <Pressable
                    key={goal.value}
                    testID={`${TEST_IDS.auth.onboardingGoalPrefix}-${goal.value}`}
                    style={[
                      oldStyles.goalCard,
                      {
                        backgroundColor:
                          data.goal === goal.value
                            ? `${goalColor}20`
                            : isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.03)',
                        borderColor: data.goal === goal.value ? goalColor : 'transparent',
                      },
                    ]}
                    onPress={() => setData({ ...data, goal: goal.value as any })}
                    accessibilityRole="radio"
                    accessibilityLabel={`${goal.label}: ${goal.desc}`}
                    accessibilityState={{ checked: data.goal === goal.value }}
                  >
                    <ThemedText
                      style={{
                        fontSize: theme.typography.h1.fontSize,
                        lineHeight: theme.typography.h1.lineHeight,
                      }}
                    >
                      {goal.icon}
                    </ThemedText>
                    <ThemedText
                      weight="600"
                      style={{
                        marginTop: theme.spacing.sm,
                        color: data.goal === goal.value ? goalColor : theme.colors.text,
                      }}
                    >
                      {goal.label}
                    </ThemedText>
                    <ThemedText
                      variant="caption"
                      color="textSecondary"
                      style={{ textAlign: 'center', marginTop: theme.spacing.xs }}
                    >
                      {goal.desc}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        );

      case 3: // Activity Level
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step3" accessibilityRole="radiogroup" accessibilityLabel="Chọn mức độ vận động">
            {ACTIVITY_OPTIONS.map((act) => (
              <Pressable
                key={act.value}
                testID={`${TEST_IDS.auth.onboardingActivityPrefix}-${act.value}`}
                style={[
                  oldStyles.activityCard,
                  {
                    backgroundColor:
                      data.activityLevel === act.value
                        ? theme.colors.primaryLight
                        : isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.03)',
                    borderColor:
                      data.activityLevel === act.value
                        ? theme.colors.primary
                        : 'transparent',
                  },
                ]}
                onPress={() => setData({ ...data, activityLevel: act.value as any })}
                accessibilityRole="radio"
                accessibilityLabel={`${act.label}: ${act.desc}`}
                accessibilityState={{ checked: data.activityLevel === act.value }}
              >
                <ThemedText style={{ fontSize: 28, lineHeight: 32 }}>{act.icon}</ThemedText>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    weight={data.activityLevel === act.value ? '600' : '400'}
                    color={data.activityLevel === act.value ? 'primary' : undefined}
                  >
                    {act.label}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {act.desc}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        );

      case 4: // Result
        return (
          <Animated.View entering={FadeInRight} key="step4">
            {isCalculating ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <ThemedText style={{ marginTop: 16 }}>
                  {t('onboarding.calculating')}
                </ThemedText>
              </View>
            ) : aiResult ? (
              <View style={[glass.card, oldStyles.resultCard]} testID={TEST_IDS.auth.onboardingResultCard}>
                <ThemedText style={{ fontSize: 48 }}>🎉</ThemedText>
                <ThemedText variant="h2" style={{ marginTop: 12 }}>
                  {t('onboarding.daily_goal')}
                </ThemedText>
                {aiResult.offlineMode ? (
                  <View style={oldStyles.offlineBadge}>
                    <ThemedText variant="caption" weight="600">
                      Offline mode
                    </ThemedText>
                  </View>
                ) : null}

                <View style={oldStyles.resultRow}>
                  <View style={oldStyles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>🔥</ThemedText>
                    <ThemedText variant="h3" color="primary">
                      {aiResult.calories}
                    </ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      kcal
                    </ThemedText>
                  </View>
                  <View style={oldStyles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>💪</ThemedText>
                    <ThemedText variant="h3">{aiResult.protein}g</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      Protein
                    </ThemedText>
                  </View>
                  <View style={oldStyles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>🍞</ThemedText>
                    <ThemedText variant="h3">{aiResult.carbs}g</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      Carbs
                    </ThemedText>
                  </View>
                  <View style={oldStyles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>🥑</ThemedText>
                    <ThemedText variant="h3">{aiResult.fat}g</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      Fat
                    </ThemedText>
                  </View>
                </View>
                {aiResult.offlineMode ? (
                  <ThemedText variant="caption" color="textSecondary" style={oldStyles.offlineNote}>
                    {aiResult.explanation ?? 'Đang dùng công thức chuẩn để hoàn tất onboarding.'}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <View style={[glass.card, oldStyles.resultCard]} testID={TEST_IDS.auth.onboardingErrorCard}>
                <ThemedText style={{ fontSize: 40 }}>⚠️</ThemedText>
                <ThemedText variant="h3" style={{ marginTop: 12, textAlign: 'center' }}>
                  Chưa thể tạo mục tiêu dinh dưỡng
                </ThemedText>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={{ marginTop: 12, textAlign: 'center' }}
                >
                  {calculationError ?? 'Vui lòng thử lại sau khi kiểm tra backend và dịch vụ AI.'}
                </ThemedText>
                <View style={{ width: '100%', marginTop: 20 }}>
                  <Button
                    title="Thử lại"
                    variant="secondary"
                    onPress={() => {
                      setAiResult(null);
                      setCalculationError(null);
                      calculateNutrition();
                    }}
                    testID={TEST_IDS.auth.onboardingRetryButton}
                  />
                </View>
              </View>
            )}
          </Animated.View>
        );

      default:
        return null;
    }
  };

  /* ─── Render footer button (Emerald Nebula for step 0) ─── */
  const renderFooterButton = () => {
    if (currentStep === 0 || currentStep === 1) {
      return (
        <View style={s.nebulaFooter}>
          <Pressable
            testID={TEST_IDS.auth.onboardingNextButton}
            onPress={handleNext}
            disabled={!canProceed()}
            style={({ pressed }) => [
              s.nebulaCTA,
              { width: '100%' },
              pressed && { transform: [{ scale: 0.97 }] },
              !canProceed() && { opacity: 0.5 },
            ]}
          >
            <LinearGradient
              colors={['#6BFF8F', '#4BE277', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)', 'transparent']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemedText
                variant="body"
                weight="700"
                style={{ color: C.onPrimary, fontSize: 18 }}
              >
                Tiếp tục
              </ThemedText>
              <Ionicons name="arrow-forward" size={20} color={C.onPrimary} />
            </View>
          </Pressable>
        </View>
      );
    }

    // Steps 1-4: original footer
    return (
      <View style={oldStyles.footer}>
        {currentStep > 0 && currentStep < 4 && (
          <View style={oldStyles.footerBackButtonWrap}>
            <Button
              title="Quay lại"
              variant="outline"
              onPress={handleBack}
              testID={TEST_IDS.auth.onboardingBackButton}
            />
          </View>
        )}

        {currentStep < 4 ? (
          <View
            style={
              currentStep > 0 ? oldStyles.footerPrimaryButtonWrap : oldStyles.footerSingleButtonWrap
            }
          >
            <Button
              title={currentStep === 3 ? 'Hoàn tất' : 'Tiếp tục'}
              onPress={handleNext}
              disabled={!canProceed()}
              testID={TEST_IDS.auth.onboardingNextButton}
            />
          </View>
        ) : (
          <View style={oldStyles.footerSingleButtonWrap}>
            <Button
              title="Bắt đầu sử dụng"
              onPress={handleComplete}
              disabled={isCalculating || !aiResult}
              testID={TEST_IDS.auth.onboardingCompleteButton}
            />
          </View>
        )}
      </View>
    );
  };

  /* ─── Main render ─── */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        testID={TEST_IDS.auth.onboardingScreen}
      >
        {/* Background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: (currentStep === 0 || currentStep === 1) ? C.surface : undefined }]}>
          {(currentStep === 0 || currentStep === 1) ? (
            <>
              {/* Background glow blobs */}
              <View style={[s.blob, { top: -80, right: -100, backgroundColor: C.primary + '0D' }]} />
              <View style={[s.blob, { bottom: -60, left: -100, backgroundColor: C.primary + '0D' }]} />
            </>
          ) : null}
        </View>

        <LinearGradient
          colors={(currentStep === 0 || currentStep === 1) ? ['transparent', 'transparent'] : theme.colors.screenGradient}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={[s.header, { paddingTop: Math.max(insets.top + 12, 28) }]}>
            {/* Top bar: row with back button and step counter */}
            {(currentStep === 0 || currentStep === 1) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, width: '100%', position: 'relative' }}>
                {currentStep > 0 && (
                  <Pressable
                    onPress={handleBack}
                    style={{ position: 'absolute', left: 0, padding: 4 }}
                  >
                    <Ionicons name="arrow-back" size={28} color={C.onSurface} style={{ opacity: 0.8 }} />
                  </Pressable>
                )}
                <ThemedText
                  variant="body"
                  weight="700"
                  style={{ color: C.primary, fontSize: 16 }}
                >
                  {`Bước ${currentStep + 1} trên 5`}
                </ThemedText>
              </View>
            ) : null}
            {/* Progress bars */}
            <View style={s.progressContainer}>
              {STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    s.progressDot,
                    {
                      backgroundColor:
                        index <= currentStep
                          ? C.primary
                          : (currentStep === 0 || currentStep === 1)
                            ? C.surfaceContainerHighest
                            : isDark
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.1)',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Step title/subtitle for steps 2-4 only */}
            {currentStep > 1 && (
              <>
                <ThemedText style={s.stepIcon}>
                  {STEPS[currentStep]?.icon ?? '👋'}
                </ThemedText>
                <ThemedText variant="h2" style={s.stepTitle}>
                  {STEPS[currentStep]?.title ?? ''}
                </ThemedText>
                <ThemedText
                  variant="body"
                  color="textSecondary"
                  style={s.stepSubtitle}
                >
                  {STEPS[currentStep]?.subtitle ?? ''}
                </ThemedText>
              </>
            )}
          </View>

          {/* Content */}
          <View style={s.content}>
            <ScrollView
              style={s.scrollArea}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                s.scrollContent,
                (currentStep === 0 || currentStep === 1) && { paddingHorizontal: 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            >
              {renderStep()}
            </ScrollView>
          </View>

          {/* Footer */}
          {renderFooterButton()}
        </LinearGradient>
      </View>
    </GestureHandlerRootView>
  );
};

/* ─── New styles (Emerald Nebula for Step 0) ─── */
const s = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    height: 6,
  },
  progressDot: {
    height: 6,
    flex: 1,
    borderRadius: 3,
  },
  stepIcon: {
    fontSize: 44,
    lineHeight: 52,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: 10,
  },
  stepSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  /* Background blobs */
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },

  /* Card */
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
  },

  /* Card Header */
  cardHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.2)',
    // Emerald glow
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'visible',
  },

  /* Form */
  formGroup: {
    gap: 20,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    color: 'rgba(188, 200, 185, 0.8)',
    fontSize: 12,
    letterSpacing: 0.5,
    marginLeft: 2,
    fontFamily: 'Inter_700Bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    height: '100%',
  },

  /* Age */
  ageHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  sliderBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(47, 52, 69, 0.6)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageDirectInput: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    width: 60,
    height: 40,
  },

  /* Gender */
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },


  /* Nebula footer */
  nebulaFooter: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  nebulaCTA: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  nebulaBackBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/* ─── Legacy styles for steps 1-4 ─── */
const oldStyles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputCol: {
    flex: 1,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  goalCard: {
    width: (width - 72) / 3,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  activityCard: {
    width: '100%',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerBackButtonWrap: {
    width: 112,
  },
  footerPrimaryButtonWrap: {
    flex: 1,
  },
  footerSingleButtonWrap: {
    width: '100%',
  },
  resultCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  resultRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
    justifyContent: 'center',
  },
  resultItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  offlineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
    borderColor: 'rgba(251, 191, 36, 0.45)',
    marginTop: 12,
  },
  offlineNote: {
    textAlign: 'center',
    marginTop: 16,
  },
});

/* ─── Step 1 styles (Body Metrics Nebula) ─── */
const s1 = StyleSheet.create({
  glowRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'rgba(75, 226, 119, 0.4)',
    shadowColor: '#4BE277',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 10,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: '#1E2433',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(75, 226, 119, 0.3)',
    marginBottom: 16,
    zIndex: 2,
  },
  metricCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 0,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(75, 226, 119, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.2)',
  },
});

export default OnboardingScreen;
