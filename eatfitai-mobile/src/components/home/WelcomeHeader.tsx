/**
 * WelcomeHeader – Compact Emerald Nebula header bar
 */
import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { TEST_IDS } from '../../testing/testIds';
import { useEN } from '../../theme/emeraldNebula';

const C_STATIC = {
  bg: '#05070d',
  surfaceHigh: '#252b3f',
  primary: '#4be277',
  onSurface: '#dee1f7',
  textMuted: '#9aa9c1',
  danger: '#ff8c8c',
};
const C = C_STATIC;

interface WelcomeHeaderProps {
  streakCount?: number;
  unreadNotificationCount?: number;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
  onSettingsPress?: () => void;
  onStreakPress?: () => void;
}

/** Return a time-of-day icon using Ionicons */
const getTimeIcon = (): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { name: 'partly-sunny', color: '#f7c052' };   // Sáng – mặt trời nửa mây
  if (h >= 12 && h < 15) return { name: 'sunny', color: '#f7c052' };          // Trưa – full mặt trời
  if (h >= 15 && h < 18) return { name: 'sunny-outline', color: '#fb923c' };  // Chiều – mặt trời hạ
  if (h >= 18 && h < 22) return { name: 'moon', color: '#a78bfa' };           // Tối – mặt trăng
  return { name: 'moon-outline', color: '#818cf8' };                           // Khuya
};


const getStreakColor = (streak: number) => {
  if (streak >= 100) return '#c084fc'; // Purple (Legendary)
  if (streak >= 50) return '#f43f5e';  // Rose/Red
  if (streak >= 14) return '#f97316';  // Orange
  if (streak >= 7) return '#eab308';   // Yellow
  if (streak >= 3) return '#10b981';   // Emerald
  return '#fff'; // Default
};

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  streakCount = 0,
  unreadNotificationCount = 0,
  onNotificationPress,
  onSettingsPress,
  onStreakPress,
}) => {
  const EN = useEN();
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const C = {
    ...C_STATIC,
    bg: EN.bg,
    surfaceHigh: EN.surfaceHigh,
    primary: EN.primary,
    onSurface: EN.onSurface,
    textMuted: EN.textMuted,
    danger: EN.danger,
  };

  const timeIcon = getTimeIcon();
  const companionStatus = streakCount > 0 ? `${streakCount} ngày liên tiếp` : 'Sẵn sàng hỗ trợ';

  return (
    <Animated.View
      entering={FadeInDown.delay(80).springify()}
      style={styles.container}
    >
      <View style={styles.left}>
        <View style={styles.texts}>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: C.primary }]}>MoChi</Text>
            <Ionicons name={timeIcon.name} size={13} color={timeIcon.color} style={{ marginLeft: 4 }} />
          </View>
          <Text style={[styles.name, { color: C.onSurface }]} numberOfLines={1}>
            {companionStatus}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {streakCount > 0 && (
          <Pressable style={[styles.streak, { backgroundColor: C.surfaceHigh }]} onPress={onStreakPress} hitSlop={8}>
            <Ionicons name="flame" size={16} color="#ff8c8c" />
            <Text style={[styles.streakText, { color: getStreakColor(streakCount) }]}>{streakCount}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.iconButton, { backgroundColor: C.surfaceHigh }]}
          onPress={onSettingsPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mở cài đặt"
        >
          <Ionicons name="settings-outline" size={21} color={C.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.bell, { backgroundColor: C.surfaceHigh }]}
          onPress={onNotificationPress}
          hitSlop={10}
          testID={TEST_IDS.home.notificationsButton}
          accessibilityRole="button"
          accessibilityLabel="Xem thông báo"
        >
          <Ionicons name="notifications-outline" size={22} color={C.textMuted} />
          {unreadNotificationCount > 0 && (
            <View style={[styles.bellDot, { backgroundColor: C.danger, borderColor: C.bg }]} />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,   // ← was 8, reduced for compact header
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  texts: { flex: 1 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  greeting: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C.primary,
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C.onSurface,
    letterSpacing: -0.1,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  streakText: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C.onSurface,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
});

export default WelcomeHeader;
