import type { TextInputProps, ViewStyle } from 'react-native';
import { TextInput, StyleSheet, View, Pressable, Platform } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
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
}: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const { colors, spacing, typography } = theme;
  const isDark = theme.mode === 'dark';
  const [hidden, setHidden] = useState<boolean>(!!secureTextEntry);
  const [focused, setFocused] = useState<boolean>(false);
  const [internalValue, setInternalValue] = useState<string>(
    (rest.value as string) ?? '',
  );
  const textInputRef = useRef<TextInput>(null);

  // Keep internal value in sync when external value changes while not focused
  useEffect(() => {
    const incoming = (rest.value as string) ?? '';
    if (!focused) {
      setInternalValue(incoming);
      return;
    }
    // Heuristic: if parent programmatically clears the value while focused, reflect it
    if (focused && incoming === '' && internalValue !== '') {
      setInternalValue('');
    }
  }, [rest.value, focused, internalValue]);

  const effectiveSecure = secureToggle ? hidden : secureTextEntry;

  const inputValue = useMemo(() => {
    // While focused, prefer internal value to avoid interrupting IME composition
    return focused ? internalValue : ((rest.value as string) ?? internalValue);
  }, [focused, internalValue, rest.value]);

  const input = (
    <TextInput
      ref={textInputRef}
      {...rest}
      secureTextEntry={effectiveSecure}
      placeholderTextColor={placeholderTextColor ?? colors.muted}
      style={[
        styles.base,
        {
          borderColor: error
            ? colors.danger
            : focused
              ? colors.primary
              : isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.08)',
          color: colors.text,
          borderRadius: theme.borderRadius.input,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          // Glassmorphism background
          backgroundColor: isDark ? 'rgba(30, 35, 33, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          paddingRight: secureToggle ? spacing.lg + 20 : undefined,
          fontSize: typography.body.fontSize,
          minHeight: 48,
        },
        style,
      ]}
      accessibilityLabel={label || rest.accessibilityLabel}
      accessibilityHint={helperText || rest.accessibilityHint}
      // Avoid props that can interfere with IME composition
      keyboardType={rest.keyboardType}
      // Avoid Android full-screen editor which can break IME composition on some devices
      disableFullscreenUI={Platform.OS === 'android' ? true : undefined}
      autoCapitalize={rest.autoCapitalize || 'none'}
      value={inputValue}
      onChangeText={(text) => {
        setInternalValue(text);
        rest.onChangeText?.(text);
      }}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
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
        style={{
          position: 'absolute',
          right: spacing.sm,
          top: '50%',
          transform: [{ translateY: -9 }],
        }}
      >
        <Ionicons name={hidden ? 'eye' : 'eye-off'} size={20} color={colors.muted} />
      </Pressable>
    </View>
  ) : (
    input
  );

  if (!label && !helperText) return inputWithToggle;

  return (
    <View style={{ gap: spacing.sm }}>
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
