// EditProfileScreen: Chỉnh sửa thông tin cá nhân
// Name, Gender, Age, Avatar

import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Pressable,
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
import { glassStyles } from '../../../components/ui/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useProfileStore } from '../../../store/useProfileStore';
import { showSuccess, handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';

// Schema
const ProfileSchema = z.object({
    fullName: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự'),
    gender: z.enum(['male', 'female']),
    age: z.string().refine(
        (val) => !val || (!isNaN(Number(val)) && Number(val) >= 10 && Number(val) <= 120),
        { message: 'Tuổi từ 10 - 120' }
    ),
});

type ProfileForm = z.infer<typeof ProfileSchema>;

const GENDER_OPTIONS = [
    { value: 'male', label: 'Nam', icon: '👨' },
    { value: 'female', label: 'Nữ', icon: '👩' },
] as const;

const EditProfileScreen = (): React.ReactElement => {
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
        formState: { errors },
        reset,
        setValue,
    } = useForm<ProfileForm>({
        resolver: zodResolver(ProfileSchema),
        defaultValues: {
            fullName: '',
            gender: 'male',
            age: '',
        },
    });

    // Load current values
    useEffect(() => {
        if (profile) {
            reset({
                fullName: profile.fullName || '',
                gender: (profile.gender as any) || 'male',
                age: profile.age ? String(profile.age) : '',
            });
        }
    }, [profile, reset]);

    const onSubmit = async (values: ProfileForm) => {
        try {
            // Calculate dateOfBirth from age
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - (Number(values.age) || 25);
            const dateOfBirth = `${birthYear}-01-01`;

            await updateProfile({
                fullName: values.fullName.trim(),
                gender: values.gender,
                dateOfBirth: dateOfBirth,
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
        avatarSection: {
            alignItems: 'center',
            marginBottom: 20,
        },
        sectionTitle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
        },
        genderRow: {
            flexDirection: 'row',
            gap: 12,
        },
        genderOption: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderRadius: 14,
            borderWidth: 2,
            gap: 8,
        },
    });

    return (
        <LinearGradient
            colors={theme.colors.screenGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.container}
        >
            {/* Custom Header - Back button + Title on same row */}
            <View style={{ paddingTop: 60, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
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
                            ✏️ Chỉnh sửa hồ sơ
                        </ThemedText>
                    </View>
                </View>

                {/* Subtitle below */}
                <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: 8 }}>
                    Cập nhật thông tin cá nhân
                </ThemedText>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Personal Info */}
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
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
                                    placeholder="Nguyễn Văn A"
                                    error={!!errors.fullName}
                                    helperText={errors.fullName?.message}
                                    required
                                />
                            )}
                        />

                        {/* Gender Selection */}
                        <View style={{ marginTop: 16 }}>
                            <ThemedText
                                variant="bodySmall"
                                color="textSecondary"
                                style={{ marginBottom: 8 }}
                            >
                                Giới tính
                            </ThemedText>
                            <Controller
                                control={control}
                                name="gender"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.genderRow}>
                                        {GENDER_OPTIONS.map((opt) => {
                                            const isSelected = value === opt.value;
                                            return (
                                                <Pressable
                                                    key={opt.value}
                                                    onPress={() => onChange(opt.value)}
                                                    style={[
                                                        styles.genderOption,
                                                        {
                                                            backgroundColor: isSelected
                                                                ? `${theme.colors.primary}15`
                                                                : isDark
                                                                    ? 'rgba(255,255,255,0.03)'
                                                                    : 'rgba(0,0,0,0.02)',
                                                            borderColor: isSelected
                                                                ? theme.colors.primary
                                                                : 'transparent',
                                                        },
                                                    ]}
                                                >
                                                    <ThemedText style={{ fontSize: 24 }}>{opt.icon}</ThemedText>
                                                    <ThemedText
                                                        style={{
                                                            fontWeight: isSelected ? '600' : '400',
                                                            color: isSelected ? theme.colors.primary : theme.colors.text,
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </ThemedText>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            />
                        </View>

                        {/* Age */}
                        <View style={{ marginTop: 16 }}>
                            <Controller
                                control={control}
                                name="age"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <ThemedTextInput
                                        label="Tuổi"
                                        value={value}
                                        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                                        onBlur={onBlur}
                                        placeholder="25"
                                        keyboardType="numeric"
                                        error={!!errors.age}
                                        helperText={errors.age?.message}
                                    />
                                )}
                            />
                        </View>
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
        </LinearGradient>
    );
};

export default EditProfileScreen;
