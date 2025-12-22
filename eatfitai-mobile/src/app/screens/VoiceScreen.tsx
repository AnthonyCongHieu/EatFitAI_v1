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
    FadeOut,
    Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';

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
    const queryClient = useQueryClient();

    const {
        status,
        recognizedText,
        parsedCommand,
        error,
        executedData,
        setRecognizedText,
        processText,
        executeCommand,
        confirmWeight,
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
    const micTranslateY = useSharedValue(0);

    useEffect(() => {
        // Hiệu ứng pulse CHỈ khi có âm thanh (amplitude > 0.1)
        if (isRecording && amplitude > 0.1) {
            // Pulse mạnh khi có âm thanh
            const scale = 1 + amplitude * 0.5; // Scale theo amplitude
            ring1Scale.value = withSpring(scale, { damping: 10 });
            ring2Scale.value = withSpring(scale * 1.2, { damping: 12 });
            ring3Scale.value = withSpring(scale * 1.4, { damping: 14 });
            ring1Opacity.value = withTiming(0.4 + amplitude * 0.3);
        } else if (isRecording) {
            // Đang recording nhưng không có âm thanh - rings nhỏ, mờ
            ring1Scale.value = withSpring(1.05);
            ring2Scale.value = withSpring(1.1);
            ring3Scale.value = withSpring(1.15);
            ring1Opacity.value = withTiming(0.15);
        } else {
            // Không recording - reset
            ring1Scale.value = withSpring(1);
            ring2Scale.value = withSpring(1);
            ring3Scale.value = withSpring(1);
            ring1Opacity.value = withTiming(0.3);
        }
    }, [isRecording, amplitude]);

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

    // Animation morph: nút di chuyển mượt ra giữa màn hình
    const micContainerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: micTranslateY.value }],
    }));

    // Animate khi isRecording thay đổi - dùng timing để mượt hơn
    useEffect(() => {
        if (isRecording) {
            // Di chuyển xuống giữa màn hình với curve mượt
            micTranslateY.value = withTiming(100, {
                duration: 400,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1) // ease-out curve
            });
        } else {
            // Quay lại vị trí ban đầu
            micTranslateY.value = withTiming(0, {
                duration: 350,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1)
            });
        }
    }, [isRecording]);

    const handleToggleRecording = async () => {
        buttonScale.value = withSequence(
            withSpring(0.9, { damping: 10 }),
            withSpring(1, { damping: 15 })
        );
        if (isRecording) {
            // BẤM LẦN 2 = STOP & GỬi (xác nhận)
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    // Hủy ghi âm (không gửi)
    const handleCancelRecording = () => {
        cancelRecording();
        reset();
    };

    const handleManualProcess = async () => {
        if (recognizedText.trim()) {
            await processText(recognizedText.trim());
        }
    };

    const handleExecute = async () => {
        await executeCommand();
        // Lấy status mới từ store sau khi execute xong
        const { status: newStatus, lastExecutedAction, error: execError } = useVoiceStore.getState();

        if (newStatus === 'success') {
            // Hiển thị toast thành công
            Toast.show({
                type: 'success',
                text1: 'Thành công!',
                text2: lastExecutedAction || 'Đã thực hiện lệnh',
                visibilityTime: 3000,
            });

            // Invalidate cache để HomeScreen/MealDiary cập nhật
            queryClient.invalidateQueries({ queryKey: ['home-summary'] });
            queryClient.invalidateQueries({ queryKey: ['diary-entries'] });

            // Reset sau 2s
            setTimeout(() => reset(), 2000);
        } else if (newStatus === 'error' && execError) {
            Toast.show({
                type: 'error',
                text1: 'Lỗi',
                text2: execError,
            });
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
                return { emoji: '', text: 'Chạm vào micro để bắt đầu', color: theme.colors.primary };
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
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 20 },
                    isRecording && styles.scrollContentRecording
                ]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header - ẨN khi recording */}
                {!isRecording && (
                    <Animated.View entering={FadeInUp.delay(100)} style={styles.header}>
                        <ThemedText variant="h2" weight="700" style={styles.headerTitle}>
                            🎙️ Trợ lý Giọng nói
                        </ThemedText>
                        <ThemedText variant="bodySmall" color="textSecondary" style={styles.headerSubtitle}>
                            Nói hoặc gõ lệnh để thêm bữa ăn
                        </ThemedText>
                    </Animated.View>
                )}

                {/* Premium Mic Button - GIỮA MÀN HÌNH khi recording */}
                <Animated.View
                    entering={FadeInUp.delay(200)}
                    style={[styles.micContainer, isRecording && styles.micContainerRecording, micContainerAnimatedStyle]}
                >
                    {/* Wrapper cho rings + button để giữ centered */}
                    <View style={styles.micButtonWrapper}>
                        {/* Outer rings */}
                        <Animated.View style={[styles.ring, styles.ring3, { borderColor: statusConfig.color }, ring3Style]} />
                        <Animated.View style={[styles.ring, styles.ring2, { borderColor: statusConfig.color }, ring2Style]} />
                        <Animated.View style={[styles.ring, styles.ring1, { borderColor: statusConfig.color }, ring1Style]} />

                        {/* Main button - Timer trong nút khi recording */}
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
                                {isRecording ? (
                                    // Đang recording: hiện timer
                                    <View style={styles.micIconWrapper}>
                                        <ThemedText variant="h2" weight="700" style={{ color: '#fff' }}>
                                            {formatDuration(duration)}
                                        </ThemedText>
                                    </View>
                                ) : (
                                    // Idle: hiện icon mic
                                    <View style={styles.micIconWrapper}>
                                        <Ionicons name="mic" size={48} color="#FFFFFF" />
                                    </View>
                                )}
                            </LinearGradient>
                        </AnimatedPressable>
                    </View>

                    {/* Text + Nút hủy khi đang recording */}
                    {isRecording && (
                        <Animated.View entering={FadeIn.delay(300)} style={styles.recordingText}>
                            <ThemedText variant="h4" weight="600" style={{ textAlign: 'center' }}>
                                Đang lắng nghe...
                            </ThemedText>
                            <ThemedText variant="caption" color="muted" style={{ textAlign: 'center', marginTop: 6 }}>
                                Chạm nút đỏ để gửi
                            </ThemedText>

                            {/* Nút HỦY theo theme */}
                            <Pressable
                                onPress={handleCancelRecording}
                                style={[styles.recordingCancelBtn, {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                                }]}
                            >
                                <ThemedText variant="bodySmall" weight="500" color="textSecondary">
                                    Hủy ghi âm
                                </ThemedText>
                            </Pressable>
                        </Animated.View>
                    )}
                </Animated.View>

                {/* IDLE MODE: Hiện đầy đủ UI */}
                {!isRecording && (
                    <>
                        {/* Status indicator - KHÔNG hiện khi có error */}
                        {status !== 'idle' && status !== 'error' && !error && (
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
                                <View style={styles.statusContent}>
                                    <ThemedText style={{ fontSize: 28 }}>{statusConfig.emoji}</ThemedText>
                                    <ThemedText variant="h4" weight="600" style={{ color: statusConfig.color }}>
                                        {statusConfig.text}
                                    </ThemedText>
                                </View>
                            </Animated.View>
                        )}

                        {/* Error message - Gọn gàng, chuyên nghiệp */}
                        {error && (
                            <View style={[styles.errorCard, { backgroundColor: theme.colors.danger + '12', borderColor: theme.colors.danger + '30' }]}>
                                <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
                                <ThemedText variant="bodySmall" weight="500" style={{ color: theme.colors.danger, flex: 1, marginLeft: 10 }}>
                                    {error}
                                </ThemedText>
                            </View>
                        )}

                        {/* Premium Text Input */}
                        <Animated.View entering={FadeInUp.delay(400)} style={styles.inputSection}>
                            <ThemedText variant="bodySmall" weight="600" color="textSecondary" style={styles.inputLabel}>
                                Hoặc gõ lệnh trực tiếp
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

                        {/* Voice Guide - Hướng dẫn sử dụng */}
                        <Animated.View entering={FadeInUp.delay(450)} style={[styles.voiceGuide, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                        }]}>
                            <ThemedText variant="bodySmall" weight="600" color="textSecondary" style={{ marginBottom: 12 }}>
                                💡 Bạn có thể nói:
                            </ThemedText>
                            <View style={styles.guideList}>
                                <ThemedText variant="caption" color="muted">• <ThemedText variant="caption" weight="500">Thêm món</ThemedText>: "Thêm 1 bát phở bữa trưa"</ThemedText>
                                <ThemedText variant="caption" color="muted">• <ThemedText variant="caption" weight="500">Ghi cân nặng</ThemedText>: "Cân nặng 65 kg"</ThemedText>
                                <ThemedText variant="caption" color="muted">• <ThemedText variant="caption" weight="500">Hỏi calo</ThemedText>: "Hôm nay ăn bao nhiêu calo?"</ThemedText>
                            </View>
                        </Animated.View>

                        {/* Result Card */}
                        {parsedCommand && parsedCommand.intent !== 'UNKNOWN' && (
                            <View style={styles.resultSection}>
                                <VoiceResultCard
                                    command={parsedCommand}
                                    onExecute={handleExecute}
                                    onConfirmWeight={confirmWeight}
                                    isExecuting={status === 'executing'}
                                    executedData={executedData}
                                />
                            </View>
                        )}

                        {/* Action Buttons - LUÔN HIỂN THỊ */}
                        <Animated.View entering={FadeInUp.delay(500)} style={[styles.actions, { marginTop: 20, marginBottom: 20 }]}>
                            <Pressable
                                onPress={() => {
                                    reset();
                                    setRecognizedText('');
                                }}
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
                                onPress={async () => {
                                    if (recognizedText.trim()) {
                                        // Clear kết quả cũ trước khi phân tích mới
                                        const textToProcess = recognizedText.trim();
                                        reset();
                                        setRecognizedText(textToProcess);
                                        await processText(textToProcess);
                                    }
                                }}
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
                    </>
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
        paddingBottom: 50,
    },
    scrollContentRecording: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 12,
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
        marginBottom: 4,
    },
    headerSubtitle: {
        textAlign: 'center',
    },
    micContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 220,
        marginVertical: 8,
    },
    micContainerRecording: {
        flex: 1,
        height: 'auto',
        marginVertical: 0,
        paddingVertical: 60,
    },
    recordingText: {
        marginTop: 24,
        alignItems: 'center',
    },
    recordingCancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    micButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 220,
        height: 220,
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
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 16,
    },
    micIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
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
    recordingMode: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    floatingCancel: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        marginBottom: 16,
    },
    statusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    inlineCancel: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    inputSection: {
        marginBottom: 16,
    },
    inputLabel: {
        marginBottom: 8,
    },
    inputWrapper: {
        borderRadius: 16,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    textInput: {
        padding: 14,
        fontSize: 15,
        minHeight: 70,
        textAlignVertical: 'top',
    },
    examplesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    exampleChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    voiceGuide: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    guideList: {
        gap: 6,
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

