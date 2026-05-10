/**
 * Tilt3DCard — Passthrough wrapper (all 3D effects disabled)
 *
 * Previously provided gyroscope-driven and touch-driven 3D tilt.
 * Now acts as a simple transparent container so that existing
 * call-sites don't need any changes.
 */
import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

/* ─── ParallaxLayer (no-op passthrough) ─── */
interface ParallaxLayerProps {
  children: React.ReactNode;
  depth?: number;
  style?: StyleProp<ViewStyle>;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  style,
}) => {
  return <View style={style}>{children}</View>;
};

/* ─── Main Tilt3DCard (no-op passthrough) ─── */
interface Tilt3DCardProps {
  children: React.ReactNode;
  maxTilt?: number;
  perspective?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  showReflection?: boolean;
  reflectionColor?: string;
  useDeviceMotion?: boolean;
  activeTouch?: boolean;
}

const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  style,
}) => {
  return <View style={style}>{children}</View>;
};

export const useTiltContext = () => null;

export default Tilt3DCard;
