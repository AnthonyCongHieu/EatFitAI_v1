import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
};

export const ScreenHeader = ({
  title,
  subtitle,
  onBackPress,
}: ScreenHeaderProps): JSX.Element => {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
      }}
    >
      {onBackPress && (
        <TouchableOpacity
          onPress={onBackPress}
          style={{ marginBottom: theme.spacing.sm, alignSelf: 'flex-start' }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      )}
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
