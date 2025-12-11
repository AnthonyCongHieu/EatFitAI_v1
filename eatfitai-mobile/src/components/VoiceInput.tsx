// VoiceInput component - Voice logging for meals
// Inspired by FoodBuddy and Welling AI

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
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

interface VoiceInputProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VoiceInput: React.FC<VoiceInputProps> = ({
  onResult,
  onError,
  placeholder = 'Nhấn và giữ để nói...',
  disabled = false,
}) => {
  const { theme } = useAppTheme();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');

  // Animation values
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const startRecording = useCallback(() => {
    if (disabled) return;

    setRecordingState('recording');
    scale.value = withSpring(1.1, { damping: 18, stiffness: 400 });

    // Pulse animation while recording
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1, // Infinite repeat
      false,
    );

    // Note: In a real implementation, you would use expo-speech or
    // @react-native-voice/voice here
    // For now, this is a placeholder for the voice recognition logic
    console.log('Started recording...');
  }, [disabled, scale, pulseScale]);

  const stopRecording = useCallback(() => {
    if (recordingState !== 'recording') return;

    setRecordingState('processing');
    scale.value = withSpring(1, { damping: 18, stiffness: 400 });
    cancelAnimation(pulseScale);
    pulseScale.value = withTiming(1, { duration: 200 });

    // Simulate processing
    // In real implementation: stop voice recognition and process result
    setTimeout(() => {
      setRecordingState('idle');
      // Simulated result - in real app this would come from voice recognition
      // onResult('Phở bò');
      console.log('Stopped recording...');
    }, 500);
  }, [recordingState, scale, pulseScale]);

  const handleLongPress = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handlePressOut = useCallback(() => {
    if (recordingState === 'recording') {
      stopRecording();
    }
  }, [recordingState, stopRecording]);

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

      {/* Instructions */}
      {recordingState === 'idle' && (
        <View style={styles.instructions}>
          <ThemedText variant="caption" color="muted">
            Ví dụ: "Tôi ăn 1 bát phở bò"
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
