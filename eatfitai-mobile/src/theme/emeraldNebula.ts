/**
 * Premium Mesh Wallet Design System — Single Source of Truth
 *
 * Palette & style primitives shared across ALL screens.
 * Based on the "Premium Mesh Wallet" design direction:
 * deep navy base, mesh ambient glows (green/cyan/violet),
 * glass surfaces with subtle borders.
 *
 * Usage:
 *   import { useEN } from '../../theme/emeraldNebula';
 *   const EN = useEN();
 *   backgroundColor: EN.bg
 */

import { StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from './ThemeProvider';

/* ─────────────────────────────────────────────────────
   Color Palette — DARK mode  (Premium Mesh Wallet)
   Deep navy base · Mesh ambient glows · Glass surfaces
   ───────────────────────────────────────────────────── */
export const EN = {
  // Backgrounds — deep navy progression (never pure black)
  bg: '#05070d',                         // Ultra-deep navy base
  surfaceLow: '#0f1625',                 // Menu group / section bg
  surface: '#1a1f2f',                    // General card surfaces
  surfaceHigh: '#252b3f',                // Elevated cards
  surfaceHighest: '#2f364b',             // Icon wraps, inputs, nested content

  // Primary — Bright Emerald (mesh accent)
  primary: '#4be277',                    // Bright green primary
  primaryContainer: '#22c55e',           // Darker green for gradients
  primaryGlow: 'rgba(75, 226, 119, 0.28)',

  // Accent — Mesh spectrum
  cyan: '#32d7f0',                       // Cyan mesh glow
  amber: '#f7c052',                      // Warm amber

  // Text — cool blue-tinted hierarchy
  onSurface: '#dee1f7',                  // Primary text (soft lavender-white)
  onSurfaceVariant: '#b7c4d9',           // Secondary labels
  textMuted: '#9aa9c1',                  // Muted / timestamps

  // Borders & Glass — mesh-aware thin lines
  outline: 'rgba(226, 232, 240, 0.12)',  // Subtle warm-white line
  outlineVariant: 'rgba(226, 232, 240, 0.08)', // Even subtler
  glassBg: 'rgba(26, 31, 47, 0.78)',     // Glass card fill
  glassBorder: 'rgba(255, 255, 255, 0.08)', // Glass edge highlight

  // Semantic
  danger: '#ff8c8c',                     // Softer warm red
  dangerContainer: 'rgba(255, 140, 140, 0.12)',
  error: '#ff8c8c',                      // Matches danger for consistency
  errorContainer: 'rgba(255, 140, 140, 0.12)',
  success: '#4be277',                    // Matches primary
  warning: '#f7c052',                    // Warm amber
  info: '#32d7f0',                       // Cyan accent
} as const;

/* ─────────────────────────────────────────────────────
   Color Palette — LIGHT mode  (Soft Pastel #2)
   Warm cream backgrounds · Mint-green primary · Organic feel
   ───────────────────────────────────────────────────── */
export const EN_LIGHT = {
  // Backgrounds — warm cream progression
  bg: '#fdfbf7',                         // Warm cream base
  surfaceLow: '#f4f1ea',                 // Warm beige sections
  surface: '#ffffff',                    // Pure-white cards
  surfaceHigh: '#ffffff',                // Card surfaces
  surfaceHighest: '#f9f8f4',             // Nested/input fields

  // Primary — Mint Green (softer, organic feel)
  primary: '#43b581',                    // Mint-green primary
  primaryContainer: '#2e9666',           // Darker mint for gradients
  primaryGlow: 'rgba(67, 181, 129, 0.15)',

  // Accent (darkened slightly for cream-background contrast)
  cyan: '#0891B2',
  amber: '#D97706',

  // Text — earthy green-tinted hierarchy
  onSurface: '#2c3e38',                 // Dark earthy green-black
  onSurfaceVariant: '#5a7a6e',           // Muted green-gray
  textMuted: '#8ca39a',                  // Sage green-gray

  // Borders & Glass — warm sand/mint tints
  outline: '#e8e4db',                    // Warm sand border
  outlineVariant: 'rgba(67, 181, 129, 0.14)', // Soft mint tint
  glassBg: 'rgba(255, 255, 255, 0.92)', // Warm glass
  glassBorder: 'rgba(67, 181, 129, 0.10)', // Pastel mint edge

  // Semantic
  danger: '#e67373',                     // Softer red (pastel)
  dangerContainer: 'rgba(230, 115, 115, 0.10)',
  error: '#d45b5b',                      // Softer error
  errorContainer: 'rgba(230, 115, 115, 0.10)',
  success: '#43b581',                    // Matches primary
  warning: '#e6a23c',                    // Warmer amber
  info: '#2e9666',                       // Deep mint
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
