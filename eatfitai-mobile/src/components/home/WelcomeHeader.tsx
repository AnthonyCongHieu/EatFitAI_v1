/**
 * WelcomeHeader - Compact Emerald Nebula header bar.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { TEST_IDS } from '../../testing/testIds';
import { useEN } from '../../theme/emeraldNebula';
import { resolveServerUrl } from '../../utils/imageHelpers';

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
  userName?: string;
  avatarUrl?: string | null;
  streakCount?: number;
  unreadNotificationCount?: number;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
  onSettingsPress?: () => void;
  onStreakPress?: () => void;
}

const getTimeIcon = (): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { name: 'partly-sunny', color: '#f7c052' };
  if (h >= 12 && h < 15) return { name: 'sunny', color: '#f7c052' };
  if (h >= 15 && h < 18) return { name: 'sunny-outline', color: '#fb923c' };
  if (h >= 18 && h < 22) return { name: 'moon', color: '#a78bfa' };
  return { name: 'moon-outline', color: '#818cf8' };
};

const getGreetingText = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'CHÀO BUỔI SÁNG';
  if (h >= 12 && h < 18) return 'CHÀO BUỔI CHIỀU';
  return 'CHÀO BUỔI TỐI';
};

const getStreakColor = (streak: number) => {
  if (streak >= 100) return '#c084fc';
  if (streak >= 50) return '#f43f5e';
  if (streak >= 14) return '#f97316';
  if (streak >= 7) return '#eab308';
  if (streak >= 3) return '#10b981';
  return '#fff';
};

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  userName = '',
  avatarUrl = null,
  streakCount = 0,
  unreadNotificationCount = 0,
  onNotificationPress,
  onAvatarPress,
  onSettingsPress,
  onStreakPress,
}) => {
  const EN = useEN();
  const palette = {
    ...C_STATIC,
    bg: EN.bg,
    surfaceHigh: EN.surfaceHigh,
    primary: EN.primary,
    onSurface: EN.onSurface,
    textMuted: EN.textMuted,
    danger: EN.danger,
  };

  const timeIcon = getTimeIcon();
  const displayStreak = streakCount ?? 0;
  const resolvedAvatarUrl = resolveServerUrl(avatarUrl);

  return (
    <Animated.View
      entering={FadeInDown.delay(80).springify()}
      style={styles.container}
    >
      <View style={styles.left}>
        <Pressable onPress={onAvatarPress} style={styles.avatarContainer}>
          {resolvedAvatarUrl ? (
            <Image source={{ uri: resolvedAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: palette.surfaceHigh }]}>
              <Text style={[styles.avatarText, { color: palette.primary }]}>
                {(userName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>
        <View style={styles.texts}>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: palette.primary }]}>{getGreetingText()}</Text>
            <Ionicons name={timeIcon.name} size={16} color={timeIcon.color} style={styles.timeIcon} />
          </View>
          <Text style={[styles.name, { color: palette.onSurface }]} numberOfLines={1}>
            {userName || 'Bạn'}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {displayStreak >= 0 && (
          <Pressable style={[styles.streak, { backgroundColor: palette.surfaceHigh }]} onPress={onStreakPress} hitSlop={8}>
            <Ionicons name="flame" size={16} color={displayStreak > 0 ? '#ff8c8c' : palette.textMuted} />
            <Text style={[styles.streakText, { color: displayStreak > 0 ? getStreakColor(displayStreak) : palette.textMuted }]}>{displayStreak}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.iconButton, { backgroundColor: palette.surfaceHigh }]}
          onPress={onSettingsPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mở cài đặt"
        >
          <Ionicons name="settings-outline" size={21} color={palette.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.bell, { backgroundColor: palette.surfaceHigh }]}
          onPress={onNotificationPress}
          hitSlop={10}
          testID={TEST_IDS.home.notificationsButton}
          accessibilityRole="button"
          accessibilityLabel="Xem thông báo"
        >
          <Ionicons name="notifications-outline" size={22} color={palette.textMuted} />
          {unreadNotificationCount > 0 && (
            <View style={[styles.bellDot, { backgroundColor: palette.danger, borderColor: palette.bg }]} />
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
    paddingVertical: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 10,
    borderRadius: 22,
    shadowColor: C_STATIC.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C_STATIC.primary,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C_STATIC.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  greeting: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 0.5,
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.onSurface,
    letterSpacing: -0.2,
  },
  timeIcon: {
    marginLeft: 6,
    marginTop: -2,
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
