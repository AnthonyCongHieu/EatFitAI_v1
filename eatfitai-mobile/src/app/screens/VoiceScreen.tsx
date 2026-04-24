import React, { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../components/ThemedText';
import { trackEvent } from '../../services/analytics';

import VoiceResultCard from '../../components/voice/VoiceResultCard';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { useVoiceStore } from '../../store/useVoiceStore';
import type { AppTabsParamList } from '../navigation/AppTabs';
import { TEST_IDS } from '../../testing/testIds';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type VoiceNavigationProp = BottomTabNavigationProp<AppTabsParamList, 'VoiceTab'>;
type VoiceRouteProp = RouteProp<AppTabsParamList, 'VoiceTab'>;

/* ═══════════════════════════════════════════════
   Emerald Nebula Palette
   ═══════════════════════════════════════════════ */
const P = {
  primary: '#4be277',
  primaryDim: '#3DB860',
  primaryContainer: '#22c55e',
  surface: '#0e1322',
  surfaceContainer: '#1a1f2f',
  surfaceContainerLow: '#161b2b',
  surfaceContainerHigh: '#25293a',
  surfaceContainerHighest: '#2f3445',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  outlineVariant: '#3d4a3d',
  glass: 'rgba(22, 27, 43, 0.6)',
  glassBorder: 'rgba(255,255,255,0.06)',
  glow: 'rgba(75, 226, 119, 0.15)',
};

/* ═══════════════════════════════════════════════
   Quick Command Chips
   ═══════════════════════════════════════════════ */
const QUICK_COMMANDS = [
  'Hôm nay ăn bao nhiêu calo?',
  'Thêm 200g cơm vào bữa trưa',
  'Cân nặng 65 kg',
];

/* ═══════════════════════════════════════════════
   Chat Message Type
   ═══════════════════════════════════════════════ */
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
}

const VoiceScreen = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation = useNavigation<VoiceNavigationProp>();
  const route = useRoute<VoiceRouteProp>();
  const chatScrollRef = useRef<ScrollView>(null);
  const lastReviewSignatureRef = useRef('');

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

  /* ── Auto-start from deep link ── */
  useFocusEffect(
    useCallback(() => {
      if (!route.params?.autoStart || isRecording) {
        return undefined;
      }

      let active = true;
      const timer = setTimeout(() => {
        if (!active) return;
        reset();
        startRecording().catch(() => undefined);
      }, 180);

      navigation.setParams({ autoStart: undefined, source: undefined });

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [isRecording, navigation, reset, route.params?.autoStart, startRecording]),
  );

  /* ═══ Animated Values ═══ */
  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.2);
  const buttonScale = useSharedValue(1);

  // Wave bar animations
  const waveBar1 = useSharedValue(1);
  const waveBar2 = useSharedValue(1);
  const waveBar3 = useSharedValue(1);
  const waveBar4 = useSharedValue(1);
  const waveBar5 = useSharedValue(1);

  useEffect(() => {
    if (isRecording && amplitude > 0.1) {
      const scale = 1 + amplitude * 0.5;
      ring1Scale.value = withSpring(scale, { damping: 10 });
      ring2Scale.value = withSpring(scale * 1.15, { damping: 12 });
      ring3Scale.value = withSpring(scale * 1.3, { damping: 14 });
      ring1Opacity.value = withTiming(0.3 + amplitude * 0.3);

      // Wave bars react to amplitude
      waveBar1.value = withSpring(1 + amplitude * 2, { damping: 8 });
      waveBar2.value = withSpring(1 + amplitude * 1.5, { damping: 10 });
      waveBar3.value = withSpring(1 + amplitude * 2.5, { damping: 6 });
      waveBar4.value = withSpring(1 + amplitude * 1.8, { damping: 9 });
      waveBar5.value = withSpring(1 + amplitude * 2.2, { damping: 7 });
      return;
    }

    if (isRecording) {
      ring1Scale.value = withSpring(1.05);
      ring2Scale.value = withSpring(1.1);
      ring3Scale.value = withSpring(1.15);
      ring1Opacity.value = withTiming(0.15);
      // Idle breathing waves
      waveBar1.value = withRepeat(withTiming(1.3, { duration: 800 }), -1, true);
      waveBar2.value = withRepeat(withTiming(1.5, { duration: 1000 }), -1, true);
      waveBar3.value = withRepeat(withTiming(1.2, { duration: 700 }), -1, true);
      waveBar4.value = withRepeat(withTiming(1.4, { duration: 900 }), -1, true);
      waveBar5.value = withRepeat(withTiming(1.3, { duration: 850 }), -1, true);
      return;
    }

    ring1Scale.value = withSpring(1);
    ring2Scale.value = withSpring(1);
    ring3Scale.value = withSpring(1);
    ring1Opacity.value = withTiming(0.2);
    waveBar1.value = withTiming(1);
    waveBar2.value = withTiming(1);
    waveBar3.value = withTiming(1);
    waveBar4.value = withTiming(1);
    waveBar5.value = withTiming(1);
  }, [amplitude, isRecording, ring1Opacity, ring1Scale, ring2Scale, ring3Scale,
    waveBar1, waveBar2, waveBar3, waveBar4, waveBar5]);

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

  /* ═══ Handlers ═══ */
  const handleToggleRecording = async () => {
    buttonScale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1, { damping: 15 }),
    );

    if (isRecording) {
      await stopRecording();
      return;
    }

    trackEvent('voice_parse_start', {
      flow: 'voice',
      step: 'record',
      status: 'started',
      metadata: {
        source: route.params?.source ?? 'microphone',
      },
    });
    await startRecording();
  };

  const handleCancelRecording = () => {
    cancelRecording();
    reset();
  };

  const handleExecute = async () => {
    trackEvent('voice_execute_submit', {
      flow: 'voice',
      step: 'execute',
      status: 'submitted',
      metadata: {
        intent: parsedCommand?.intent,
      },
    });
    await executeCommand();
    const {
      status: newStatus,
      lastExecutedAction,
      error: execError,
    } = useVoiceStore.getState();

    if (newStatus === 'success') {
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: lastExecutedAction || 'Đã thực hiện lệnh.',
        visibilityTime: 3000,
      });
      trackEvent('voice_execute_success', {
        flow: 'voice',
        step: 'execute',
        status: 'success',
        metadata: {
          intent: parsedCommand?.intent,
          action: executedData?.type,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });

      setTimeout(() => reset(), 2000);
      return;
    }

    if (newStatus === 'error' && execError) {
      trackEvent('voice_execute_failure', {
        category: 'error',
        flow: 'voice',
        step: 'execute',
        status: 'failure',
        metadata: {
          intent: parsedCommand?.intent,
          message: execError,
        },
      });
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: execError,
      });
    }
  };

  const handleQuickCommand = (text: string) => {
    trackEvent('voice_parse_start', {
      flow: 'voice',
      step: 'parse',
      status: 'started',
      metadata: {
        inputMode: 'quick_command',
        textLength: text.length,
      },
    });
    setRecognizedText(text);
    processText(text);
  };

  const handleSendText = async () => {
    if (recognizedText.trim()) {
      const textToProcess = recognizedText.trim();
      trackEvent('voice_parse_start', {
        flow: 'voice',
        step: 'parse',
        status: 'started',
        metadata: {
          inputMode: 'text',
          textLength: textToProcess.length,
        },
      });
      reset();
      setRecognizedText(textToProcess);
      await processText(textToProcess);
    }
  };

  useEffect(() => {
    if (status !== 'review' || !parsedCommand) {
      return;
    }

    const signature = `${parsedCommand.intent}:${parsedCommand.rawText}`;
    if (lastReviewSignatureRef.current === signature) {
      return;
    }

    lastReviewSignatureRef.current = signature;
    trackEvent('voice_review_ready', {
      flow: 'voice',
      step: 'review',
      status: 'ready',
      metadata: {
        intent: parsedCommand.intent,
        confidence: parsedCommand.confidence,
        source: parsedCommand.source,
      },
    });
  }, [parsedCommand, status]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case 'listening':
        return 'LISTENING...';
      case 'processing':
        return 'Đang xử lý giọng nói...';
      case 'parsing':
        return 'AI đang phân tích...';
      case 'review':
        return 'Kiểm tra trước khi lưu';
      case 'executing':
        return 'Đang thực hiện...';
      case 'success':
        return 'Hoàn thành!';
      case 'error':
        return 'Có lỗi xảy ra';
      default:
        return 'Chạm để bắt đầu';
    }
  };

  /* ═══ Build chat messages from state ═══ */
  const chatMessages: ChatMessage[] = [];
  if (recognizedText) {
    chatMessages.push({ id: 'user-1', type: 'user', text: recognizedText });
  }
  if (executedData?.details) {
    chatMessages.push({ id: 'ai-1', type: 'ai', text: executedData.details });
  }
  if (error) {
    chatMessages.push({ id: 'ai-error', type: 'ai', text: `⚠️ ${error}` });
  }

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <View style={[S.container, { paddingTop: insets.top }]} testID={TEST_IDS.voice.screen}>


      {/* ═══ GLASS HEADER ═══ */}
      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={S.header}>
        <View style={S.headerInner}>
          <Pressable
            style={S.headerBtn}
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={P.primary} />
          </Pressable>
          <ThemedText style={S.headerTitle}>Trợ lý AI</ThemedText>
          <View style={S.headerBtn} />
        </View>
      </Animated.View>

      {/* ═══ MAIN CONTENT ═══ */}
      <ScrollView
        ref={chatScrollRef}
        style={S.scrollView}
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >


        {/* ═══ CHAT HISTORY ═══ */}
        {chatMessages.length > 0 && (
          <Animated.View entering={FadeInUp.delay(100)} style={S.chatArea}>
            {chatMessages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  S.bubbleRow,
                  msg.type === 'user' ? S.bubbleRowUser : S.bubbleRowAi,
                ]}
              >
                {msg.type === 'ai' && (
                  <View style={S.aiAvatar}>
                    <Ionicons name="hardware-chip" size={16} color={P.primary} />
                  </View>
                )}
                <View
                  style={[
                    S.bubble,
                    msg.type === 'user' ? S.bubbleUser : S.bubbleAi,
                  ]}
                >
                  <ThemedText style={S.bubbleText}>{msg.text}</ThemedText>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ═══ VOICE RESULT CARD (parsed command) ═══ */}
        {!isRecording && parsedCommand && parsedCommand.intent !== 'UNKNOWN' && (
          <View style={S.resultSection}>
            <VoiceResultCard
              command={parsedCommand}
              onExecute={handleExecute}
              onConfirmWeight={confirmWeight}
              isExecuting={status === 'executing'}
              executedData={executedData}
            />
          </View>
        )}

        {/* ═══ STATUS CARD ═══ */}
        {!isRecording && status !== 'idle' && status !== 'error' && !error && (
          <Animated.View entering={FadeInUp.delay(200)} style={S.statusCard}>
            <View style={S.statusDot} />
            <ThemedText style={S.statusText}>{getStatusLabel()}</ThemedText>
          </Animated.View>
        )}

        {/* ═══ TEXT INPUT SECTION ═══ */}
        {!isRecording && (
          <Animated.View entering={FadeInUp.delay(300)} style={S.inputSection}>
            <ThemedText style={S.inputLabel}>Hoặc gõ lệnh trực tiếp</ThemedText>
            <View style={S.inputRow}>
              <View style={S.inputWrapper}>
                <TextInput
                  style={S.textInput}
                  placeholder="Ví dụ: Ghi 1 bát phở vào bữa trưa"
                  placeholderTextColor={P.onSurfaceVariant + '60'}
                  value={recognizedText}
                  onChangeText={setRecognizedText}
                  multiline
                  numberOfLines={2}
                  testID={TEST_IDS.voice.textInput}
                />
              </View>
              <Pressable
                onPress={handleSendText}
                disabled={!recognizedText.trim() || status === 'parsing'}
                style={[
                  S.sendBtn,
                  { opacity: !recognizedText.trim() || status === 'parsing' ? 0.4 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[P.primary, P.primaryDim]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={S.sendBtnGrad}
                >
                  <Ionicons name="send" size={18} color="#003915" />
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* ═══ QUICK COMMAND CHIPS ═══ */}
        {!isRecording && (
          <Animated.View entering={FadeInUp.delay(350)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.chipRow}
            >
              {QUICK_COMMANDS.map((cmd) => (
                <Pressable
                  key={cmd}
                  style={S.chip}
                  onPress={() => handleQuickCommand(cmd)}
                >
                  <ThemedText style={S.chipText}>{cmd}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ═══ REAL-TIME TRANSCRIPT ═══ */}
        {isRecording && recognizedText !== '' && (
          <Animated.View entering={FadeIn.delay(200)} style={S.transcriptWrap}>
            <View style={S.transcriptPill}>
              <ThemedText style={S.transcriptText}>
                "{recognizedText}"
              </ThemedText>
            </View>
          </Animated.View>
        )}

        {/* ═══ CENTRAL VOICE UI ═══ */}
        <Animated.View
          entering={FadeInUp.delay(400)}
          style={S.voiceSection}
        >


          {/* Pulsing rings */}
          <Animated.View style={[S.ring, S.ring3, ring3Style]} />
          <Animated.View style={[S.ring, S.ring2, ring2Style]} />
          <Animated.View style={[S.ring, S.ring1, ring1Style]} />

          {/* Main mic button */}
          <AnimatedPressable
            onPress={handleToggleRecording}
            style={[S.micBtnOuter, buttonAnimatedStyle]}
            testID="voice-mic-button"
          >
            <View style={S.micBtnGlassWrap}>


              {/* Inner gradient circle */}
              <LinearGradient
                colors={
                  isRecording
                    ? ['#ef4444', '#dc2626']
                    : [P.primary, P.primaryContainer]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.micBtnInner}
              >
                {isRecording ? (
                  <ThemedText style={S.durationText}>
                    {formatDuration(duration)}
                  </ThemedText>
                ) : (
                  <Ionicons name="mic" size={36} color="#fff" />
                )}
              </LinearGradient>
            </View>
          </AnimatedPressable>

          {/* Status label */}
          <ThemedText style={[
            S.listeningLabel,
            isRecording && { color: P.primary },
          ]}>
            {isRecording ? 'LISTENING...' : getStatusLabel()}
          </ThemedText>

          {/* Cancel button when recording */}
          {isRecording && (
            <Animated.View entering={FadeIn.delay(300)}>
              <Pressable style={S.cancelBtn} onPress={handleCancelRecording}>
                <ThemedText style={S.cancelBtnText}>Hủy ghi âm</ThemedText>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        {/* ═══ VOICE GUIDE ═══ */}
        {!isRecording && status === 'idle' && (
          <Animated.View entering={FadeInUp.delay(500)} style={S.guideCard}>
            <ThemedText style={S.guideTitle}>💡 Bạn có thể nói:</ThemedText>
            <View style={S.guideList}>
              <ThemedText style={S.guideItem}>
                • <ThemedText style={S.guideBold}>Thêm món</ThemedText>: "Thêm 1 bát phở bữa trưa"
              </ThemedText>
              <ThemedText style={S.guideItem}>
                • <ThemedText style={S.guideBold}>Ghi cân nặng</ThemedText>: "Cân nặng 65 kg"
              </ThemedText>
              <ThemedText style={S.guideItem}>
                • <ThemedText style={S.guideBold}>Hỏi calo</ThemedText>: "Hôm nay ăn bao nhiêu calo?"
              </ThemedText>
            </View>
          </Animated.View>
        )}

        {/* Actions row */}
        {!isRecording && recognizedText.trim() && (
          <Animated.View entering={FadeInUp.delay(350)} style={S.actionsRow}>
            <Pressable
              onPress={() => {
                reset();
                setRecognizedText('');
              }}
              style={S.resetBtn}
              testID={TEST_IDS.voice.resetButton}
            >
              <Ionicons name="refresh" size={18} color={P.onSurfaceVariant} />
              <ThemedText style={S.resetBtnText}>Đặt lại</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSendText}
              disabled={!recognizedText.trim() || status === 'parsing'}
              style={[
                S.analyzeBtn,
                { opacity: !recognizedText.trim() || status === 'parsing' ? 0.5 : 1 },
              ]}
              testID={TEST_IDS.voice.processButton}
            >
              <LinearGradient
                colors={[P.primary, P.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.analyzeBtnGrad}
              >
                <Ionicons name="sparkles" size={18} color="#003915" />
                <ThemedText style={S.analyzeBtnText}>
                  {status === 'parsing' ? 'Đang xử lý...' : 'Phân tích'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Right edge accent */}
      <View style={S.edgeAccent} pointerEvents="none" />
    </View>
  );
};

/* ═══════════════════════════════════════════════
   Styles — Emerald Nebula 3D Voice UI
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.surface,
  },
  glowBg: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    borderRadius: 150,
    backgroundColor: P.glow,
    opacity: 0.4,
  },

  /* ═══ HEADER ═══ */
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(14, 19, 34, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: P.glassBorder,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  /* ═══ SCROLL ═══ */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  /* ═══ SUBTITLE ═══ */
  subtitle: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: P.onSurfaceVariant + '80',
    letterSpacing: 3,
    marginTop: 16,
    marginBottom: 24,
    textTransform: 'uppercase',
  },

  /* ═══ CHAT ═══ */
  chatArea: {
    gap: 16,
    marginBottom: 20,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.primaryContainer + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: P.surfaceContainerHighest + '70',
    borderRadius: 18,
    borderTopRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: P.surfaceContainerHigh + '90',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: P.primary + '80',
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '400',
    color: P.onSurface,
    lineHeight: 20,
  },

  /* ═══ STATUS CARD ═══ */
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: P.surfaceContainerHigh + '60',
    borderWidth: 1,
    borderColor: P.primary + '30',
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: P.primary,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.primary,
  },

  /* ═══ TEXT INPUT ═══ */
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: P.onSurfaceVariant,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.outlineVariant + '40',
    backgroundColor: P.surfaceContainerLow,
    overflow: 'hidden',
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: P.onSurface,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ═══ QUICK COMMANDS ═══ */
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 16,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: P.surfaceContainerHighest + '50',
    borderWidth: 1,
    borderColor: P.outlineVariant + '18',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: P.primary,
  },

  /* ═══ TRANSCRIPT ═══ */
  transcriptWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  transcriptPill: {
    backgroundColor: P.surfaceContainerLow + '60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  transcriptText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.8)',
  },

  /* ═══ MIC SECTION ═══ */
  voiceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    minHeight: 300,
  },
  micGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: P.primary + '18',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderStyle: 'dashed',
  },
  ring1: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: P.primary + '40',
  },
  ring2: {
    width: 195,
    height: 195,
    borderWidth: 1.5,
    borderColor: P.primary + '25',
  },
  ring3: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: P.primary + '12',
    borderStyle: 'dotted',
  },

  /* Mic button */
  micBtnOuter: {
    width: 120,
    height: 120,
    zIndex: 10,
  },
  micBtnGlassWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: P.surfaceContainerHigh + 'CC',
    borderWidth: 1,
    borderColor: P.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 12,
  },
  micBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  durationText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Wave bars */
  waveBarsContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBar: {
    position: 'absolute',
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: P.primary,
  },
  waveBarTop: {
    top: -2,
    left: '50%',
    marginLeft: -1.5,
  },
  waveBarTopRight: {
    top: 14,
    right: 14,
    transform: [{ rotate: '45deg' }],
  },
  waveBarRight: {
    right: -2,
    top: '50%',
    marginTop: -6,
    height: 16,
  },
  waveBarBottomRight: {
    bottom: 14,
    right: 14,
    transform: [{ rotate: '-45deg' }],
  },
  waveBarBottom: {
    bottom: -2,
    left: '50%',
    marginLeft: -1.5,
  },

  /* Status label */
  listeningLabel: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: '700',
    color: P.onSurfaceVariant,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  /* Cancel */
  cancelBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: P.onSurfaceVariant,
  },

  /* ═══ VOICE GUIDE ═══ */
  guideCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.glassBorder,
    backgroundColor: P.surfaceContainerLow,
    marginBottom: 20,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: P.onSurfaceVariant,
    marginBottom: 12,
  },
  guideList: {
    gap: 8,
  },
  guideItem: {
    fontSize: 12,
    fontWeight: '400',
    color: P.onSurfaceVariant + 'AA',
    lineHeight: 18,
  },
  guideBold: {
    fontWeight: '600',
    color: P.onSurface,
  },

  /* ═══ RESULT ═══ */
  resultSection: {
    marginBottom: 20,
  },

  /* ═══ ACTIONS ROW ═══ */
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  resetBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.onSurfaceVariant,
  },
  analyzeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
  },
  analyzeBtnGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003915',
  },

  /* ═══ EDGE ACCENT ═══ */
  edgeAccent: {
    position: 'absolute',
    right: -1,
    top: '50%',
    width: 3,
    height: 48,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    backgroundColor: P.primary,
    marginTop: -24,
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default VoiceScreen;
