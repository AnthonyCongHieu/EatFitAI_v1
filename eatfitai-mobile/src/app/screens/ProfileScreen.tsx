// ProfileScreen v4: Aligned with actual database fields
// Chu thich bang tieng Viet khong dau de tranh loi ma hoa

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { AvatarPicker } from '../../components/ui/AvatarPicker';
import { glassStyles } from '../../components/ui/GlassCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService } from '../../services/profileService';
import { handleApiErrorWithCustomMessage, showSuccess } from '../../utils/errorHandler';
import type { RootStackParamList } from '../types';
import { t } from '../../i18n/vi';

// Schema matching actual database fields
// Schema matching actual database fields
const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự'),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(), // Đã bỏ 'other'
  age: z.string().optional(), // Using string for input handling, convert to number/date later
  activityLevel: z
    .enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
    .optional(),
  goal: z.enum(['lose', 'maintain', 'gain']).optional(),
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
      { message: 'Chiều cao (cm) từ 100 - 250' },
    ),
  weightKg: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value ||
        (!Number.isNaN(Number(value)) && Number(value) >= 30 && Number(value) <= 300),
      { message: 'Cân nặng (kg) từ 30 - 300' },
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
  gender: 'male' | 'female'; // Đã bỏ 'other'
  age: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
}

const GENDER_OPTIONS = [
  { value: 'male', label: t('common.male'), icon: '👨' },
  { value: 'female', label: t('common.female'), icon: '👩' },
  // Đã bỏ giới tính "Khác" theo yêu cầu
] as const;

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: t('common.sedentary'), multiplier: 1.2 },
  { value: 'light', label: t('common.light'), multiplier: 1.375 },
  { value: 'moderate', label: t('common.moderate'), multiplier: 1.55 },
  { value: 'active', label: t('common.active'), multiplier: 1.725 },
  { value: 'very_active', label: t('common.very_active'), multiplier: 1.9 },
] as const;

const GOAL_OPTIONS = [
  { value: 'lose', label: t('common.lose_weight'), icon: '📉', colorKey: 'danger' },
  { value: 'maintain', label: t('common.maintain_weight'), icon: '⚖️', colorKey: 'info' },
  { value: 'gain', label: t('common.gain_weight'), icon: '📈', colorKey: 'success' },
] as const;

const ProfileScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const logout = useAuthStore((s) => s.logout);
  const { profile, fetchProfile, isLoading, updateProfile, isSaving } = useProfileStore(
    (state) => ({
      profile: state.profile,
      fetchProfile: state.fetchProfile,
      isLoading: state.isLoading,
      updateProfile: state.updateProfile,
      isSaving: state.isSaving,
    }),
  );

  // Removed local aiData state as we now use the main form

  // Profile form (synced with DB)
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
    setValue,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      fullName: '',
      heightCm: '',
      weightKg: '',
      gender: 'male',
      age: '',
      activityLevel: 'moderate',
      goal: 'maintain',
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
        unknown: { text1: t('common.profile_title'), text2: t('common.missing_info') },
      });
    });
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      const activityLevelMap: Record<
        number,
        'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
      > = {
        1: 'sedentary',
        2: 'light',
        3: 'moderate',
        4: 'active',
        5: 'very_active',
      };

      reset({
        fullName: profile.fullName ?? '',
        heightCm: profile.heightCm ? String(profile.heightCm) : '',
        weightKg: profile.weightKg ? String(profile.weightKg) : '',
        gender: (profile.gender as any) || 'male',
        age: profile.age ? String(profile.age) : '25',
        activityLevel: activityLevelMap[profile.activityLevelId || 3] || 'moderate',
        goal: (profile.goal as any) || 'maintain',
      });
    }
  }, [profile, reset]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    try {
      // Map activity level sang ID
      const activityLevelMap: Record<string, number> = {
        sedentary: 1,
        light: 2,
        moderate: 3,
        active: 4,
        very_active: 5,
      };

      // Tính dateOfBirth từ age
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - (Number(values.age) || 25);
      const dateOfBirth = `${birthYear}-01-01`;

      await updateProfile({
        fullName: values.fullName.trim(),
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        weightKg: values.weightKg ? Number(values.weightKg) : null,
        gender: values.gender,
        dateOfBirth: dateOfBirth,
        activityLevelId: activityLevelMap[values.activityLevel || 'moderate'] || 3,
        goal: values.goal,
      });
      showSuccess('profile_updated');
    } catch (error: any) {
      handleApiErrorWithCustomMessage(error, {
        unknown: { text1: t('common.save_info'), text2: t('common.missing_info') },
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
        unknown: { text1: t('common.save_history'), text2: t('common.missing_info') },
      });
    }
  };

  const calculateBMR = (): number => {
    const weight = Number(currentWeight) || 65;
    const height = Number(currentHeight) || 170;
    const age = Number(watch('age')) || 25;
    const gender = watch('gender') || 'male';

    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    }
    return 10 * weight + 6.25 * height - 5 * age - 161;
  };

  // Removed handleAiSuggestion as it's no longer needed in ProfileScreen

  const handleLogout = () => {
    Alert.alert(t('common.logout'), t('common.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout'), style: 'destructive', onPress: () => logout() },
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
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title={t('common.profile_title')}
        subtitle={t('common.profile_subtitle')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Personal Info Card - Synced with DB */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <View style={glass.card}>
            <View style={styles.sectionTitle}>
              <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
              <ThemedText variant="h3">{t('common.personal_info')}</ThemedText>
            </View>

            {/* Avatar with image picker */}
            <AvatarPicker
              avatarUrl={profile?.avatarUrl}
              name={profile?.fullName}
              email={profile?.email}
              onUploadComplete={async (url: string) => {
                try {
                  console.log('[ProfileScreen] Avatar selected:', url);
                  await updateProfile({ avatarUrl: url });
                  console.log('[ProfileScreen] Avatar updated successfully');
                  showSuccess('profile_updated');
                } catch (error: any) {
                  console.error('[ProfileScreen] Avatar update failed:', error);
                  handleApiErrorWithCustomMessage(error, {
                    unknown: {
                      text1: 'Upload avatar',
                      text2: 'Không thể cập nhật avatar',
                    },
                  });
                }
              }}
            />

            <Controller
              control={control}
              name="fullName"
              render={({ field: { value, onChange, onBlur } }) => (
                <ThemedTextInput
                  label={t('common.full_name')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('common.enter_name')}
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
                      label={t('common.height')}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="170"
                      keyboardType="numeric"
                      returnKeyType="done"
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
                      label={t('common.weight')}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="65"
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  )}
                />
              </View>
            </View>

            {/* Gender Selection */}
            <View style={{ marginTop: theme.spacing.md }}>
              <ThemedText
                variant="bodySmall"
                color="textSecondary"
                style={{ marginBottom: 8 }}
              >
                {t('common.gender')}
              </ThemedText>
              <Controller
                control={control}
                name="gender"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.optionRow} accessibilityRole="radiogroup" accessibilityLabel="Chọn giới tính">
                    {GENDER_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor:
                              value === opt.value
                                ? theme.colors.primaryLight
                                : isDark
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'rgba(0,0,0,0.03)',
                            borderColor:
                              value === opt.value ? theme.colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => onChange(opt.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={opt.label}
                        accessibilityState={{ checked: value === opt.value }}
                      >
                        <ThemedText>
                          {opt.icon} {opt.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Age Input */}
            <View style={{ marginTop: theme.spacing.md }}>
              <Controller
                control={control}
                name="age"
                render={({ field: { onChange, value, onBlur } }) => (
                  <ThemedTextInput
                    label={t('common.age')}
                    value={value}
                    onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                    onBlur={onBlur}
                    placeholder="25"
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                )}
              />
            </View>

            {/* Goal Selection */}
            <View style={{ marginTop: theme.spacing.md }}>
              <ThemedText
                variant="bodySmall"
                color="textSecondary"
                style={{ marginBottom: 8 }}
              >
                {t('common.goal')}
              </ThemedText>
              <Controller
                control={control}
                name="goal"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Chọn mục tiêu">
                    {GOAL_OPTIONS.map((goal) => {
                      const goalColor = theme.colors[goal.colorKey];
                      return (
                        <Pressable
                          key={goal.value}
                          style={[
                            styles.goalCard,
                            {
                              backgroundColor:
                                value === goal.value
                                  ? `${goalColor}15`
                                  : isDark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.02)',
                              borderColor:
                                value === goal.value ? goalColor : 'transparent',
                            },
                          ]}
                          onPress={() => onChange(goal.value)}
                          accessibilityRole="radio"
                          accessibilityLabel={goal.label}
                          accessibilityState={{ checked: value === goal.value }}
                        >
                          <ThemedText style={{ fontSize: theme.typography.h3.fontSize }}>{goal.icon}</ThemedText>
                          <ThemedText
                            variant="bodySmall"
                            weight={value === goal.value ? '600' : '400'}
                            style={{
                              color: value === goal.value ? goalColor : theme.colors.text,
                            }}
                          >
                            {goal.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              />
            </View>

            {/* Activity Level */}
            <View style={{ marginTop: theme.spacing.md }}>
              <ThemedText
                variant="bodySmall"
                color="textSecondary"
                style={{ marginBottom: 8 }}
              >
                {t('common.activity_level')}
              </ThemedText>
              <Controller
                control={control}
                name="activityLevel"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.optionRow} accessibilityRole="radiogroup" accessibilityLabel="Chọn mức độ vận động">
                    {ACTIVITY_OPTIONS.map((act) => (
                      <Pressable
                        key={act.value}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor:
                              value === act.value
                                ? theme.colors.primaryLight
                                : isDark
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'rgba(0,0,0,0.03)',
                            borderColor:
                              value === act.value ? theme.colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => onChange(act.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={act.label}
                        accessibilityState={{ checked: value === act.value }}
                      >
                        <ThemedText
                          variant="bodySmall"
                          weight={value === act.value ? '600' : '400'}
                          color={value === act.value ? 'primary' : undefined}
                        >
                          {act.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {profile?.lastMeasuredDate && (
              <ThemedText
                variant="caption"
                color="textSecondary"
                style={{ marginTop: 8 }}
              >
                📅 {t('common.last_updated')}:{' '}
                {new Date(profile.lastMeasuredDate).toLocaleDateString('vi-VN')}
              </ThemedText>
            )}

            <View style={{ marginTop: theme.spacing.lg }}>
              <Button
                title={isSubmittingProfile ? t('common.saving') : t('common.save_info')}
                onPress={handleSubmit(onSubmitProfile)}
                loading={isSubmittingProfile}
                disabled={isSubmittingProfile}
              />
            </View>
          </View>
        </Animated.View>

        {/* Removed old AI section */}

        {/* Body Metrics History */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <View style={glass.card}>
            <View style={styles.sectionTitle}>
              <ThemedText style={{ fontSize: 20 }}>📏</ThemedText>
              <ThemedText variant="h3">{t('common.history_metrics')}</ThemedText>
            </View>

            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: theme.spacing.md }}
            >
              {t('common.add_metrics_desc')}
            </ThemedText>

            <View style={styles.row}>
              <View style={styles.col}>
                <Controller
                  control={metricsControl}
                  name="heightCm"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ThemedTextInput
                      label={t('common.height')}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="170"
                      keyboardType="numeric"
                      returnKeyType="done"
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
                      label={t('common.weight')}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="65"
                      keyboardType="numeric"
                      returnKeyType="done"
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
                  label={t('common.measured_date')}
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
                  label={t('common.note')}
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
                title={
                  isSubmittingMetrics ? t('common.saving') : t('common.save_history')
                }
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
              title={t('common.nutrition_settings')}
              variant="outline"
              onPress={() => navigation.navigate('NutritionSettings')}
            />

            <Button
              title={t('common.view_insights')}
              variant="outline"
              onPress={() => navigation.navigate('NutritionInsights')}
            />

            <Button title={t('common.logout')} variant="ghost" onPress={handleLogout} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
