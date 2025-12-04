import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Screen from '../../../components/Screen';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { glassStyles } from '../../../components/ui/GlassCard';
import { t } from '../../../i18n/vi';

const ResetSchema = z
  .object({
    email: z.string().email(t('auth.invalidEmail')),
    resetCode: z.string().min(4, t('auth.resetCodeRequired')),
    newPassword: z.string().min(6, t('auth.passwordTooShort')),
    confirm: z.string().min(6, t('auth.passwordTooShort')),
  })
  .refine((data) => data.newPassword === data.confirm, {
    path: ['confirm'],
    message: t('auth.passwordMismatch'),
  });

type ResetValues = z.infer<typeof ResetSchema>;

const ForgotPasswordScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastCode, setLastCode] = useState<string>('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ResetValues>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { email: '', resetCode: '', newPassword: '', confirm: '' },
  });

  const email = watch('email');

  const onSendCode = useCallback(async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: t('auth.invalidEmail'),
        text2: t('auth.checkEmailFormat'),
      });
      return;
    }
    try {
      setSending(true);
      const code = await forgotPassword(email);
      if (code) {
        setLastCode(code);
        setValue('resetCode', code);
        Toast.show({
          type: 'success',
          text1: t('auth.resetCodeReceived'),
          text2: t('auth.resetCodeAutofill'),
        });
      } else {
        Toast.show({
          type: 'info',
          text1: t('auth.resetCodeSent'),
          text2: t('auth.resetCheckEmail'),
        });
      }
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: t('auth.resetFailed'),
        text2: e?.message ?? t('common.tryAgain'),
      });
    } finally {
      setSending(false);
    }
  }, [email, forgotPassword, setValue]);

  const onReset = useCallback(
    async (values: ResetValues) => {
      try {
        setResetting(true);
        await resetPassword(values.email, values.resetCode, values.newPassword);
        Toast.show({
          type: 'success',
          text1: t('auth.passwordUpdated'),
          text2: t('auth.loginAgain'),
        });
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? t('auth.resetFailed');
        Alert.alert(t('common.error'), msg);
      } finally {
        setResetting(false);
      }
    },
    [resetPassword],
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#1a1a2e'] : ['#f0f9ff', '#e0f2fe']}
        style={StyleSheet.absoluteFill}
      />
      <Screen scroll style={styles.container}>
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <View style={glass.card}>
            <ThemedText style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🔐</ThemedText>
            <ThemedText variant="h2" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
              {t('auth.forgotPasswordTitle')}
            </ThemedText>
            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: theme.spacing.md }}
            >
              {t('auth.forgotPasswordDesc')}
            </ThemedText>

            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: theme.spacing.md }}
            >
              {t('auth.forgotPasswordEmailHint')}
            </ThemedText>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  label={t('auth.email')}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  required
                />
              )}
            />

            <Button
              title={sending ? t('common.loading') : t('auth.sendResetCode')}
              onPress={onSendCode}
              loading={sending}
              disabled={sending}
              variant="outline"
              style={{ marginTop: theme.spacing.md }}
              fullWidth
            />

            <View style={{ height: theme.spacing.md }} />

            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: theme.spacing.sm }}
            >
              {t('auth.resetCodeLabel')}
            </ThemedText>
            <Controller
              control={control}
              name="resetCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  label={t('auth.resetCode')}
                  placeholder="123456"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.resetCode}
                  helperText={
                    errors.resetCode?.message ||
                    (lastCode ? `${t('auth.lastCode')}: ${lastCode}` : undefined)
                  }
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  label={t('auth.newPassword')}
                  placeholder="••••••"
                  secureTextEntry
                  secureToggle
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="confirm"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  label={t('auth.confirmNewPassword')}
                  placeholder="••••••"
                  secureTextEntry
                  secureToggle
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={!!errors.confirm}
                  helperText={errors.confirm?.message}
                  required
                />
              )}
            />

            <Button
              title={resetting ? t('common.processing') : t('auth.resetPasswordAction')}
              onPress={handleSubmit(onReset)}
              loading={resetting}
              disabled={resetting}
              variant="primary"
              style={{ marginTop: theme.spacing.lg }}
              fullWidth
            />
          </View>
        </Animated.View>
      </Screen>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
});

export default ForgotPasswordScreen;

