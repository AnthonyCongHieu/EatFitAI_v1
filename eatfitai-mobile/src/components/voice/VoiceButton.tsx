/**
 * VoiceButton - Floating Action Button for Voice AI
 * Displays microphone icon, triggers voice recording
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '../../../theme/ThemeProvider';
import { useVoiceStore } from '../../../store/useVoiceStore';

interface VoiceButtonProps {
  onPress: () => void;
  size?: number;
  style?: any;
}

export const VoiceButton = ({
  onPress,
  size = 56,
  style,
}: VoiceButtonProps): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const { status } = useVoiceStore();

  const isActive = status === 'listening';

  // Pulse animation when listening
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800 }),
          withTiming(0, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withSpring(1);
      pulseOpacity.value = withTiming(0);
    }
  }, [isActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
      width: size,
      height: size,
    },
    pulse: {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.colors.primary,
    },
    button: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: isActive ? theme.colors.error : theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.lg,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {/* Pulse effect */}
      <Animated.View style={[styles.pulse, pulseStyle]} />

      {/* Button */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={isActive ? 'Dừng ghi âm' : 'Bắt đầu lệnh giọng nói'}
        accessibilityHint="Nhấn để nói lệnh với EatFit"
      >
        <Ionicons name={isActive ? 'stop' : 'mic'} size={size * 0.45} color="#FFFFFF" />
      </Pressable>
    </View>
  );
};

export default VoiceButton;
