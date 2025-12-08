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
  const isDark = theme.mode === 'dark';

  const resolvedPadding = paddingMap[padding] ?? theme.spacing.md;

  // Glassmorphism shadow
  const glassmorpShadow = shadow === 'none' ? {} : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: shadow === 'lg' ? 16 : shadow === 'md' ? 12 : 8,
    elevation: shadow === 'lg' ? 8 : shadow === 'md' ? 6 : 4,
  };

  // Glassmorphism styles theo variant
  const variantStyle: ViewStyle =
    variant === 'outlined'
      ? {
        backgroundColor: isDark
          ? 'rgba(25, 30, 28, 0.75)'
          : 'rgba(255, 255, 255, 0.85)',
        borderWidth: 1,
        borderColor: isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.06)',
      }
      : variant === 'filled'
        ? {
          backgroundColor: theme.colors.primaryLight,
          borderWidth: 1,
          borderColor: isDark
            ? 'rgba(16, 185, 129, 0.3)'
            : 'rgba(16, 185, 129, 0.2)',
        }
        : {
          // Default elevated - glassmorphism
          backgroundColor: isDark
            ? 'rgba(25, 30, 28, 0.85)'
            : 'rgba(255, 255, 255, 0.9)',
          borderWidth: 1,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.05)',
        };

  const content = (
    <View
      style={[
        {
          borderRadius: theme.borderRadius.card,
          padding: resolvedPadding,
          ...glassmorpShadow,
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
