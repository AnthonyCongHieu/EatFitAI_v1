import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type Segment = {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type SegmentedControlProps = {
  segments: Segment[];
  selectedKey: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined';
  animated?: boolean;
  disabled?: boolean;
};

export const SegmentedControl = ({
  segments,
  selectedKey,
  onChange,
  size = 'md',
  variant = 'filled',
  animated = true,
  disabled = false
}: SegmentedControlProps): JSX.Element => {
  const { theme } = useAppTheme();

  const selectedIndex = segments.findIndex(segment => segment.key === selectedKey);
  const indicatorPosition = useSharedValue(selectedIndex);

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { height: 32, padding: 4, fontSize: 12, borderRadius: 8 };
      case 'lg':
        return { height: 48, padding: 8, fontSize: 16, borderRadius: 12 };
      case 'md':
      default:
        return { height: 40, padding: 6, fontSize: 14, borderRadius: 10 };
    }
  };

  const sizeConfig = getSizeConfig();
  const segmentWidth = `100%`; // Will be calculated dynamically

  const handleSegmentPress = (segment: Segment) => {
    if (!segment.disabled && !disabled) {
      const newIndex = segments.findIndex(s => s.key === segment.key);
      if (animated) {
        indicatorPosition.value = withSpring(newIndex, { damping: 20, stiffness: 200 });
      } else {
        indicatorPosition.value = newIndex;
      }
      onChange(segment.key);
    }
  };

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      indicatorPosition.value,
      segments.map((_, index) => index),
      segments.map((_, index) => (100 / segments.length) * index)
    );

    return {
      transform: [{ translateX: `${translateX}%` }],
      width: `${100 / segments.length}%`,
    };
  });

  const getSegmentStyle = (isSelected: boolean, isDisabled: boolean) => {
    const baseStyle = {
      flex: 1,
      height: sizeConfig.height - sizeConfig.padding * 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: sizeConfig.borderRadius - 2,
      opacity: isDisabled || disabled ? 0.5 : 1,
    };

    if (variant === 'outlined') {
      return {
        ...baseStyle,
        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
      };
    }

    return baseStyle;
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: sizeConfig.height,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: variant === 'outlined' ? 'transparent' : theme.colors.muted + '20',
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Animated Indicator */}
      {variant === 'filled' && (
        <Animated.View
          style={[
            styles.indicator,
            {
              height: sizeConfig.height - sizeConfig.padding * 2,
              borderRadius: sizeConfig.borderRadius - 2,
              backgroundColor: theme.colors.primary,
            },
            indicatorAnimatedStyle,
          ]}
        />
      )}

      {/* Segments */}
      <View style={styles.segments}>
        {segments.map((segment, index) => {
          const isSelected = segment.key === selectedKey;
          const isDisabled = segment.disabled || disabled;

          return (
            <Pressable
              key={segment.key}
              onPress={() => handleSegmentPress(segment)}
              disabled={isDisabled}
              style={getSegmentStyle(isSelected, isDisabled)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={segment.label}
            >
              <View style={styles.segmentContent}>
                {segment.icon && (
                  <View style={styles.segmentIcon}>
                    {segment.icon}
                  </View>
                )}
                <ThemedText
                  style={[
                    styles.segmentLabel,
                    {
                      fontSize: sizeConfig.fontSize,
                      color: variant === 'outlined'
                        ? (isSelected ? '#fff' : theme.colors.text)
                        : (isSelected ? '#fff' : theme.colors.text),
                      fontFamily: 'Inter_600SemiBold',
                    },
                  ]}
                >
                  {segment.label}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  segments: {
    flexDirection: 'row',
    flex: 1,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentIcon: {
    marginRight: 2,
  },
  segmentLabel: {
    fontWeight: '500',
  },
});

export default SegmentedControl;
