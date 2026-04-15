/**
 * QuickActionsOverlay – Full-screen glass-blur popup with 2×2 bento grid
 * Triggered by the floating AI robot FAB on the HomeScreen.
 */
import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInDown,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

/* ─── Emerald Nebula palette ─── */
const C = {
  bg: '#0e1322',
  surfaceLow: '#161b2b',
  surface: '#1a1f2f',
  surfaceHigh: '#25293a',
  surfaceHighest: '#2f3445',
  primary: '#4be277',
  primaryContainer: '#22c55e',
  onPrimary: '#003915',
  onSurface: '#dee1f7',
  textMuted: '#94a3b8',
  outlineVariant: 'rgba(61, 74, 61, 0.1)',
};

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface QuickActionsOverlayProps {
  visible: boolean;
  onClose: () => void;
  onScanFood: () => void;
  onAddMeal: () => void;
  onRecipes: () => void;
  onWater: () => void;
}

const QuickActionsOverlay: React.FC<QuickActionsOverlayProps> = ({
  visible,
  onClose,
  onScanFood,
  onAddMeal,
  onRecipes,
  onWater,
}) => {
  const actions: QuickAction[] = [
    { icon: 'camera', label: 'QUÉT THỨC ĂN', onPress: onScanFood },
    { icon: 'restaurant', label: 'THÊM BỮA', onPress: onAddMeal },
    { icon: 'book', label: 'CÔNG THỨC', onPress: onRecipes },
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

  const gridSize = (width - 48 - 16) / 2; // padding 24*2, gap 16

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Dark overlay background */}
      <Animated.View
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(200)}
        style={[StyleSheet.absoluteFill, styles.overlayTint]}
      />

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

        {/* 2×2 Bento Grid */}
        <Animated.View
          entering={ZoomIn.delay(200).duration(400).springify()}
          style={styles.grid}
        >
          {actions.map((action, index) => (
            <Animated.View
              key={action.label}
              entering={FadeInDown.delay(250 + index * 80).duration(400)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.actionCard,
                  { width: gridSize, height: gridSize },
                  pressed && styles.actionCardPressed,
                ]}
                onPress={() => handleAction(action)}
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
  overlayTint: {
    backgroundColor: 'rgba(14, 19, 34, 0.82)',
  },
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
    backgroundColor: 'rgba(47, 52, 69, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Header */
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: C.onSurface,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textMuted,
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
    borderRadius: 40,
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    // Bioluminescent glow
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
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
    opacity: 0.5,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(75, 226, 119, 0.5)',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
});

export default QuickActionsOverlay;
