import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type {
  MochiAccessoryId,
  MochiAnimation,
} from './mochiCompanionEngine';
import MochiRig, { type MochiRigExpression } from './MochiRig';

type MochiRoomSceneProps = {
  animation: MochiAnimation;
  activeAccessoryIds: MochiAccessoryId[];
};

export const MOCHI_ROOM_RENDERER = 'vector-rig';

const getAnimationIntensity = (animation: MochiAnimation): number => {
  if (animation === 'celebrate') return 1.45;
  if (animation === 'reminder' || animation === 'drinkWater') return 1.1;
  if (animation === 'surprised') return 1.25;
  return 0.8;
};

const getRigExpression = (animation: MochiAnimation): MochiRigExpression => {
  if (animation === 'happy') return 'success';
  return animation;
};

const MochiRoomScene = ({
  animation,
  activeAccessoryIds,
}: MochiRoomSceneProps): React.ReactElement => {
  const lift = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const intensity = getAnimationIntensity(animation);

  useEffect(() => {
    cancelAnimation(lift);
    cancelAnimation(rotate);
    cancelAnimation(scale);

    lift.value = withRepeat(
      withSequence(
        withTiming(-10 * intensity, { duration: 1150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1150, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    if (animation === 'celebrate') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 170, easing: Easing.out(Easing.ease) }),
          withTiming(5, { duration: 170, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 170, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 190, easing: Easing.out(Easing.ease) }),
          withTiming(0.99, { duration: 140, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.03, { duration: 160, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    if (animation === 'thinking') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 760, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 760, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (animation === 'surprised' || animation === 'reminder') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 120, easing: Easing.linear }),
          withTiming(3, { duration: 120, easing: Easing.linear }),
          withTiming(0, { duration: 120, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      rotate.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
    }
  }, [animation, intensity, lift, rotate, scale]);

  const rigStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const expression = getRigExpression(animation);

  return (
    <LinearGradient
      colors={['#151826', '#1F2534', '#17231E']}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.96, y: 1 }}
      style={styles.room}
    >
      <View style={styles.backGlow} />
      <View style={styles.wallShelf}>
        <View style={[styles.roomProp, styles.roomPropPink]} />
        <View style={[styles.roomProp, styles.roomPropGreen]} />
        <View style={[styles.roomProp, styles.roomPropGold]} />
      </View>
      <View style={styles.floor} />
      <View style={styles.floorShadow} />
      <Animated.View style={[styles.rigStage, rigStyle]}>
        <MochiRig
          expression={expression}
          activeAccessoryIds={activeAccessoryIds}
          size={248}
          testID="mochi-room-3d-rig"
        />
      </Animated.View>
      <View style={styles.frontHighlight} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  room: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  backGlow: {
    position: 'absolute',
    top: 34,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(75, 226, 119, 0.12)',
    transform: [{ scaleX: 1.2 }],
  },
  wallShelf: {
    position: 'absolute',
    top: 36,
    right: 24,
    width: 92,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 246, 231, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 231, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  roomProp: {
    width: 14,
    height: 24,
    borderRadius: 7,
  },
  roomPropPink: {
    backgroundColor: '#F472B6',
  },
  roomPropGreen: {
    backgroundColor: '#4BE277',
    height: 30,
  },
  roomPropGold: {
    backgroundColor: '#F7C948',
    height: 20,
  },
  floor: {
    position: 'absolute',
    left: -30,
    right: -30,
    bottom: -46,
    height: 150,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    backgroundColor: 'rgba(75, 226, 119, 0.12)',
    borderTopWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.24)',
  },
  floorShadow: {
    position: 'absolute',
    bottom: 28,
    width: 214,
    height: 42,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 0, 0, 0.26)',
    transform: [{ scaleX: 1.18 }],
  },
  rigStage: {
    width: 248,
    height: 248,
    marginBottom: 28,
  },
  frontHighlight: {
    position: 'absolute',
    left: 24,
    top: 22,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 246, 231, 0.08)',
  },
});

export default MochiRoomScene;
