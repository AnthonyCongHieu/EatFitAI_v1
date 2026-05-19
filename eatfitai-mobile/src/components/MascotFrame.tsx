/**
 * MascotFrame — Khung bao quanh mascot MoChi
 * Emerald Nebula theme
 *
 * Thiết kế "aura glow" — không có viền tròn cứng,
 * chỉ có hào quang mềm phát sáng phía sau mascot.
 *
 * Preset sizes theo màn hình:
 *   MASCOT_FRAME_SIZE.overlay  = 92  (floating FAB)
 *   MASCOT_FRAME_SIZE.home     = 110 (HomeScreen hero)
 *   MASCOT_FRAME_SIZE.voice    = 160 (VoiceScreen center)
 *   MASCOT_FRAME_SIZE.tutorial = 140 (onboarding tutorial)
 *   MASCOT_FRAME_SIZE.card     = 64  (small card/achievement)
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';

// ─── Size presets ─────────────────────────────────────────────
export const MASCOT_FRAME_SIZE = {
  overlay: 92,    // Floating FAB (MascotOverlay)
  home: 110,      // HomeScreen hero section
  voice: 160,     // VoiceScreen center stage
  tutorial: 140,  // Onboarding / tutorial slides
  card: 64,       // Small card / achievement badges
} as const;

interface MascotFrameProps {
  /** Kích thước vùng chứa mascot (px) */
  size: number;
  /** Bật hiệu ứng pulse glow */
  animated?: boolean;
  /** Tốc độ pulse (ms/cycle). Mặc định 2800 */
  pulseDuration?: number;
  /** Hiện chấm thông báo cam (chỉ khi có reminder/bubble) */
  showNotificationDot?: boolean;
  /** Style tuỳ thêm */
  style?: ViewStyle;
  children: React.ReactNode;
}

// ─── Palette ─────────────────────────────────────────────────
const C = {
  emerald:       '#22c55e',
  emeraldBright: '#4be277',
  emeraldDim:    '#16a34a',
  amber:         '#f7c052',
  surface:       '#05070d',
};

// ─── Component ───────────────────────────────────────────────
const MascotFrame = ({
  size,
  showNotificationDot = false,
  style,
  children,
}: MascotFrameProps): React.ReactElement => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>

      {/* Aura glow layer removed as requested */}

      {/* Ground shadow removed for a purely transparent mascot */}

      {/* ── Mascot content ── */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>

      {/* ── Notification dot — chỉ hiện khi có thông báo ── */}
      {showNotificationDot && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 0.02,
            right: size * 0.02,
            width: size * 0.13,
            height: size * 0.13,
            borderRadius: size * 0.07,
            backgroundColor: C.amber,
            borderWidth: 2,
            borderColor: C.surface,
            shadowColor: C.amber,
            shadowOpacity: 0.8,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }}
        />
      )}
    </View>
  );
};

export default MascotFrame;
