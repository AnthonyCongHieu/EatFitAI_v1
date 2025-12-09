import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../theme/themes';

const COLORS = lightTheme.colors;
const SHADOWS = lightTheme.shadows;
const SPACING = lightTheme.spacing;
const TYPOGRAPHY = lightTheme.typography;

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  onPress?: () => void;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  currentStreak,
  longestStreak,
  onPress,
}) => {
  const isActive = currentStreak > 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive ? styles.activeContainer : styles.inactiveContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="flame"
            size={32}
            color={isActive ? '#FF9500' : COLORS.textSecondary}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isActive ? `${currentStreak} ngày liên tiếp!` : 'Bắt đầu chuỗi mới!'}
          </Text>
          <Text style={styles.subtitle}>Kỷ lục: {longestStreak} ngày</Text>
        </View>

        {isActive && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔥 ON FIRE</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    ...SHADOWS.sm,
  },
  activeContainer: {
    backgroundColor: '#FFF5E6', // Light orange bg
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  inactiveContainer: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  badge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
});
