/**
 * OnboardingScreen - First-time user setup wizard
 * 5 steps: Basic Info → Body Metrics → Goal → Activity → AI Calculate
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useProfileStore } from '../../../store/useProfileStore';
import { AUTH_NEEDS_ONBOARDING_KEY, useAuthStore } from '../../../store/useAuthStore';
import apiClient from '../../../services/apiClient';
import { profileService } from '../../../services/profileService';
import { showSuccess } from '../../../utils/errorHandler';
import { t } from '../../../i18n/vi';
import { TEST_IDS } from '../../../testing/testIds';
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

      const response = await apiClient.post<NutritionCalculationResult>('/api/ai/nutrition/recalculate', {
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

      // Auth state change will cause AppNavigator to swap from onboarding to AppTabs.
      useAuthStore.setState({ isAuthenticated: true, needsOnboarding: false });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: Math.max(insets.top + 12, 28),
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    progressContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    progressDot: {
      height: 6,
      flex: 1,
      borderRadius: 3,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 24,
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
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    optionButton: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 20,
      borderWidth: 2,
      minWidth: 120,
      alignItems: 'center',
      gap: 8,
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
    inputRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    inputCol: {
      flex: 1,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: isKeyboardVisible ? 12 : 16,
      paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom + 12, 24),
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
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(245, 158, 11, 0.12)',
      borderColor: isDark ? 'rgba(251, 191, 36, 0.45)' : 'rgba(245, 158, 11, 0.35)',
      marginTop: 12,
    },
    offlineNote: {
      textAlign: 'center',
      marginTop: 16,
    },
  });

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step0">
            <ThemedTextInput
              label={t('onboarding.your_name')}
              value={data.fullName}
              onChangeText={(text) => setData({ ...data, fullName: text })}
              placeholder={t('onboarding.enter_name')}
              style={{ marginBottom: 20 }}
              testID={TEST_IDS.auth.onboardingNameInput}
            />

            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: 12 }}
            >
              {t('onboarding.gender')}
            </ThemedText>
            <View style={styles.optionGrid} accessibilityRole="radiogroup" accessibilityLabel="Chọn giới tính">
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  testID={
                    opt.value === 'male'
                      ? TEST_IDS.auth.onboardingGenderMaleButton
                      : TEST_IDS.auth.onboardingGenderFemaleButton
                  }
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor:
                        data.gender === opt.value
                          ? theme.colors.primaryLight
                          : isDark
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(0,0,0,0.03)',
                      borderColor:
                        data.gender === opt.value ? theme.colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setData({ ...data, gender: opt.value as any })}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: data.gender === opt.value }}
                >
                  <ThemedText
                    style={{
                      fontSize: theme.typography.h2.fontSize,
                      lineHeight: theme.typography.h2.lineHeight,
                    }}
                  >
                    {opt.icon}
                  </ThemedText>
                  <ThemedText weight="500">{opt.label}</ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedTextInput
              label={t('onboarding.age')}
              value={data.age}
              onChangeText={(text) =>
                setData({ ...data, age: text.replace(/[^0-9]/g, '') })
              }
              placeholder="Nhập tuổi"
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              style={{ marginTop: 20 }}
              testID={TEST_IDS.auth.onboardingAgeInput}
            />
          </Animated.View>
        );

      case 1: // Body Metrics
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step1">
            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <ThemedTextInput
                  label={t('onboarding.height_cm')}
                  value={data.heightCm}
                  onChangeText={(text) =>
                    setData({ ...data, heightCm: text.replace(/[^0-9]/g, '') })
                  }
                  placeholder="Nhập chiều cao"
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                  testID={TEST_IDS.auth.onboardingHeightInput}
                />
              </View>
              <View style={styles.inputCol}>
                <ThemedTextInput
                  label={t('onboarding.weight_kg')}
                  value={data.weightKg}
                  onChangeText={(text) =>
                    setData({ ...data, weightKg: text.replace(/[^0-9.]/g, '') })
                  }
                  placeholder="Nhập cân nặng"
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  testID={TEST_IDS.auth.onboardingWeightInput}
                />
              </View>
            </View>

            <View style={[glass.card, { marginTop: 20 }]}>
              <ThemedText
                variant="bodySmall"
                color="textSecondary"
                style={{ textAlign: 'center' }}
              >
                {t('onboarding.ai_calculation_tip')}
              </ThemedText>
            </View>
          </Animated.View>
        );

      case 2: // Goal
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step2">
            <View style={styles.optionGrid} accessibilityRole="radiogroup" accessibilityLabel="Chọn mục tiêu">
              {GOAL_OPTIONS.map((goal) => {
                const goalColor = theme.colors[goal.colorKey];
                return (
                  <Pressable
                    key={goal.value}
                    testID={`${TEST_IDS.auth.onboardingGoalPrefix}-${goal.value}`}
                    style={[
                      styles.goalCard,
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
                  styles.activityCard,
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
              <View style={[glass.card, styles.resultCard]} testID={TEST_IDS.auth.onboardingResultCard}>
                <ThemedText style={{ fontSize: 48 }}>🎉</ThemedText>
                <ThemedText variant="h2" style={{ marginTop: 12 }}>
                  {t('onboarding.daily_goal')}
                </ThemedText>
                {aiResult.offlineMode ? (
                  <View style={styles.offlineBadge}>
                    <ThemedText variant="caption" weight="600">
                      Offline mode
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.resultRow}>
                  <View style={styles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>🔥</ThemedText>
                    <ThemedText variant="h3" color="primary">
                      {aiResult.calories}
                    </ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      kcal
                    </ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>💪</ThemedText>
                    <ThemedText variant="h3">{aiResult.protein}g</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      Protein
                    </ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>🍞</ThemedText>
                    <ThemedText variant="h3">{aiResult.carbs}g</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      Carbs
                    </ThemedText>
                  </View>
                  <View style={styles.resultItem}>
                    <ThemedText style={{ fontSize: 24 }}>🥑</ThemedText>
                    <ThemedText variant="h3">{aiResult.fat}g</ThemedText>
                    <ThemedText variant="caption" color="textSecondary">
                      Fat
                    </ThemedText>
                  </View>
                </View>
                {aiResult.offlineMode ? (
                  <ThemedText variant="caption" color="textSecondary" style={styles.offlineNote}>
                    {aiResult.explanation ?? 'Đang dùng công thức chuẩn để hoàn tất onboarding.'}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <View style={[glass.card, styles.resultCard]} testID={TEST_IDS.auth.onboardingErrorCard}>
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'position' : undefined}
      keyboardVerticalOffset={0}
      testID={TEST_IDS.auth.onboardingScreen}
    >
      <LinearGradient
        colors={theme.colors.screenGradient}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      index <= currentStep
                        ? theme.colors.primary
                        : isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.1)',
                  },
                ]}
              />
            ))}
          </View>

          <ThemedText style={styles.stepIcon}>
            {STEPS[currentStep]?.icon ?? '👋'}
          </ThemedText>
          <ThemedText variant="h2" style={styles.stepTitle}>
            {STEPS[currentStep]?.title ?? ''}
          </ThemedText>
          <ThemedText
            variant="body"
            color="textSecondary"
            style={styles.stepSubtitle}
          >
            {STEPS[currentStep]?.subtitle ?? ''}
          </ThemedText>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {renderStep()}
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {currentStep > 0 && currentStep < 4 && (
            <View style={styles.footerBackButtonWrap}>
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
                currentStep > 0 ? styles.footerPrimaryButtonWrap : styles.footerSingleButtonWrap
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
            <View style={styles.footerSingleButtonWrap}>
              <Button
                title="Bắt đầu sử dụng"
                onPress={handleComplete}
                disabled={isCalculating || !aiResult}
                testID={TEST_IDS.auth.onboardingCompleteButton}
              />
            </View>
          )}
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default OnboardingScreen;

