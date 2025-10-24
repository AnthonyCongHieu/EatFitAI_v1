import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  runOnJS
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type CollapsibleProps = {
  children: ReactNode;
  title?: string;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  headerComponent?: ReactNode;
  duration?: number;
  animated?: boolean;
  disabled?: boolean;
};

export const Collapsible = ({
  children,
  title,
  expanded = false,
  onToggle,
  headerComponent,
  duration = 300,
  animated = true,
  disabled = false
}: CollapsibleProps): JSX.Element => {
  const { theme } = useAppTheme();

  const animationProgress = useSharedValue(expanded ? 1 : 0);
  const contentHeight = useSharedValue(0);

  const handleToggle = () => {
    if (disabled) return;

    const newExpanded = !expanded;
    if (onToggle) {
      onToggle(newExpanded);
    }

    if (animated) {
      animationProgress.value = withTiming(newExpanded ? 1 : 0, { duration });
    } else {
      animationProgress.value = newExpanded ? 1 : 0;
    }
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(animationProgress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(animationProgress.value, [0, 1], [0, contentHeight.value]),
    opacity: animationProgress.value,
  }));

  const renderHeader = () => {
    if (headerComponent) {
      return headerComponent;
    }

    return (
      <View style={styles.header}>
        {title && (
          <ThemedText variant="subtitle" style={styles.title}>
            {title}
          </ThemedText>
        )}
        <Animated.View style={headerAnimatedStyle}>
          <ThemedText style={styles.arrow}>▼</ThemedText>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleToggle}
        disabled={disabled}
        style={({ pressed }) => [
          styles.headerContainer,
          {
            backgroundColor: pressed && !disabled ? theme.colors.muted + '20' : 'transparent',
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title || 'Toggle content'}
      >
        {renderHeader()}
      </Pressable>

      <Animated.View
        style={[
          styles.content,
          contentAnimatedStyle,
        ]}
        onLayout={(event) => {
          contentHeight.value = event.nativeEvent.layout.height;
        }}
      >
        <View style={styles.contentInner}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  headerContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  arrow: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    overflow: 'hidden',
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default Collapsible;
