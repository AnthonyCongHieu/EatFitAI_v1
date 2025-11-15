import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';

type AppStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export const AppStepper = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: AppStepperProps): JSX.Element => {
  const { theme } = useAppTheme();

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: canDecrement ? theme.colors.primary : theme.colors.muted,
          },
        ]}
        onPress={handleDecrement}
        disabled={!canDecrement}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
      >
        <ThemedText style={styles.buttonText}>-</ThemedText>
      </Pressable>

      <View style={styles.valueContainer}>
        <ThemedText style={styles.value}>{value}</ThemedText>
      </View>

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: canIncrement ? theme.colors.primary : theme.colors.muted,
          },
        ]}
        onPress={handleIncrement}
        disabled={!canIncrement}
        accessibilityRole="button"
        accessibilityLabel="Increase"
      >
        <ThemedText style={styles.buttonText}>+</ThemedText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  valueContainer: {
    minWidth: 40,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});

export default AppStepper;