/**
 * VoiceSheet - Bottom sheet for voice recording UI
 * Shows waveform, status text, and controls
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Pressable, TextInput, ScrollView } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../ThemedText';
import Button from '../Button';
import { BottomSheet } from '../BottomSheet';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useVoiceStore } from '../../store/useVoiceStore';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import VoiceResultCard from './VoiceResultCard';

interface VoiceSheetProps {
    visible: boolean;
    onClose: () => void;
}

export const VoiceSheet = ({ visible, onClose }: VoiceSheetProps): JSX.Element => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';

    const {
        status,
        recognizedText,
        parsedCommand,
        error,
        setRecognizedText,
        processText,
        executeCommand,
        reset,
        closeSheet,
    } = useVoiceStore();

    const {
        isRecording,
        duration,
        amplitude,
        startRecording,
        stopRecording,
        cancelRecording,
    } = useVoiceRecognition();

    // Waveform animation based on amplitude
    const waveScale = useSharedValue(1);

    useEffect(() => {
        if (isRecording) {
            waveScale.value = withSpring(1 + amplitude * 0.5);
        } else {
            waveScale.value = withSpring(1);
        }
    }, [amplitude, isRecording]);

    const waveStyle = useAnimatedStyle(() => ({
        transform: [{ scale: waveScale.value }],
    }));

    // Start recording when sheet opens
    useEffect(() => {
        if (visible && status === 'idle') {
            // Auto-start removed - user controls manually
        }
    }, [visible]);

    const handleClose = () => {
        cancelRecording();
        reset();
        closeSheet();
        onClose();
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const handleManualProcess = async () => {
        if (recognizedText.trim()) {
            await processText(recognizedText.trim());
        }
    };

    const handleExecute = async () => {
        await executeCommand();
        // Auto-close after success
        setTimeout(() => {
            if (status === 'success') {
                handleClose();
            }
        }, 1500);
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusText = (): string => {
        switch (status) {
            case 'listening':
                return '🎤 Đang ghi âm...';
            case 'processing':
                return '✍️ Đang chuyển giọng nói thành chữ...';
            case 'parsing':
                return '🤖 AI đang phân tích lệnh...';
            case 'executing':
                return '⚡ Đang thực hiện lệnh...';
            case 'success':
                return '✅ Thành công!';
            case 'error':
                return '❌ Có lỗi xảy ra';
            default:
                return '💬 Nhấn micro để ghi âm hoặc gõ lệnh bên dưới';
        }
    };

    const styles = StyleSheet.create({
        container: {
            padding: theme.spacing.lg,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
        },
        waveContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            height: 120,
            marginBottom: theme.spacing.lg,
        },
        wave: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isRecording ? theme.colors.danger : theme.colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        waveInner: {
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: (isRecording ? theme.colors.danger : theme.colors.primary) + '30',
        },
        duration: {
            marginTop: theme.spacing.sm,
            textAlign: 'center',
        },
        statusText: {
            textAlign: 'center',
            marginBottom: theme.spacing.lg,
        },
        inputContainer: {
            marginBottom: theme.spacing.lg,
        },
        textInput: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            color: theme.colors.text,
            fontSize: theme.typography.body.fontSize,
            minHeight: 80,
            textAlignVertical: 'top',
        },
        inputHint: {
            marginTop: theme.spacing.xs,
            textAlign: 'center',
        },
        actions: {
            flexDirection: 'row',
            gap: theme.spacing.md,
        },
        errorText: {
            color: theme.colors.danger,
            textAlign: 'center',
            marginBottom: theme.spacing.md,
        },
    });

    return (
        <BottomSheet visible={visible} onClose={handleClose} height={580}>
            <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <ThemedText variant="h3" weight="600">
                        🎤 Lệnh Giọng Nói
                    </ThemedText>
                    <Pressable onPress={handleClose} hitSlop={8}>
                        <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Waveform / Mic Button */}
                <Pressable style={styles.waveContainer} onPress={handleToggleRecording}>
                    <Animated.View style={[styles.waveInner, waveStyle]} />
                    <View style={styles.wave}>
                        <Ionicons
                            name={isRecording ? 'stop' : 'mic'}
                            size={40}
                            color="#FFFFFF"
                        />
                    </View>
                    {isRecording && (
                        <ThemedText variant="caption" color="danger" style={styles.duration}>
                            {formatDuration(duration)}
                        </ThemedText>
                    )}
                </Pressable>

                {/* Status Text */}
                <ThemedText variant="body" color="textSecondary" style={styles.statusText}>
                    {getStatusText()}
                </ThemedText>

                {/* Error */}
                {error && (
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                )}

                {/* Manual Text Input (fallback when STT not available) */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Hoặc gõ lệnh tại đây..."
                        placeholderTextColor={theme.colors.muted}
                        value={recognizedText}
                        onChangeText={setRecognizedText}
                        multiline
                    />
                    <ThemedText variant="caption" color="muted" style={styles.inputHint}>
                        Ví dụ: "Ghi 1 bát phở vào bữa trưa"
                    </ThemedText>
                </View>

                {/* Result Card */}
                {parsedCommand && parsedCommand.intent !== 'UNKNOWN' && (
                    <VoiceResultCard
                        command={parsedCommand}
                        onExecute={handleExecute}
                        isExecuting={status === 'executing'}
                    />
                )}

                {/* Actions */}
                {!parsedCommand && (
                    <View style={styles.actions}>
                        <Button
                            title="Hủy"
                            variant="ghost"
                            onPress={handleClose}
                            style={{ flex: 1 }}
                        />
                        <Button
                            title="Xử lý"
                            variant="primary"
                            onPress={handleManualProcess}
                            disabled={!recognizedText.trim() || status === 'parsing'}
                            loading={status === 'parsing'}
                            style={{ flex: 1 }}
                        />
                    </View>
                )}
            </ScrollView>
        </BottomSheet>
    );
};

export default VoiceSheet;
