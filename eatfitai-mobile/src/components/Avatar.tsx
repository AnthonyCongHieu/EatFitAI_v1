import type { ImageSourcePropType } from 'react-native';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { ThemedText } from './ThemedText';
import { useAppTheme } from '../theme/ThemeProvider';

type AvatarProps = {
  source?: ImageSourcePropType;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circular' | 'rounded' | 'square';
  showBorder?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  animated?: boolean;
  onPress?: () => void;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export const Avatar = ({
  source,
  name,
  size = 'md',
  variant = 'circular',
  showBorder = false,
  borderColor,
  backgroundColor,
  textColor,
  animated = true,
  onPress
}: AvatarProps): JSX.Element => {
  const { theme } = useAppTheme();

  const scale = useSharedValue(1);

  const getSizeConfig = () => {
    switch (size) {
      case 'xs':
        return { size: 24, fontSize: 10 };
      case 'sm':
        return { size: 32, fontSize: 12 };
      case 'lg':
        return { size: 64, fontSize: 24 };
      case 'xl':
        return { size: 96, fontSize: 36 };
      case 'md':
      default:
        return { size: 48, fontSize: 18 };
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBorderRadius = () => {
    const { size } = getSizeConfig();
    switch (variant) {
      case 'circular':
        return size / 2;
      case 'rounded':
        return size * 0.2;
      case 'square':
      default:
        return 0;
    }
  };

  const sizeConfig = getSizeConfig();
  const borderRadius = getBorderRadius();

  const finalBorderColor = borderColor || theme.colors.border;
  const finalBackgroundColor = backgroundColor || theme.colors.muted + '30';
  const finalTextColor = textColor || theme.colors.text;

  const handlePressIn = () => {
    if (animated && onPress) {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const avatarContent = source ? (
    <Image
      source={source}
      style={[
        styles.image,
        {
          width: sizeConfig.size,
          height: sizeConfig.size,
          borderRadius,
        },
      ]}
      resizeMode="cover"
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        {
          width: sizeConfig.size,
          height: sizeConfig.size,
          borderRadius,
          backgroundColor: finalBackgroundColor,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.initials,
          {
            fontSize: sizeConfig.fontSize,
            color: finalTextColor,
            fontFamily: 'Inter_600SemiBold',
          },
        ]}
      >
        {getInitials(name)}
      </ThemedText>
    </View>
  );

  return (
    <AnimatedView
      style={[
        styles.container,
        {
          width: sizeConfig.size + (showBorder ? 4 : 0),
          height: sizeConfig.size + (showBorder ? 4 : 0),
          borderRadius: borderRadius + (showBorder ? 2 : 0),
          borderWidth: showBorder ? 2 : 0,
          borderColor: finalBorderColor,
          padding: showBorder ? 1 : 0,
        },
        animatedStyle,
      ]}
    >
      {avatarContent}
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Avatar;
