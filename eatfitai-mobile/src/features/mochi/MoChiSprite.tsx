import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  MOCHI_SPRITES,
  type MoChiPoseKey,
} from '../../assets/mascot/mochi/mochiAssets';
import { MOCHI_SPRITE_CATALOG } from './mochiPoseCatalog';

export type MoChiSpriteProps = {
  poseKey: MoChiPoseKey;
  size: number;
  variant?: 'full' | 'face' | 'notice';
  animated?: boolean;
  testID?: string;
};

const MoChiSprite = ({
  poseKey,
  size,
  variant,
  animated = true,
  testID,
}: MoChiSpriteProps): React.ReactElement => {
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  const scale = useSharedValue(1);
  const poseMeta = MOCHI_SPRITE_CATALOG[poseKey];
  const resolvedVariant = variant ?? poseMeta.variant;

  React.useEffect(() => {
    if (!animated) {
      bob.value = 0;
      tilt.value = 0;
      scale.value = 1;
      return;
    }

    bob.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1450, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1450, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    tilt.value = withRepeat(
      withSequence(
        withTiming(-0.8, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    if (poseMeta.mood === 'celebrating' || poseMeta.mood === 'happy') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 320, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) });
    }
  }, [animated, bob, poseMeta.mood, scale, tilt]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { rotate: `${tilt.value}deg` },
      { scale: scale.value },
    ],
  }));

  const spriteSize =
    resolvedVariant === 'face' ? size : resolvedVariant === 'notice' ? size * 1.18 : size * 1.08;

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={poseMeta.accessibilityLabel}
      style={[styles.root, { width: size, height: size }]}
    >
      <Animated.View style={[styles.spriteWrap, animatedStyle]}>
        <Image
          source={MOCHI_SPRITES[poseKey]}
          resizeMode="contain"
          style={{ width: spriteSize, height: spriteSize }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  spriteWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});

export default MoChiSprite;
