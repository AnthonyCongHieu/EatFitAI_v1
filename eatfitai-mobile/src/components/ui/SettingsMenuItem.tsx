// Component hiển thị một menu item trong settings
// Thiết kế theo xu hướng 2026: glassmorphism, micro-interactions

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface SettingsMenuItemProps {
  // Icon có thể là emoji hoặc tên Ionicons
  icon: string;
  // Label chính
  label: string;
  // Mô tả phụ (optional)
  subtitle?: string;
  // Callback khi tap
  onPress?: () => void;
  // Hiển thị bên phải (badge, value, toggle...)
  rightElement?: React.ReactNode;
  // Hiển thị mũi tên navigate
  showArrow?: boolean;
  // Màu icon (optional)
  iconColor?: string;
  // Disabled state
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SettingsMenuItem: React.FC<SettingsMenuItemProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
  iconColor,
  disabled = false,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  // Animation cho press effect
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  // Kiểm tra icon là emoji hay Ionicons name
  // Mở rộng regex để bắt nhiều Unicode emoji ranges hơn
  const isEmoji =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{2139}\u{24C2}\u{3297}\u{3299}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}\u{25C0}]|[\u{25FB}-\u{25FE}]/u.test(
      icon,
    );

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 14,
      marginBottom: 8,
      // Subtle border
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    iconEmoji: {
      fontSize: 20,
    },
    content: {
      flex: 1,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: disabled ? theme.colors.textSecondary : theme.colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    arrow: {
      opacity: 0.5,
    },
  });

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={subtitle}
      accessibilityState={{ disabled }}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        {isEmoji ? (
          <ThemedText style={styles.iconEmoji}>{icon}</ThemedText>
        ) : (
          <Ionicons
            name={icon as any}
            size={22}
            color={iconColor || theme.colors.primary}
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {subtitle && <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>}
      </View>

      {/* Right section */}
      <View style={styles.rightSection}>
        {rightElement}
        {showArrow && onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.arrow}
          />
        )}
      </View>
    </AnimatedPressable>
  );
};

export default SettingsMenuItem;
