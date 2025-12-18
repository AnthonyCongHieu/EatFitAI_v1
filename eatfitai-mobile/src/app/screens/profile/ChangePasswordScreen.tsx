// ChangePasswordScreen: Đổi mật khẩu
// Current password, New password, Confirm password

import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { showSuccess, handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import apiClient from '../../../services/apiClient';

// Schema
const PasswordSchema = z.object({
    currentPassword: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
    newPassword: z.string().min(6, 'Mật khẩu mới ít nhất 6 ký tự'),
    confirmPassword: z.string().min(6, 'Xác nhận mật khẩu ít nhất 6 ký tự'),
}).refine((data) => data.newPassword === data.confirmPassword, {
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
        container: { flex: 1, backgroundColor: theme.colors.background },
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
            gap: 12,
        },
        hint: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            padding: 12,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
        },
        hintText: {
            flex: 1,
            fontSize: 13,
            color: theme.colors.textSecondary,
        },
    });

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Đổi mật khẩu"
                subtitle="Cập nhật mật khẩu mới"
                onBackPress={() => navigation.goBack()}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Password Form */}
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                        <View style={styles.sectionTitle}>
                            <ThemedText style={{ fontSize: 20 }}>🔐</ThemedText>
                            <ThemedText variant="h3">Thay đổi mật khẩu</ThemedText>
                        </View>

                        <View style={styles.inputGroup}>
                            <Controller
                                control={control}
                                name="currentPassword"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <ThemedTextInput
                                        label="Mật khẩu hiện tại"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        error={!!errors.currentPassword}
                                        helperText={errors.currentPassword?.message}
                                        required
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="newPassword"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <ThemedTextInput
                                        label="Mật khẩu mới"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        error={!!errors.newPassword}
                                        helperText={errors.newPassword?.message}
                                        required
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="confirmPassword"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <ThemedTextInput
                                        label="Xác nhận mật khẩu mới"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        error={!!errors.confirmPassword}
                                        helperText={errors.confirmPassword?.message}
                                        required
                                    />
                                )}
                            />
                        </View>
                    </Animated.View>

                    {/* Security Hint */}
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.hint}>
                        <ThemedText style={{ fontSize: 16 }}>💡</ThemedText>
                        <ThemedText style={styles.hintText}>
                            Mật khẩu mạnh nên có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
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
        </View>
    );
};

export default ChangePasswordScreen;
