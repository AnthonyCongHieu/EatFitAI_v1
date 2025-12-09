import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  action?: React.ReactNode;
};

export const ScreenHeader = ({
  title,
  subtitle,
  onBackPress,
  action,
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
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ flex: 1 }}>
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
        {action && (
          <View style={{ marginLeft: theme.spacing.md, marginTop: theme.spacing.xs }}>
            {action}
          </View>
        )}
      </View>
    </View>
  );
};

export default ScreenHeader;
