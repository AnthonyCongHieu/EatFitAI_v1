import type { TextInputProps, ViewStyle } from 'react-native';
import { TextInput, StyleSheet, View, Pressable } from 'react-native';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  error?: boolean;
  style?: ViewStyle | ViewStyle[];
  secureToggle?: boolean;
};

export const ThemedTextInput = ({ error, style, placeholderTextColor, secureTextEntry, secureToggle, ...rest }: Props): JSX.Element => {
  const {
    theme: { colors, radius, spacing },
  } = useAppTheme();
  const [hidden, setHidden] = useState<boolean>(!!secureTextEntry);

  const input = (
    <TextInput
      {...rest}
      secureTextEntry={secureToggle ? hidden : secureTextEntry}
      placeholderTextColor={placeholderTextColor ?? colors.muted}
      style={[
        styles.base,
        {
          borderColor: error ? (colors.danger ?? '#E53935') : colors.border,
          color: colors.text,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: 'transparent',
          paddingRight: secureToggle ? spacing.lg + 20 : undefined,
        },
        style,
      ]}
    />
  );

  if (!secureToggle) return input;

  return (
    <View style={{ position: 'relative' }}>
      {input}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
        onPress={() => setHidden((v) => !v)}
        hitSlop={8}
        style={{ position: 'absolute', right: 8, top: 10 }}
      >
        <Ionicons name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
  },
});

export default ThemedTextInput;
