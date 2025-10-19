import type { TextProps } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../theme/ThemeProvider';

type ThemedTextProps = TextProps & {
  variant?: 'title' | 'subtitle' | 'body';
};

const SIZE_MAP = {
  title: 28,
  subtitle: 18,
  body: 15,
} as const;

export const ThemedText = ({
  variant = 'body',
  style,
  ...rest
}: ThemedTextProps): JSX.Element => {
  const {
    theme: { colors },
  } = useAppTheme();

  return (
    <Text
      style={[
        styles.base,
        { color: colors.text, fontSize: SIZE_MAP[variant] },
        variant === 'title' ? styles.title : null,
        variant === 'subtitle' ? styles.subtitle : null,
        style,
      ]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: 'Inter_400Regular',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    fontFamily: 'Inter_600SemiBold',
  },
});
