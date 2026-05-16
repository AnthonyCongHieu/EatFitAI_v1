import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useMoChiIslandLayout } from './MoChiIslandLayoutContext';

const MoChiIslandSpacer = (): React.ReactElement => {
  const { topOffset } = useMoChiIslandLayout();
  const spacerHeight = useSharedValue(topOffset);

  useEffect(() => {
    spacerHeight.value = withTiming(topOffset, { duration: 220 });
  }, [spacerHeight, topOffset]);

  const spacerStyle = useAnimatedStyle(() => ({
    height: spacerHeight.value,
  }));

  return <Animated.View pointerEvents="none" style={spacerStyle} />;
};

export default MoChiIslandSpacer;
