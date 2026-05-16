import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Switch, Pressable, Modal, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../../../components/ThemedText';
import {
  scheduleNotifications,
  requestNotificationPermissions,
  cancelAllMealNotifications,
} from '../../../services/notificationService';

// Storage key
const NOTIFICATIONS_SETTINGS_KEY = '@eatfitai_notifications';

const DEFAULT_MEAL_TIMES = { breakfast: '07:30', lunch: '12:00', dinner: '19:00', snack: '15:30' };

interface NotificationSettings {
  enabled: boolean;
  breakfastEnabled: boolean; breakfastTime: string;
  lunchEnabled: boolean; lunchTime: string;
  dinnerEnabled: boolean; dinnerTime: string;
  snackEnabled: boolean; snackTime: string;

  waterReminderEnabled: boolean;
  weeklyReviewEnabled: boolean;
  goalAchievedEnabled: boolean;
  streakRiskEnabled: boolean;

  aiRecipeSuggestionsEnabled: boolean;
  aiNutritionTipsEnabled: boolean;
  aiAchievementUnlockedEnabled: boolean;

  quietHoursEnabled: boolean;
  quietHoursFrom: string;
  quietHoursTo: string;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  breakfastEnabled: true, breakfastTime: DEFAULT_MEAL_TIMES.breakfast,
  lunchEnabled: true, lunchTime: DEFAULT_MEAL_TIMES.lunch,
  dinnerEnabled: true, dinnerTime: DEFAULT_MEAL_TIMES.dinner,
  snackEnabled: false, snackTime: DEFAULT_MEAL_TIMES.snack,

  waterReminderEnabled: true,
  weeklyReviewEnabled: true,
  goalAchievedEnabled: true,
  streakRiskEnabled: true,

  aiRecipeSuggestionsEnabled: false,
  aiNutritionTipsEnabled: true,
  aiAchievementUnlockedEnabled: true,

  quietHoursEnabled: true,
  quietHoursFrom: '22:00', // 10:00 PM
  quietHoursTo: '07:00', // 07:00 AM
};

const P = {
  primary: '#22c55e',
  onPrimary: '#003915',
  surface: '#0e1322',
  surfaceContainerLowest: '#090e1c',
  surfaceContainerLow: '#161b2b',
  surfaceContainerHighest: '#2f3445',
  surfaceGlass: '#1a1e2e',  // Solid color — rgba causes 2-tone bug on Android
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  glassBorder: 'rgba(61, 74, 61, 0.2)',
  slate500: '#64748b',
  slate400: '#94a3b8',
};

// Helpers
const timeStringToDate = (time: string): Date => {
  const parts = time.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const dateToTimeString = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

type TimeKey = 'breakfastTime' | 'lunchTime' | 'dinnerTime' | 'snackTime' | 'quietHoursFrom' | 'quietHoursTo';

const MEAL_ITEMS = [
  { label: 'Nhắc ăn sáng', timeKey: 'breakfastTime' as TimeKey, toggleKey: 'breakfastEnabled' as keyof NotificationSettings, icon: 'restaurant-outline' },
  { label: 'Nhắc ăn trưa', timeKey: 'lunchTime' as TimeKey, toggleKey: 'lunchEnabled' as keyof NotificationSettings, icon: 'nutrition-outline' },
  { label: 'Nhắc ăn tối', timeKey: 'dinnerTime' as TimeKey, toggleKey: 'dinnerEnabled' as keyof NotificationSettings, icon: 'pizza-outline' },
  { label: 'Nhắc bữa phụ', timeKey: 'snackTime' as TimeKey, toggleKey: 'snackEnabled' as keyof NotificationSettings, icon: 'cafe-outline', dim: true },
];

const NotificationsScreen = (): React.ReactElement => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [, setIsSaving] = useState(false);

  // Time picker state
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingTimeKey, setEditingTimeKey] = useState<TimeKey | null>(null);
  const [editingTimeLabel, setEditingTimeLabel] = useState('');
  const [tempDate, setTempDate] = useState(new Date());

  // "Đổi giờ" mode — inline editing of meal times
  const [isEditingMealTimes, setIsEditingMealTimes] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATIONS_SETTINGS_KEY);
      if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    } catch (error) { console.log('Error loading notification settings:', error); }
  };

  const saveSettings = async (newSettings = settings) => {
    try {
      setIsSaving(true);
      await AsyncStorage.setItem(NOTIFICATIONS_SETTINGS_KEY, JSON.stringify(newSettings));
      if (newSettings.enabled) {
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          await scheduleNotifications(newSettings);
        }
      } else {
        await cancelAllMealNotifications();
      }
    } catch (error) {
      console.log('Error saving notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    // Auto save on toggle to match modern UX
    saveSettings(updated);
  };

  const formatTime = (time: string): string => {
    const parts = time.split(':');
    const h = parseInt(parts[0] || '00', 10);
    const m = parts[1] || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const formattedHour = displayHour < 10 ? `0${displayHour}` : displayHour;
    return `${formattedHour}:${m} ${period}`;
  };

  const openTimePicker = useCallback((timeKey: TimeKey, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTimeKey(timeKey);
    setEditingTimeLabel(label);
    setTempDate(timeStringToDate(settings[timeKey] as string));
    setTimePickerVisible(true);
  }, [settings]);

  const handleTimeChange = useCallback((_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setTimePickerVisible(false);
      if (selectedDate && editingTimeKey) {
        updateSetting(editingTimeKey, dateToTimeString(selectedDate));
      }
      return;
    }
    // iOS — just update temp date, confirm on button press
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  }, [editingTimeKey]);

  const confirmTimePicker = useCallback(() => {
    if (editingTimeKey) {
      updateSetting(editingTimeKey, dateToTimeString(tempDate));
    }
    setTimePickerVisible(false);
  }, [editingTimeKey, tempDate]);

  const toggleEditMealTimes = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditingMealTimes((prev) => !prev);
  }, []);

  // Switch Toggle wrapper mimicking iOS/custom styling
  const CustomToggle = ({ value, onValueChange, disabled = false }: { value: boolean, onValueChange: (val: boolean) => void, disabled?: boolean }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: P.surfaceContainerHighest, true: P.primary }}
      thumbColor={'#fff'}
    />
  );

  const disabledInner = !settings.enabled;

  return (
    <View style={S.container}>
      {/* ═══ Header ═══ */}
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, width: 40 }}>
          <Ionicons name="arrow-back" size={24} color={P.primary} />
        </Pressable>
        <View style={S.headerCenter}>
          <ThemedText style={S.headerTitle}>Cài đặt thông báo</ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[S.scrollContent, { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
        {/* Master Toggle Card — always full opacity */}
        <Animated.View entering={FadeInDown.delay(100)} style={[S.glassCard, S.masterCard]}>
          <View style={[S.rowCenter, { flex: 1 }]}>
            <View style={S.iconBoxPrimary}>
              <Ionicons name="notifications" size={24} color={P.primary} />
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <ThemedText style={S.titleWhite}>Tất cả thông báo</ThemedText>
              <ThemedText style={S.subText}>Quản lý tùy chọn thông báo</ThemedText>
            </View>
          </View>
          <CustomToggle value={settings.enabled} onValueChange={(val) => updateSetting('enabled', val)} disabled={false} />
        </Animated.View>

        {/* Inner content — dim when notifications off */}
        <View style={{ marginTop: 24, opacity: disabledInner ? 0.45 : 1 }}>
          {/* Meal Reminders Card */}
          <View style={[S.glassCard, { marginBottom: 24 }]}>
            <ThemedText style={S.sectionLabel}>NHẮC NHỞ BỮA ĂN</ThemedText>

            <View style={S.gapLarge}>
              {MEAL_ITEMS.map((item) => (
                <View key={item.label} style={S.rowBetween}>
                  <View style={[S.rowCenter, { flex: 1, marginRight: 8 }]}>
                    <View style={[S.iconBoxDark, item.dim && !settings[item.toggleKey] && { opacity: 0.6 }]}>
                      <Ionicons name={item.icon as any} size={20} color={P.primary} />
                    </View>
                    <ThemedText
                      style={[S.itemText, !settings[item.toggleKey] && { color: P.slate400, fontFamily: 'Inter_500Medium' }, { flex: 1 }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </ThemedText>
                  </View>
                  <View style={S.rowCenterGap}>
                    {isEditingMealTimes ? (
                      <Pressable
                        onPress={() => openTimePicker(item.timeKey, item.label)}
                        style={S.timeEditBtn}
                        hitSlop={8}
                        disabled={disabledInner}
                      >
                        <ThemedText style={S.timeEditText}>{formatTime(settings[item.timeKey] as string)}</ThemedText>
                      </Pressable>
                    ) : (
                      <ThemedText style={S.timeText}>{formatTime(settings[item.timeKey] as string)}</ThemedText>
                    )}
                    <CustomToggle
                      value={settings[item.toggleKey] as boolean}
                      onValueChange={(val) => updateSetting(item.toggleKey, val)}
                      disabled={!settings.enabled}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* "Đổi giờ" toggle button */}
            <Pressable style={S.editBtn} onPress={toggleEditMealTimes} hitSlop={12} disabled={disabledInner}>
              <ThemedText style={S.editBtnText}>
                {isEditingMealTimes ? 'XONG' : 'ĐỔI GIỜ'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Health Alerts Card */}
          <View style={[S.glassCard, { marginBottom: 24 }]}>
            <ThemedText style={S.sectionLabel}>CẢNH BÁO SỨC KHỎE</ThemedText>
            <View style={S.gapMedium}>
              {[
                { label: 'Nhắc uống nước', key: 'waterReminderEnabled' },
                { label: 'Báo cáo tiến độ tuần', key: 'weeklyReviewEnabled' },
                { label: 'Chúc mừng đạt mục tiêu', key: 'goalAchievedEnabled' },
                { label: 'Cảnh báo mất chuỗi', key: 'streakRiskEnabled' },
              ].map((item) => (
                <View key={item.label} style={S.rowBetween}>
                  <ThemedText style={[S.itemTextStandard, { flex: 1, paddingRight: 16 }]} numberOfLines={2}>{item.label}</ThemedText>
                  <CustomToggle
                    value={settings[item.key as keyof NotificationSettings] as boolean}
                    onValueChange={(val) => updateSetting(item.key as keyof NotificationSettings, val)}
                    disabled={!settings.enabled}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* AI Insights Card */}
          <View style={[S.glassCard, { marginBottom: 24 }]}>
            <ThemedText style={S.sectionLabel}>AI & GỢI Ý</ThemedText>
            <View style={S.gapMedium}>
              {[
                { label: 'Gợi ý công thức mới', key: 'aiRecipeSuggestionsEnabled' },
                { label: 'Mẹo dinh dưỡng từ AI', key: 'aiNutritionTipsEnabled' },
                { label: 'Thông báo thành tích mới', key: 'aiAchievementUnlockedEnabled' },
              ].map((item) => (
                <View key={item.label} style={S.rowBetween}>
                  <ThemedText style={[S.itemTextStandard, !settings[item.key as keyof NotificationSettings] && { color: P.slate400 }, { flex: 1, paddingRight: 16 }]} numberOfLines={2}>
                    {item.label}
                  </ThemedText>
                  <CustomToggle
                    value={settings[item.key as keyof NotificationSettings] as boolean}
                    onValueChange={(val) => updateSetting(item.key as keyof NotificationSettings, val)}
                    disabled={!settings.enabled}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Quiet Hours Card */}
          <View style={[S.glassCard, { marginBottom: 24 }]}>
            <View style={S.rowBetweenStart}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <ThemedText style={S.titleWhite}>Giờ yên tĩnh</ThemedText>
                <ThemedText style={S.subText}>Không làm phiền trong thời gian này</ThemedText>
              </View>
              <CustomToggle
                value={settings.quietHoursEnabled}
                onValueChange={(val) => updateSetting('quietHoursEnabled', val)}
                disabled={!settings.enabled}
              />
            </View>

            <View style={S.quietGrid}>
              <Pressable
                style={S.quietBox}
                onPress={() => openTimePicker('quietHoursFrom', 'Bắt đầu yên tĩnh')}
                disabled={disabledInner || !settings.quietHoursEnabled}
              >
                <ThemedText style={S.quietLabel}>TỪ</ThemedText>
                <ThemedText style={S.quietTime}>{formatTime(settings.quietHoursFrom)}</ThemedText>
              </Pressable>
              <Pressable
                style={S.quietBox}
                onPress={() => openTimePicker('quietHoursTo', 'Kết thúc yên tĩnh')}
                disabled={disabledInner || !settings.quietHoursEnabled}
              >
                <ThemedText style={S.quietLabel}>ĐẾN</ThemedText>
                <ThemedText style={S.quietTime}>{formatTime(settings.quietHoursTo)}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ═══ Time Picker Modal (iOS) ═══ */}
      {Platform.OS === 'ios' && timePickerVisible && (
        <Modal transparent animationType="slide" visible={timePickerVisible}>
          <View style={S.modalOverlay}>
            <Animated.View entering={FadeIn.duration(200)} style={S.modalContent}>
              <View style={S.modalHeader}>
                <Pressable onPress={() => setTimePickerVisible(false)}>
                  <ThemedText style={S.modalCancel}>Hủy</ThemedText>
                </Pressable>
                <ThemedText style={S.modalTitle}>{editingTimeLabel}</ThemedText>
                <Pressable onPress={confirmTimePicker}>
                  <ThemedText style={S.modalDone}>Xong</ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor="#fff"
                locale="vi"
                style={{ height: 200 }}
              />
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* ═══ Time Picker (Android) ═══ */}
      {Platform.OS === 'android' && timePickerVisible && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          is24Hour={false}
        />
      )}
    </View>
  );
};

export default NotificationsScreen;

/* ═══ Styles ═══ */
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 15,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: P.primary, letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  glassCard: {
    backgroundColor: P.surfaceGlass,
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: P.glassBorder,
    shadowColor: P.primary, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5,
  },
  masterCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  iconBoxPrimary: { width: 48, height: 48, borderRadius: 16, backgroundColor: P.primary + '33', alignItems: 'center', justifyContent: 'center' },
  iconBoxDark: { width: 40, height: 40, borderRadius: 12, backgroundColor: P.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' },

  titleWhite: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  subText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: P.slate400, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', color: P.slate500, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBetweenStart: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowCenterGap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  gapLarge: { gap: 20 },
  gapMedium: { gap: 16 },

  itemText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff', marginLeft: 12 },
  itemTextStandard: { fontSize: 16, fontFamily: 'Inter_500Medium', color: '#fff' },
  timeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: P.slate500 },

  // Time edit button (when in editing mode)
  timeEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: P.primary + '18', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: P.primary + '40',
  },
  timeEditText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: P.primary },

  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  editBtnText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: P.primary, letterSpacing: 1 },

  quietGrid: { flexDirection: 'row', gap: 16, marginTop: 20 },
  quietBox: {
    flex: 1, backgroundColor: P.surfaceContainerLowest,
    borderWidth: 1, borderColor: P.glassBorder, borderRadius: 16,
    padding: 16, gap: 4,
  },
  quietTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quietLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: P.slate500, textTransform: 'uppercase' },
  quietTime: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },

  // Modal styles for iOS time picker
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1a1e30',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  modalCancel: { fontSize: 15, fontFamily: 'Inter_500Medium', color: P.slate400 },
  modalDone: { fontSize: 15, fontFamily: 'Inter_700Bold', color: P.primary },
});
