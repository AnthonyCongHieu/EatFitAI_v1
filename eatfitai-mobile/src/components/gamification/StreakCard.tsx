import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeProvider';

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
  const { theme } = useAppTheme();
  const isActive = currentStreak > 0;

  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    activeContainer: {
      backgroundColor: theme.colors.streak.background,
      borderWidth: 1,
      borderColor: theme.colors.streak.border,
    },
    inactiveContainer: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.glass.backgroundAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      ...theme.typography.h3,
      color: theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    badge: {
      backgroundColor: theme.colors.streak.active,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.md,
    },
    badgeText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 10,
    },
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive ? styles.activeContainer : styles.inactiveContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={isActive ? `Chuỗi ${currentStreak} ngày liên tiếp` : 'Bắt đầu chuỗi mới'}
      accessibilityHint="Nhấn để xem thành tựu"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="flame"
            size={32}
            color={isActive ? theme.colors.streak.active : theme.colors.textSecondary}
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

