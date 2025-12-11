/**
 * OnboardingScreen - First-time user setup wizard
 * 5 steps: Basic Info → Body Metrics → Goal → Activity → AI Calculate
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useProfileStore } from '../../../store/useProfileStore';
import { useAuthStore } from '../../../store/useAuthStore';
import apiClient, { aiApiClient } from '../../../services/apiClient';
import { showSuccess } from '../../../utils/errorHandler';
import { t } from '../../../i18n/vi';
import type { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OnboardingData {
  fullName: string;
  gender: 'male' | 'female' | null; // Đã bỏ 'other'
  age: string;
  heightCm: string;
  weightKg: string;
  goal: 'lose' | 'maintain' | 'gain' | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
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
  },
  {
    value: 'light',
    label: t('onboarding.activity_light'),
    desc: t('onboarding.activity_light_desc'),
    multiplier: 1.375,
  },
  {
    value: 'moderate',
    label: t('onboarding.activity_moderate'),
    desc: t('onboarding.activity_moderate_desc'),
    multiplier: 1.55,
  },
  {
    value: 'active',
    label: t('onboarding.activity_active'),
    desc: t('onboarding.activity_active_desc'),
    multiplier: 1.725,
  },
  {
    value: 'very_active',
    label: t('onboarding.activity_very_active'),
    desc: t('onboarding.activity_very_active_desc'),
    multiplier: 1.9,
  },
];

const OnboardingScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const [currentStep, setCurrentStep] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fullName: '',
    gender: null,
    age: '',
    heightCm: '',
    weightKg: '',
    goal: null,
    activityLevel: 'moderate',
  });

  const [aiResult, setAiResult] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

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
    try {
      // Gọi qua backend API thay vì AI provider trực tiếp
      // Backend sẽ proxy đến AI Provider (Ollama)
      const response = await aiApiClient.post('/api/ai/nutrition/recalculate', {
        sex: data.gender,
        age: Number(data.age),
        heightCm: Number(data.heightCm),
        weightKg: Number(data.weightKg),
        goal: data.goal,
      });

      if (response.data) {
        setAiResult(response.data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'AI Provider không khả dụng',
          text2: 'Hãy đảm bảo Ollama đang chạy và thử lại.',
        });
      }
    } catch (error) {
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

  const calculateBMR = (): number => {
    const weight = Number(data.weightKg);
    const height = Number(data.heightCm);
    const age = Number(data.age);

    if (data.gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    }
    return 10 * weight + 6.25 * height - 5 * age - 161;
  };

  const getActivityMultiplier = (): number => {
    const activity = ACTIVITY_OPTIONS.find((a) => a.value === data.activityLevel);
    return activity?.multiplier || 1.55;
  };

  const adjustForGoal = (tdee: number): number => {
    switch (data.goal) {
      case 'lose':
        return tdee - 500;
      case 'gain':
        return tdee + 300;
      default:
        return tdee;
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
      await AsyncStorage.setItem('onboarding_complete', 'true');

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

      showSuccess('settings_saved', { text1: '🎉 Thiết lập hoàn tất!' });

      // Đặt isAuthenticated = true để trigger navigation tự động
      useAuthStore.setState({ isAuthenticated: true });

      // Bug #8 fix: Reset navigation stack và chuyển về màn hình chính
      // Đảm bảo user không bị kẹt ở onboarding screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs' }],
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    progressContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    progressDot: {
      height: 4,
      flex: 1,
      borderRadius: 2,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    stepIcon: {
      fontSize: 48,
      textAlign: 'center',
      marginBottom: 16,
    },
    stepTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    stepSubtitle: {
      textAlign: 'center',
      marginBottom: 32,
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    optionButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 2,
      minWidth: 100,
      alignItems: 'center',
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
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 2,
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
      padding: 24,
      paddingBottom: 40,
      flexDirection: 'row',
      gap: 12,
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
            />

            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: 12 }}
            >
              {t('onboarding.gender')}
            </ThemedText>
            <View
              style={styles.optionGrid}
              accessibilityRole="radiogroup"
              accessibilityLabel="Chọn giới tính"
            >
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
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
                  <ThemedText style={{ fontSize: theme.typography.h2.fontSize }}>
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
              placeholder="25"
              keyboardType="numeric"
              style={{ marginTop: 20 }}
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
                  placeholder="170"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputCol}>
                <ThemedTextInput
                  label={t('onboarding.weight_kg')}
                  value={data.weightKg}
                  onChangeText={(text) =>
                    setData({ ...data, weightKg: text.replace(/[^0-9.]/g, '') })
                  }
                  placeholder="65"
                  keyboardType="numeric"
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
            <View
              style={styles.optionGrid}
              accessibilityRole="radiogroup"
              accessibilityLabel="Chọn mục tiêu"
            >
              {GOAL_OPTIONS.map((goal) => {
                const goalColor = theme.colors[goal.colorKey];
                return (
                  <Pressable
                    key={goal.value}
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
                    <ThemedText style={{ fontSize: theme.typography.h1.fontSize }}>
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
          <Animated.View
            entering={FadeInRight}
            exiting={FadeOutLeft}
            key="step3"
            accessibilityRole="radiogroup"
            accessibilityLabel="Chọn mức độ vận động"
          >
            {ACTIVITY_OPTIONS.map((act) => (
              <Pressable
                key={act.value}
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
                <ThemedText
                  weight={data.activityLevel === act.value ? '600' : '400'}
                  color={data.activityLevel === act.value ? 'primary' : undefined}
                >
                  {act.label}
                </ThemedText>
                <ThemedText variant="caption" color="textSecondary">
                  {act.desc}
                </ThemedText>
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
              <View style={[glass.card, styles.resultCard]}>
                <ThemedText style={{ fontSize: 48 }}>🎉</ThemedText>
                <ThemedText variant="h2" style={{ marginTop: 12 }}>
                  {t('onboarding.daily_goal')}
                </ThemedText>

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
              </View>
            ) : null}
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={theme.colors.screenGradient} style={styles.container}>
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
        <ThemedText variant="body" color="textSecondary" style={styles.stepSubtitle}>
          {STEPS[currentStep]?.subtitle ?? ''}
        </ThemedText>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 0 && currentStep < 4 && (
          <Button
            title="Quay lại"
            variant="outline"
            onPress={handleBack}
            style={{ flex: 1 }}
          />
        )}

        {currentStep < 4 ? (
          <Button
            title={currentStep === 3 ? 'Hoàn tất' : 'Tiếp tục'}
            onPress={handleNext}
            disabled={!canProceed()}
            style={{
              flex: currentStep > 0 ? 1 : undefined,
              width: currentStep === 0 ? '100%' : undefined,
            }}
          />
        ) : (
          <Button
            title="Bắt đầu sử dụng"
            onPress={handleComplete}
            disabled={isCalculating}
            style={{ width: '100%' }}
          />
        )}
      </View>
    </LinearGradient>
  );
};

export default OnboardingScreen;
