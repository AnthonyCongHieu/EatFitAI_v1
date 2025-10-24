import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type ListItemProps = {
  title: string;
  subtitle?: string;
  leftComponent?: ReactNode;
  rightComponent?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  variant?: 'default' | 'card' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  chevron?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ListItem = ({
  title,
  subtitle,
  leftComponent,
  rightComponent,
  onPress,
  onLongPress,
  disabled = false,
  selected = false,
  variant = 'default',
  size = 'md',
  animated = true,
  chevron = false
}: ListItemProps): JSX.Element => {
  const { theme } = useAppTheme();

  const scale = useSharedValue(1);

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 12, titleSize: 14, subtitleSize: 12 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 20, titleSize: 18, subtitleSize: 14 };
      case 'md':
      default:
        return { paddingVertical: 12, paddingHorizontal: 16, titleSize: 16, subtitleSize: 13 };
    }
  };

  const sizeConfig = getSizeConfig();

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          marginVertical: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        };
      case 'bordered':
        return {
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          marginVertical: 2,
        };
      case 'default':
      default:
        return {
          backgroundColor: 'transparent',
          borderBottomWidth: 0.5,
          borderBottomColor: theme.colors.border,
        };
    }
  };

  const handlePressIn = () => {
    if (animated && !disabled) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (animated && !disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderRightComponent = () => {
    if (rightComponent) {
      return rightComponent;
    }

    if (chevron) {
      return (
        <ThemedText style={[styles.chevron, { color: theme.colors.muted }]}>
          ›
        </ThemedText>
      );
    }

    return null;
  };

  return (
    <AnimatedPressable
      style={[
        styles.container,
        getVariantStyles(),
        {
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          opacity: disabled ? 0.6 : 1,
        },
        animatedStyle,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected, disabled }}
    >
      <View style={styles.content}>
        {/* Left Component */}
        {leftComponent && (
          <View style={styles.leftComponent}>
            {leftComponent}
          </View>
        )}

        {/* Text Content */}
        <View style={styles.textContent}>
          <ThemedText
            style={[
              styles.title,
              {
                fontSize: sizeConfig.titleSize,
                color: selected ? theme.colors.primary : theme.colors.text,
                fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular',
              },
            ]}
          >
            {title}
          </ThemedText>

          {subtitle && (
            <ThemedText
              style={[
                styles.subtitle,
                {
                  fontSize: sizeConfig.subtitleSize,
                  color: theme.colors.muted,
                },
              ]}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>

        {/* Right Component */}
        {renderRightComponent() && (
          <View style={styles.rightComponent}>
            {renderRightComponent()}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftComponent: {
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontWeight: '500',
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 2,
    lineHeight: 16,
  },
  rightComponent: {
    marginLeft: 12,
  },
  chevron: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ListItem;
