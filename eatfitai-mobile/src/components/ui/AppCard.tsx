import React from 'react';
import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type ShadowSize = 'none' | 'sm' | 'md' | 'lg';
type Variant = 'elevated' | 'outlined' | 'filled';

export type AppCardProps = {
  children: ReactNode;
  title?: string;
  style?: ViewStyle | ViewStyle[];
  padding?: PaddingSize;
  shadow?: ShadowSize;
  variant?: Variant;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const paddingMap: Record<PaddingSize, number> = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const AppCard = ({
  children,
  title,
  style,
  padding = 'md',
  shadow = 'md',
  variant = 'elevated',
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: AppCardProps): JSX.Element => {
  const { theme } = useAppTheme();

  const resolvedPadding = paddingMap[padding] ?? theme.spacing.md;
  const shadowStyle =
    shadow === 'none' ? {} : (theme.shadows[shadow] ?? theme.shadows.md);

  const variantStyle: ViewStyle =
    variant === 'outlined'
      ? {
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }
      : variant === 'filled'
        ? { backgroundColor: theme.colors.primaryLight }
        : {
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
          };

  const content = (
    <View
      style={[
        {
          borderRadius: theme.borderRadius.card,
          padding: resolvedPadding,
          ...shadowStyle,
          ...variantStyle,
        },
        style,
      ]}
    >
      {title ? (
        <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
          {title}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

export default AppCard;
