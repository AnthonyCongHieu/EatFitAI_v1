// ChangePasswordScreen: Đổi mật khẩu
// Current password, New password, Confirm password

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
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

const ChangePasswordScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
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

  const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    card: {
      ...glass.card,
      padding: 20,
    },
    sectionTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    inputGroup: {
      gap: 16,
    },
    inputWrapper: {
      gap: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    required: {
      color: theme.colors.danger,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    input: {
      flex: 1,
      height: 50,
      fontSize: 16,
      color: theme.colors.text,
    },
    eyeButton: {
      padding: 8,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.danger,
      marginTop: 4,
    },
    hint: {
      ...glass.card,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 16,
    },
    hintText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
  });

  // Password Input Component with Eye Icon
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
    <View style={styles.inputWrapper}>
      <ThemedText style={styles.label}>
        {label} <ThemedText style={styles.required}>*</ThemedText>
      </ThemedText>
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <Pressable onPress={toggleShowPassword} style={styles.eyeButton}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>
      {error && errorMessage && (
        <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Custom Header - Back button + Title on same row */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {/* Row: Back button + Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <ThemedText variant="h3" weight="700">
              Đổi mật khẩu
            </ThemedText>
          </View>
        </View>

        {/* Subtitle below */}
        <ThemedText
          variant="bodySmall"
          color="textSecondary"
          style={{ textAlign: 'center', marginTop: 8 }}
        >
          Cập nhật mật khẩu mới
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Password Form */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
            <View style={styles.sectionTitle}>
              <ThemedText variant="h3">Thay đổi mật khẩu</ThemedText>
            </View>

            <View style={styles.inputGroup}>
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
          <Animated.View entering={FadeInDown.delay(200)} style={styles.hint}>
            <ThemedText style={{ fontSize: 16 }}>💡</ThemedText>
            <ThemedText style={styles.hintText}>
              Mật khẩu mạnh nên có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký
              tự đặc biệt.
            </ThemedText>
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <Button
              title={isSubmitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default ChangePasswordScreen;
