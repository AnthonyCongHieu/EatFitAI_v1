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
import { useAppTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { profileService } from '../../services/profileService';

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Ten can it nhat 2 ky tu'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[0-9+()\-\s]{8,20}$/.test(value), {
      message: 'So dien thoai khong hop le',
    }),
  heightCm: z
    .string()
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
    .optional()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 30 && Number(value) <= 300),
      {
        message: 'Can nang (kg) tu 30 - 300',
      },
    ),
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Ngay sinh dinh dang YYYY-MM-DD',
    }),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

const BodyMetricsSchema = z.object({
  heightCm: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap chieu cao' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 100 && Number(value) <= 250, {
      message: 'Chieu cao (cm) tu 100 - 250',
    }),
  weightKg: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap can nang' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 30 && Number(value) <= 300, {
      message: 'Can nang (kg) tu 30 - 300',
    }),
  bodyFatPercent: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 3 && Number(value) <= 60),
      {
        message: 'Body fat % tu 3 - 60',
      },
    ),
  recordedAt: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Ngay do dinh dang YYYY-MM-DD',
    }),
});

type BodyMetricsFormValues = z.infer<typeof BodyMetricsSchema>;

const ProfileScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
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
      phone: '',
      heightCm: '',
      weightKg: '',
      dateOfBirth: '',
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
      bodyFatPercent: '',
      recordedAt: '',
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
        phone: profile.phone ?? '',
        heightCm: profile.heightCm ? String(profile.heightCm) : '',
        weightKg: profile.weightKg ? String(profile.weightKg) : '',
        dateOfBirth: profile.dateOfBirth ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    try {
      await updateProfile({
        fullName: values.fullName.trim(),
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.trim() : null,
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
        heightCm: Number(values.heightCm),
        weightKg: Number(values.weightKg),
        bodyFatPercent: values.bodyFatPercent ? Number(values.bodyFatPercent) : null,
        recordedAt: values.recordedAt ? `${values.recordedAt}T00:00:00Z` : null,
      });
      resetMetrics({ heightCm: '', weightKg: '', bodyFatPercent: '', recordedAt: '' });
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
      <Screen contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, ...theme.shadows.md }]}>
          <ThemedText variant="h3">Thông tin cá nhân</ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
            Chỉnh sửa hồ sơ và lưu lại để cập nhật
          </ThemedText>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <ThemedText variant="bodySmall" weight="600" style={{ marginTop: theme.spacing.md }}>
                Họ và tên
              </ThemedText>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { value, onChange, onBlur } }) => (
                  <ThemedTextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Nhập họ tên"
                    placeholderTextColor={theme.colors.muted}
                  />
                )}
              />
              {profileErrors.fullName && (
                <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
                  {profileErrors.fullName.message}
                </ThemedText>
              )}

              <ThemedText variant="bodySmall" weight="600" style={{ marginTop: theme.spacing.md }}>
                Số điện thoại
              </ThemedText>
              <Controller
                control={control}
                name="phone"
                render={({ field: { value, onChange, onBlur } }) => (
                  <ThemedTextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Ví dụ: 0987654321"
                    placeholderTextColor={theme.colors.muted}
                    keyboardType="phone-pad"
                  />
                )}
              />
              {profileErrors.phone && (
                <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
                  {profileErrors.phone.message}
                </ThemedText>
              )}

              <View style={[styles.row, { marginTop: theme.spacing.md }]}>
                <View style={styles.col}>
                  <ThemedText variant="bodySmall" weight="600">Chiều cao (cm)</ThemedText>
                  <Controller
                    control={control}
                    name="heightCm"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <ThemedTextInput
                        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                        value={value ?? ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="170"
                        placeholderTextColor={theme.colors.muted}
                        keyboardType="numeric"
                      />
                    )}
                  />
                  {profileErrors.heightCm && (
                    <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
                      {profileErrors.heightCm.message}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.col}>
                  <ThemedText variant="bodySmall" weight="600">Cân nặng (kg)</ThemedText>
                  <Controller
                    control={control}
                    name="weightKg"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <ThemedTextInput
                        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                        value={value ?? ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="60"
                        placeholderTextColor={theme.colors.muted}
                        keyboardType="numeric"
                      />
                    )}
                  />
                  {profileErrors.weightKg && (
                    <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
                      {profileErrors.weightKg.message}
                    </ThemedText>
                  )}
                </View>
              </View>

              <ThemedText variant="bodySmall" weight="600" style={{ marginTop: theme.spacing.md }}>
                Ngày sinh (YYYY-MM-DD)
              </ThemedText>
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field: { value, onChange, onBlur } }) => (
                  <ThemedTextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="1995-01-01"
                    placeholderTextColor={theme.colors.muted}
                  />
                )}
              />
              {profileErrors.dateOfBirth && (
                <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
                  {profileErrors.dateOfBirth.message}
                </ThemedText>
              )}

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

          <View style={{ marginTop: theme.spacing.md }}>
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
              variant="danger"
              title="Đăng xuất"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, ...theme.shadows.md }]}>
          <ThemedText variant="h3">Ghi nhận chỉ số cơ thể</ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: theme.spacing.xs }}>
            Theo dõi tiến trình bằng cách lưu số đo mới
          </ThemedText>

          <ThemedText variant="bodySmall" weight="600" style={{ marginTop: theme.spacing.md }}>
            Chiều cao (cm)
          </ThemedText>
          <Controller
            control={metricsControl}
            name="heightCm"
            render={({ field: { value, onChange, onBlur } }) => (
              <ThemedTextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="170"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
              />
            )}
          />
          {metricsErrors.heightCm && (
            <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
              {metricsErrors.heightCm.message}
            </ThemedText>
          )}

          <ThemedText variant="bodySmall" weight="600" style={{ marginTop: theme.spacing.md }}>
            Cân nặng (kg)
          </ThemedText>
          <Controller
            control={metricsControl}
            name="weightKg"
            render={({ field: { value, onChange, onBlur } }) => (
              <ThemedTextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="60"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
              />
            )}
          />
          {metricsErrors.weightKg && (
            <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
              {metricsErrors.weightKg.message}
            </ThemedText>
          )}

          <ThemedText variant="bodySmall" weight="600" style={{ marginTop: theme.spacing.md }}>
            Body fat % (tuỳ chọn)
          </ThemedText>
          <Controller
            control={metricsControl}
            name="bodyFatPercent"
            render={({ field: { value, onChange, onBlur } }) => (
              <ThemedTextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="18"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
              />
            )}
          />
          {metricsErrors.bodyFatPercent && (
            <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
              {metricsErrors.bodyFatPercent.message}
            </ThemedText>
          )}

          <ThemedText variant="bodySmall" weight="600" style={{ marginTop: theme.spacing.md }}>
            Ngày đo (YYYY-MM-DD)
          </ThemedText>
          <Controller
            control={metricsControl}
            name="recordedAt"
            render={({ field: { value, onChange, onBlur } }) => (
              <ThemedTextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="2024-06-01"
                placeholderTextColor={theme.colors.muted}
              />
            )}
          />
          {metricsErrors.recordedAt && (
            <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
              {metricsErrors.recordedAt.message}
            </ThemedText>
          )}

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
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
});

export default ProfileScreen;
