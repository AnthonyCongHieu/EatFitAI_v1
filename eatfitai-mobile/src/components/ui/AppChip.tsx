import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type AppChipProps = {
  label: string;
  selected?: boolean;
  variant?: 'solid' | 'outline';
  onPress?: () => void;
};

export const AppChip = ({
  label,
  selected = false,
  variant = 'solid',
  onPress,
}: AppChipProps): JSX.Element => {
  const { theme } = useAppTheme();

  const getBackgroundColor = () => {
    if (variant === 'solid') {
      return selected ? theme.colors.primary : theme.colors.muted + '20';
    }
    return 'transparent';
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return selected ? theme.colors.primary : theme.colors.border;
    }
    return 'transparent';
  };

  const getTextColor = () => {
    if (variant === 'solid' && selected) {
      return '#fff';
    }
    if (variant === 'outline' && selected) {
      return theme.colors.primary;
    }
    return theme.colors.text;
  };

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
        },
      ]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
    >
      <ThemedText
        style={[
          styles.label,
          {
            color: getTextColor(),
          },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});

export default AppChip;