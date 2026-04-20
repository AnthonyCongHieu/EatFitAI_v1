// ChangePasswordScreen — Emerald Nebula Design
// Đổi mật khẩu: Current password → New password → Confirm password

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { EN, enStyles } from '../../../theme/emeraldNebula';
import {
  showSuccess,
  handleApiErrorWithCustomMessage,
} from '../../../utils/errorHandler';
import apiClient from '../../../services/apiClient';

// Schema
const PasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
    newPassword: z.string().min(6, 'Mật khẩu mới ít nhất 6 ký tự'),
    confirmPassword: z.string().min(6, 'Xác nhận mật khẩu ít nhất 6 ký tự'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof PasswordSchema>;

/* ─── Password Input Component ─── */
const PasswordInput = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  errorMessage,
  showPassword,
  toggleShowPassword,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  onBlur: () => void;
  placeholder: string;
  error: boolean;
  errorMessage?: string;
  showPassword: boolean;
  toggleShowPassword: () => void;
}) => (
  <View style={S.inputWrapper}>
    <ThemedText style={S.label}>
      {label} <ThemedText style={S.required}>*</ThemedText>
    </ThemedText>
    <View style={[S.inputContainer, error && S.inputError]}>
      <TextInput
        style={S.input}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={EN.textMuted}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
      />
      <Pressable onPress={toggleShowPassword} style={S.eyeButton}>
        <Ionicons
          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
          size={22}
          color={EN.textMuted}
        />
      </Pressable>
    </View>
    {error && errorMessage && (
      <ThemedText style={S.errorText}>{errorMessage}</ThemedText>
    )}
  </View>
);

/* ═══════════════════════════════════════════════
   ChangePasswordScreen — Emerald Nebula
   ═══════════════════════════════════════════════ */
const ChangePasswordScreen = (): React.ReactElement => {
  const navigation = useNavigation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordForm>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: PasswordForm) => {
    try {
      setIsSubmitting(true);

      await apiClient.post('/api/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      showSuccess('password_changed');
      reset();
      navigation.goBack();
    } catch (error: any) {
      handleApiErrorWithCustomMessage(error, {
        unauthorized: { text1: 'Lỗi', text2: 'Mật khẩu hiện tại không đúng' },
        unknown: { text1: 'Lỗi', text2: 'Không thể đổi mật khẩu' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SubScreenLayout
      title="Đổi mật khẩu"
      subtitle="Cập nhật mật khẩu mới"
      keyboardAvoiding
    >
      {/* Password Form Card */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={enStyles.card}>
        <View style={S.inputGroup}>
          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <PasswordInput
                label="Mật khẩu hiện tại"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="••••••••"
                error={!!errors.currentPassword}
                errorMessage={errors.currentPassword?.message}
                showPassword={showCurrentPassword}
                toggleShowPassword={() =>
                  setShowCurrentPassword(!showCurrentPassword)
                }
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <PasswordInput
                label="Mật khẩu mới"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="••••••••"
                error={!!errors.newPassword}
                errorMessage={errors.newPassword?.message}
                showPassword={showNewPassword}
                toggleShowPassword={() => setShowNewPassword(!showNewPassword)}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <PasswordInput
                label="Xác nhận mật khẩu mới"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="••••••••"
                error={!!errors.confirmPassword}
                errorMessage={errors.confirmPassword?.message}
                showPassword={showConfirmPassword}
                toggleShowPassword={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              />
            )}
          />
        </View>
      </Animated.View>

      {/* Security Hint */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={S.hintCard}>
        <Ionicons name="shield-checkmark-outline" size={20} color={EN.primary} />
        <ThemedText style={S.hintText}>
          Mật khẩu mạnh nên có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký
          tự đặc biệt.
        </ThemedText>
      </Animated.View>

      {/* Submit Button — Emerald green gradient */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={({ pressed }) => [
            S.submitButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            isSubmitting && { opacity: 0.5 },
          ]}
        >
          <LinearGradient
            colors={[EN.primary, EN.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={S.submitButtonText}>Đổi mật khẩu</ThemedText>
          )}
        </Pressable>
      </Animated.View>
    </SubScreenLayout>
  );
};

/* ─── Styles ─── */
const S = StyleSheet.create({
  inputGroup: {
    gap: 18,
  },
  inputWrapper: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: EN.onSurface,
  },
  required: {
    color: EN.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EN.surfaceHighest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: EN.outline,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: EN.danger,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: EN.onSurface,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: EN.danger,
    marginTop: 4,
  },
  hintCard: {
    ...enStyles.card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: EN.textMuted,
    lineHeight: 20,
  },
  submitButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: EN.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#003915',
    letterSpacing: 0.3,
  },
});

export default ChangePasswordScreen;
