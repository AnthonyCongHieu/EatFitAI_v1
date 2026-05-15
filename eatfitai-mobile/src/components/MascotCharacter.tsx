import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { MoChiPoseKey } from '../assets/mascot/mochi/mochiAssets';
import MoChiSprite from '../features/mochi/MoChiSprite';

export type MascotState =
  | 'idle'
  | 'wave'
  | 'thinking'
  | 'pointing'
  | 'success'
  | 'reminder'
  | 'error'
  | 'hungry'
  | 'thirsty'
  | 'confused'
  | 'concerned'
  | 'celebrating'
  | 'reporting';

type MascotCharacterProps = {
  state: MascotState;
  poseKey?: MoChiPoseKey;
  hasReminder?: boolean;
  size?: number;
  testID?: string;
};

export const MOCHI_STATE_POSES: Record<MascotState, MoChiPoseKey> = {
  idle: 'idle',
  wave: 'celebrate',
  thinking: 'faceThinking',
  pointing: 'foodPhone',
  success: 'sparkleSuccess',
  reminder: 'foodPhone',
  error: 'sadCry',
  hungry: 'foodPhone',
  thirsty: 'hydrate',
  confused: 'confused',
  concerned: 'cakeConcern',
  celebrating: 'celebrate',
  reporting: 'reportReview',
};

const MascotCharacter = ({
  state,
  poseKey,
  hasReminder = false,
  size = 68,
  testID,
}: MascotCharacterProps): React.ReactElement => {
  const attentionPulse = useSharedValue(hasReminder ? 1.08 : 1);
  const rotate = useSharedValue(0);
  const resolvedPose = poseKey ?? MOCHI_STATE_POSES[state];

  React.useEffect(() => {
    attentionPulse.value = hasReminder ? 1.08 : 1;
    rotate.value = 0;

    if (state === 'reminder' || state === 'hungry' || state === 'thirsty') {
      attentionPulse.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 520, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }

    if (state === 'confused' || state === 'thinking') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 720, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: 720, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [attentionPulse, hasReminder, rotate, state]);

  // pulseStyle removed since the stage is gone

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const stageSize = size * 1.24;
  const spriteSize = size * 1.36;

  return (
    <View testID={testID} style={[styles.root, { width: size, height: size }]}>
      {/* background stage circle removed for a fully transparent look */}
      <Animated.View style={[styles.sprite, rotateStyle]}>
        <MoChiSprite poseKey={resolvedPose} size={spriteSize} />
      </Animated.View>
      {/* reminderDot handled by MascotFrame now */}
    </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 2,
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
