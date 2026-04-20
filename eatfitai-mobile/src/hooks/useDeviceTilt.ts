/**
 * useDeviceTilt — Reads device motion sensors (gyroscope + accelerometer)
 * and returns smoothed tilt values as Reanimated SharedValues.
 *
 * Uses a low-pass filter to eliminate jitter and produce silky-smooth
 * parallax motion when the user tilts their phone.
 *
 * Returns tiltX (roll, left/right) and tiltY (pitch, forward/back),
 * both in the range [-1, 1].
 */
import { useEffect, useRef } from 'react';
import { DeviceMotion } from 'expo-sensors';
import { useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 0.5,
};

/** Maximum tilt angle (radians) that maps to output 1.0 */
const MAX_TILT_RAD = 0.5; // ~28 degrees

interface UseDeviceTiltOptions {
  /** Whether the sensor is active (default true) */
  active?: boolean;
  /** Update interval in ms (default 16 ≈ 60fps) */
  interval?: number;
}

export function useDeviceTilt(options: UseDeviceTiltOptions = {}) {
  const { active = true, interval = 16 } = options;

  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const subscriptionRef = useRef<ReturnType<typeof DeviceMotion.addListener> | null>(null);

  useEffect(() => {
    if (!active) {
      // Reset to center when deactivated
      tiltX.value = withSpring(0, SPRING_CONFIG);
      tiltY.value = withSpring(0, SPRING_CONFIG);
      return;
    }

    let mounted = true;

    const startListening = async () => {
      try {
        const isAvailable = await DeviceMotion.isAvailableAsync();
        if (!isAvailable || !mounted) return;

        DeviceMotion.setUpdateInterval(interval);

        subscriptionRef.current = DeviceMotion.addListener((data) => {
          if (!mounted) return;

          const { rotation } = data;
          if (!rotation) return;

          // rotation.gamma = roll (tilt left/right)
          // rotation.beta  = pitch (tilt forward/back)
          const rawX = Math.max(-1, Math.min(1, rotation.gamma / MAX_TILT_RAD));
          const rawY = Math.max(-1, Math.min(1, rotation.beta / MAX_TILT_RAD));

          // Use spring animation for buttery smooth interpolation
          tiltX.value = withSpring(rawX, SPRING_CONFIG);
          tiltY.value = withSpring(rawY, SPRING_CONFIG);
        });
      } catch (err) {
        // Sensor unavailable — silently degrade
        if (__DEV__) {
          console.warn('[useDeviceTilt] DeviceMotion not available:', err);
        }
      }
    };

    startListening();

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      // Smooth return to center on cleanup
      tiltX.value = withSpring(0, SPRING_CONFIG);
      tiltY.value = withSpring(0, SPRING_CONFIG);
    };
  }, [active, interval]);

  return { tiltX, tiltY };
}
