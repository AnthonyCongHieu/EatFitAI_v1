/**
 * QuickRating - Simple rating component for 1-5 scale
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface QuickRatingProps {
  value: number;
  onChange: (value: number) => void;
  options: string[]; // Labels for each rating (length must match scale)
  min?: number;
  max?: number;
}

export const QuickRating: React.FC<QuickRatingProps> = ({
  value,
  onChange,
  options,
  min = 1,
  max = 5,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    option: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.radius.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1.5,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    selectedOption: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
    },
    label: {
      textAlign: 'center',
      fontSize: 11,
      marginTop: 2,
    },
    selectedLabel: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((num) => (
        <Pressable
          key={num}
          onPress={() => onChange(num)}
          style={[styles.option, value === num && styles.selectedOption]}
        >
          <ThemedText variant="body" weight="600">
            {num}
          </ThemedText>
          {options[num - 1] && (
            <ThemedText
              variant="caption"
              style={[styles.label, value === num && styles.selectedLabel]}
            >
              {options[num - 1]}
            </ThemedText>
          )}
        </Pressable>
      ))}
    </View>
  );
};

export default QuickRating;
