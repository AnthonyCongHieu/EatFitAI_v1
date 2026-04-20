/**
 * Tilt3DCard — Multi-layer Holographic Parallax Card
 *
 * Creates a convincing 3D depth effect by:
 * 1. Tilting the entire card with perspective transforms
 * 2. Exposing gesture values via React Context so child
 *    `ParallaxLayer` components can offset at different depths
 *
 * Supports two input modes:
 * - **Touch** (default): Pan gesture drives tilt
 * - **Device Motion**: Gyroscope/accelerometer drives tilt (set `useDeviceMotion={true}`)
 *
 * The deeper the layer, the more it shifts — mimicking
 * how objects at different distances move relative to each other.
 */
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useDeviceTilt } from '../../hooks/useDeviceTilt';

/* ─── Spring config for natural bounce ─── */
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
  mass: 0.7,
};

/* ─── Context to share gesture values with child layers ─── */
interface TiltContextValue {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  isPressed: SharedValue<boolean>;
  cardWidth: number;
  cardHeight: number;
}

const TiltContext = createContext<TiltContextValue | null>(null);

export const useTiltContext = (): TiltContextValue | null => useContext(TiltContext);

/* ─── ParallaxLayer ─── */
interface ParallaxLayerProps {
  children: React.ReactNode;
  /** Depth multiplier: 0 = flush with card, 1 = max float.
   *  Negative = sinks behind. Default 0. */
  depth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wrap any child inside a Tilt3DCard with this component
 * to give it a specific "floating height" in the parallax stack.
 *
 * depth=0 → moves with the card (no extra offset)
 * depth=0.5 → floats halfway, shifts moderately
 * depth=1 → maximum float, shifts the most
 */
export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  depth = 0,
  style,
}) => {
  const ctx = useTiltContext();

  const animatedStyle = useAnimatedStyle(() => {
    if (!ctx) return {};

    const maxShift = 12; // max px shift at depth=1

    const offsetX = interpolate(
      ctx.translateX.value,
      [-ctx.cardWidth / 2, 0, ctx.cardWidth / 2],
      [maxShift * depth, 0, -maxShift * depth],
      Extrapolation.CLAMP,
    );

    const offsetY = interpolate(
      ctx.translateY.value,
      [-ctx.cardHeight / 2, 0, ctx.cardHeight / 2],
      [maxShift * depth, 0, -maxShift * depth],
      Extrapolation.CLAMP,
    );

    const isAtRest =
      Math.abs(ctx.translateX.value) < 0.5 && Math.abs(ctx.translateY.value) < 0.5;

    if (isAtRest) {
      return { transform: [] };
    }

    return {
      transform: [
        { translateX: Math.round(offsetX) },
        { translateY: Math.round(offsetY) },
      ],
    };
  });

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
};

/* ─── Main Tilt3DCard ─── */
interface Tilt3DCardProps {
  children: React.ReactNode;
  /** Maximum rotation angle in degrees (default 8) */
  maxTilt?: number;
  /** Perspective value — lower = more dramatic 3D (default 800) */
  perspective?: number;
  /** Width of the card — needed to normalize gesture translation */
  width?: number;
  /** Height of the card — needed to normalize gesture translation */
  height?: number;
  /** Extra styles applied to the outer Animated.View */
  style?: StyleProp<ViewStyle>;
  /** Whether to show a light reflection overlay (default true) */
  showReflection?: boolean;
  /** Color of the reflection highlight (default white) */
  reflectionColor?: string;
  /** Enable gyroscope/accelerometer-driven tilt (default false) */
  useDeviceMotion?: boolean;
  /** Enable touch-based tilt (default true) */
  activeTouch?: boolean;
}

const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  maxTilt = 8,
  perspective = 800,
  width = 340,
  height = 500,
  style,
  showReflection = true,
  reflectionColor = 'rgba(255,255,255,0.07)',
  useDeviceMotion = false,
  activeTouch = true,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isPressed = useSharedValue(false);

  // Device tilt input (only active when useDeviceMotion is true)
  const { tiltX, tiltY } = useDeviceTilt({ active: useDeviceMotion });

  // Bridge device tilt values → translateX/translateY
  // tiltX/tiltY range is [-1, 1], map to [-width/2, width/2] for consistent behavior
  useEffect(() => {
    if (!useDeviceMotion) return;

    // Use a Reanimated-compatible approach: poll the shared values
    const interval = setInterval(() => {
      if (!isPressed.value) {
        // Map tilt [-1, 1] → translate [-width/3, width/3]
        // Using width/3 instead of width/2 for a subtler, more elegant effect
        const targetX = tiltX.value * (width / 3);
        const targetY = tiltY.value * (height / 3);
        translateX.value = withSpring(targetX, {
          damping: 25,
          stiffness: 120,
          mass: 0.6,
        });
        translateY.value = withSpring(targetY, {
          damping: 25,
          stiffness: 120,
          mass: 0.6,
        });
      }
    }, 32); // ~30fps polling is enough since tilt values are already spring-smoothed

    return () => clearInterval(interval);
  }, [useDeviceMotion, width, height]);

  const contextValue = useMemo<TiltContextValue>(
    () => ({
      translateX,
      translateY,
      isPressed,
      cardWidth: width,
      cardHeight: height,
    }),
    [translateX, translateY, isPressed, width, height],
  );

  // Pan gesture (touch override — always available)
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          isPressed.value = true;
        })
        .onUpdate((e) => {
          translateX.value = e.translationX;
          translateY.value = e.translationY;
        })
        .onEnd(() => {
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
          isPressed.value = false;
        })
        .onFinalize(() => {
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
          isPressed.value = false;
        }),
    [translateX, translateY, isPressed],
  );

  // Card 3D transform
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [maxTilt, 0, -maxTilt],
      Extrapolation.CLAMP,
    );

    const rotateX = interpolate(
      translateY.value,
      [-height / 2, 0, height / 2],
      [-maxTilt, 0, maxTilt],
      Extrapolation.CLAMP,
    );

    const isAtRest = Math.abs(translateX.value) < 0.5 && Math.abs(translateY.value) < 0.5;

    if (isAtRest) {
      return { transform: [] };
    }

    return {
      transform: [
        { perspective },
        { rotateY: `${rotateY}deg` },
        { rotateX: `${rotateX}deg` },
      ],
    };
  });

  // Reflection highlight that follows tilt
  const reflectionStyle = useAnimatedStyle(() => {
    if (!showReflection) return { opacity: 0 };

    const offsetX = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-80, 0, 80],
      Extrapolation.CLAMP,
    );
    const offsetY = interpolate(
      translateY.value,
      [-height / 2, 0, height / 2],
      [-50, 0, 50],
      Extrapolation.CLAMP,
    );

    const tiltMagnitude =
      Math.abs(translateX.value / (width / 2)) +
      Math.abs(translateY.value / (height / 2));
    const opacity = interpolate(tiltMagnitude, [0, 1], [0, 0.4], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateX: offsetX }, { translateY: offsetY }],
    };
  });

  const content = (
    <Animated.View style={[cardAnimatedStyle, style]}>
      {children}
      {showReflection && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.reflection,
            { backgroundColor: reflectionColor },
            reflectionStyle,
          ]}
        />
      )}
    </Animated.View>
  );

  return (
    <TiltContext.Provider value={contextValue}>
      {activeTouch ? (
        <GestureDetector gesture={pan}>
          {content}
        </GestureDetector>
      ) : (
        content
      )}
    </TiltContext.Provider>
  );
};

const styles = StyleSheet.create({
  reflection: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    width: '130%',
    height: '50%',
    top: '-5%',
    left: '-15%',
  },
});

export default Tilt3DCard;
