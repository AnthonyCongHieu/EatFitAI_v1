/**
 * Emerald Nebula Design System — Single Source of Truth
 *
 * Palette & style primitives shared across ALL screens.
 * Based on the "Emerald Nebula 3D" design established on
 * HomeScreen and ProfileScreen.
 *
 * Colors aligned EXACTLY with ProfileScreen's `P` palette
 * to avoid visual mismatch between main and sub-screens.
 *
 * Usage:
 *   import { useEN } from '../../theme/emeraldNebula';
 *   const EN = useEN();
 *   backgroundColor: EN.bg
 */

import { StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from './ThemeProvider';

/* ─────────────────────────────────────────────────────
   Color Palette — DARK mode
   Synced with ProfileScreen `P` constants
   ───────────────────────────────────────────────────── */
export const EN = {
  // Backgrounds — darkest to brightest
  // Aligned with ProfileScreen P.surface → P.surfaceContainerHighest
  bg: '#0e1322',                     // P.surface (screen bg)
  surfaceLow: '#161b2b',             // P.surfaceContainerLow (menu group bg)
  surface: '#1a1f2f',                // P.surfaceContainer (general surfaces)
  surfaceHigh: '#25293a',            // P.surfaceContainerHigh
  surfaceHighest: '#2f3445',         // P.surfaceContainerHighest (icon wraps, inputs)

  // Primary — Emerald Green
  primary: '#4be277',                // P.primary
  primaryContainer: '#22c55e',       // P.primaryContainer
  primaryGlow: 'rgba(75, 226, 119, 0.35)',

  // Accent (from HomeScreen C palette)
  cyan: '#06b6d4',
  amber: '#f59e0b',

  // Text
  onSurface: '#dee1f7',              // P.onSurface
  onSurfaceVariant: '#bccbb9',       // P.onSurfaceVariant
  textMuted: '#94a3b8',              // Shared

  // Borders & Glass
  outline: 'rgba(255,255,255,0.06)',
  outlineVariant: '#3d4a3d',         // P.outlineVariant
  glassBg: 'rgba(37, 41, 58, 0.6)', // P.glassBg
  glassBorder: 'rgba(255,255,255,0.05)', // P.glassBorder

  // Semantic
  danger: '#ff6b6b',
  dangerContainer: 'rgba(147, 0, 10, 0.3)',
  error: '#ffb4ab',                  // P.error (for destructive labels)
  errorContainer: 'rgba(147, 0, 10, 0.3)', // P.errorContainer
  success: '#4be277',
  warning: '#fbbf24',
  info: '#2dd4bf',
} as const;

/* ─────────────────────────────────────────────────────
   Color Palette — LIGHT mode
   ───────────────────────────────────────────────────── */
export const EN_LIGHT = {
  // Backgrounds — brightest to slightly tinted
  bg: '#F8FBF7',
  surfaceLow: '#F0F5EE',
  surface: '#FFFFFF',
  surfaceHigh: '#EEF8F0',
  surfaceHighest: '#E6F0E8',

  // Primary — Emerald Green (darker for light bg contrast)
  primary: '#16A34A',
  primaryContainer: '#22c55e',
  primaryGlow: 'rgba(22, 163, 74, 0.15)',

  // Accent
  cyan: '#0891B2',
  amber: '#D97706',

  // Text
  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  textMuted: '#94A3B8',

  // Borders & Glass
  outline: 'rgba(0,0,0,0.06)',
  outlineVariant: 'rgba(34, 197, 94, 0.14)',
  glassBg: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(34, 197, 94, 0.10)',

  // Semantic
  danger: '#EF4444',
  dangerContainer: 'rgba(239, 68, 68, 0.1)',
  error: '#DC2626',
  errorContainer: 'rgba(239, 68, 68, 0.1)',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#0F766E',
} as const;

/* ─────────────────────────────────────────────────────
   useEN() — Hook that returns correct palette for current mode
   ───────────────────────────────────────────────────── */
export type ENPalette = typeof EN;

export const useEN = (): ENPalette => {
  const { mode } = useAppTheme();
  return mode === 'dark' ? EN : (EN_LIGHT as unknown as ENPalette);
};

/* ─────────────────────────────────────────────────────
   Reusable Style Presets — Mirrors ProfileScreen patterns
   ───────────────────────────────────────────────────── */

/** Standard card style — glassmorphism with top-border accent */
export const enCardStyle: ViewStyle = {
  backgroundColor: EN.glassBg,
  borderRadius: 16,
  borderTopWidth: 1,
  borderTopColor: EN.glassBorder,
  padding: 16,
  overflow: 'hidden',
};

/** Lighter card variant for nested content */
export const enCardSmallStyle: ViewStyle = {
  backgroundColor: EN.surfaceHighest,
  borderRadius: 12,
  padding: 12,
};

/** Menu group card — for grouped row actions (matches ProfileScreen S.menuGroup) */
export const enMenuGroupStyle: ViewStyle = {
  borderRadius: 16,
  backgroundColor: EN.surfaceLow,
  padding: 8,
  gap: 4,
  overflow: 'hidden',
};

/** Menu row inside menu group (matches ProfileScreen S.menuRow) */
export const enMenuRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: EN.glassBg,
  borderTopWidth: 1,
  borderTopColor: EN.glassBorder,
};

/** Icon wrap for menu rows — circular (matches ProfileScreen S.menuIconWrap) */
export const enMenuIconWrapStyle: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  // Note: ProfileScreen sets bg via prop (default P.surfaceContainerHighest)
  // Keep the default here for consistency
  backgroundColor: EN.surfaceHighest,
};

/** Pre-built stylesheet for common patterns */
export const enStyles = StyleSheet.create({
  card: enCardStyle,
  cardSmall: enCardSmallStyle,
  menuGroup: enMenuGroupStyle,
  menuRow: enMenuRowStyle,
  menuIconWrap: enMenuIconWrapStyle,
});
