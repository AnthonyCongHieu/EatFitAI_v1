import React from 'react';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type AppCardProps = {
  children: ReactNode;
  title?: string;
  style?: ViewStyle | ViewStyle[];
  shadow?: boolean;
  border?: boolean;
};

export const AppCard = ({
  children,
  title,
  style,
  shadow = true,
  border = false,
}: AppCardProps): JSX.Element => {
  const { theme } = useAppTheme();

  const cardStyle: ViewStyle = {
    borderRadius: theme.radius.lg, // 16
    padding: theme.spacing.md, // 16
    backgroundColor: theme.colors.card,
    ...(shadow ? theme.shadows.md : {}),
    ...(border ? { borderWidth: 1, borderColor: theme.colors.border } : {}),
  };

  return (
    <View style={[cardStyle, style]}>
      {title && (
        <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
          {title}
        </ThemedText>
      )}
      {children}
    </View>
  );
};

export default AppCard;