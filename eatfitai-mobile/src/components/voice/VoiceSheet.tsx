/**
 * VoiceSheet - Premium Bottom sheet for voice recording UI
 * Features: Animated pulse rings, gradient mic button, glassmorphism, premium typography
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Pressable, TextInput, ScrollView, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
    FadeIn,
    FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const VoiceSheet = ({ visible, onClose }: VoiceSheetProps): React.ReactElement => {
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

    // Animated pulse rings
    const ring1Scale = useSharedValue(1);
    const ring2Scale = useSharedValue(1);
    const ring3Scale = useSharedValue(1);
    const ring1Opacity = useSharedValue(0.6);
    const ring2Opacity = useSharedValue(0.4);
    const ring3Opacity = useSharedValue(0.2);
    const buttonScale = useSharedValue(1);

    useEffect(() => {
        if (isRecording) {
            // Pulse animation for rings
            ring1Scale.value = withRepeat(
                withSequence(
                    withTiming(1.3, { duration: 800, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );
            ring2Scale.value = withRepeat(
                withSequence(
                    withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );
            ring3Scale.value = withRepeat(
                withSequence(
                    withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 1200, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );
            ring1Opacity.value = withRepeat(
                withSequence(
                    withTiming(0.2, { duration: 800 }),
                    withTiming(0.6, { duration: 800 })
                ),
                -1,
                false
            );
        } else {
            ring1Scale.value = withSpring(1);
            ring2Scale.value = withSpring(1);
            ring3Scale.value = withSpring(1);
            ring1Opacity.value = withTiming(0.3);
        }
    }, [isRecording]);

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring1Scale.value }],
        opacity: ring1Opacity.value,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring2Scale.value }],
        opacity: ring2Opacity.value,
    }));

    const ring3Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring3Scale.value }],
        opacity: ring3Opacity.value,
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const handleClose = () => {
        cancelRecording();
        reset();
        closeSheet();
        onClose();
    };

    const handleToggleRecording = async () => {
        buttonScale.value = withSequence(
            withSpring(0.9, { damping: 10 }),
            withSpring(1, { damping: 15 })
        );
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

    const getStatusConfig = (): { emoji: string; text: string; color: string } => {
        switch (status) {
            case 'listening':
                return { emoji: '🎙️', text: 'Đang lắng nghe...', color: theme.colors.danger };
            case 'processing':
                return { emoji: '✨', text: 'Đang xử lý giọng nói...', color: theme.colors.warning };
            case 'parsing':
                return { emoji: '🤖', text: 'AI đang phân tích...', color: theme.colors.info };
            case 'executing':
                return { emoji: '⚡', text: 'Đang thực hiện...', color: theme.colors.primary };
            case 'success':
                return { emoji: '✅', text: 'Hoàn thành!', color: theme.colors.success };
            case 'error':
                return { emoji: '❌', text: 'Có lỗi xảy ra', color: theme.colors.danger };
            default:
                return { emoji: '🎤', text: 'Chạm để bắt đầu ghi âm', color: theme.colors.primary };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <BottomSheet visible={visible} onClose={handleClose} height={620}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Premium Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <LinearGradient
                            colors={[theme.colors.primary, theme.colors.secondary]}
                            style={styles.headerIcon}
                        >
                            <ThemedText style={{ fontSize: 18 }}>🎙️</ThemedText>
                        </LinearGradient>
                        <View>
                            <ThemedText variant="h3" weight="700">
                                Trợ lý Giọng nói
                            </ThemedText>
                            <ThemedText variant="caption" color="textSecondary">
                                Nói hoặc gõ lệnh bên dưới
                            </ThemedText>
                        </View>
                    </View>
                    <Pressable
                        onPress={handleClose}
                        hitSlop={8}
                        style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                    >
                        <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Premium Mic Button with Animated Rings */}
                <Animated.View entering={FadeInUp.delay(100)} style={styles.micContainer}>
                    {/* Outer rings */}
                    <Animated.View style={[styles.ring, styles.ring3, { borderColor: statusConfig.color + '20' }, ring3Style]} />
                    <Animated.View style={[styles.ring, styles.ring2, { borderColor: statusConfig.color + '30' }, ring2Style]} />
                    <Animated.View style={[styles.ring, styles.ring1, { borderColor: statusConfig.color + '50' }, ring1Style]} />

                    {/* Main button */}
                    <AnimatedPressable onPress={handleToggleRecording} style={buttonAnimatedStyle}>
                        <LinearGradient
                            colors={isRecording
                                ? [theme.colors.danger, '#FF6B6B']
                                : [theme.colors.primary, theme.colors.secondary]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.micButton}
                        >
                            <Ionicons
                                name={isRecording ? 'stop' : 'mic'}
                                size={36}
                                color="#FFFFFF"
                            />
                        </LinearGradient>
                    </AnimatedPressable>

                    {/* Duration badge */}
                    {isRecording && (
                        <Animated.View
                            entering={FadeIn}
                            style={[styles.durationBadge, { backgroundColor: theme.colors.danger }]}
                        >
                            <View style={styles.recordingDot} />
                            <ThemedText variant="bodySmall" weight="600" style={{ color: '#fff' }}>
                                {formatDuration(duration)}
                            </ThemedText>
                        </Animated.View>
                    )}
                </Animated.View>

                {/* Status indicator */}
                <Animated.View
                    entering={FadeInUp.delay(200)}
                    style={[
                        styles.statusCard,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                            borderColor: statusConfig.color + '30',
                        }
                    ]}
                >
                    <ThemedText style={{ fontSize: 24 }}>{statusConfig.emoji}</ThemedText>
                    <ThemedText variant="body" weight="500" style={{ color: statusConfig.color }}>
                        {statusConfig.text}
                    </ThemedText>
                </Animated.View>

                {/* Error message */}
                {error && (
                    <View style={[styles.errorCard, { backgroundColor: theme.colors.danger + '15' }]}>
                        <Ionicons name="warning" size={18} color={theme.colors.danger} />
                        <ThemedText variant="bodySmall" style={{ color: theme.colors.danger, flex: 1 }}>
                            {error}
                        </ThemedText>
                    </View>
                )}

                {/* Premium Text Input */}
                <Animated.View entering={FadeInUp.delay(300)} style={styles.inputSection}>
                    <ThemedText variant="bodySmall" weight="600" color="textSecondary" style={styles.inputLabel}>
                        ✍️ Hoặc gõ lệnh trực tiếp
                    </ThemedText>
                    <View style={[
                        styles.inputWrapper,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }
                    ]}>
                        <TextInput
                            style={[styles.textInput, { color: theme.colors.text }]}
                            placeholder="Ví dụ: Ghi 1 bát phở vào bữa trưa..."
                            placeholderTextColor={theme.colors.muted}
                            value={recognizedText}
                            onChangeText={setRecognizedText}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Example commands */}
                    <View style={styles.examplesContainer}>
                        {['Thêm 200g cơm', 'Ghi 1 ly cà phê', 'Bữa sáng: 2 trứng'].map((example, index) => (
                            <Pressable
                                key={index}
                                style={[styles.exampleChip, { backgroundColor: theme.colors.primary + '15' }]}
                                onPress={() => setRecognizedText(example)}
                            >
                                <ThemedText variant="caption" style={{ color: theme.colors.primary }}>
                                    {example}
                                </ThemedText>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>

                {/* Result Card */}
                {parsedCommand && parsedCommand.intent !== 'UNKNOWN' && (
                    <VoiceResultCard
                        command={parsedCommand}
                        onExecute={handleExecute}
                        isExecuting={status === 'executing'}
                    />
                )}

                {/* Action Buttons */}
                {!parsedCommand && (
                    <Animated.View entering={FadeInUp.delay(400)} style={styles.actions}>
                        <Pressable
                            onPress={handleClose}
                            style={[
                                styles.actionButton,
                                styles.cancelButton,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                            ]}
                        >
                            <ThemedText variant="button" color="textSecondary">Hủy</ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={handleManualProcess}
                            disabled={!recognizedText.trim() || status === 'parsing'}
                            style={[
                                styles.actionButton,
                                styles.processButton,
                                { opacity: (!recognizedText.trim() || status === 'parsing') ? 0.5 : 1 }
                            ]}
                        >
                            <LinearGradient
                                colors={[theme.colors.primary, theme.colors.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Ionicons name="sparkles" size={18} color="#fff" />
                                <ThemedText variant="button" style={{ color: '#fff', marginLeft: 8 }}>
                                    {status === 'parsing' ? 'Đang xử lý...' : 'Phân tích'}
                                </ThemedText>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                )}
            </ScrollView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 180,
        marginVertical: 8,
    },
    ring: {
        position: 'absolute',
        borderRadius: 100,
        borderWidth: 2,
    },
    ring1: {
        width: 100,
        height: 100,
    },
    ring2: {
        width: 130,
        height: 130,
    },
    ring3: {
        width: 160,
        height: 160,
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginHorizontal: 20,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
    },
    inputSection: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    inputLabel: {
        marginBottom: 10,
    },
    inputWrapper: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    textInput: {
        padding: 16,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    examplesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    exampleChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        paddingHorizontal: 20,
    },
    actionButton: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
    },
    cancelButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    processButton: {},
    gradientButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default VoiceSheet;

