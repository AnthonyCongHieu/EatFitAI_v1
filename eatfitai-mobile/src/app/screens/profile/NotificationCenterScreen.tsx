import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import { getScheduledNotifications } from '../../../services/notificationService';
import type { RootStackParamList } from '../../types';
import { useEN } from '../../../theme/emeraldNebula';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const P_STATIC = {
  primary: '#4be277',
  surface: '#0e1322',
  surfaceContainer: '#1a1f2f',
  surfaceContainerLow: '#161b2b',
  surfaceContainerHigh: '#25293a',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  outline: 'rgba(255,255,255,0.06)',
};

type NotificationPreview = {
  id: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
};

const FALLBACK_NOTIFICATIONS: NotificationPreview[] = [
  {
    id: 'meal-reminder',
    title: 'Nhắc ghi bữa',
    body: 'Các nhắc nhở bữa ăn sẽ xuất hiện ở đây khi đến giờ.',
    icon: 'restaurant-outline',
    tone: '#4be277',
  },
  {
    id: 'water-reminder',
    title: 'Uống nước',
    body: 'MoChi sẽ gom các nhắc uống nước quan trọng trong trung tâm này.',
    icon: 'water-outline',
    tone: '#38bdf8',
  },
  {
    id: 'weekly-review',
    title: 'Báo cáo tiến độ',
    body: 'Khi có báo cáo tuần hoặc cảnh báo cần xem, bạn sẽ thấy tại đây.',
    icon: 'bar-chart-outline',
    tone: '#a78bfa',
  },
];

const buildNotificationPreviews = (scheduled: any[]): NotificationPreview[] => {
  if (!scheduled.length) {
    return FALLBACK_NOTIFICATIONS;
  }

  return scheduled.slice(0, 8).map((item, index) => {
    const content = item?.content ?? item?.request?.content ?? {};
    return {
      id: String(item?.identifier ?? item?.request?.identifier ?? `scheduled-${index}`),
      title: String(content.title ?? 'Thông báo EatFitAI'),
      body: String(content.body ?? 'Thông báo đã được lên lịch.'),
      icon: 'notifications-outline',
      tone: P.primary,
    };
  });
};

const NotificationCenterScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const P = { ...P_STATIC, ...useEN() };
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const nextScheduled = await getScheduledNotifications();
      setScheduled(Array.isArray(nextScheduled) ? nextScheduled : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const notifications = useMemo(
    () => buildNotificationPreviews(scheduled),
    [scheduled],
  );

  return (
    <View style={[S.container, { paddingTop: insets.top, backgroundColor: P.bg }]}>
      <View style={S.header}>
        <Pressable
          style={S.headerButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="chevron-back" size={24} color={P.primary} />
        </Pressable>
        <View style={S.headerCopy}>
          <ThemedText style={S.headerTitle}>Thông báo</ThemedText>
          <ThemedText style={S.headerSubtitle}>Những việc cần bạn xem</ThemedText>
        </View>
        <Pressable
          style={S.headerButton}
          onPress={() => navigation.navigate('NotificationsSettings')}
          accessibilityRole="button"
          accessibilityLabel="Cài đặt thông báo"
        >
          <Ionicons name="settings-outline" size={21} color={P.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={S.summaryCard}>
          <View style={S.summaryIcon}>
            <Ionicons name="notifications" size={24} color={P.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={S.summaryTitle}>
              {scheduled.length > 0 ? 'Thông báo đã lên lịch' : 'Chưa có thông báo mới'}
            </ThemedText>
            <ThemedText style={S.summaryText}>
              {scheduled.length > 0
                ? `${scheduled.length} thông báo đang chờ được gửi.`
                : 'Khi có nhắc bữa, nước hoặc báo cáo cần xem, EatFitAI sẽ gom ở đây.'}
            </ThemedText>
          </View>
        </View>

        {isLoading ? (
          <View style={S.loadingBox}>
            <ActivityIndicator color={P.primary} />
          </View>
        ) : (
          <View style={S.list}>
            {notifications.map((item) => (
              <View key={item.id} style={S.notificationRow}>
                <View style={[S.notificationIcon, { backgroundColor: item.tone + '18' }]}>
                  <Ionicons name={item.icon} size={20} color={item.tone} />
                </View>
                <View style={S.notificationCopy}>
                  <ThemedText style={S.notificationTitle}>{item.title}</ThemedText>
                  <ThemedText style={S.notificationBody}>{item.body}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.surface,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.outline,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.surfaceContainerLow,
    borderWidth: 1,
    borderColor: P.outline,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: P.onSurface,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: P.onSurfaceVariant,
  },
  scrollContent: {
    padding: 18,
    gap: 14,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    padding: 16,
    backgroundColor: P.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(75,226,119,0.16)',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.primary + '18',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: P.onSurface,
  },
  summaryText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: P.onSurfaceVariant,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  list: {
    gap: 10,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: P.surfaceContainerLow,
    borderWidth: 1,
    borderColor: P.outline,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: P.onSurface,
  },
  notificationBody: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: P.onSurfaceVariant,
  },
});

export default NotificationCenterScreen;
