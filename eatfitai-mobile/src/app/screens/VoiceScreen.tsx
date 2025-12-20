/**
 * VoiceScreen - Full screen Voice Assistant
 * Premium UI with animated pulse rings, gradient buttons
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../components/ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useVoiceStore } from '../../store/useVoiceStore';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import VoiceResultCard from '../../components/voice/VoiceResultCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VoiceScreen = (): React.ReactElement => {
    const { theme } = useAppTheme();
    const isDark = theme.mode === 'dark';
    const insets = useSafeAreaInsets();

    const {
        status,
        recognizedText,
        parsedCommand,
        error,
        setRecognizedText,
        processText,
        executeCommand,
        reset,
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
    const ring1Opacity = useSharedValue(0.3);
    const buttonScale = useSharedValue(1);

    useEffect(() => {
        if (isRecording) {
            ring1Scale.value = withRepeat(
                withSequence(
                    withTiming(1.4, { duration: 800, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );
            ring2Scale.value = withRepeat(
                withSequence(
                    withTiming(1.7, { duration: 1000, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );
            ring3Scale.value = withRepeat(
                withSequence(
                    withTiming(2, { duration: 1200, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 1200, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );
            ring1Opacity.value = withRepeat(
                withSequence(
                    withTiming(0.1, { duration: 800 }),
                    withTiming(0.5, { duration: 800 })
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
        opacity: ring1Opacity.value * 0.6,
    }));

    const ring3Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring3Scale.value }],
        opacity: ring1Opacity.value * 0.3,
    }));

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

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
        if (status === 'success') {
            setTimeout(() => reset(), 2000);
        }
    };

    const handleReset = () => {
        cancelRecording();
        reset();
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
                return { emoji: '🎤', text: 'Chạm vào micro để bắt đầu', color: theme.colors.primary };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <LinearGradient
            colors={theme.colors.screenGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.container}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Animated.View entering={FadeInUp.delay(100)} style={styles.header}>
                    <LinearGradient
                        colors={[theme.colors.primary, theme.colors.secondary]}
                        style={styles.headerIcon}
                    >
                        <ThemedText style={{ fontSize: 24 }}>🎙️</ThemedText>
                    </LinearGradient>
                    <ThemedText variant="h2" weight="700" style={styles.headerTitle}>
                        Trợ lý Giọng nói
                    </ThemedText>
                    <ThemedText variant="body" color="textSecondary" style={styles.headerSubtitle}>
                        Nói hoặc gõ lệnh để thêm bữa ăn nhanh chóng
                    </ThemedText>
                </Animated.View>

                {/* Premium Mic Button with Animated Rings */}
                <Animated.View entering={FadeInUp.delay(200)} style={styles.micContainer}>
                    {/* Outer rings */}
                    <Animated.View style={[styles.ring, styles.ring3, { borderColor: statusConfig.color }, ring3Style]} />
                    <Animated.View style={[styles.ring, styles.ring2, { borderColor: statusConfig.color }, ring2Style]} />
                    <Animated.View style={[styles.ring, styles.ring1, { borderColor: statusConfig.color }, ring1Style]} />

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
                            <View style={styles.micIconWrapper}>
                                <Ionicons
                                    name={isRecording ? 'stop' : 'mic'}
                                    size={40}
                                    color="#FFFFFF"
                                />
                            </View>
                        </LinearGradient>
                    </AnimatedPressable>

                    {/* Duration badge */}
                    {isRecording && (
                        <Animated.View
                            entering={FadeIn}
                            style={[styles.durationBadge, { backgroundColor: theme.colors.danger }]}
                        >
                            <View style={styles.recordingDot} />
                            <ThemedText variant="body" weight="700" style={{ color: '#fff' }}>
                                {formatDuration(duration)}
                            </ThemedText>
                        </Animated.View>
                    )}
                </Animated.View>

                {/* Status indicator */}
                <Animated.View
                    entering={FadeInUp.delay(300)}
                    style={[
                        styles.statusCard,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                            borderColor: statusConfig.color + '40',
                        }
                    ]}
                >
                    <ThemedText style={{ fontSize: 28 }}>{statusConfig.emoji}</ThemedText>
                    <ThemedText variant="h4" weight="600" style={{ color: statusConfig.color }}>
                        {statusConfig.text}
                    </ThemedText>
                </Animated.View>

                {/* Error message */}
                {error && (
                    <View style={[styles.errorCard, { backgroundColor: theme.colors.danger + '15' }]}>
                        <Ionicons name="warning" size={20} color={theme.colors.danger} />
                        <ThemedText variant="body" style={{ color: theme.colors.danger, flex: 1 }}>
                            {error}
                        </ThemedText>
                    </View>
                )}

                {/* Premium Text Input */}
                <Animated.View entering={FadeInUp.delay(400)} style={styles.inputSection}>
                    <ThemedText variant="bodySmall" weight="600" color="textSecondary" style={styles.inputLabel}>
                        ✍️ Hoặc gõ lệnh trực tiếp
                    </ThemedText>
                    <View style={[
                        styles.inputWrapper,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
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
                    <View style={styles.resultSection}>
                        <VoiceResultCard
                            command={parsedCommand}
                            onExecute={handleExecute}
                            isExecuting={status === 'executing'}
                        />
                    </View>
                )}

                {/* Action Buttons */}
                {!parsedCommand && (
                    <Animated.View entering={FadeInUp.delay(500)} style={styles.actions}>
                        <Pressable
                            onPress={handleReset}
                            style={[
                                styles.actionButton,
                                styles.cancelButton,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                            ]}
                        >
                            <Ionicons name="refresh" size={20} color={theme.colors.textSecondary} />
                            <ThemedText variant="button" color="textSecondary" style={{ marginLeft: 8 }}>
                                Đặt lại
                            </ThemedText>
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
                                <Ionicons name="sparkles" size={20} color="#fff" />
                                <ThemedText variant="button" style={{ color: '#fff', marginLeft: 8 }}>
                                    {status === 'parsing' ? 'Đang xử lý...' : 'Phân tích'}
                                </ThemedText>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                )}
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    headerIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        textAlign: 'center',
        marginBottom: 8,
    },
    headerSubtitle: {
        textAlign: 'center',
    },
    micContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 220,
        marginVertical: 16,
    },
    ring: {
        position: 'absolute',
        borderRadius: 100,
        borderWidth: 2,
    },
    ring1: {
        width: 110,
        height: 110,
    },
    ring2: {
        width: 150,
        height: 150,
    },
    ring3: {
        width: 190,
        height: 190,
    },
    micButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 12,
    },
    micIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        paddingTop: 4,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        gap: 8,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 20,
        borderWidth: 1.5,
        marginBottom: 20,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    inputSection: {
        marginBottom: 20,
    },
    inputLabel: {
        marginBottom: 12,
    },
    inputWrapper: {
        borderRadius: 20,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    textInput: {
        padding: 18,
        fontSize: 16,
        minHeight: 90,
        textAlignVertical: 'top',
    },
    examplesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
    exampleChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    resultSection: {
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 14,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        overflow: 'hidden',
    },
    cancelButton: {
        flexDirection: 'row',
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

export default VoiceScreen;

