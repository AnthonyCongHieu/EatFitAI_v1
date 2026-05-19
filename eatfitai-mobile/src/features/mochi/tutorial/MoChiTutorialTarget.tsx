import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type {
  MoChiTutorialHighlightProfile,
  MoChiTutorialTargetId,
} from './mochiTutorialCatalog';
import { useMoChiTutorial } from './MoChiTutorialContext';

type MoChiTutorialTargetProps = {
  targetId: MoChiTutorialTargetId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onTutorialActivate?: () => void;
  highlightProfile?: MoChiTutorialHighlightProfile;
  highlightRadius?: number;
  highlightInsets?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
};

const PROFILE_DEFAULTS: Record<
  MoChiTutorialHighlightProfile,
  {
    radius: number;
    insets: Record<'top' | 'right' | 'bottom' | 'left', number>;
  }
> = {
  dock: {
    radius: 40,
    insets: { top: 4, right: 4, bottom: 4, left: 4 },
  },
  tab: {
    radius: 18,
    insets: { top: 5, right: 7, bottom: 5, left: 7 },
  },
  sheetAction: {
    radius: 24,
    insets: { top: 4, right: 4, bottom: 4, left: 4 },
  },
  homeWater: {
    radius: 22,
    insets: { top: 5, right: 5, bottom: 5, left: 5 },
  },
};

export const MoChiTutorialTarget = ({
  targetId,
  children,
  style,
  onTutorialActivate,
  highlightProfile,
  highlightRadius,
  highlightInsets,
}: MoChiTutorialTargetProps): React.ReactElement => {
  const ref = useRef<View>(null);
  const focus = useRef(new Animated.Value(0)).current;
  const { currentStep, phase, registerTarget } = useMoChiTutorial();
  const isActiveTarget = phase === 'spotlight' && currentStep?.targetId === targetId;
  const activeHighlightProfile = highlightProfile ?? currentStep?.highlightProfile ?? 'sheetAction';
  const profile = PROFILE_DEFAULTS[activeHighlightProfile];
  const resolvedInsets = {
    top: highlightInsets?.top ?? profile.insets.top,
    right: highlightInsets?.right ?? profile.insets.right,
    bottom: highlightInsets?.bottom ?? profile.insets.bottom,
    left: highlightInsets?.left ?? profile.insets.left,
  };
  const resolvedRadius = highlightRadius ?? profile.radius;

  useEffect(() => {
    const scheduleMeasure = (callback: () => void) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(callback);
        return;
      }

      setTimeout(callback, 0);
    };

    const unregister = registerTarget(targetId, {
      activateTarget: onTutorialActivate,
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
  }, [onTutorialActivate, registerTarget, targetId]);

  useEffect(() => {
    focus.stopAnimation();

    if (!isActiveTarget) {
      focus.setValue(0);
      return;
    }

    focus.setValue(0);
    const animation = Animated.timing(focus, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [focus, isActiveTarget]);

  const highlightStyle = useMemo(() => ({
    top: -resolvedInsets.top,
    right: -resolvedInsets.right,
    bottom: -resolvedInsets.bottom,
    left: -resolvedInsets.left,
    borderRadius: resolvedRadius,
    opacity: focus.interpolate({
      inputRange: [0, 1],
      outputRange: [0.82, 1],
    }),
    transform: [
      {
        scale: focus.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  }), [
    focus,
    resolvedInsets.bottom,
    resolvedInsets.left,
    resolvedInsets.right,
    resolvedInsets.top,
    resolvedRadius,
  ]);

  return (
    <View
      ref={ref}
      collapsable={false}
      nativeID={`mochi-tutorial-${targetId}`}
      style={[styles.targetRoot, isActiveTarget && styles.activeTarget, style]}
    >
      {children}
      {isActiveTarget && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlightHalo,
            highlightStyle,
          ]}
        />
      )}
    </View>
  );
};

export default MoChiTutorialTarget;

const styles = StyleSheet.create({
  targetRoot: {
    position: 'relative',
  },
  activeTarget: {
    zIndex: 30,
    elevation: 30,
  },
  highlightHalo: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#4BE277',
    backgroundColor: 'rgba(75, 226, 119, 0.10)',
    shadowColor: '#4BE277',
    shadowOpacity: 0.56,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
});
