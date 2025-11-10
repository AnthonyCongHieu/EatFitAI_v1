import type { TextInputProps, ViewStyle } from 'react-native';
import { TextInput, StyleSheet, View, Pressable, Platform } from 'react-native';
import { useState, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import { t } from '../i18n/vi';

type Props = TextInputProps & {
  error?: boolean;
  style?: ViewStyle | ViewStyle[];
  secureToggle?: boolean;
  label?: string;
  helperText?: string;
  required?: boolean;
};

export const ThemedTextInput = ({
  error,
  style,
  placeholderTextColor,
  secureTextEntry,
  secureToggle,
  label,
  helperText,
  required,
  ...rest
}: Props): JSX.Element => {
  const {
    theme: { colors, radius, spacing, typography },
  } = useAppTheme();
  const [hidden, setHidden] = useState<boolean>(!!secureTextEntry);
  const textInputRef = useRef<TextInput>(null);

  const effectiveSecure = secureToggle ? hidden : secureTextEntry;

  const resolvedKeyboardType = (() => {
    // On Android, Vietnamese IME (Telex/Laban Key) often fails in secure fields
    // unless using the 'visible-password' keyboard. Preserve explicit overrides.
    if (Platform.OS === 'android' && effectiveSecure && !rest.keyboardType) {
      return 'visible-password';
    }
    return rest.keyboardType || 'default';
  })();

  const input = (
    <TextInput
      ref={textInputRef}
      {...rest}
      secureTextEntry={effectiveSecure}
      placeholderTextColor={placeholderTextColor ?? colors.muted}
      style={[
        styles.base,
        {
          borderColor: error ? colors.danger : colors.border,
          color: colors.text,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.card,
          paddingRight: secureToggle ? spacing.lg + 20 : undefined,
          fontSize: typography.body.fontSize,
          minHeight: 48,
        },
        style,
      ]}
      accessibilityLabel={label || rest.accessibilityLabel}
      accessibilityHint={helperText || rest.accessibilityHint}
      // Avoid props that can interfere with IME composition
      keyboardType={resolvedKeyboardType}
      autoCapitalize={rest.autoCapitalize || 'none'}
    />
  );

  const inputWithToggle = secureToggle ? (
    <View style={{ position: 'relative' }}>
      {input}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hidden ? t('common.showPassword') : t('common.hidePassword')}
        onPress={() => setHidden((v) => !v)}
        hitSlop={12}
        style={{ position: 'absolute', right: spacing.sm, top: '50%', transform: [{ translateY: -9 }] }}
      >
        <Ionicons name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.muted} />
      </Pressable>
    </View>
  ) : input;

  if (!label && !helperText) return inputWithToggle;

  return (
    <View style={{ gap: spacing.xs }}>
      {label && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <ThemedText variant="bodySmall" weight="600">
            {label}
          </ThemedText>
          {required && (
            <ThemedText variant="bodySmall" color="danger">
              *
            </ThemedText>
          )}
        </View>
      )}
      {inputWithToggle}
      {helperText && (
        <ThemedText variant="bodySmall" color={error ? 'danger' : 'textSecondary'}>
          {helperText}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});

export default ThemedTextInput;
