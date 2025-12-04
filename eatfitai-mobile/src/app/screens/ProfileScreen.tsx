// ProfileScreen v4: Aligned with actual database fields
// Chu thich bang tieng Viet khong dau de tranh loi ma hoa

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '../../components/ThemedText';
import ThemedTextInput from '../../components/ThemedTextInput';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { glassStyles } from '../../components/ui/GlassCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService } from '../../services/profileService';
import { handleApiErrorWithCustomMessage, showSuccess } from '../../utils/errorHandler';
import type { RootStackParamList } from '../types';

// Schema matching actual database fields
const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự'),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

// Body metrics for history tracking
const BodyMetricsSchema = z.object({
  heightCm: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        (!Number.isNaN(Number(value)) && Number(value) >= 100 && Number(value) <= 250),
      { message: 'Chiều cao (cm) từ 100 - 250' }
    ),
  weightKg: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        (!Number.isNaN(Number(value)) && Number(value) >= 30 && Number(value) <= 300),
      { message: 'Cân nặng (kg) từ 30 - 300' }
    ),
  measuredDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Ngày đo định dạng YYYY-MM-DD',
    }),
  note: z.string().trim().optional(),
});

type BodyMetricsFormValues = z.infer<typeof BodyMetricsSchema>;

// AI calculation fields (not saved to DB, only for local calculation)
interface AiCalcData {
  gender: 'male' | 'female' | 'other';
  age: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam', icon: '👨' },
  { value: 'female', label: 'Nữ', icon: '👩' },
  { value: 'other', label: 'Khác', icon: '🧑' },
] as const;

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Ít vận động', multiplier: 1.2 },
  { value: 'light', label: 'Nhẹ nhàng', multiplier: 1.375 },
  { value: 'moderate', label: 'Vừa phải', multiplier: 1.55 },
  { value: 'active', label: 'Tích cực', multiplier: 1.725 },
  { value: 'very_active', label: 'Rất tích cực', multiplier: 1.9 },
] as const;

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Giảm cân', icon: '📉', color: '#EF4444' },
  { value: 'maintain', label: 'Duy trì', icon: '⚖️', color: '#3B82F6' },
  { value: 'gain', label: 'Tăng cân', icon: '📈', color: '#22C55E' },
] as const;

const ProfileScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const logout = useAuthStore((s) => s.logout);
  const { profile, fetchProfile, isLoading, updateProfile, isSaving } = useProfileStore((state) => ({
    profile: state.profile,
    fetchProfile: state.fetchProfile,
    isLoading: state.isLoading,
    updateProfile: state.updateProfile,
    isSaving: state.isSaving,
  }));

  // AI calculation state (local only)
  const [aiData, setAiData] = useState<AiCalcData>({
    gender: 'male',
    age: 25,
    activityLevel: 'moderate',
    goal: 'maintain',
  });
  const [showAiSection, setShowAiSection] = useState(false);
  const [isCalculatingAi, setIsCalculatingAi] = useState(false);

  // Profile form (synced with DB)
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      fullName: '',
      heightCm: '',
      weightKg: '',
    },
  });

  const currentHeight = watch('heightCm');
  const currentWeight = watch('weightKg');

  // Body metrics form for history
  const {
    control: metricsControl,
    handleSubmit: handleMetricsSubmit,
    reset: resetMetrics,
    formState: { errors: metricsErrors, isSubmitting: isSubmittingMetrics },
  } = useForm<BodyMetricsFormValues>({
    resolver: zodResolver(BodyMetricsSchema),
    defaultValues: {
      heightCm: '',
      weightKg: '',
      measuredDate: '',
      note: '',
    },
  });

  useEffect(() => {
    fetchProfile().catch((error: any) => {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Tải hồ sơ thất bại', text2: 'Vui lòng thử lại' },
      });
    });
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName ?? '',
        heightCm: profile.heightCm ? String(profile.heightCm) : '',
        weightKg: profile.weightKg ? String(profile.weightKg) : '',
      });
    }
  }, [profile, reset]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    try {
      await updateProfile({
        fullName: values.fullName.trim(),
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        weightKg: values.weightKg ? Number(values.weightKg) : null,
      });
      showSuccess('profile_updated');
    } catch (error: any) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Không thể lưu hồ sơ', text2: 'Vui lòng thử lại' },
      });
    }
  };

  const onSubmitBodyMetrics = async (values: BodyMetricsFormValues) => {
    try {
      await profileService.createBodyMetrics({
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        weightKg: values.weightKg ? Number(values.weightKg) : null,
        measuredDate: values.measuredDate ? `${values.measuredDate}T00:00:00Z` : null,
        note: values.note || null,
      });
      resetMetrics({ heightCm: '', weightKg: '', measuredDate: '', note: '' });
      showSuccess('settings_saved');
      fetchProfile();
    } catch (error: any) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: 'Không thể lưu số đo', text2: 'Vui lòng thử lại' },
      });
    }
  };

  const calculateBMR = (): number => {
    const weight = Number(currentWeight) || 65;
    const height = Number(currentHeight) || 170;
    const age = aiData.age || 25;

    if (aiData.gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    }
    return 10 * weight + 6.25 * height - 5 * age - 161;
  };

  const handleAiSuggestion = async () => {
    if (!currentHeight || !currentWeight) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập chiều cao và cân nặng trước khi tính toán.');
      return;
    }

    setIsCalculatingAi(true);
    try {
      // Try AI Provider first
      const response = await fetch('http://127.0.0.1:5050/nutrition-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: aiData.gender,
          age: aiData.age,
          height: Number(currentHeight),
          weight: Number(currentWeight),
          activity: aiData.activityLevel,
          goal: aiData.goal,
        }),
      });

      let result;
      if (response.ok) {
        result = await response.json();
      } else {
        // Fallback to local Mifflin-St Jeor
        const bmr = calculateBMR();
        const activity = ACTIVITY_OPTIONS.find((a) => a.value === aiData.activityLevel);
        const tdee = bmr * (activity?.multiplier || 1.55);
        let calories = tdee;
        if (aiData.goal === 'lose') calories -= 500;
        if (aiData.goal === 'gain') calories += 300;

        result = {
          calories: Math.round(calories),
          protein: Math.round(Number(currentWeight) * 1.6),
          carbs: Math.round((calories * 0.45) / 4),
          fat: Math.round((calories * 0.25) / 9),
        };
      }

      Alert.alert(
        '🤖 AI Đề xuất dinh dưỡng',
        `Mục tiêu hàng ngày:\n\n` +
        `🔥 Calories: ${result.calories} kcal\n` +
        `💪 Protein: ${result.protein}g\n` +
        `🍞 Carbs: ${result.carbs}g\n` +
        `🥑 Fat: ${result.fat}g`,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Áp dụng',
            onPress: () => navigation.navigate('NutritionSettings'),
          },
        ]
      );
    } catch (error) {
      // Fallback calculation
      const bmr = calculateBMR();
      const activity = ACTIVITY_OPTIONS.find((a) => a.value === aiData.activityLevel);
      const tdee = bmr * (activity?.multiplier || 1.55);
      let calories = tdee;
      if (aiData.goal === 'lose') calories -= 500;
      if (aiData.goal === 'gain') calories += 300;

      Alert.alert(
        '📊 Kết quả tính toán',
        `Mục tiêu hàng ngày:\n\n` +
        `🔥 Calories: ${Math.round(calories)} kcal\n` +
        `💪 Protein: ${Math.round(Number(currentWeight) * 1.6)}g\n` +
        `🍞 Carbs: ${Math.round((calories * 0.45) / 4)}g\n` +
        `🥑 Fat: ${Math.round((calories * 0.25) / 9)}g`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCalculatingAi(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.lg,
      paddingBottom: 100,
    },
    sectionTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    col: {
      flex: 1,
    },
    optionRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    optionButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    goalCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    aiButton: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    aiButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: theme.spacing.sm,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      gap: theme.spacing.sm,
    },
  });

  if (isLoading && !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Hồ sơ" subtitle="Thông tin cá nhân" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Personal Info Card - Synced with DB */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <View style={glass.card}>
            <View style={styles.sectionTitle}>
              <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
              <ThemedText variant="h3">Thông tin cá nhân</ThemedText>
            </View>

            {/* Avatar with initial */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: theme.colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ThemedText variant="h1" color="primary">
                  {profile?.fullName?.charAt(0)?.toUpperCase() || '?'}
                </ThemedText>
              </View>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 8 }}>
                {profile?.email}
              </ThemedText>
            </View>

            <Controller
              control={control}
              name="fullName"
              render={({ field: { value, onChange, onBlur } }) => (
                <ThemedTextInput
                  label="Họ và tên"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Nhập họ tên"
                  error={!!profileErrors.fullName}
                  helperText={profileErrors.fullName?.message}
                  required
                />
              )}
            />

            <View style={[styles.row, { marginTop: theme.spacing.md }]}>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="heightCm"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ThemedTextInput
                      label="Chiều cao (cm)"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="170"
                      keyboardType="numeric"
                    />
                  )}
                />
              </View>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="weightKg"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ThemedTextInput
                      label="Cân nặng (kg)"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="65"
                      keyboardType="numeric"
                    />
                  )}
                />
              </View>
            </View>

            {profile?.lastMeasuredDate && (
              <ThemedText variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                📅 Cập nhật lần cuối: {new Date(profile.lastMeasuredDate).toLocaleDateString('vi-VN')}
              </ThemedText>
            )}

            <View style={{ marginTop: theme.spacing.lg }}>
              <Button
                title={isSubmittingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
                onPress={handleSubmit(onSubmitProfile)}
                loading={isSubmittingProfile}
                disabled={isSubmittingProfile}
              />
            </View>
          </View>
        </Animated.View>

        {/* AI Nutrition Calculator */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <View style={glass.card}>
            <Pressable
              style={styles.sectionTitle}
              onPress={() => setShowAiSection(!showAiSection)}
            >
              <ThemedText style={{ fontSize: 20 }}>🤖</ThemedText>
              <ThemedText variant="h3" style={{ flex: 1 }}>AI Tính toán dinh dưỡng</ThemedText>
              <Icon name={showAiSection ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
            </Pressable>

            {!showAiSection && (
              <View style={styles.infoCard}>
                <Icon name="information-circle" size={20} color={theme.colors.primary} />
                <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
                  Nhấn để mở rộng và tính toán nhu cầu dinh dưỡng dựa trên thông tin cá nhân
                </ThemedText>
              </View>
            )}

            {showAiSection && (
              <>
                {/* Gender */}
                <View style={{ marginBottom: theme.spacing.md }}>
                  <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: 8 }}>
                    Giới tính
                  </ThemedText>
                  <View style={styles.optionRow}>
                    {GENDER_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor: aiData.gender === opt.value
                              ? theme.colors.primaryLight
                              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            borderColor: aiData.gender === opt.value
                              ? theme.colors.primary
                              : 'transparent',
                          },
                        ]}
                        onPress={() => setAiData({ ...aiData, gender: opt.value })}
                      >
                        <ThemedText>{opt.icon} {opt.label}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Age */}
                <ThemedTextInput
                  label="Tuổi"
                  value={String(aiData.age)}
                  onChangeText={(text) => setAiData({ ...aiData, age: Number(text.replace(/[^0-9]/g, '')) || 0 })}
                  placeholder="25"
                  keyboardType="numeric"
                />

                {/* Goal */}
                <View style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.md }}>
                  <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: 8 }}>
                    Mục tiêu
                  </ThemedText>
                  <View style={styles.row}>
                    {GOAL_OPTIONS.map((goal) => (
                      <Pressable
                        key={goal.value}
                        style={[
                          styles.goalCard,
                          {
                            backgroundColor: aiData.goal === goal.value
                              ? `${goal.color}15`
                              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                            borderColor: aiData.goal === goal.value ? goal.color : 'transparent',
                          },
                        ]}
                        onPress={() => setAiData({ ...aiData, goal: goal.value })}
                      >
                        <ThemedText style={{ fontSize: 20 }}>{goal.icon}</ThemedText>
                        <ThemedText
                          variant="bodySmall"
                          weight={aiData.goal === goal.value ? '600' : '400'}
                          style={{ color: aiData.goal === goal.value ? goal.color : theme.colors.text }}
                        >
                          {goal.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Activity Level */}
                <View style={{ marginBottom: theme.spacing.md }}>
                  <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: 8 }}>
                    Mức vận động
                  </ThemedText>
                  <View style={styles.optionRow}>
                    {ACTIVITY_OPTIONS.map((act) => (
                      <Pressable
                        key={act.value}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor: aiData.activityLevel === act.value
                              ? theme.colors.primaryLight
                              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            borderColor: aiData.activityLevel === act.value
                              ? theme.colors.primary
                              : 'transparent',
                          },
                        ]}
                        onPress={() => setAiData({ ...aiData, activityLevel: act.value })}
                      >
                        <ThemedText
                          variant="bodySmall"
                          weight={aiData.activityLevel === act.value ? '600' : '400'}
                          color={aiData.activityLevel === act.value ? 'primary' : undefined}
                        >
                          {act.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Calculate Button */}
                <Pressable style={styles.aiButton} onPress={handleAiSuggestion} disabled={isCalculatingAi}>
                  <LinearGradient
                    colors={['#8B5CF6', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.aiButtonInner}
                  >
                    {isCalculatingAi ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Icon name="sparkles" size={20} color="#fff" />
                        <ThemedText weight="600" style={{ color: '#fff' }}>
                          Tính toán nhu cầu dinh dưỡng
                        </ThemedText>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>

        {/* Body Metrics History */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <View style={glass.card}>
            <View style={styles.sectionTitle}>
              <ThemedText style={{ fontSize: 20 }}>📏</ThemedText>
              <ThemedText variant="h3">Ghi lịch sử số đo</ThemedText>
            </View>

            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.md }}>
              Thêm bản ghi số đo mới vào lịch sử theo dõi
            </ThemedText>

            <View style={styles.row}>
              <View style={styles.col}>
                <Controller
                  control={metricsControl}
                  name="heightCm"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ThemedTextInput
                      label="Cao (cm)"
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="170"
                      keyboardType="numeric"
                      error={!!metricsErrors.heightCm}
                      helperText={metricsErrors.heightCm?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.col}>
                <Controller
                  control={metricsControl}
                  name="weightKg"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ThemedTextInput
                      label="Nặng (kg)"
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="65"
                      keyboardType="numeric"
                      error={!!metricsErrors.weightKg}
                      helperText={metricsErrors.weightKg?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={metricsControl}
              name="measuredDate"
              render={({ field: { value, onChange, onBlur } }) => (
                <ThemedTextInput
                  label="Ngày đo (YYYY-MM-DD)"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={new Date().toISOString().split('T')[0]}
                  error={!!metricsErrors.measuredDate}
                  helperText={metricsErrors.measuredDate?.message}
                />
              )}
            />

            <Controller
              control={metricsControl}
              name="note"
              render={({ field: { value, onChange, onBlur } }) => (
                <ThemedTextInput
                  label="Ghi chú (tùy chọn)"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="VD: Sau tập gym"
                  multiline
                  numberOfLines={2}
                />
              )}
            />

            <View style={{ marginTop: theme.spacing.md }}>
              <Button
                title={isSubmittingMetrics ? 'Đang lưu...' : 'Lưu vào lịch sử'}
                onPress={handleMetricsSubmit(onSubmitBodyMetrics)}
                loading={isSubmittingMetrics}
                disabled={isSubmittingMetrics}
                variant="outline"
              />
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <View style={{ gap: theme.spacing.md }}>
            <Button
              title="Cài đặt mục tiêu dinh dưỡng"
              variant="outline"
              onPress={() => navigation.navigate('NutritionSettings')}
            />

            <Button
              title="Xem phân tích dinh dưỡng"
              variant="outline"
              onPress={() => navigation.navigate('NutritionInsights')}
            />

            <Button
              title="Đăng xuất"
              variant="ghost"
              onPress={handleLogout}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
