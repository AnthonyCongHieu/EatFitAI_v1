/**
 * WelcomeHeader – Compact Emerald Nebula header bar
 */
import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';

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
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  streakCount = 0,
  onNotificationPress,
  onAvatarPress,
}) => {
  const { user } = useAuthStore();

  const getGreeting = (): string => {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return 'Chào buổi sáng 🌿';
    if (h >= 12 && h < 17) return 'Chào buổi chiều ☀️';
    if (h >= 17 && h < 22) return 'Chào buổi tối 🌙';
    return 'Khuya rồi 🌃';
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Bạn';
  const initials = userName.charAt(0).toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.container}>
      {/* Left: avatar + texts */}
      <Pressable style={styles.left} onPress={onAvatarPress}>
        <View style={styles.avatarRing}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <View style={styles.texts}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>{userName}</Text>
        </View>
      </Pressable>

      {/* Right: streak + bell */}
      <View style={styles.right}>
        {streakCount > 0 && (
          <View style={styles.streak}>
            <Ionicons name="flame" size={16} color={C.primary} />
            <Text style={styles.streakText}>{streakCount}</Text>
          </View>
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
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },

  texts: { flex: 1 },
  greeting: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 1,
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
