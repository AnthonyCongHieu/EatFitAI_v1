import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import MeshBackground from '../../../components/ui/MeshBackground';
import MoChiInlineNotice from '../../../features/mochi/MoChiInlineNotice';
import {
  selectUnreadMoChiNotificationCount,
  useMoChiNotificationInboxStore,
  type MoChiNotificationItem,
} from '../../../features/mochi/mochiNotificationInbox';
import { performMoChiNotificationAction } from '../../../features/mochi/mochiNotificationActions';
import type { RootStackParamList } from '../../types';
import { useEN } from '../../../theme/emeraldNebula';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const P_STATIC = {
  primary: '#4be277',
  surface: '#05070d',
  surfaceContainer: '#1a1f2f',
  surfaceContainerLow: '#0f1625',
  surfaceContainerHigh: '#252b3f',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#b7c4d9',
  outline: 'rgba(226,232,240,0.12)',
};
const P = P_STATIC;

const getNotificationVisual = (
  item: MoChiNotificationItem,
): { icon: keyof typeof Ionicons.glyphMap; tone: string } => {
  if (item.eventType === 'water_reminder') {
    return { icon: 'water-outline', tone: '#38bdf8' };
  }

  if (item.category === 'report') {
    return { icon: 'bar-chart-outline', tone: '#a78bfa' };
  }

  if (item.category === 'tip') {
    return { icon: 'sparkles-outline', tone: '#f7c052' };
  }

  return { icon: 'restaurant-outline', tone: '#4be277' };
};

const getNotificationStateLabel = (item: MoChiNotificationItem): string => {
  if (item.resolvedAt) {
    return 'Đã xong';
  }

  if (item.readAt) {
    return 'Đã xem';
  }

  return 'Mới';
};

const NotificationCenterScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const palette = { ...P_STATIC, ...useEN() };
  const items = useMoChiNotificationInboxStore((state) => state.items);
  const markRead = useMoChiNotificationInboxStore((state) => state.markRead);
  const markActed = useMoChiNotificationInboxStore((state) => state.markActed);
  const unreadCount = useMemo(() => selectUnreadMoChiNotificationCount(items), [items]);

  const handleOpenItem = (item: MoChiNotificationItem) => {
    if (item.resolvedAt) {
      markRead(item.id);
      return;
    }

    markActed(item.id);
    performMoChiNotificationAction(item.action, item.mealTypeId);
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <MeshBackground />
      <View style={S.header}>
        <Pressable
          style={S.headerButton}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface} />
        </Pressable>
        <View style={S.headerCopy}>
          <ThemedText style={S.headerTitle}>Thông báo</ThemedText>
          <ThemedText style={S.headerSubtitle}>Những việc cần bạn xem</ThemedText>
        </View>
        <Pressable
          style={S.headerButton}
          onPress={() => navigation.navigate('NotificationsSettings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Cài đặt thông báo"
        >
          <Ionicons name="settings-outline" size={21} color={palette.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={S.summaryCard}>
          <View style={S.summaryIcon}>
            <Ionicons name="notifications" size={24} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={S.summaryTitle}>
              {unreadCount > 0 ? `${unreadCount} việc mới cần xem` : 'Đã xem hết thông báo'}
            </ThemedText>
            <ThemedText style={S.summaryText}>
              {unreadCount > 0
                ? 'MoChi chỉ giữ lại các nhắc nhở có hành động rõ ràng hoặc báo cáo cần kiểm tra.'
                : 'Khi có nhắc bữa, nước hoặc báo cáo quan trọng, chúng sẽ nằm ở đây.'}
            </ThemedText>
          </View>
        </View>

        {items.length === 0 ? (
          <MoChiInlineNotice
            mochiEvent="weekly_review"
            routeName="NotificationCenter"
            title="Chưa có việc cần xem"
            message="Khi có nhắc nhở quan trọng, MoChi sẽ gom lại ở đây để bạn xử lý khi tiện."
            compact
            tone="calm"
          />
        ) : (
          <View style={S.list}>
            {items.map((item) => {
              const visual = getNotificationVisual(item);
              const isUnread = !item.readAt && !item.resolvedAt;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleOpenItem(item)}
                  style={[
                    S.notificationRow,
                    isUnread && S.notificationRowUnread,
                    item.resolvedAt && S.notificationRowResolved,
                  ]}
                >
                  <View style={[S.notificationIcon, { backgroundColor: visual.tone + '18' }]}>
                    <Ionicons name={visual.icon} size={20} color={visual.tone} />
                  </View>
                  <View style={S.notificationCopy}>
                    <View style={S.notificationTitleRow}>
                      <ThemedText style={S.notificationTitle} numberOfLines={1}>
                        {item.title}
                      </ThemedText>
                      <ThemedText style={[S.notificationState, isUnread && { color: palette.primary }]}>
                        {getNotificationStateLabel(item)}
                      </ThemedText>
                    </View>
                    <ThemedText style={S.notificationBody} numberOfLines={2}>
                      {item.body}
                    </ThemedText>
                    {item.ctaLabel && !item.resolvedAt && (
                      <ThemedText style={[S.notificationCta, { color: palette.primary }]}>
                        {item.ctaLabel}
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              );
            })}
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
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'BeVietnamPro_600SemiBold',
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
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
  },
  summaryText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: P.onSurfaceVariant,
  },
  list: {
    gap: 10,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 84,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: P.surfaceContainerLow,
    borderWidth: 1,
    borderColor: P.outline,
  },
  notificationRowUnread: {
    borderColor: 'rgba(75,226,119,0.24)',
  },
  notificationRowResolved: {
    opacity: 0.72,
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
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
  },
  notificationState: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurfaceVariant,
  },
  notificationBody: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: P.onSurfaceVariant,
  },
  notificationCta: {
    marginTop: 5,
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
  },
});

export default NotificationCenterScreen;
