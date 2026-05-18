import React, { useEffect, useRef } from 'react';
import {
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { MoChiTutorialTargetId } from './mochiTutorialCatalog';
import { useMoChiTutorial } from './MoChiTutorialContext';

type MoChiTutorialTargetProps = {
  targetId: MoChiTutorialTargetId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const MoChiTutorialTarget = ({
  targetId,
  children,
  style,
}: MoChiTutorialTargetProps): React.ReactElement => {
  const ref = useRef<View>(null);
  const { registerTarget } = useMoChiTutorial();

  useEffect(() => {
    const scheduleMeasure = (callback: () => void) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(callback);
        return;
      }

      setTimeout(callback, 0);
    };

    const unregister = registerTarget(targetId, {
      measure: () =>
        new Promise((resolve) => {
          scheduleMeasure(() => {
            if (!ref.current) {
              resolve(null);
              return;
            }

            ref.current.measureInWindow((x, y, width, height) => {
              if (width <= 0 || height <= 0) {
                resolve(null);
                return;
              }

              resolve({ x, y, width, height });
            });
          });
        }),
    });

    return unregister;
  }, [registerTarget, targetId]);

  return (
    <View
      ref={ref}
      collapsable={false}
      nativeID={`mochi-tutorial-${targetId}`}
      style={style}
    >
      {children}
    </View>
  );
};

export default MoChiTutorialTarget;
