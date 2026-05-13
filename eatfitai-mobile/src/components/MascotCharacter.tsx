import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  MOCHI_ASSETS,
  type MochiAssetKey,
} from '../assets/mascot/mochi/mochiAssets';

export type MascotState =
  | 'idle'
  | 'wave'
  | 'thinking'
  | 'pointing'
  | 'success'
  | 'reminder'
  | 'error';

type MascotCharacterProps = {
  state: MascotState;
  hasReminder?: boolean;
  size?: number;
  testID?: string;
};

export const MOCHI_STATE_ASSETS: Record<MascotState, MochiAssetKey> = {
  idle: 'idle',
  wave: 'hello',
  thinking: 'thinking',
  pointing: 'scanFood',
  success: 'goalComplete',
  reminder: 'reminder',
  error: 'surprised',
};

const MascotCharacter = ({
  state,
  hasReminder = false,
  size = 68,
  testID,
}: MascotCharacterProps): React.ReactElement => {
  const bob = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const translateX = useSharedValue(0);
  const attentionPulse = useSharedValue(1);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [bob]);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(rotate);
    cancelAnimation(translateX);
    cancelAnimation(attentionPulse);

    scale.value = 1;
    rotate.value = 0;
    translateX.value = 0;
    attentionPulse.value = hasReminder ? 1.08 : 1;

    if (state === 'wave') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 180, easing: Easing.out(Easing.ease) }),
          withTiming(5, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(-3, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (state === 'thinking') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 850, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (state === 'pointing') {
      translateX.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 420, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      attentionPulse.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 520, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (state === 'success') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 150, easing: Easing.out(Easing.ease) }),
          withTiming(0.98, { duration: 120, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.04, { duration: 160, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      rotate.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 180, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (state === 'reminder') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 520, easing: Easing.inOut(Easing.ease) }),
          withTiming(5, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      attentionPulse.value = withRepeat(
        withSequence(
          withTiming(1.16, { duration: 560, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 560, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (state === 'error') {
      translateX.value = withSequence(
        withTiming(-4, { duration: 80, easing: Easing.linear }),
        withTiming(4, { duration: 80, easing: Easing.linear }),
        withTiming(-3, { duration: 80, easing: Easing.linear }),
        withTiming(3, { duration: 80, easing: Easing.linear }),
        withTiming(0, { duration: 100, easing: Easing.out(Easing.ease) }),
      );
      scale.value = withTiming(0.97, { duration: 180, easing: Easing.out(Easing.ease) });
    }
  }, [attentionPulse, hasReminder, rotate, scale, state, translateX]);

  const characterStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: attentionPulse.value }],
    opacity: state === 'reminder' || hasReminder ? 0.38 : 0.18,
  }));

  const assetKey = MOCHI_STATE_ASSETS[state];
  const imageSize = size * 1.38;
  const stageSize = size * 1.18;

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel="Mochi"
      style={[styles.root, { width: size, height: size }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stage,
          {
            width: stageSize,
            height: stageSize,
            borderRadius: stageSize / 2,
          },
          pulseStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.sprite,
          {
            width: imageSize,
            height: imageSize,
          },
          characterStyle,
        ]}
      >
        <Image
          source={MOCHI_ASSETS[assetKey]}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={styles.spriteImage}
        />
      </Animated.View>
      {hasReminder && <View style={styles.reminderDot} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  stage: {
    position: 'absolute',
    backgroundColor: '#FFF6E7',
    borderWidth: 1,
    borderColor: 'rgba(123, 71, 31, 0.2)',
    zIndex: 0,
  },
  sprite: {
    overflow: 'visible',
    zIndex: 2,
  },
  spriteImage: {
    width: '100%',
    height: '100%',
  },
  reminderDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#FFF7ED',
  },
});

export default MascotCharacter;
