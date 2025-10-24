import type { TextProps } from 'react-native';
import { Text } from 'react-native';
import { memo } from 'react';

import { useAppTheme } from '../theme/ThemeProvider';

type ThemedTextProps = TextProps & {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'button';
  color?: 'primary' | 'secondary' | 'muted' | 'danger' | 'success' | 'warning' | 'info' | 'textSecondary';
  weight?: '300' | '400' | '500' | '600' | '700';
  align?: 'left' | 'center' | 'right' | 'justify';
};

export const ThemedText = memo(({
  variant = 'body',
  color,
  weight,
  align,
  style,
  ...rest
}: ThemedTextProps): JSX.Element => {
  const { theme } = useAppTheme();

  const typography = theme.typography[variant];

  // Determine text color
  let textColor = theme.colors.text;
  if (color === 'primary') textColor = theme.colors.primary;
  else if (color === 'secondary') textColor = theme.colors.secondary;
  else if (color === 'muted') textColor = theme.colors.muted;
  else if (color === 'danger') textColor = theme.colors.danger;
  else if (color === 'success') textColor = theme.colors.success;
  else if (color === 'warning') textColor = theme.colors.warning;
  else if (color === 'info') textColor = theme.colors.info;
  else if (color === 'textSecondary') textColor = theme.colors.textSecondary;

  // Determine font family based on weight override
  let fontFamily = typography.fontFamily;
  if (weight === '300') fontFamily = 'Inter_300Light';
  else if (weight === '400') fontFamily = 'Inter_400Regular';
  else if (weight === '500') fontFamily = 'Inter_500Medium';
  else if (weight === '600') fontFamily = 'Inter_600SemiBold';
  else if (weight === '700') fontFamily = 'Inter_700Bold';

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize: typography.fontSize,
          lineHeight: typography.lineHeight,
          letterSpacing: typography.letterSpacing,
          color: textColor,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
});
