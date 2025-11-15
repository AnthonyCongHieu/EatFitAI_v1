// Man hinh Ho So v2: tap Profile chinh sua thong tin va ghi so do
// Chu thich bang tieng Viet khong dau de tranh loi ma hoa

import { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../components/ThemedText';
import ThemedTextInput from '../../components/ThemedTextInput';
import Button from '../../components/Button';
import Screen from '../../components/Screen';
import { AppCard } from '../../components/ui/AppCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService } from '../../services/profileService';

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Ten can it nhat 2 ky tu'),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

const BodyMetricsSchema = z.object({
  heightCm: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 100 && Number(value) <= 250),
      {
        message: 'Chieu cao (cm) tu 100 - 250',
      },
    ),
  weightKg: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 30 && Number(value) <= 300),
      {
        message: 'Can nang (kg) tu 30 - 300',
      },
    ),
  measuredDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Ngay do dinh dang YYYY-MM-DD',
    }),
  note: z.string().trim().optional(),
});

type BodyMetricsFormValues = z.infer<typeof BodyMetricsSchema>;

const ProfileScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const styles = StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.xxl,
    },
    card: {
      borderRadius: theme.borderRadius.card,
      padding: theme.spacing.xl,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      borderWidth: 1,
      borderRadius: theme.borderRadius.input,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: Platform.select({ ios: theme.spacing.md, android: theme.spacing.sm }),
      marginTop: theme.spacing.xs,
      fontFamily: 'Inter_400Regular',
    },
    loadingBox: {
      paddingVertical: theme.spacing.xl,
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    col: {
      flex: 1,
    },
  });
  const logout = useAuthStore((s) => s.logout);
  const { profile, fetchProfile, isLoading, updateProfile, isSaving } = useProfileStore((state) => ({
    profile: state.profile,
    fetchProfile: state.fetchProfile,
    isLoading: state.isLoading,
    updateProfile: state.updateProfile,
    isSaving: state.isSaving,
  }));

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      fullName: '',
    },
  });

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
    fetchProfile().catch(() => {
      Toast.show({ type: 'error', text1: 'Tải hồ sơ thất bại' });
    });
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    try {
      await updateProfile({
        fullName: values.fullName.trim(),
      });
      Toast.show({ type: 'success', text1: 'Đã lưu thông tin hồ sơ' });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 422) {
        Toast.show({
          type: 'error',
          text1: 'Du lieu khong hop le',
          text2: 'Vui long kiem tra lai noi dung',
        });
        return;
      }
      Toast.show({ type: 'error', text1: 'Không thể lưu hồ sơ' });
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
      Toast.show({ type: 'success', text1: 'Đã ghi nhận số đo mới' });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 422) {
        Toast.show({
          type: 'error',
          text1: 'Số đo không hợp lệ',
          text2: 'Vui long kiem tra cac truong',
        });
        return;
      }
      Toast.show({ type: 'error', text1: 'Không thể lưu số đo' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ScreenHeader
        title="Hồ sơ"
        subtitle="Quản lý thông tin cá nhân và số đo"
      />

      <Screen contentContainerStyle={styles.scrollContent}>
        <AppCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
              <ThemedText variant="h2" color="primary">
                {profile?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="h3">Thông tin cá nhân</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">
                Chỉnh sửa hồ sơ và lưu lại để cập nhật
              </ThemedText>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { value, onChange, onBlur } }) => (
                  <ThemedTextInput
                    label="Họ và tên"
                    style={styles.input}
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


              <View style={{ marginTop: theme.spacing.xl }}>
                <Button
                  onPress={handleSubmit(onSubmitProfile)}
                  loading={isSaving || isSubmittingProfile}
                  disabled={isSaving || isSubmittingProfile}
                  title={isSaving || isSubmittingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                  variant="primary"
                />
              </View>
            </>
          )}

          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
            <View style={{ height: 1, backgroundColor: theme.colors.border }} />
            <Button
              accessibilityLabel="Đăng xuất"
              onPress={() =>
                Alert.alert(
                  'Đăng xuất',
                  'Bạn có chắc chắn muốn đăng xuất không?',
                  [
                    { text: 'Huỷ', style: 'cancel' },
                    {
                      text: 'Đồng ý',
                      style: 'destructive',
                      onPress: () => {
                        logout().catch(() => {});
                      },
                    },
                  ],
                )
              }
              variant="outline"
              title="Đăng xuất"
              fullWidth
            />
          </View>
        </AppCard>

        <AppCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <View style={[styles.icon, { backgroundColor: theme.colors.secondaryLight }]}>
              <ThemedText variant="h4" color="secondary">
                📏
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="h3">Ghi nhận chỉ số cơ thể</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">
                Theo dõi tiến trình bằng cách lưu số đo mới
              </ThemedText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={metricsControl}
                name="heightCm"
                render={({ field: { value, onChange, onBlur } }) => (
                  <ThemedTextInput
                    label="Chiều cao (cm)"
                    style={styles.input}
                    value={value}
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
            <View style={{ flex: 1 }}>
              <Controller
                control={metricsControl}
                name="weightKg"
                render={({ field: { value, onChange, onBlur } }) => (
                  <ThemedTextInput
                    label="Cân nặng (kg)"
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="60"
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
                style={styles.input}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="2024-06-01"
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
                label="Ghi chú (tuỳ chọn)"
                style={styles.input}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ghi chú về số đo"
                multiline
                numberOfLines={2}
              />
            )}
          />

          <View style={{ marginTop: theme.spacing.xl }}>
            <Button
              accessibilityLabel="Lưu số đo mới"
              onPress={handleMetricsSubmit(onSubmitBodyMetrics)}
              loading={isSubmittingMetrics}
              disabled={isSubmittingMetrics}
              variant="secondary"
              title={isSubmittingMetrics ? 'Đang lưu...' : 'Lưu số đo mới'}
            />
          </View>
        </AppCard>
      </Screen>
    </KeyboardAvoidingView>
  );
};


export default ProfileScreen;
