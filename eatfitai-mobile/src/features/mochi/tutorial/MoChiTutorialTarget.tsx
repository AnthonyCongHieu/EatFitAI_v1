import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StatusBar, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  measureAdjustment?: Partial<Record<'x' | 'y' | 'width' | 'height', number>>;
  showHalo?: boolean;
};

const PROFILE_DEFAULTS: Record<
  MoChiTutorialHighlightProfile,
  {
    radius: number;
    insets: Record<'top' | 'right' | 'bottom' | 'left', number>;
  }
> = {
  dock: {
    radius: 47,
    insets: { top: 4, right: 4, bottom: 4, left: 4 },
  },
  tab: {
    radius: 18,
    insets: { top: 5, right: 7, bottom: 5, left: 7 },
  },
  sheetAction: {
    radius: 20,
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  },
  homeWater: {
    radius: 26,
    insets: { top: 3, right: 3, bottom: 3, left: 3 },
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
  measureAdjustment,
  showHalo = true,
}: MoChiTutorialTargetProps): React.ReactElement => {
  const ref = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const insetsRef = useRef(insets);
  insetsRef.current = insets;

  const focus = useRef(new Animated.Value(0)).current;
  const activateTargetRef = useRef(onTutorialActivate);
  const measureAdjustmentRef = useRef(measureAdjustment);
  const { currentStep, phase, registerTarget, requestTargetMeasurement } =
    useMoChiTutorial();
  const isActiveTarget = phase === 'spotlight' && currentStep?.targetId === targetId;
  const hasTutorialActivate = typeof onTutorialActivate === 'function';
  const activeHighlightProfile =
    highlightProfile ?? currentStep?.highlightProfile ?? 'sheetAction';
  const profile = PROFILE_DEFAULTS[activeHighlightProfile];
  const resolvedInsets = {
    top: highlightInsets?.top ?? profile.insets.top,
    right: highlightInsets?.right ?? profile.insets.right,
    bottom: highlightInsets?.bottom ?? profile.insets.bottom,
    left: highlightInsets?.left ?? profile.insets.left,
  };
  const resolvedRadius = highlightRadius ?? profile.radius;

  const [layoutSize, setLayoutSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  const handleLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayoutSize((currentSize) => {
        if (
          currentSize
          && Math.abs(currentSize.width - width) < 0.5
          && Math.abs(currentSize.height - height) < 0.5
        ) {
          return currentSize;
        }

        return { width, height };
      });
    }
  };

  activateTargetRef.current = onTutorialActivate;
  measureAdjustmentRef.current = measureAdjustment;

  useEffect(() => {
    const scheduleMeasure = (callback: () => void) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(callback);
        return;
      }

      setTimeout(callback, 0);
    };

    const unregister = registerTarget(targetId, {
      activateTarget: hasTutorialActivate
        ? () => {
            activateTargetRef.current?.();
          }
        : undefined,
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

              const currentAdjustment = measureAdjustmentRef.current;
              const currentInsets = insetsRef.current;
              const statusBarOffset = Platform.OS === 'android' ? (currentInsets.top || StatusBar.currentHeight || 24) : 0;
              const adjustedFrame = {
                x: x + (currentAdjustment?.x ?? 0),
                y: y + (currentAdjustment?.y ?? 0) + statusBarOffset,
                width: width + (currentAdjustment?.width ?? 0),
                height: height + (currentAdjustment?.height ?? 0),
              };

              if (adjustedFrame.width <= 0 || adjustedFrame.height <= 0) {
                resolve({ x, y, width, height });
                return;
              }

              resolve(adjustedFrame);
            });
          });
        }),
    });

    return unregister;
  }, [hasTutorialActivate, registerTarget, targetId]);

  useEffect(() => {
    if (!isActiveTarget) {
      return;
    }

    requestTargetMeasurement(targetId);
  }, [
    isActiveTarget,
    layoutSize?.height,
    layoutSize?.width,
    measureAdjustment?.height,
    measureAdjustment?.width,
    measureAdjustment?.x,
    measureAdjustment?.y,
    requestTargetMeasurement,
    targetId,
  ]);

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

  const highlightStyle = useMemo(() => {
    const haloWidth = layoutSize
      ? layoutSize.width + resolvedInsets.left + resolvedInsets.right
      : undefined;
    const haloHeight = layoutSize
      ? layoutSize.height + resolvedInsets.top + resolvedInsets.bottom
      : undefined;

    return {
      top: -resolvedInsets.top,
      left: -resolvedInsets.left,
      ...(layoutSize
        ? { width: haloWidth, height: haloHeight }
        : { right: -resolvedInsets.right, bottom: -resolvedInsets.bottom }),
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
    };
  }, [
    focus,
    layoutSize,
    resolvedInsets.left,
    resolvedInsets.right,
    resolvedInsets.top,
    resolvedInsets.bottom,
    resolvedRadius,
  ]);

  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={handleLayout}
      nativeID={`mochi-tutorial-${targetId}`}
      style={[styles.targetRoot, isActiveTarget && styles.activeTarget, style]}
    >
      {showHalo && isActiveTarget && (
        <Animated.View
          pointerEvents="none"
          style={[styles.highlightHalo, highlightStyle]}
        />
      )}
      {children}
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
  },
  highlightHalo: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4BE277',
    backgroundColor: 'rgba(75, 226, 119, 0.055)',
    shadowColor: '#4BE277',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
