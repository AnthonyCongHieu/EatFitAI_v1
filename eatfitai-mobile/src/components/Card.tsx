import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { useAppTheme } from '../theme/ThemeProvider';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: 'sm' | 'md' | 'lg';
};

export const Card = ({ children, style, padding = 'md' }: CardProps): JSX.Element => {
  const {
    theme: { colors, radius, spacing },
  } = useAppTheme();

  const pad = padding === 'sm' ? spacing.sm : padding === 'lg' ? spacing.lg : spacing.md;

  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      layout={Layout.springify()}
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: pad,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

export default Card;
