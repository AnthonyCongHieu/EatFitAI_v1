import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type TooltipProps = {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  visible?: boolean;
  onClose?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  animated?: boolean;
};

export const Tooltip = ({
  children,
  content,
  position = 'top',
  visible = false,
  onClose,
  autoHide = false,
  autoHideDelay = 3000,
  animated = true
}: TooltipProps): JSX.Element => {
  const { theme } = useAppTheme();

  const opacity = useSharedValue(0);

  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return {
          bottom: '100%',
          left: '50%',
          marginBottom: 8,
          transform: [{ translateX: '-50%' }],
        };
      case 'bottom':
        return {
          top: '100%',
          left: '50%',
          marginTop: 8,
          transform: [{ translateX: '-50%' }],
        };
      case 'left':
        return {
          right: '100%',
          top: '50%',
          marginRight: 8,
          transform: [{ translateY: '-50%' }],
        };
      case 'right':
        return {
          left: '100%',
          top: '50%',
          marginLeft: 8,
          transform: [{ translateY: '-50%' }],
        };
      default:
        return {};
    }
  };

  const getArrowStyles = () => {
    const baseArrow = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
      borderWidth: 6,
      borderColor: 'transparent',
    };

    switch (position) {
      case 'top':
        return {
          ...baseArrow,
          top: '100%',
          left: '50%',
          marginLeft: -6,
          borderTopColor: theme.colors.card,
          borderBottomWidth: 0,
        };
      case 'bottom':
        return {
          ...baseArrow,
          bottom: '100%',
          left: '50%',
          marginLeft: -6,
          borderBottomColor: theme.colors.card,
          borderTopWidth: 0,
        };
      case 'left':
        return {
          ...baseArrow,
          left: '100%',
          top: '50%',
          marginTop: -6,
          borderLeftColor: theme.colors.card,
          borderRightWidth: 0,
        };
      case 'right':
        return {
          ...baseArrow,
          right: '100%',
          top: '50%',
          marginTop: -6,
          borderRightColor: theme.colors.card,
          borderLeftWidth: 0,
        };
      default:
        return {};
    }
  };

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleBackdropPress = () => {
    if (onClose) {
      onClose();
    }
  };

  // Auto-hide functionality
  React.useEffect(() => {
    if (visible && autoHide && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [visible, autoHide, autoHideDelay, onClose]);

  // Animate opacity
  React.useEffect(() => {
    if (animated) {
      opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
    } else {
      opacity.value = visible ? 1 : 0;
    }
  }, [visible, animated]);

  if (!visible) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Backdrop for closing */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleBackdropPress}
      />

      {/* Tooltip */}
      <Animated.View
        style={[
          styles.tooltip,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          },
          getPositionStyles() as any,
          tooltipAnimatedStyle,
        ]}
        entering={animated ? FadeIn.duration(200) : undefined}
        exiting={animated ? FadeOut.duration(200) : undefined}
      >
        {/* Arrow */}
        <View style={getArrowStyles()} />

        {/* Content */}
        <View style={styles.content}>
          <ThemedText
            style={[
              styles.text,
              {
                color: theme.colors.text,
                fontSize: 14,
                fontFamily: 'Inter_400Regular',
              },
            ]}
          >
            {content}
          </ThemedText>
        </View>
      </Animated.View>

      {/* Children */}
      <View style={styles.children}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 1000,
    maxWidth: 200,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    textAlign: 'center',
    lineHeight: 18,
  },
  children: {
    zIndex: 1,
  },
});

export default Tooltip;
