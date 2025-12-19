// NotificationsScreen: Cài đặt thông báo
// Meal reminders với time pickers

import React, { useState, useEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Switch,
    Pressable,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { SettingsMenuItem } from '../../../components/ui/SettingsMenuItem';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { showSuccess, showInfo } from '../../../utils/errorHandler';
import { scheduleNotifications, requestNotificationPermissions, cancelAllMealNotifications } from '../../../services/notificationService';

// Storage key
const NOTIFICATIONS_SETTINGS_KEY = '@eatfitai_notifications';

// Default times
const DEFAULT_MEAL_TIMES = {
    breakfast: '07:00',
    lunch: '12:00',
    dinner: '19:00',
    snack: '15:00',
};

interface NotificationSettings {
    enabled: boolean;
    breakfastEnabled: boolean;
    breakfastTime: string;
    lunchEnabled: boolean;
    lunchTime: string;
    dinnerEnabled: boolean;
    dinnerTime: string;
    snackEnabled: boolean;
    snackTime: string;
    weeklyReviewEnabled: boolean;
}

const defaultSettings: NotificationSettings = {
    enabled: false,
    breakfastEnabled: true,
    breakfastTime: DEFAULT_MEAL_TIMES.breakfast,
    lunchEnabled: true,
    lunchTime: DEFAULT_MEAL_TIMES.lunch,
    dinnerEnabled: true,
    dinnerTime: DEFAULT_MEAL_TIMES.dinner,
    snackEnabled: false,
    snackTime: DEFAULT_MEAL_TIMES.snack,
    weeklyReviewEnabled: true,
};

const NotificationsScreen = (): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const glass = glassStyles(isDark);
    const navigation = useNavigation();

    const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
    const [isSaving, setIsSaving] = useState(false);

    // Load saved settings
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem(NOTIFICATIONS_SETTINGS_KEY);
            if (saved) {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            }
        } catch (error) {
            console.log('Error loading notification settings:', error);
        }
    };

    const saveSettings = async () => {
        try {
            setIsSaving(true);
            await AsyncStorage.setItem(NOTIFICATIONS_SETTINGS_KEY, JSON.stringify(settings));

            // Schedule notifications với expo-notifications
            if (settings.enabled) {
                // Yêu cầu quyền và schedule
                const hasPermission = await requestNotificationPermissions();
                if (hasPermission) {
                    await scheduleNotifications(settings);
                    showSuccess('settings_saved', { text2: 'Thông báo đã được bật' });
                } else {
                    // Không được cấp quyền - tắt lại settings
                    showInfo('Cần cấp quyền thông báo để bật nhắc nhở');
                }
            } else {
                // Tắt thông báo - cancel tất cả
                await cancelAllMealNotifications();
                showInfo('Thông báo đã tắt');
            }

            navigation.goBack();
        } catch (error) {
            console.log('Error saving notification settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = <K extends keyof NotificationSettings>(
        key: K,
        value: NotificationSettings[K]
    ) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const formatTime = (time: string): string => {
        const parts = time.split(':');
        const hours = parts[0] || '00';
        const minutes = parts[1] || '00';
        const h = parseInt(hours, 10);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${displayHour}:${minutes} ${period}`;
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
            padding: 4,
        },
        sectionTitle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
        },
        masterToggle: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            borderRadius: 16,
            backgroundColor: settings.enabled
                ? `${theme.colors.primary}15`
                : isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.02)',
            borderWidth: 2,
            borderColor: settings.enabled ? theme.colors.primary : 'transparent',
        },
        masterToggleText: {
            flex: 1,
        },
        mealItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        },
        mealIcon: {
            fontSize: 24,
            marginRight: 12,
        },
        mealInfo: {
            flex: 1,
        },
        mealLabel: {
            fontSize: 16,
            fontWeight: '500',
            color: theme.colors.text,
        },
        mealTime: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        disabledOverlay: {
            opacity: 0.5,
        },
        infoBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            padding: 16,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
        },
    });

    const MealReminderItem = ({
        icon,
        label,
        enabledKey,
        timeKey,
        enabled,
        time,
    }: {
        icon: string;
        label: string;
        enabledKey: keyof NotificationSettings;
        timeKey: keyof NotificationSettings;
        enabled: boolean;
        time: string;
    }) => (
        <View style={[styles.mealItem, !settings.enabled && styles.disabledOverlay]}>
            <ThemedText style={styles.mealIcon}>{icon}</ThemedText>
            <View style={styles.mealInfo}>
                <ThemedText style={styles.mealLabel}>{label}</ThemedText>
                <ThemedText style={styles.mealTime}>{formatTime(time)}</ThemedText>
            </View>
            <Switch
                value={enabled && settings.enabled}
                onValueChange={(val) => updateSetting(enabledKey as keyof NotificationSettings, val)}
                disabled={!settings.enabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={enabled ? '#fff' : '#f4f3f4'}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Thông báo"
                subtitle="Nhắc nhở bữa ăn"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Master Toggle */}
                <Animated.View entering={FadeInDown.delay(100)}>
                    <Pressable
                        style={styles.masterToggle}
                        onPress={() => updateSetting('enabled', !settings.enabled)}
                    >
                        <View style={styles.masterToggleText}>
                            <ThemedText variant="h3">
                                {settings.enabled ? '🔔 Thông báo đang bật' : '🔕 Thông báo đã tắt'}
                            </ThemedText>
                            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 4 }}>
                                Nhận nhắc nhở ghi lại bữa ăn
                            </ThemedText>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={(val) => updateSetting('enabled', val)}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            thumbColor={settings.enabled ? '#fff' : '#f4f3f4'}
                        />
                    </Pressable>
                </Animated.View>

                {/* Meal Reminders */}
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <View style={styles.sectionTitle}>
                        <ThemedText style={{ fontSize: 20 }}>🍽️</ThemedText>
                        <ThemedText variant="h3">Nhắc nhở bữa ăn</ThemedText>
                    </View>

                    <MealReminderItem
                        icon="🌅"
                        label="Bữa sáng"
                        enabledKey="breakfastEnabled"
                        timeKey="breakfastTime"
                        enabled={settings.breakfastEnabled}
                        time={settings.breakfastTime}
                    />
                    <MealReminderItem
                        icon="☀️"
                        label="Bữa trưa"
                        enabledKey="lunchEnabled"
                        timeKey="lunchTime"
                        enabled={settings.lunchEnabled}
                        time={settings.lunchTime}
                    />
                    <MealReminderItem
                        icon="🌙"
                        label="Bữa tối"
                        enabledKey="dinnerEnabled"
                        timeKey="dinnerTime"
                        enabled={settings.dinnerEnabled}
                        time={settings.dinnerTime}
                    />
                    <MealReminderItem
                        icon="🥤"
                        label="Bữa phụ"
                        enabledKey="snackEnabled"
                        timeKey="snackTime"
                        enabled={settings.snackEnabled}
                        time={settings.snackTime}
                    />
                </Animated.View>

                {/* Weekly Review */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                    <SettingsMenuItem
                        icon="📊"
                        label="Báo cáo tuần"
                        subtitle="Nhận thông báo phân tích hàng tuần"
                        rightElement={
                            <Switch
                                value={settings.weeklyReviewEnabled && settings.enabled}
                                onValueChange={(val) => updateSetting('weeklyReviewEnabled', val)}
                                disabled={!settings.enabled}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={settings.weeklyReviewEnabled ? '#fff' : '#f4f3f4'}
                            />
                        }
                    />
                </Animated.View>

                {/* Info */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.infoBox}>
                    <ThemedText style={{ fontSize: 16 }}>💡</ThemedText>
                    <ThemedText variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
                        Thông báo sẽ nhắc bạn ghi lại bữa ăn vào những thời điểm đã chọn.
                        Bạn cần cho phép quyền thông báo khi được hỏi.
                    </ThemedText>
                </Animated.View>

                {/* Save Button */}
                <Animated.View entering={FadeInDown.delay(500)}>
                    <Button
                        title={isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
                        onPress={saveSettings}
                        loading={isSaving}
                        disabled={isSaving}
                    />
                </Animated.View>
            </ScrollView>
        </View>
    );
};

export default NotificationsScreen;
