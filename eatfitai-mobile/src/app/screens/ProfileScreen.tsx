// Man hinh Ho So v2: tap Profile chinh sua thong tin va ghi so do
// Chu thich bang tieng Viet khong dau de tranh loi ma hoa

import { useEffect } from 'react';
import {
  ActivityIndicator,
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
      Toast.show({ type: 'error', text1: 'Tai ho so that bai' });
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
        phone: values.phone ? values.phone.trim() : null,
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        weightKg: values.weightKg ? Number(values.weightKg) : null,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.trim() : null,
      });
      Toast.show({ type: 'success', text1: 'Da luu thong tin ho so' });
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
      Toast.show({ type: 'error', text1: 'Khong the luu ho so' });
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
      Toast.show({ type: 'success', text1: 'Da ghi nhan so do moi' });
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 422) {
        Toast.show({
          type: 'error',
          text1: 'So do khong hop le',
          text2: 'Vui long kiem tra cac truong',
        });
        return;
      }
      Toast.show({ type: 'error', text1: 'Khong the luu so do' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="title">Thong tin ca nhan</ThemedText>
          <ThemedText style={styles.subtitle}>Chinh sua ho so va luu lai de cap nhat</ThemedText>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <ThemedText style={styles.label}>Ho va ten</ThemedText>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Nhap ho ten"
                    placeholderTextColor={theme.colors.muted}
                  />
                )}
              />
              {profileErrors.fullName && (
                <ThemedText style={styles.errorText}>{profileErrors.fullName.message}</ThemedText>
              )}

              <ThemedText style={styles.label}>So dien thoai</ThemedText>
              <Controller
                control={control}
                name="phone"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Vi du: 0987654321"
                    placeholderTextColor={theme.colors.muted}
                    keyboardType="phone-pad"
                  />
                )}
              />
              {profileErrors.phone && (
                <ThemedText style={styles.errorText}>{profileErrors.phone.message}</ThemedText>
              )}

              <View style={styles.row}>
                <View style={styles.col}>
                  <ThemedText style={styles.label}>Chieu cao (cm)</ThemedText>
                  <Controller
                    control={control}
                    name="heightCm"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
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
                    <ThemedText style={styles.errorText}>{profileErrors.heightCm.message}</ThemedText>
                  )}
                </View>
                <View style={styles.col}>
                  <ThemedText style={styles.label}>Can nang (kg)</ThemedText>
                  <Controller
                    control={control}
                    name="weightKg"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
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
                    <ThemedText style={styles.errorText}>{profileErrors.weightKg.message}</ThemedText>
                  )}
                </View>
              </View>

              <ThemedText style={styles.label}>Ngay sinh (YYYY-MM-DD)</ThemedText>
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
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
                <ThemedText style={styles.errorText}>{profileErrors.dateOfBirth.message}</ThemedText>
              )}

              <Pressable
                onPress={handleSubmit(onSubmitProfile)}
                disabled={isSaving || isSubmittingProfile}
                style={[
                  styles.button,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isSaving || isSubmittingProfile ? 0.7 : 1,
                  },
                ]}>
                <ThemedText style={styles.buttonText}>
                  {isSaving || isSubmittingProfile ? 'Dang luu...' : 'Luu ho so'}
                </ThemedText>
              </Pressable>
            </>
          )}

          <Pressable
            onPress={() => logout().catch(() => {})}
            style={[styles.button, { backgroundColor: '#E53935', marginTop: 16 }]}>
            <ThemedText style={styles.buttonText}>Dang xuat</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="title">Ghi nhan chi so co the</ThemedText>
          <ThemedText style={styles.subtitle}>Theo doi tien trinh bang cach luu so do moi</ThemedText>

          <ThemedText style={styles.label}>Chieu cao (cm)</ThemedText>
          <Controller
            control={metricsControl}
            name="heightCm"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
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
            <ThemedText style={styles.errorText}>{metricsErrors.heightCm.message}</ThemedText>
          )}

          <ThemedText style={styles.label}>Can nang (kg)</ThemedText>
          <Controller
            control={metricsControl}
            name="weightKg"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
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
            <ThemedText style={styles.errorText}>{metricsErrors.weightKg.message}</ThemedText>
          )}

          <ThemedText style={styles.label}>Body fat % (tuy chon)</ThemedText>
          <Controller
            control={metricsControl}
            name="bodyFatPercent"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
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
            <ThemedText style={styles.errorText}>{metricsErrors.bodyFatPercent.message}</ThemedText>
          )}

          <ThemedText style={styles.label}>Ngay do (YYYY-MM-DD)</ThemedText>
          <Controller
            control={metricsControl}
            name="recordedAt"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
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
            <ThemedText style={styles.errorText}>{metricsErrors.recordedAt.message}</ThemedText>
          )}

          <Pressable
            onPress={handleMetricsSubmit(onSubmitBodyMetrics)}
            disabled={isSubmittingMetrics}
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.secondary,
                opacity: isSubmittingMetrics ? 0.7 : 1,
                marginTop: 20,
              },
            ]}>
            <ThemedText style={styles.buttonText}>
              {isSubmittingMetrics ? 'Dang luu...' : 'Luu so do moi'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
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
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
  },
  label: {
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    marginTop: 6,
  },
  errorText: {
    color: '#E53935',
    marginTop: 4,
  },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
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
