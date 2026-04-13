/**
 * Tilt3DCard — Multi-layer Holographic Parallax Card
 *
 * Creates a convincing 3D depth effect by:
 * 1. Tilting the entire card with perspective transforms
 * 2. Exposing gesture values via React Context so child
 *    `ParallaxLayer` components can offset at different depths
 *
 * The deeper the layer, the more it shifts — mimicking
 * how objects at different distances move relative to each other.
 */
import React, { createContext, useContext, useMemo } from 'react';
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

export const useTiltContext = (): TiltContextValue | null =>
  useContext(TiltContext);

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

    // Scale up slightly for "closer" layers
    const scale = ctx.isPressed.value ? 1 + depth * 0.03 : 1;

    return {
      transform: [
        { translateX: offsetX },
        { translateY: offsetY },
        { scale: withSpring(scale, SPRING_CONFIG) },
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
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
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isPressed = useSharedValue(false);

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

  // Pan gesture
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

    const scale = isPressed.value ? 1.015 : 1;

    return {
      transform: [
        { perspective },
        { rotateY: `${rotateY}deg` },
        { rotateX: `${rotateX}deg` },
        { scale: withSpring(scale, SPRING_CONFIG) },
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
    const opacity = interpolate(
      tiltMagnitude,
      [0, 1],
      [0, 0.4],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateX: offsetX }, { translateY: offsetY }],
    };
  });

  return (
    <TiltContext.Provider value={contextValue}>
      <GestureDetector gesture={pan}>
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
      </GestureDetector>
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
