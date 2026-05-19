/**
 * MeshBackground — Premium Mesh Wallet ambient glow layer.
 *
 * Renders radial SVG gradient "blobs" on top of a dark linear base,
 * replicating the CSS mesh design from the approved mockup
 * (docs/mockups/home-background-options-v2.html .screen::before):
 *
 *   • Top-left  18%, 4%  — Emerald glow   rgba(75,226,119,0.24)
 *   • Top-right 92%, 18% — Cyan glow      rgba(50,215,240,0.20)
 *   • Bottom-right 72%, 66% — Violet glow rgba(157,124,255,0.16)
 *   • Bottom-left 20%, 86% — Amber glow   rgba(247,192,82,0.08)
 *   • Base: linear #0d1427 → #070b16
 *
 * Drop-in replacement for any <LinearGradient style={absoluteFill} />.
 * Uses react-native-svg which is already in the project.
 */
import React, { memo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

interface MeshBackgroundProps {
  /** Override the default height (screen height) */
  height?: number;
}

const MeshBackground: React.FC<MeshBackgroundProps> = ({ height: overrideHeight }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const w = screenWidth;
  const h = overrideHeight ?? screenHeight;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/* ── Base: dark navy linear gradient ── */}
        <SvgLinearGradient id="meshBase" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0d1427" stopOpacity="1" />
          <Stop offset="1" stopColor="#070b16" stopOpacity="1" />
        </SvgLinearGradient>

        {/* ── Green glow — top-left (18%, 4%) — strong emerald ── */}
        <RadialGradient id="meshGreen" cx="18%" cy="4%" rx="32%" ry="32%">
          <Stop offset="0" stopColor="#4be277" stopOpacity="0.24" />
          <Stop offset="0.55" stopColor="#4be277" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#4be277" stopOpacity="0" />
        </RadialGradient>

        {/* ── Cyan glow — top-right (92%, 18%) ── */}
        <RadialGradient id="meshCyan" cx="92%" cy="18%" rx="30%" ry="30%">
          <Stop offset="0" stopColor="#32d7f0" stopOpacity="0.20" />
          <Stop offset="0.5" stopColor="#32d7f0" stopOpacity="0.06" />
          <Stop offset="1" stopColor="#32d7f0" stopOpacity="0" />
        </RadialGradient>

        {/* ── Violet glow — bottom-right (72%, 66%) ── */}
        <RadialGradient id="meshViolet" cx="72%" cy="66%" rx="32%" ry="32%">
          <Stop offset="0" stopColor="#9d7cff" stopOpacity="0.16" />
          <Stop offset="0.5" stopColor="#9d7cff" stopOpacity="0.05" />
          <Stop offset="1" stopColor="#9d7cff" stopOpacity="0" />
        </RadialGradient>

        {/* ── Amber glow — bottom-left (20%, 86%) ── */}
        <RadialGradient id="meshAmber" cx="20%" cy="86%" rx="28%" ry="28%">
          <Stop offset="0" stopColor="#f7c052" stopOpacity="0.08" />
          <Stop offset="0.5" stopColor="#f7c052" stopOpacity="0.02" />
          <Stop offset="1" stopColor="#f7c052" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Paint order: base → green → cyan → violet → amber (additive layering) */}
      <Rect x="0" y="0" width={w} height={h} fill="url(#meshBase)" />
      <Rect x="0" y="0" width={w} height={h} fill="url(#meshGreen)" />
      <Rect x="0" y="0" width={w} height={h} fill="url(#meshCyan)" />
      <Rect x="0" y="0" width={w} height={h} fill="url(#meshViolet)" />
      <Rect x="0" y="0" width={w} height={h} fill="url(#meshAmber)" />
    </Svg>
  );
};

export default memo(MeshBackground);
