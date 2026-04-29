import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
  FadeInUp,
} from 'react-native-reanimated';
import { ThemedText } from '../../components/ThemedText';
import Tilt3DCard, { ParallaxLayer } from '../../components/ui/Tilt3DCard';

const { width, height } = Dimensions.get('window');

/* ─── Emerald Nebula palette ─── */
const C = {
  surfaceLowest: '#090E1C',
  surface: '#0E1322',
  surfaceContainer: '#1A1F2F',
  surfaceContainerHigh: '#25293A',
  primary: '#4BE277',
  primaryContainer: '#22C55E',
  primaryFixed: '#6BFF8F',
  onPrimary: '#003915',
  onSurface: '#DEE1F7',
  outlineVariant: 'rgba(61, 74, 61, 0.2)',
};

/**
 * SplashScreen – Premium 3D loading screen for EatFit AI
 * Shown while the auth store initializes.
 */
const SplashScreen = (): React.ReactElement => {
  /* ─── Pulse Rings Animation ─── */
  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    ring2Scale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
    ring3Scale.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: interpolate(ring1Scale.value, [1, 1.08], [0.4, 0.2], Extrapolation.CLAMP),
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: interpolate(ring2Scale.value, [1, 1.06], [0.2, 0.1], Extrapolation.CLAMP),
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: interpolate(ring3Scale.value, [1, 1.04], [0.1, 0.05], Extrapolation.CLAMP),
  }));


  /* ─── Progress Bar Animation ─── */
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) });
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const progressGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(progress.value, [0, 0.5, 1], [0.3, 0.8, 0.3]),
  }));

  const cardWidth = Math.min(width - 48, 380);
  const cardHeight = height * 0.6;

  return (
    <View style={styles.container}>
      {/* ─── Deep Background ─── */}
      <LinearGradient
        colors={[C.surfaceLowest, C.surface, C.surfaceLowest]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ─── Ambient Bioluminescent Glow ─── */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      {/* ─── 3D Tilt Card Container ─── */}
      <Tilt3DCard
        maxTilt={8}
        perspective={1200}
        width={cardWidth}
        height={cardHeight}
        showReflection={false}
        useDeviceMotion={true}
        style={styles.tiltCard}
      >
        {/* ─── Pulse Rings ─── */}
        <ParallaxLayer depth={0.2} style={styles.ringsContainer}>
          <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />
          <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
          <Animated.View style={[styles.ring, styles.ring3, ring3Style]} />
        </ParallaxLayer>

        {/* ─── Hero Section ─── */}
        <ParallaxLayer depth={0.8} style={styles.heroSection}>
          <View />
        </ParallaxLayer>
      </Tilt3DCard>

      {/* ─── Footer: Progress Bar ─── */}
      <Animated.View
        entering={FadeInUp.delay(900).duration(800)}
        style={styles.footerSection}
      >
        {/* Progress Track */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle, progressGlowStyle]}>
            <LinearGradient
              colors={[C.primary, C.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Status Text */}
        <ThemedText style={styles.statusText}>
          KHỞI TẠO DỮ LIỆU
        </ThemedText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceLowest,
  },

  /* Ambient glow */
  ambientGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    backgroundColor: 'transparent',
    // Radial glow center
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 120,
    elevation: 0,
  },

  /* 3D Card */
  tiltCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Pulse Rings */
  ringsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 9999,
  },
  ring1: {
    width: 220,
    height: 220,
  },
  ring2: {
    width: 340,
    height: 340,
  },
  ring3: {
    width: 460,
    height: 460,
  },

  /* ─── Hero Section ─── */
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Footer */
  footerSection: {
    position: 'absolute',
    bottom: 64,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  progressTrack: {
    width: 240,
    height: 4,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
  },
  statusText: {
    marginTop: 16,
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(75, 226, 119, 0.8)',
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
