import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { ThemedTextInput } from './ThemedTextInput';
import { useAppTheme } from '../theme/ThemeProvider';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onClear?: () => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: 'filled' | 'outlined' | 'underlined';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  autoFocus?: boolean;
  showClearButton?: boolean;
  animated?: boolean;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'TÃ¬m kiáº¿m...',
  onSubmit,
  onClear,
  leftIcon,
  rightIcon,
  variant = 'filled',
  size = 'md',
  disabled = false,
  autoFocus = false,
  showClearButton = true,
  animated = true
}: SearchBarProps): JSX.Element => {
  const { theme } = useAppTheme();

  const scale = useSharedValue(1);

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { height: 36, paddingHorizontal: 12, fontSize: 14, iconSize: 16 };
      case 'lg':
        return { height: 52, paddingHorizontal: 20, fontSize: 18, iconSize: 20 };
      case 'md':
      default:
        return { height: 44, paddingHorizontal: 16, fontSize: 16, iconSize: 18 };
    }
  };

  const sizeConfig = getSizeConfig();

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        };
      case 'underlined':
        return {
          backgroundColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          borderRadius: 0,
        };
      case 'filled':
      default:
        return {
          backgroundColor: theme.colors.muted + '20',
          borderWidth: 0,
          borderRadius: theme.radius.full,
        };
    }
  };

  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
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

  const renderLeftIcon = () => {
    if (leftIcon) {
      return leftIcon;
    }

    return (
      <View style={styles.searchIcon}>
        <ThemedText style={[styles.iconText, { fontSize: sizeConfig.iconSize, color: theme.colors.muted }]}>
          ðŸ”
        </ThemedText>
      </View>
    );
  };

  const renderRightIcon = () => {
    if (rightIcon) {
      return rightIcon;
    }

    if (showClearButton && value.length > 0) {
      return (
        <Pressable
          onPress={handleClear}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          hitSlop={8}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <ThemedText style={[styles.iconText, { fontSize: sizeConfig.iconSize, color: theme.colors.muted }]}>
            âœ•
          </ThemedText>
        </Pressable>
      );
    }

    return null;
  };

  return (
    <AnimatedView
      style={[
        styles.container,
        getVariantStyles(),
        {
          height: sizeConfig.height,
          opacity: disabled ? 0.6 : 1,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        {/* Left Icon */}
        {renderLeftIcon()}

        {/* Text Input */}
        <ThemedTextInput
          style={[
            styles.input,
            {
              fontSize: sizeConfig.fontSize,
              color: theme.colors.text,
              flex: 1,
            },
          ].filter(Boolean)}
          value={value}
          onChangeText={onChangeText}
          placeholder={'Tìm kiếm...'}
          placeholderTextColor={theme.colors.muted}
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
          editable={!disabled}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Right Icon */}
        {renderRightIcon()}
      </View>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  iconText: {
    fontWeight: 'bold',
  },
});

export default SearchBar;
