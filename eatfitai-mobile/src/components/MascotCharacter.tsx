import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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

const MascotCharacter = ({
  state,
  hasReminder = false,
  size = 68,
  testID,
}: MascotCharacterProps): React.ReactElement => {
  const bob = useSharedValue(0);
  const scale = useSharedValue(1);
  const blink = useSharedValue(1);
  const leafTilt = useSharedValue(0);
  const rightArm = useSharedValue(0);
  const spoonSpin = useSharedValue(0);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600 }),
        withTiming(0.16, { duration: 70, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 90, easing: Easing.in(Easing.ease) }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, [blink, bob]);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(leafTilt);
    cancelAnimation(rightArm);
    cancelAnimation(spoonSpin);
    cancelAnimation(badgePulse);

    scale.value = 1;
    leafTilt.value = 0;
    rightArm.value = 0;
    spoonSpin.value = 0;
    badgePulse.value = 1;

    if (state === 'wave') {
      rightArm.value = withRepeat(
        withSequence(
          withTiming(-28, { duration: 180, easing: Easing.out(Easing.ease) }),
          withTiming(20, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(-18, { duration: 180, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (state === 'thinking') {
      spoonSpin.value = withRepeat(
        withTiming(360, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
      leafTilt.value = withRepeat(
        withSequence(
          withTiming(-9, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(9, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (state === 'pointing') {
      rightArm.value = withTiming(-36, { duration: 220, easing: Easing.out(Easing.ease) });
      badgePulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (state === 'success') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 160, easing: Easing.out(Easing.ease) }),
          withTiming(0.96, { duration: 120, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 160, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (state === 'reminder') {
      leafTilt.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      rightArm.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (state === 'error') {
      scale.value = withTiming(0.96, { duration: 220, easing: Easing.out(Easing.ease) });
      leafTilt.value = withTiming(-12, { duration: 220, easing: Easing.out(Easing.ease) });
    }
  }, [badgePulse, leafTilt, rightArm, scale, spoonSpin, state]);

  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scale: scale.value }],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: state === 'error' ? 0.55 : blink.value }],
  }));

  const leafStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${leafTilt.value}deg` }],
  }));

  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rightArm.value}deg` }],
  }));

  const spoonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spoonSpin.value}deg` }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hasReminder ? 1.06 : badgePulse.value }],
  }));

  const bodySize = size * 0.74;
  const leafWidth = size * 0.26;
  const leafHeight = size * 0.18;

  return (
    <Animated.View
      testID={testID}
      accessibilityLabel="Mầm Fit"
      style={[styles.root, { width: size, height: size }, rootStyle]}
    >
      <Animated.View style={[styles.leafWrap, leafStyle]}>
        <View
          style={[
            styles.leaf,
            styles.leftLeaf,
            { width: leafWidth, height: leafHeight, borderTopLeftRadius: leafWidth },
          ]}
        />
        <View
          style={[
            styles.leaf,
            styles.rightLeaf,
            { width: leafWidth, height: leafHeight, borderTopRightRadius: leafWidth },
          ]}
        />
      </Animated.View>

      <Animated.View style={[styles.leftArm, { top: size * 0.43 }]} />
      <Animated.View style={[styles.rightArm, { top: size * 0.43 }, armStyle]}>
        <Animated.View style={[styles.spoon, spoonStyle]} />
      </Animated.View>

      <LinearGradient
        colors={state === 'error' ? ['#FFE7D6', '#FDBA74'] : ['#ECFDF3', '#78E08F']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={[
          styles.body,
          {
            width: bodySize,
            height: bodySize,
            borderRadius: bodySize / 2,
            marginTop: size * 0.18,
          },
        ]}
      >
        <View style={styles.faceRow}>
          <Animated.View style={[styles.eye, eyeStyle]} />
          <Animated.View style={[styles.eye, eyeStyle]} />
        </View>
        <View style={[styles.mouth, state === 'error' && styles.errorMouth]} />
        <View style={styles.cheekRow}>
          <View style={styles.cheek} />
          <View style={styles.cheek} />
        </View>
      </LinearGradient>

      <Animated.View style={[styles.kcalBadge, badgeStyle]}>
        <View style={styles.badgeDot} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafWrap: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    zIndex: 3,
  },
  leaf: {
    backgroundColor: '#34D399',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  leftLeaf: {
    transform: [{ rotate: '-22deg' }],
    marginRight: -2,
  },
  rightLeaf: {
    backgroundColor: '#22C55E',
    transform: [{ rotate: '22deg' }],
    marginLeft: -2,
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  faceRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  eye: {
    width: 7,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#163B2B',
  },
  mouth: {
    width: 17,
    height: 8,
    marginTop: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#163B2B',
    borderRadius: 10,
  },
  errorMouth: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#7C2D12',
    marginTop: 8,
  },
  cheekRow: {
    position: 'absolute',
    top: '54%',
    left: 9,
    right: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cheek: {
    width: 7,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(251, 113, 133, 0.48)',
  },
  leftArm: {
    position: 'absolute',
    left: 5,
    width: 17,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#6EE7B7',
    transform: [{ rotate: '28deg' }],
    zIndex: 1,
  },
  rightArm: {
    position: 'absolute',
    right: 3,
    width: 18,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#6EE7B7',
    transformOrigin: 'left center',
    zIndex: 1,
  },
  spoon: {
    position: 'absolute',
    right: -5,
    top: -8,
    width: 5,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  kcalBadge: {
    position: 'absolute',
    right: 3,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FB923C',
    borderWidth: 2,
    borderColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF7ED',
  },
});

export default MascotCharacter;
