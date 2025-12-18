// BodyMetricsScreen: Màn hình nhập số đo cơ thể
// Cho phép nhập chiều cao, cân nặng, cân nặng mục tiêu

import React, { useEffect, useState } from 'react';
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
import { BMIIndicator } from '../../../components/ui/BMIIndicator';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useProfileStore } from '../../../store/useProfileStore';
import { showSuccess, handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';

// Schema validation
const BodyMetricsSchema = z.object({
    heightCm: z
        .string()
        .trim()
        .refine(
            (value) =>
                !value ||
                (!Number.isNaN(Number(value)) && Number(value) >= 100 && Number(value) <= 250),
            { message: 'Chiều cao từ 100 - 250 cm' }
        ),
    weightKg: z
        .string()
        .trim()
        .refine(
            (value) =>
                !value ||
                (!Number.isNaN(Number(value)) && Number(value) >= 30 && Number(value) <= 300),
            { message: 'Cân nặng từ 30 - 300 kg' }
        ),
    targetWeightKg: z
        .string()
        .trim()
        .optional()
        .refine(
            (value) =>
                !value ||
                (!Number.isNaN(Number(value)) && Number(value) >= 30 && Number(value) <= 300),
            { message: 'Cân nặng mục tiêu từ 30 - 300 kg' }
        ),
});

type BodyMetricsForm = z.infer<typeof BodyMetricsSchema>;

const BodyMetricsScreen = (): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation();

    const { profile, updateProfile, isSaving } = useProfileStore((state) => ({
        profile: state.profile,
        updateProfile: state.updateProfile,
        isSaving: state.isSaving,
    }));

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors },
        reset,
    } = useForm<BodyMetricsForm>({
        resolver: zodResolver(BodyMetricsSchema),
        defaultValues: {
            heightCm: '',
            weightKg: '',
            targetWeightKg: '',
        },
    });

    // Load current values
    useEffect(() => {
        if (profile) {
            reset({
                heightCm: profile.heightCm ? String(profile.heightCm) : '',
                weightKg: profile.weightKg ? String(profile.weightKg) : '',
                targetWeightKg: '', // TODO: Load from backend when field exists
            });
        }
    }, [profile, reset]);

    // Watch values for BMI calculation
    const heightCm = watch('heightCm');
    const weightKg = watch('weightKg');
    const targetWeightKg = watch('targetWeightKg');

    // Calculate difference to target
    const weightDiff = (): string | null => {
        if (!weightKg || !targetWeightKg) return null;
        const current = Number(weightKg);
        const target = Number(targetWeightKg);
        if (isNaN(current) || isNaN(target)) return null;
        const diff = target - current;
        if (diff > 0) return `Cần tăng ${diff.toFixed(1)} kg`;
        if (diff < 0) return `Cần giảm ${Math.abs(diff).toFixed(1)} kg`;
        return 'Đã đạt mục tiêu! 🎉';
    };

    const onSubmit = async (values: BodyMetricsForm) => {
        try {
            await updateProfile({
                heightCm: values.heightCm ? Number(values.heightCm) : null,
                weightKg: values.weightKg ? Number(values.weightKg) : null,
                // TODO: Add targetWeightKg to backend
            });
            showSuccess('profile_updated');
            navigation.goBack();
        } catch (error: any) {
            handleApiErrorWithCustomMessage(error, {
                unknown: { text1: 'Lỗi', text2: 'Không thể lưu thông tin' },
            });
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
        row: {
            flexDirection: 'row',
            gap: theme.spacing.md,
        },
        col: {
            flex: 1,
        },
        bmiSection: {
            alignItems: 'center',
            marginTop: 20,
            paddingTop: 20,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
        diffBadge: {
            marginTop: 16,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
        },
        diffText: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.primary,
        },
    });

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Số đo cơ thể"
                subtitle="Cập nhật chiều cao và cân nặng"
                onBackPress={() => navigation.goBack()}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Current Metrics */}
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                        <View style={styles.sectionTitle}>
                            <ThemedText style={{ fontSize: 20 }}>📏</ThemedText>
                            <ThemedText variant="h3">Số đo hiện tại</ThemedText>
                        </View>

                        <View style={styles.row}>
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
                                            error={!!errors.heightCm}
                                            helperText={errors.heightCm?.message}
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
                                            error={!!errors.weightKg}
                                            helperText={errors.weightKg?.message}
                                        />
                                    )}
                                />
                            </View>
                        </View>

                        {/* BMI Display */}
                        <View style={styles.bmiSection}>
                            <BMIIndicator
                                heightCm={heightCm ? Number(heightCm) : undefined}
                                weightKg={weightKg ? Number(weightKg) : undefined}
                                variant="full"
                            />
                        </View>
                    </Animated.View>

                    {/* Target Weight */}
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                        <View style={styles.sectionTitle}>
                            <ThemedText style={{ fontSize: 20 }}>🎯</ThemedText>
                            <ThemedText variant="h3">Cân nặng mục tiêu</ThemedText>
                        </View>

                        <Controller
                            control={control}
                            name="targetWeightKg"
                            render={({ field: { value, onChange, onBlur } }) => (
                                <ThemedTextInput
                                    label="Mục tiêu (kg)"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="60"
                                    keyboardType="numeric"
                                    error={!!errors.targetWeightKg}
                                    helperText={errors.targetWeightKg?.message}
                                />
                            )}
                        />

                        {/* Weight difference badge */}
                        {weightDiff() && (
                            <View style={styles.diffBadge}>
                                <ThemedText style={styles.diffText}>{weightDiff()}</ThemedText>
                            </View>
                        )}
                    </Animated.View>

                    {/* Save Button */}
                    <Animated.View entering={FadeInDown.delay(300)}>
                        <Button
                            title={isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            onPress={handleSubmit(onSubmit)}
                            loading={isSaving}
                            disabled={isSaving}
                        />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default BodyMetricsScreen;
