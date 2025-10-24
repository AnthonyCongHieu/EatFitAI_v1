import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { useAppTheme } from '../theme/ThemeProvider';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  animated?: boolean;
};

export const Card = ({ 
  children, 
  style, 
  padding = 'md', 
  shadow = 'md',
  animated = true 
}: CardProps): JSX.Element => {
  const { theme } = useAppTheme();

  // Determine padding
  let pad = theme.spacing.md;
  if (padding === 'sm') pad = theme.spacing.sm;
  else if (padding === 'lg') pad = theme.spacing.lg;
  else if (padding === 'xl') pad = theme.spacing.xl;

  // Determine shadow
  const shadowStyle = shadow === 'none' ? {} : theme.shadows[shadow];

  const cardStyle = [
    {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.lg,
      padding: pad,
      ...shadowStyle,
    },
    style,
  ];

  if (animated) {
    return (
      <Animated.View
        entering={FadeInUp.duration(theme.animation.normal)}
        layout={Layout.springify()}
        style={cardStyle}
      >
        {children}
      </Animated.View>
    );
  }

  return <Animated.View style={cardStyle}>{children}</Animated.View>;
};

export default Card;
