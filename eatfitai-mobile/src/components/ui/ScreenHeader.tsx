import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export const ScreenHeader = ({ title, subtitle }: ScreenHeaderProps): JSX.Element => {
  const { theme } = useAppTheme();

  return (
    <View style={{
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl
    }}>
      <ThemedText variant="h1" style={{ marginBottom: theme.spacing.sm }}>
        {title}
      </ThemedText>
      {subtitle && (
        <ThemedText variant="body" color="textSecondary">
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
};

export default ScreenHeader;