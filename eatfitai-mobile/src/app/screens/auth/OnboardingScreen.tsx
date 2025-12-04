/**
 * OnboardingScreen - First-time user setup wizard
 * 5 steps: Basic Info → Body Metrics → Goal → Activity → AI Calculate
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useProfileStore } from '../../../store/useProfileStore';
import { showSuccess } from '../../../utils/errorHandler';
import type { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OnboardingData {
    fullName: string;
    gender: 'male' | 'female' | 'other' | null;
    age: string;
    heightCm: string;
    weightKg: string;
    goal: 'lose' | 'maintain' | 'gain' | null;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

const STEPS = [
    { title: 'Thông tin cơ bản', subtitle: 'Hãy cho chúng tôi biết về bạn', icon: '👋' },
    { title: 'Số đo cơ thể', subtitle: 'Để tính toán nhu cầu dinh dưỡng', icon: '📏' },
    { title: 'Mục tiêu của bạn', subtitle: 'Bạn muốn đạt được gì?', icon: '🎯' },
    { title: 'Mức vận động', subtitle: 'Bạn hoạt động thế nào?', icon: '🏃' },
    { title: 'Hoàn tất!', subtitle: 'AI đang tính toán cho bạn...', icon: '✨' },
];

const GENDER_OPTIONS = [
    { value: 'male', label: 'Nam', icon: '👨' },
    { value: 'female', label: 'Nữ', icon: '👩' },
    { value: 'other', label: 'Khác', icon: '🧑' },
];

const GOAL_OPTIONS = [
    { value: 'lose', label: 'Giảm cân', icon: '📉', desc: 'Giảm mỡ, gọn người', color: '#EF4444' },
    { value: 'maintain', label: 'Duy trì', icon: '⚖️', desc: 'Giữ nguyên cân nặng', color: '#3B82F6' },
    { value: 'gain', label: 'Tăng cân', icon: '📈', desc: 'Tăng cơ, tăng khối lượng', color: '#22C55E' },
];

const ACTIVITY_OPTIONS = [
    { value: 'sedentary', label: 'Ít vận động', desc: 'Ngồi văn phòng cả ngày', multiplier: 1.2 },
    { value: 'light', label: 'Nhẹ nhàng', desc: 'Tập 1-2 lần/tuần', multiplier: 1.375 },
    { value: 'moderate', label: 'Vừa phải', desc: 'Tập 3-5 lần/tuần', multiplier: 1.55 },
    { value: 'active', label: 'Tích cực', desc: 'Tập 6-7 lần/tuần', multiplier: 1.725 },
    { value: 'very_active', label: 'Rất tích cực', desc: 'Vận động viên', multiplier: 1.9 },
];

const OnboardingScreen = (): JSX.Element => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation<NavigationProp>();
    const updateProfile = useProfileStore((s) => s.updateProfile);

    const [currentStep, setCurrentStep] = useState(0);
    const [isCalculating, setIsCalculating] = useState(false);
    const [data, setData] = useState<OnboardingData>({
        fullName: '',
        gender: null,
        age: '',
        heightCm: '',
        weightKg: '',
        goal: null,
        activityLevel: 'moderate',
    });

    const [aiResult, setAiResult] = useState<{
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    } | null>(null);

    const canProceed = (): boolean => {
        switch (currentStep) {
            case 0:
                return data.fullName.length >= 2 && data.gender !== null && data.age !== '';
            case 1:
                return data.heightCm !== '' && data.weightKg !== '';
            case 2:
                return data.goal !== null;
            case 3:
                return true;
            default:
                return true;
        }
    };

    const handleNext = async () => {
        if (currentStep < 4) {
            if (currentStep === 3) {
                // Last data step - calculate AI
                setCurrentStep(4);
                calculateNutrition();
            } else {
                setCurrentStep((prev) => prev + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const calculateNutrition = async () => {
        setIsCalculating(true);
        try {
            const response = await fetch('http://127.0.0.1:5050/nutrition-advice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gender: data.gender,
                    age: Number(data.age),
                    height: Number(data.heightCm),
                    weight: Number(data.weightKg),
                    activity: data.activityLevel,
                    goal: data.goal,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setAiResult(result);
            } else {
                // Fallback calculation if AI fails
                const bmr = calculateBMR();
                const tdee = bmr * getActivityMultiplier();
                const calories = adjustForGoal(tdee);
                setAiResult({
                    calories: Math.round(calories),
                    protein: Math.round(Number(data.weightKg) * 1.6),
                    carbs: Math.round((calories * 0.45) / 4),
                    fat: Math.round((calories * 0.25) / 9),
                });
            }
        } catch (error) {
            // Fallback calculation
            const bmr = calculateBMR();
            const tdee = bmr * getActivityMultiplier();
            const calories = adjustForGoal(tdee);
            setAiResult({
                calories: Math.round(calories),
                protein: Math.round(Number(data.weightKg) * 1.6),
                carbs: Math.round((calories * 0.45) / 4),
                fat: Math.round((calories * 0.25) / 9),
            });
        } finally {
            setIsCalculating(false);
        }
    };

    const calculateBMR = (): number => {
        const weight = Number(data.weightKg);
        const height = Number(data.heightCm);
        const age = Number(data.age);

        if (data.gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age + 5;
        }
        return 10 * weight + 6.25 * height - 5 * age - 161;
    };

    const getActivityMultiplier = (): number => {
        const activity = ACTIVITY_OPTIONS.find((a) => a.value === data.activityLevel);
        return activity?.multiplier || 1.55;
    };

    const adjustForGoal = (tdee: number): number => {
        switch (data.goal) {
            case 'lose':
                return tdee - 500;
            case 'gain':
                return tdee + 300;
            default:
                return tdee;
        }
    };

    const handleComplete = async () => {
        try {
            // Save profile
            await updateProfile({
                fullName: data.fullName,
                heightCm: Number(data.heightCm),
                weightKg: Number(data.weightKg),
            });

            // Mark onboarding complete
            await AsyncStorage.setItem('onboarding_complete', 'true');

            showSuccess('settings_saved', { text1: '🎉 Thiết lập hoàn tất!' });

            // Navigate to main app
            navigation.reset({
                index: 0,
                routes: [{ name: 'AppTabs' }],
            });
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            paddingTop: 60,
            paddingHorizontal: 24,
            paddingBottom: 20,
        },
        progressContainer: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 20,
        },
        progressDot: {
            height: 4,
            flex: 1,
            borderRadius: 2,
        },
        content: {
            flex: 1,
            paddingHorizontal: 24,
        },
        stepIcon: {
            fontSize: 48,
            textAlign: 'center',
            marginBottom: 16,
        },
        stepTitle: {
            textAlign: 'center',
            marginBottom: 8,
        },
        stepSubtitle: {
            textAlign: 'center',
            marginBottom: 32,
        },
        optionGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
        },
        optionButton: {
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 16,
            borderWidth: 2,
            minWidth: 100,
            alignItems: 'center',
        },
        goalCard: {
            width: (width - 72) / 3,
            padding: 16,
            borderRadius: 20,
            alignItems: 'center',
            borderWidth: 2,
        },
        activityCard: {
            width: '100%',
            padding: 16,
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 2,
        },
        inputRow: {
            flexDirection: 'row',
            gap: 16,
            marginBottom: 16,
        },
        inputCol: {
            flex: 1,
        },
        footer: {
            padding: 24,
            paddingBottom: 40,
            flexDirection: 'row',
            gap: 12,
        },
        resultCard: {
            padding: 24,
            borderRadius: 24,
            alignItems: 'center',
            marginBottom: 24,
        },
        resultRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 20,
            justifyContent: 'center',
        },
        resultItem: {
            alignItems: 'center',
            minWidth: 80,
        },
    });

    const renderStep = () => {
        switch (currentStep) {
            case 0: // Basic Info
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step0">
                        <ThemedTextInput
                            label="Tên của bạn"
                            value={data.fullName}
                            onChangeText={(text) => setData({ ...data, fullName: text })}
                            placeholder="Nhập tên"
                            style={{ marginBottom: 20 }}
                        />

                        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: 12 }}>
                            Giới tính
                        </ThemedText>
                        <View style={styles.optionGrid}>
                            {GENDER_OPTIONS.map((opt) => (
                                <Pressable
                                    key={opt.value}
                                    style={[
                                        styles.optionButton,
                                        {
                                            backgroundColor: data.gender === opt.value
                                                ? theme.colors.primaryLight
                                                : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            borderColor: data.gender === opt.value
                                                ? theme.colors.primary
                                                : 'transparent',
                                        },
                                    ]}
                                    onPress={() => setData({ ...data, gender: opt.value as any })}
                                >
                                    <ThemedText style={{ fontSize: 24 }}>{opt.icon}</ThemedText>
                                    <ThemedText weight="500">{opt.label}</ThemedText>
                                </Pressable>
                            ))}
                        </View>

                        <ThemedTextInput
                            label="Tuổi"
                            value={data.age}
                            onChangeText={(text) => setData({ ...data, age: text.replace(/[^0-9]/g, '') })}
                            placeholder="25"
                            keyboardType="numeric"
                            style={{ marginTop: 20 }}
                        />
                    </Animated.View>
                );

            case 1: // Body Metrics
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step1">
                        <View style={styles.inputRow}>
                            <View style={styles.inputCol}>
                                <ThemedTextInput
                                    label="Chiều cao (cm)"
                                    value={data.heightCm}
                                    onChangeText={(text) => setData({ ...data, heightCm: text.replace(/[^0-9]/g, '') })}
                                    placeholder="170"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.inputCol}>
                                <ThemedTextInput
                                    label="Cân nặng (kg)"
                                    value={data.weightKg}
                                    onChangeText={(text) => setData({ ...data, weightKg: text.replace(/[^0-9.]/g, '') })}
                                    placeholder="65"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={[glass.card, { marginTop: 20 }]}>
                            <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>
                                💡 Thông tin này giúp AI tính toán lượng calories và macros phù hợp với bạn
                            </ThemedText>
                        </View>
                    </Animated.View>
                );

            case 2: // Goal
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step2">
                        <View style={styles.optionGrid}>
                            {GOAL_OPTIONS.map((goal) => (
                                <Pressable
                                    key={goal.value}
                                    style={[
                                        styles.goalCard,
                                        {
                                            backgroundColor: data.goal === goal.value
                                                ? `${goal.color}20`
                                                : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            borderColor: data.goal === goal.value ? goal.color : 'transparent',
                                        },
                                    ]}
                                    onPress={() => setData({ ...data, goal: goal.value as any })}
                                >
                                    <ThemedText style={{ fontSize: 32 }}>{goal.icon}</ThemedText>
                                    <ThemedText
                                        weight="600"
                                        style={{
                                            marginTop: 8,
                                            color: data.goal === goal.value ? goal.color : theme.colors.text,
                                        }}
                                    >
                                        {goal.label}
                                    </ThemedText>
                                    <ThemedText
                                        variant="caption"
                                        color="textSecondary"
                                        style={{ textAlign: 'center', marginTop: 4 }}
                                    >
                                        {goal.desc}
                                    </ThemedText>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                );

            case 3: // Activity Level
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} key="step3">
                        {ACTIVITY_OPTIONS.map((act) => (
                            <Pressable
                                key={act.value}
                                style={[
                                    styles.activityCard,
                                    {
                                        backgroundColor: data.activityLevel === act.value
                                            ? theme.colors.primaryLight
                                            : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        borderColor: data.activityLevel === act.value
                                            ? theme.colors.primary
                                            : 'transparent',
                                    },
                                ]}
                                onPress={() => setData({ ...data, activityLevel: act.value as any })}
                            >
                                <ThemedText
                                    weight={data.activityLevel === act.value ? '600' : '400'}
                                    color={data.activityLevel === act.value ? 'primary' : undefined}
                                >
                                    {act.label}
                                </ThemedText>
                                <ThemedText variant="caption" color="textSecondary">
                                    {act.desc}
                                </ThemedText>
                            </Pressable>
                        ))}
                    </Animated.View>
                );

            case 4: // Result
                return (
                    <Animated.View entering={FadeInRight} key="step4">
                        {isCalculating ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <ThemedText style={{ marginTop: 16 }}>Đang tính toán...</ThemedText>
                            </View>
                        ) : aiResult ? (
                            <View style={[glass.card, styles.resultCard]}>
                                <ThemedText style={{ fontSize: 48 }}>🎉</ThemedText>
                                <ThemedText variant="h2" style={{ marginTop: 12 }}>
                                    Mục tiêu hàng ngày
                                </ThemedText>

                                <View style={styles.resultRow}>
                                    <View style={styles.resultItem}>
                                        <ThemedText style={{ fontSize: 24 }}>🔥</ThemedText>
                                        <ThemedText variant="h3" color="primary">{aiResult.calories}</ThemedText>
                                        <ThemedText variant="caption" color="textSecondary">kcal</ThemedText>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <ThemedText style={{ fontSize: 24 }}>💪</ThemedText>
                                        <ThemedText variant="h3">{aiResult.protein}g</ThemedText>
                                        <ThemedText variant="caption" color="textSecondary">Protein</ThemedText>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <ThemedText style={{ fontSize: 24 }}>🍞</ThemedText>
                                        <ThemedText variant="h3">{aiResult.carbs}g</ThemedText>
                                        <ThemedText variant="caption" color="textSecondary">Carbs</ThemedText>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <ThemedText style={{ fontSize: 24 }}>🥑</ThemedText>
                                        <ThemedText variant="h3">{aiResult.fat}g</ThemedText>
                                        <ThemedText variant="caption" color="textSecondary">Fat</ThemedText>
                                    </View>
                                </View>
                            </View>
                        ) : null}
                    </Animated.View>
                );

            default:
                return null;
        }
    };

    return (
        <LinearGradient
            colors={isDark ? ['#0A0A0F', '#1a1a2e'] : ['#f0f9ff', '#e0f2fe']}
            style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.progressContainer}>
                    {STEPS.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.progressDot,
                                {
                                    backgroundColor: index <= currentStep
                                        ? theme.colors.primary
                                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                },
                            ]}
                        />
                    ))}
                </View>

                <ThemedText style={styles.stepIcon}>{STEPS[currentStep]?.icon ?? '👋'}</ThemedText>
                <ThemedText variant="h2" style={styles.stepTitle}>
                    {STEPS[currentStep]?.title ?? ''}
                </ThemedText>
                <ThemedText variant="body" color="textSecondary" style={styles.stepSubtitle}>
                    {STEPS[currentStep]?.subtitle ?? ''}
                </ThemedText>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {renderStep()}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                {currentStep > 0 && currentStep < 4 && (
                    <Button
                        title="Quay lại"
                        variant="outline"
                        onPress={handleBack}
                        style={{ flex: 1 }}
                    />
                )}

                {currentStep < 4 ? (
                    <Button
                        title={currentStep === 3 ? 'Hoàn tất' : 'Tiếp tục'}
                        onPress={handleNext}
                        disabled={!canProceed()}
                        style={{ flex: currentStep > 0 ? 1 : undefined, width: currentStep === 0 ? '100%' : undefined }}
                    />
                ) : (
                    <Button
                        title="Bắt đầu sử dụng"
                        onPress={handleComplete}
                        disabled={isCalculating}
                        style={{ width: '100%' }}
                    />
                )}
            </View>
        </LinearGradient>
    );
};

export default OnboardingScreen;
