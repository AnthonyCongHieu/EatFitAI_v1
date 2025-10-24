import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading';

type StatusIndicatorProps = {
  type: StatusType;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showIcon?: boolean;
  customIcon?: ReactNode;
};

const getStatusConfig = (type: StatusType, theme: any) => {
  switch (type) {
    case 'success':
      return {
        color: theme.colors.success,
        icon: '✓',
        backgroundColor: theme.colors.success + '15',
      };
    case 'error':
      return {
        color: theme.colors.danger,
        icon: '✕',
        backgroundColor: theme.colors.danger + '15',
      };
    case 'warning':
      return {
        color: theme.colors.warning,
        icon: '⚠',
        backgroundColor: theme.colors.warning + '15',
      };
    case 'info':
      return {
        color: theme.colors.info,
        icon: 'ℹ',
        backgroundColor: theme.colors.info + '15',
      };
    case 'loading':
      return {
        color: theme.colors.primary,
        icon: '⟳',
        backgroundColor: theme.colors.primary + '15',
      };
    default:
      return {
        color: theme.colors.muted,
        icon: '•',
        backgroundColor: theme.colors.muted + '15',
      };
  }
};

export const StatusIndicator = ({
  type,
  message,
  size = 'md',
  animated = true,
  showIcon = true,
  customIcon
}: StatusIndicatorProps): JSX.Element => {
  const { theme } = useAppTheme();

  const config = getStatusConfig(type, theme);
  const pulseValue = useSharedValue(1);
  const rotateValue = useSharedValue(0);

  // Loading animation
  if (type === 'loading' && animated) {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotateValue.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseValue.value },
      { rotate: `${rotateValue.value}deg` },
    ],
  }));

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { size: 16, fontSize: 12, padding: 4 };
      case 'lg':
        return { size: 32, fontSize: 18, padding: 12 };
      case 'md':
      default:
        return { size: 24, fontSize: 14, padding: 8 };
    }
  };

  const sizeConfig = getSizeConfig();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showIcon && (
          <Animated.View
            style={[
              styles.iconContainer,
              {
                width: sizeConfig.size,
                height: sizeConfig.size,
                borderRadius: sizeConfig.size / 2,
                backgroundColor: config.backgroundColor,
                padding: sizeConfig.padding,
              },
              animatedStyle,
            ]}
          >
            {customIcon || (
              <View style={styles.icon}>
                <Animated.Text
                  style={[
                    styles.iconText,
                    {
                      color: config.color,
                      fontSize: sizeConfig.fontSize,
                      fontFamily: theme.typography.button.fontFamily,
                    },
                  ]}
                >
                  {config.icon}
                </Animated.Text>
              </View>
            )}
          </Animated.View>
        )}

        {message && (
          <View style={styles.textContainer}>
            <ThemedText
              style={[
                {
                  color: config.color,
                  fontSize: sizeConfig.fontSize,
                  fontFamily: theme?.typography?.body?.fontFamily || 'Inter_400Regular',
                  lineHeight: 20,
                },
              ]}
            >
              {message}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
  },
});

export default StatusIndicator;
