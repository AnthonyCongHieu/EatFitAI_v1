// ProfileScreen v3: Glassmorphism + Better fields + AI Suggestions
// Chu thich bang tieng Viet khong dau de tranh loi ma hoa

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import Screen from '../../components/Screen';
import Icon from '../../components/Icon';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { glassStyles } from '../../components/ui/GlassCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { handleApiErrorWithCustomMessage, showSuccess } from '../../utils/errorHandler';
import type { RootStackParamList } from '../types';

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  age: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  goal: z.enum(['lose', 'maintain', 'gain']).optional(),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam', icon: '👨' },
  { value: 'female', label: 'Nữ', icon: '👩' },
  { value: 'other', label: 'Khác', icon: '🧑' },
];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Ít vận động', desc: 'Ngồi văn phòng' },
  { value: 'light', label: 'Nhẹ', desc: '1-2 lần/tuần' },
  { value: 'moderate', label: 'Vừa', desc: '3-5 lần/tuần' },
  { value: 'active', label: 'Tích cực', desc: '6-7 lần/tuần' },
  { value: 'very_active', label: 'Rất tích cực', desc: 'Vận động viên' },
];

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Giảm cân', icon: '📉', color: '#EF4444' },
  { value: 'maintain', label: 'Duy trì', icon: '⚖️', color: '#3B82F6' },
  { value: 'gain', label: 'Tăng cân', icon: '📈', color: '#22C55E' },
];

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

  const [isRequestingAI, setIsRequestingAI] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      fullName: '',
      gender: undefined,
      age: '',
      heightCm: '',
      weightKg: '',
      activityLevel: 'moderate',
      goal: 'maintain',
    },
  });

  const watchedValues = watch();

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
        gender: undefined,
        age: '',
        activityLevel: 'moderate',
        goal: 'maintain',
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

  const handleAISuggestion = async () => {
    if (!watchedValues.gender || !watchedValues.age || !watchedValues.heightCm || !watchedValues.weightKg) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ giới tính, tuổi, chiều cao và cân nặng để AI đề xuất.');
      return;
    }

    setIsRequestingAI(true);
    try {
      // Call AI Provider for nutrition suggestion
      const response = await fetch('http://127.0.0.1:5050/nutrition-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: watchedValues.gender,
          age: Number(watchedValues.age),
          height: Number(watchedValues.heightCm),
          weight: Number(watchedValues.weightKg),
          activity: watchedValues.activityLevel || 'moderate',
          goal: watchedValues.goal || 'maintain',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          '🤖 AI Đề xuất',
          `Mục tiêu hàng ngày:\n\n` +
          `🔥 Calories: ${result.calories} kcal\n` +
          `💪 Protein: ${result.protein}g\n` +
          `🍞 Carbs: ${result.carbs}g\n` +
          `🥑 Fat: ${result.fat}g\n\n` +
          `${result.explanation || ''}`,
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Áp dụng',
              onPress: () => navigation.navigate('NutritionSettings'),
            },
          ]
        );
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối AI. Hãy kiểm tra AI Provider đang chạy.');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến AI Provider. Kiểm tra server đang chạy tại port 5050.');
    } finally {
      setIsRequestingAI(false);
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
    },
    section: {
      gap: theme.spacing.md,
    },
    sectionTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
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
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    goalCard: {
      flex: 1,
      padding: 12,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 2,
    },
    activityCard: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    aiButton: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    aiButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScreenHeader title="Hồ sơ" subtitle="Thông tin cá nhân & Mục tiêu" />

      <Screen contentContainerStyle={styles.scrollContent}>
        {/* Personal Info Card */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <View style={glass.card}>
            <View style={styles.sectionTitle}>
              <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
              <ThemedText variant="h3">Thông tin cá nhân</ThemedText>
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
                  error={!!errors.fullName}
                  helperText={errors.fullName?.message}
                  required
                />
              )}
            />

            {/* Gender Selection */}
            <View style={{ marginTop: theme.spacing.md }}>
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
                        backgroundColor: watchedValues.gender === opt.value
                          ? theme.colors.primaryLight
                          : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderColor: watchedValues.gender === opt.value
                          ? theme.colors.primary
                          : 'transparent',
                      },
                    ]}
                    onPress={() => setValue('gender', opt.value as any)}
                  >
                    <ThemedText>
                      {opt.icon} {opt.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Age, Height, Weight */}
            <View style={[styles.row, { marginTop: theme.spacing.md }]}>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="age"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ThemedTextInput
                      label="Tuổi"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="25"
                      keyboardType="numeric"
                    />
                  )}
                />
              </View>
              <View style={styles.col}>
                <Controller
                  control={control}
                  name="heightCm"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ThemedTextInput
                      label="Cao (cm)"
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
                      label="Nặng (kg)"
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
          </View>
        </Animated.View>

        {/* Goal Selection Card */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <View style={glass.card}>
            <View style={styles.sectionTitle}>
              <ThemedText style={{ fontSize: 20 }}>🎯</ThemedText>
              <ThemedText variant="h3">Mục tiêu</ThemedText>
            </View>

            <View style={styles.row}>
              {GOAL_OPTIONS.map((goal) => (
                <Pressable
                  key={goal.value}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: watchedValues.goal === goal.value
                        ? `${goal.color}20`
                        : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      borderColor: watchedValues.goal === goal.value ? goal.color : 'transparent',
                    },
                  ]}
                  onPress={() => setValue('goal', goal.value as any)}
                >
                  <ThemedText style={{ fontSize: 24 }}>{goal.icon}</ThemedText>
                  <ThemedText
                    weight="600"
                    style={{
                      marginTop: 4,
                      color: watchedValues.goal === goal.value ? goal.color : theme.colors.text,
                    }}
                  >
                    {goal.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Activity Level Card */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <View style={glass.card}>
            <View style={styles.sectionTitle}>
              <ThemedText style={{ fontSize: 20 }}>🏃</ThemedText>
              <ThemedText variant="h3">Mức vận động</ThemedText>
            </View>

            <View style={[styles.optionRow, { gap: theme.spacing.sm }]}>
              {ACTIVITY_OPTIONS.map((act) => (
                <Pressable
                  key={act.value}
                  style={[
                    styles.activityCard,
                    {
                      backgroundColor: watchedValues.activityLevel === act.value
                        ? theme.colors.primaryLight
                        : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderColor: watchedValues.activityLevel === act.value
                        ? theme.colors.primary
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setValue('activityLevel', act.value as any)}
                >
                  <ThemedText
                    weight={watchedValues.activityLevel === act.value ? '600' : '400'}
                    color={watchedValues.activityLevel === act.value ? 'primary' : undefined}
                  >
                    {act.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* AI Suggestion Button */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Pressable
            style={styles.aiButton}
            onPress={handleAISuggestion}
            disabled={isRequestingAI}
          >
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.aiButtonInner}
            >
              {isRequestingAI ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="sparkles" size={24} color="#fff" />
                  <ThemedText weight="600" style={{ color: '#fff', fontSize: 16 }}>
                    AI Đề xuất dinh dưỡng
                  </ThemedText>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Save & Logout Buttons */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <View style={{ gap: theme.spacing.md }}>
            <Button
              title={isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
              onPress={handleSubmit(onSubmitProfile)}
              loading={isSubmitting}
              disabled={isSubmitting}
            />

            <Button
              title="Cài đặt mục tiêu dinh dưỡng"
              variant="outline"
              onPress={() => navigation.navigate('NutritionSettings')}
            />

            <Button
              title="Đăng xuất"
              variant="ghost"
              onPress={handleLogout}
            />
          </View>
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;
