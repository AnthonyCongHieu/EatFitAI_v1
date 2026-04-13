import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

interface SelectionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const SelectionChip: React.FC<SelectionChipProps> = ({
  label,
  selected,
  onPress,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  return (
    <Pressable
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <ThemedText
        variant="bodySmall"
        style={{
          color: selected ? '#fff' : theme.colors.text,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
});
