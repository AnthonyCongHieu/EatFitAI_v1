// GoalSettingsScreen: Cài đặt mục tiêu và hoạt động
// Cho phép chọn goal (giảm/giữ/tăng cân) và mức độ hoạt động

import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useProfileStore } from '../../../store/useProfileStore';
import { showSuccess, handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';

// Goal options
const GOAL_OPTIONS = [
    { value: 'lose', label: 'Giảm cân', icon: '📉', description: 'Ăn ít hơn calories tiêu hao', colorKey: 'danger' },
    { value: 'maintain', label: 'Giữ cân', icon: '⚖️', description: 'Cân bằng calories', colorKey: 'info' },
    { value: 'gain', label: 'Tăng cân', icon: '📈', description: 'Ăn nhiều hơn calories tiêu hao', colorKey: 'success' },
] as const;

// Activity level options
const ACTIVITY_OPTIONS = [
    { id: 1, value: 'sedentary', label: 'Ít vận động', icon: '🪑', description: 'Ngồi nhiều, ít đi lại' },
    { id: 2, value: 'light', label: 'Nhẹ nhàng', icon: '🚶', description: 'Đi bộ 1-3 ngày/tuần' },
    { id: 3, value: 'moderate', label: 'Trung bình', icon: '🏃', description: 'Tập thể dục 3-5 ngày/tuần' },
    { id: 4, value: 'active', label: 'Tích cực', icon: '💪', description: 'Tập luyện 6-7 ngày/tuần' },
    { id: 5, value: 'very_active', label: 'Rất tích cực', icon: '🏋️', description: 'Tập luyện cường độ cao hàng ngày' },
] as const;

const GoalSettingsScreen = (): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation();

    const { profile, updateProfile, isSaving } = useProfileStore((state) => ({
        profile: state.profile,
        updateProfile: state.updateProfile,
        isSaving: state.isSaving,
    }));

    const [selectedGoal, setSelectedGoal] = useState<string>('maintain');
    const [selectedActivity, setSelectedActivity] = useState<number>(3);

    // Load current values
    useEffect(() => {
        if (profile) {
            setSelectedGoal(profile.goal || 'maintain');
            setSelectedActivity(profile.activityLevelId || 3);
        }
    }, [profile]);

    const onSubmit = async () => {
        try {
            await updateProfile({
                goal: selectedGoal as any,
                activityLevelId: selectedActivity,
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
        optionsGrid: {
            gap: 12,
        },
        optionCard: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderRadius: 14,
            borderWidth: 2,
        },
        optionIcon: {
            fontSize: 28,
            marginRight: 14,
        },
        optionContent: {
            flex: 1,
        },
        optionLabel: {
            fontSize: 16,
            fontWeight: '600',
        },
        optionDesc: {
            fontSize: 13,
            marginTop: 2,
        },
        checkMark: {
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
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
                            Mục tiêu & Hoạt động
                        </ThemedText>
                    </View>
                </View>

                {/* Subtitle below */}
                <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: 8 }}>
                    Thiết lập mục tiêu dinh dưỡng
                </ThemedText>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Goal Selection */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                    <View style={styles.sectionTitle}>
                        <ThemedText style={{ fontSize: 20 }}></ThemedText>
                        <ThemedText variant="h3">Mục tiêu của bạn</ThemedText>
                    </View>

                    <View style={styles.optionsGrid}>
                        {GOAL_OPTIONS.map((goal) => {
                            const isSelected = selectedGoal === goal.value;
                            // Lấy màu an toàn - fallback về primary nếu không tìm thấy
                            const goalColor = String(theme.colors[goal.colorKey as keyof typeof theme.colors] || theme.colors.primary);

                            return (
                                <Pressable
                                    key={goal.value}
                                    onPress={() => setSelectedGoal(goal.value)}
                                    style={[
                                        styles.optionCard,
                                        {
                                            backgroundColor: isSelected
                                                ? `${goalColor}15`
                                                : isDark
                                                    ? 'rgba(255,255,255,0.03)'
                                                    : 'rgba(0,0,0,0.02)',
                                            borderColor: isSelected ? goalColor : 'transparent',
                                        },
                                    ]}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: isSelected }}
                                >
                                    <ThemedText style={styles.optionIcon}>{goal.icon}</ThemedText>
                                    <View style={styles.optionContent}>
                                        <ThemedText
                                            style={[
                                                styles.optionLabel,
                                                { color: isSelected ? goalColor : theme.colors.text },
                                            ]}
                                        >
                                            {goal.label}
                                        </ThemedText>
                                        <ThemedText
                                            style={[styles.optionDesc, { color: theme.colors.textSecondary }]}
                                        >
                                            {goal.description}
                                        </ThemedText>
                                    </View>
                                    {isSelected && (
                                        <View style={[styles.checkMark, { backgroundColor: goalColor }]}>
                                            <ThemedText style={{ color: '#fff', fontSize: 14 }}>✓</ThemedText>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Activity Level Selection */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <View style={styles.sectionTitle}>
                        <ThemedText style={{ fontSize: 20 }}></ThemedText>
                        <ThemedText variant="h3">Mức độ vận động</ThemedText>
                    </View>

                    <View style={styles.optionsGrid}>
                        {ACTIVITY_OPTIONS.map((activity) => {
                            const isSelected = selectedActivity === activity.id;

                            return (
                                <Pressable
                                    key={activity.id}
                                    onPress={() => setSelectedActivity(activity.id)}
                                    style={[
                                        styles.optionCard,
                                        {
                                            backgroundColor: isSelected
                                                ? `${theme.colors.primary}15`
                                                : isDark
                                                    ? 'rgba(255,255,255,0.03)'
                                                    : 'rgba(0,0,0,0.02)',
                                            borderColor: isSelected ? theme.colors.primary : 'transparent',
                                        },
                                    ]}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: isSelected }}
                                >
                                    <ThemedText style={styles.optionIcon}>{activity.icon}</ThemedText>
                                    <View style={styles.optionContent}>
                                        <ThemedText
                                            style={[
                                                styles.optionLabel,
                                                { color: isSelected ? theme.colors.primary : theme.colors.text },
                                            ]}
                                        >
                                            {activity.label}
                                        </ThemedText>
                                        <ThemedText
                                            style={[styles.optionDesc, { color: theme.colors.textSecondary }]}
                                        >
                                            {activity.description}
                                        </ThemedText>
                                    </View>
                                    {isSelected && (
                                        <View style={[styles.checkMark, { backgroundColor: theme.colors.primary }]}>
                                            <ThemedText style={{ color: '#fff', fontSize: 14 }}>✓</ThemedText>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Save Button */}
                <Animated.View entering={FadeInDown.delay(300)}>
                    <Button
                        title={isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        onPress={onSubmit}
                        loading={isSaving}
                        disabled={isSaving}
                    />
                </Animated.View>
            </ScrollView>
        </LinearGradient>
    );
};

export default GoalSettingsScreen;
