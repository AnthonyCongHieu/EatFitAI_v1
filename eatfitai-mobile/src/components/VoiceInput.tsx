// VoiceInput component - Voice logging for meals with real STT
// Sử dụng Native Device Speech-to-Text (Google/Apple)

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
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

type RecordingState = 'idle' | 'recording' | 'processing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * VoiceInput Component
 *
 * Hiện tại sử dụng simulation cho Expo Go.
 * Khi build production với EAS, có thể tích hợp:
 * - @jamsch/expo-speech-recognition
 * - @react-native-voice/voice
 */
const VoiceInput: React.FC<VoiceInputProps> = ({
  onResult,
  onError,
  placeholder = 'Nhấn và giữ để nói...',
  disabled = false,
}) => {
  const { theme } = useAppTheme();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recognizedText, setRecognizedText] = useState<string>('');

  // Animation values
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Start recording/listening
  const startRecording = useCallback(async () => {
    if (disabled) return;

    setRecordingState('recording');
    setRecognizedText('');
    scale.value = withSpring(1.1, { damping: 18, stiffness: 400 });

    // Pulse animation while recording
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false,
    );

    console.log('[VoiceInput] Started recording...');

    // TODO: Khi không dùng Expo Go, uncomment để dùng real STT:
    // try {
    //   await ExpoSpeechRecognition.start({ language: 'vi-VN' });
    // } catch (err) {
    //   console.error('STT start failed:', err);
    // }
  }, [disabled, scale, pulseScale]);

  // Stop recording and process
  const stopRecording = useCallback(async () => {
    if (recordingState !== 'recording') return;

    setRecordingState('processing');
    scale.value = withSpring(1, { damping: 18, stiffness: 400 });
    cancelAnimation(pulseScale);
    pulseScale.value = withTiming(1, { duration: 200 });

    console.log('[VoiceInput] Stopped recording, processing...');

    // TODO: Khi không dùng Expo Go, uncomment:
    // await ExpoSpeechRecognition.stop();

    // SIMULATION: Dùng text giả để demo
    // Trong production, text này sẽ từ STT engine
    const simulatedText = getSimulatedText();
    setRecognizedText(simulatedText);

    try {
      // Parse intent using Ollama AI
      const command = await voiceService.parseWithOllama(simulatedText);

      console.log('[VoiceInput] Parsed command:', command);

      setRecordingState('idle');
      onResult(simulatedText, command);
    } catch (error) {
      console.error('[VoiceInput] Parse error:', error);
      setRecordingState('idle');
      onError?.('Không thể xử lý lệnh giọng nói');
    }
  }, [recordingState, scale, pulseScale, onResult, onError]);

  // Demo: Simulation text cho testing
  const getSimulatedText = (): string => {
    const samples: string[] = [
      'Thêm 1 bát phở bò vào bữa trưa',
      'Ghi 2 quả trứng bữa sáng',
      'Cân nặng 65 kg',
      'Hôm nay bao nhiêu calo',
    ];
    const index = Math.floor(Math.random() * samples.length);
    return samples[index] as string;
  };

  const handleLongPress = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handlePressOut = useCallback(() => {
    if (recordingState === 'recording') {
      stopRecording();
    }
  }, [recordingState, stopRecording]);

  // Quick tap - show instructions
  const handlePress = useCallback(() => {
    if (recordingState === 'idle') {
      Alert.alert(
        '🎤 Hướng dẫn Voice',
        'Nhấn và GIỮ nút mic để nói lệnh.\n\nVí dụ:\n• "Thêm 1 phở bò bữa trưa"\n• "Cân nặng 65 kg"\n• "Hôm nay bao nhiêu calo"',
        [{ text: 'Đã hiểu' }],
      );
    }
  }, [recordingState]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: opacity.value * 0.3,
  }));

  const getStateText = (): string => {
    switch (recordingState) {
      case 'recording':
        return 'Đang nghe...';
      case 'processing':
        return 'Đang xử lý...';
      default:
        return placeholder;
    }
  };

  const getStateColor = (): string => {
    switch (recordingState) {
      case 'recording':
        return theme.colors.danger;
      case 'processing':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {/* Pulse effect behind button */}
        {recordingState === 'recording' && (
          <Animated.View
            style={[
              styles.pulse,
              pulseStyle,
              {
                backgroundColor: theme.colors.danger,
              },
            ]}
          />
        )}

        <AnimatedPressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={200}
          disabled={disabled || recordingState === 'processing'}
          style={[
            buttonStyle,
            styles.button,
            {
              backgroundColor: getStateColor(),
              opacity: disabled ? 0.5 : 1,
              ...theme.shadows.md,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Voice input"
          accessibilityHint="Nhấn và giữ để nói tên món ăn"
        >
          <Icon
            name={recordingState === 'recording' ? 'mic' : 'mic-outline'}
            size="lg"
            color="card"
          />
        </AnimatedPressable>
      </View>

      <ThemedText variant="bodySmall" color="textSecondary" style={styles.stateText}>
        {getStateText()}
      </ThemedText>

      {/* Show recognized text */}
      {recognizedText && recordingState === 'idle' && (
        <View
          style={[styles.resultBox, { backgroundColor: theme.colors.success + '20' }]}
        >
          <ThemedText variant="bodySmall" color="success">
            "{recognizedText}"
          </ThemedText>
        </View>
      )}

      {/* Instructions */}
      {recordingState === 'idle' && !recognizedText && (
        <View style={styles.instructions}>
          <ThemedText variant="caption" color="muted">
            Ví dụ: "Thêm 1 bát phở bò bữa trưa"
          </ThemedText>
        </View>
      )}

      {/* Recording indicator */}
      {recordingState === 'recording' && (
        <View style={[styles.indicator, { backgroundColor: theme.colors.danger + '20' }]}>
          <View style={[styles.indicatorDot, { backgroundColor: theme.colors.danger }]} />
          <ThemedText variant="caption" color="danger">
            Đang ghi âm
          </ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  pulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    textAlign: 'center',
  },
  instructions: {
    paddingHorizontal: 16,
  },
  resultBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default VoiceInput;
