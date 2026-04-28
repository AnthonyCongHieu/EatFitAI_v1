// VoiceInput component - Voice logging cho meals
// Chuyển từ simulation sang text input thực tế gọi parseWithProvider

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ThemedText';
import Icon from './Icon';
import voiceService, { ParsedVoiceCommand } from '../services/voiceService';

interface VoiceInputProps {
  onResult: (text: string, command?: ParsedVoiceCommand) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

type InputState = 'idle' | 'processing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * VoiceInput Component
 *
 * Text input + AI parse. User nhập lệnh → gọi Gemini parse intent.
 * Khi tích hợp @jamsch/expo-speech-recognition (EAS build),
 * có thể thêm nút mic ghi âm thật gọi voiceService.transcribeAudio().
 */
const VoiceInput: React.FC<VoiceInputProps> = ({
  onResult,
  onError,
  placeholder = 'Nhập lệnh: "Thêm 1 bát phở bữa trưa"...',
  disabled = false,
}) => {
  const { theme } = useAppTheme();
  const [inputState, setInputState] = useState<InputState>('idle');
  const [inputText, setInputText] = useState<string>('');
  const [lastParsedText, setLastParsedText] = useState<string>('');

  // Animation values
  const scale = useSharedValue(1);

  // Xử lý gửi lệnh text
  const handleSubmit = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || disabled || inputState === 'processing') return;

    Keyboard.dismiss();
    setInputState('processing');
    scale.value = withSpring(0.95, { damping: 18, stiffness: 400 });

    console.log('[VoiceInput] Parsing text command:', trimmed);

    try {
      // Parse intent bằng Gemini AI qua backend
      const command = await voiceService.parseWithProvider(trimmed);

      console.log('[VoiceInput] Parsed command:', command);
      setLastParsedText(trimmed);
      setInputText('');
      setInputState('idle');
      scale.value = withSpring(1, { damping: 18, stiffness: 400 });
      onResult(trimmed, command);
    } catch (error) {
      console.error('[VoiceInput] Parse error:', error);
      setInputState('idle');
      scale.value = withSpring(1, { damping: 18, stiffness: 400 });
      onError?.('Không thể xử lý lệnh. Vui lòng thử lại.');
    }
  }, [inputText, disabled, inputState, scale, onResult, onError]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getStateColor = (): string => {
    switch (inputState) {
      case 'processing':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Text input */}
      <View style={[styles.inputRow, { borderColor: theme.colors.border }]}>
        <TextInput
          style={[
            styles.textInput,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.card,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          editable={!disabled && inputState !== 'processing'}
          multiline={false}
        />

        {/* Nút gửi */}
        <AnimatedPressable
          onPress={handleSubmit}
          disabled={disabled || inputState === 'processing' || !inputText.trim()}
          style={[
            buttonStyle,
            styles.sendButton,
            {
              backgroundColor: getStateColor(),
              opacity: disabled || !inputText.trim() ? 0.5 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Gửi lệnh"
          accessibilityHint="Nhấn để gửi lệnh text cho AI phân tích"
        >
          <Icon
            name={inputState === 'processing' ? 'hourglass-outline' : 'send'}
            size="md"
            color="card"
          />
        </AnimatedPressable>
      </View>

      {/* Trạng thái */}
      <ThemedText variant="bodySmall" color="textSecondary" style={styles.stateText}>
        {inputState === 'processing' ? 'Đang xử lý...' : 'Nhập lệnh và nhấn gửi'}
      </ThemedText>

      {/* Kết quả parsed gần nhất */}
      {lastParsedText && inputState === 'idle' && (
        <View
          style={[styles.resultBox, { backgroundColor: theme.colors.success + '20' }]}
        >
          <ThemedText variant="bodySmall" color="success">
            ✓ "{lastParsedText}"
          </ThemedText>
        </View>
      )}

      {/* Hướng dẫn */}
      {inputState === 'idle' && !lastParsedText && (
        <View style={styles.instructions}>
          <ThemedText variant="caption" color="muted">
            Ví dụ: "Thêm 1 bát phở bò bữa trưa" • "Cân nặng 65 kg"
          </ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    textAlign: 'center',
  },
  instructions: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  resultBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
});

export default VoiceInput;
