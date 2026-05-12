/**
 * WelcomeHeader – Compact Emerald Nebula header bar
 */
import React from 'react';
import { View, StyleSheet, Pressable, Text, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';

const C = {
  bg: '#0a0e1a',
  surfaceHigh: '#1e2435',
  primary: '#4be277',
  onSurface: '#dee1f7',
  textMuted: '#94a3b8',
  danger: '#ff6b6b',
};

interface WelcomeHeaderProps {
  streakCount?: number;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
  onStreakPress?: () => void;
}

/** Return a time-of-day icon using Ionicons */
const getTimeIcon = (): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { name: 'partly-sunny', color: '#fbbf24' };   // Sáng – mặt trời nửa mây
  if (h >= 12 && h < 15) return { name: 'sunny', color: '#f59e0b' };          // Trưa – full mặt trời
  if (h >= 15 && h < 18) return { name: 'sunny-outline', color: '#fb923c' };  // Chiều – mặt trời hạ
  if (h >= 18 && h < 22) return { name: 'moon', color: '#a78bfa' };           // Tối – mặt trăng
  return { name: 'moon-outline', color: '#818cf8' };                           // Khuya
};

const getGreetingText = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'CHÀO BUỔI SÁNG';
  if (h >= 12 && h < 15) return 'CHÀO BUỔI TRƯA';
  if (h >= 15 && h < 18) return 'CHÀO BUỔI CHIỀU';
  if (h >= 18 && h < 22) return 'CHÀO BUỔI TỐI';
  return 'KHUYA RỒI';
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
  onNotificationPress,
  onAvatarPress,
  onStreakPress,
}) => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  const displayName = profile?.fullName || user?.name || user?.email?.split('@')[0] || 'Bạn';
  const initials = displayName.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatarUrl;

  const timeIcon = getTimeIcon();

  return (
    <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.container}>
      {/* Left: avatar + texts */}
      <View style={styles.left}>
        <View style={styles.avatarRing}>
          <View style={styles.avatarInner}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
        </View>
        <View style={styles.texts}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>{getGreetingText()}</Text>
            <Ionicons name={timeIcon.name} size={14} color={timeIcon.color} style={{ marginLeft: 4 }} />
          </View>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        </View>
      </View>

      {/* Right: streak + bell */}
      <View style={styles.right}>
        {streakCount > 0 && (
          <Pressable style={styles.streak} onPress={onStreakPress} hitSlop={8}>
            <Ionicons name="flame" size={16} color="#ef4444" />
            <Text style={[styles.streakText, { color: getStreakColor(streakCount) }]}>{streakCount}</Text>
          </Pressable>
        )}
        <Pressable style={styles.bell} onPress={onNotificationPress} hitSlop={10}>
          <Ionicons name="notifications-outline" size={22} color={C.textMuted} />
          <View style={styles.bellDot} />
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
    gap: 10,
    flex: 1,
  },

  avatarRing: {
    width: 40,            // ← was 44, reduced slightly
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.primary,
    padding: 2,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },

  texts: { flex: 1 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.2,
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
    borderColor: 'rgba(255,255,255,0.05)',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.onSurface,
  },

  bell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.danger,
    borderWidth: 1.5,
    borderColor: C.bg,
  },
});

export default WelcomeHeader;
