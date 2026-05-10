/**
 * QuickActionsOverlay – Full-screen blur overlay with 2×2 bento grid
 * Triggered by the floating AI robot FAB on the HomeScreen.
 *
 * A2.1: Hiển thị banner nhắc nhở bữa ăn còn thiếu phía trên lưới nút.
 */
import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { TEST_IDS } from '../../testing/testIds';
import type { MealReminder } from '../../hooks/useMealReminders';

const { width } = Dimensions.get('window');

/* ─── Emerald Nebula palette ─── */
const C = {
  bg: '#0a0e1a',
  surfaceLow: '#111827',
  surface: '#1a1f2f',
  surfaceHigh: '#1e2435',
  surfaceHighest: '#2a2f40',
  primary: '#4be277',
  primaryContainer: '#22c55e',
  onPrimary: '#003915',
  onSurface: '#dee1f7',
  textMuted: '#94a3b8',
  outlineVariant: 'rgba(75,226,119,0.08)',
  amber: '#f59e0b',
  amberBg: 'rgba(245, 158, 11, 0.08)',
  amberBorder: 'rgba(245, 158, 11, 0.2)',
};

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}

interface QuickActionsOverlayProps {
  visible: boolean;
  onClose: () => void;
  onScanFood: () => void;
  onAddMeal: () => void;
  onRecipes: () => void;
  onWater: () => void;
  /** A2.1: Danh sách nhắc nhở bữa ăn */
  reminders?: MealReminder[];
}

const QuickActionsOverlay: React.FC<QuickActionsOverlayProps> = ({
  visible,
  onClose,
  onScanFood,
  onAddMeal,
  onRecipes,
  onWater,
  reminders = [],
}) => {
  const actions: QuickAction[] = [
    {
      icon: 'camera',
      label: 'QUÉT THỨC ĂN',
      onPress: onScanFood,
      testID: TEST_IDS.home.quickAddScanButton,
    },
    {
      icon: 'restaurant',
      label: 'THÊM BỮA',
      onPress: onAddMeal,
      testID: TEST_IDS.home.quickAddSearchButton,
    },
    {
      icon: 'book',
      label: 'CÔNG THỨC',
      onPress: onRecipes,
    },
    { icon: 'water', label: 'LƯỢNG NƯỚC', onPress: onWater },
  ];

  const handleAction = useCallback(
    (action: QuickAction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
      // Small delay to let modal close smoothly
      setTimeout(() => action.onPress(), 200);
    },
    [onClose],
  );

  const handleReminderPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => onAddMeal(), 200);
  }, [onClose, onAddMeal]);

  const gridSize = (width - 48 - 16) / 2; // padding 24*2, gap 16
  const hasReminders = reminders.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Blurred background overlay */}
      <Animated.View
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 14, 26, 0.92)' }]} />
        )}
      </Animated.View>

      {/* Content */}
      <View style={styles.container}>
        {/* Close button */}
        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          style={styles.closeContainer}
        >
          <Pressable
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={C.onSurface} />
          </Pressable>
        </Animated.View>

        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          style={styles.header}
        >
          <Animated.Text style={styles.title}>Thao tác nhanh</Animated.Text>
          <Animated.Text style={styles.subtitle}>
            Bạn muốn thực hiện gì tiếp theo?
          </Animated.Text>
        </Animated.View>

        {/* ═══ A2.1: Reminder Banner (chỉ hiện khi có nhắc nhở) ═══ */}
        {hasReminders && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400).springify()}
            style={styles.reminderBanner}
          >
            <Pressable
              style={({ pressed }) => [
                styles.reminderContent,
                pressed && styles.reminderPressed,
              ]}
              onPress={handleReminderPress}
            >
              <View style={styles.reminderIconRow}>
                {reminders.map((r, i) => (
                  <Animated.Text
                    key={r.mealTypeId}
                    entering={FadeIn.delay(300 + i * 100)}
                    style={styles.reminderEmoji}
                  >
                    {r.emoji}
                  </Animated.Text>
                ))}
              </View>

              <View style={styles.reminderTextCol}>
                <Animated.Text style={styles.reminderTitle}>
                  {reminders.length === 1
                    ? `Bạn chưa ghi ${reminders[0]!.label}`
                    : `Còn ${reminders.length} bữa chưa ghi`}
                </Animated.Text>
                <Animated.Text style={styles.reminderSubtitle} numberOfLines={1}>
                  {reminders.length === 1
                    ? reminders[0]!.message
                    : reminders.map((r) => r.label).join(', ')}
                </Animated.Text>
              </View>

              <View style={styles.reminderArrow}>
                <Ionicons name="chevron-forward" size={18} color={C.amber} />
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* 2×2 Bento Grid */}
        <Animated.View
          entering={ZoomIn.delay(hasReminders ? 300 : 200).duration(400).springify()}
          style={styles.grid}
        >
          {actions.map((action, index) => (
            <Animated.View
              key={action.label}
              entering={FadeInDown.delay((hasReminders ? 350 : 250) + index * 80).duration(400)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  { width: gridSize, height: gridSize },
                  pressed && styles.actionCardPressed,
                ]}
                onPress={() => handleAction(action)}
                testID={action.testID}
                nativeID={action.testID}
                accessibilityLabel={action.testID}
                collapsable={false}
              >
                {/* Icon container */}
                <View style={styles.iconBox}>
                  <Ionicons name={action.icon} size={32} color={C.primary} />
                </View>
                {/* Label */}
                <Animated.Text style={styles.actionLabel}>
                  {action.label}
                </Animated.Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Footer hint */}
        <Animated.View
          entering={FadeIn.delay(600).duration(400)}
          style={styles.footer}
        >
          <View style={styles.footerDot} />
          <Animated.Text style={styles.footerText}>
            CHẠM X ĐỂ QUAY LẠI
          </Animated.Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  /* Close button */
  closeContainer: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(47, 52, 69, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  /* Header */
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textMuted,
    letterSpacing: 0.1,
  },

  /* ── Reminder Banner ── */
  reminderBanner: {
    width: '100%',
    marginBottom: 24,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.amberBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.amberBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  reminderPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  reminderIconRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reminderEmoji: {
    fontSize: 22,
  },
  reminderTextCol: {
    flex: 1,
    gap: 2,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  reminderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textMuted,
    letterSpacing: 0.1,
  },
  reminderArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },

  /* Action card */
  actionCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actionCardPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(75, 226, 119, 0.08)',
  },

  /* Icon box */
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  /* Label */
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.onSurface,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 48,
    opacity: 0.6,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
});

export default QuickActionsOverlay;
