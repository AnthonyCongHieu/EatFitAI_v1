import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { useAiStatus } from '../../hooks/useAiStatus';
import { useVoiceStore } from '../../store/useVoiceStore';
import MoChiIslandSpacer from '../../features/mochi/MoChiIslandSpacer';
import { getAiFeatureAvailability } from '../../utils/aiAvailability';
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
const QUICK_COMMANDS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  text: string;
}> = [
  { icon: 'restaurant-outline', label: 'Thêm món', text: 'Thêm 1 bát phở bữa trưa' },
  { icon: 'flame-outline', label: 'Calo', text: 'Hôm nay ăn bao nhiêu calo?' },
  { icon: 'scale-outline', label: 'Cân nặng', text: 'Cân nặng 65 kg' },
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
    reviewDraft,
    error,
    executedData,
    setRecognizedText,
    setReviewDraft,
    processText,
    executeCommand,
    commitReviewDraft,
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
  const { data: aiStatus, isLoading: isAiStatusLoading } = useAiStatus();
  const voiceAvailability = getAiFeatureAvailability(aiStatus, 'voice');
  const isVoiceAiBlocked = !voiceAvailability.canUseAi;

  const notifyVoiceUnavailable = useCallback(
    (inputMode: 'microphone' | 'text' | 'quick_command' | 'auto_start') => {
      Toast.show({
        type: 'info',
        text1:
          isAiStatusLoading && !aiStatus ? 'AI đang kiểm tra' : voiceAvailability.title,
        text2:
          voiceAvailability.message ??
          'Bạn vẫn có thể nhập nhật ký thủ công trong lúc chờ AI sẵn sàng.',
      });
      trackEvent('voice_ai_blocked', {
        flow: 'voice',
        step: 'availability',
        status: 'blocked',
        metadata: {
          inputMode,
          availabilityState: voiceAvailability.state,
          reason: voiceAvailability.title,
        },
      });
    },
    [
      aiStatus,
      isAiStatusLoading,
      voiceAvailability.message,
      voiceAvailability.state,
      voiceAvailability.title,
    ],
  );

  const guardVoiceAiReady = useCallback(
    (inputMode: 'microphone' | 'text' | 'quick_command' | 'auto_start') => {
      if (voiceAvailability.canUseAi) {
        return true;
      }

      notifyVoiceUnavailable(inputMode);
      return false;
    },
    [notifyVoiceUnavailable, voiceAvailability.canUseAi],
  );

  /* ── Auto-start from deep link ── */
  useFocusEffect(
    useCallback(() => {
      if (!route.params?.autoStart || isRecording) {
        return undefined;
      }

      if (isAiStatusLoading && !aiStatus) {
        return undefined;
      }

      if (!guardVoiceAiReady('auto_start')) {
        navigation.setParams({ autoStart: undefined, source: undefined });
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
    }, [
      guardVoiceAiReady,
      aiStatus,
      isAiStatusLoading,
      isRecording,
      navigation,
      reset,
      route.params?.autoStart,
      startRecording,
    ]),
  );

  /* ═══ Animated Values ═══ */
  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.2);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording && amplitude > 0.1) {
      const scale = 1 + amplitude * 0.5;
      ring1Scale.value = withSpring(scale, { damping: 10 });
      ring2Scale.value = withSpring(scale * 1.15, { damping: 12 });
      ring3Scale.value = withSpring(scale * 1.3, { damping: 14 });
      ring1Opacity.value = withTiming(0.3 + amplitude * 0.3);
      return;
    }

    if (isRecording) {
      ring1Scale.value = withSpring(1.05);
      ring2Scale.value = withSpring(1.1);
      ring3Scale.value = withSpring(1.15);
      ring1Opacity.value = withTiming(0.15);
      return;
    }

    ring1Scale.value = withSpring(1);
    ring2Scale.value = withSpring(1);
    ring3Scale.value = withSpring(1);
    ring1Opacity.value = withTiming(0.2);
  }, [amplitude, isRecording, ring1Opacity, ring1Scale, ring2Scale, ring3Scale]);

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

    if (!guardVoiceAiReady('microphone')) {
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

  const handleCommitReview = async () => {
    trackEvent('voice_execute_submit', {
      flow: 'voice',
      step: 'commit_review',
      status: 'submitted',
      metadata: {
        intent: reviewDraft?.intent ?? parsedCommand?.intent,
        itemCount: reviewDraft?.items?.length ?? 0,
      },
    });

    await commitReviewDraft();
    const {
      status: newStatus,
      lastExecutedAction,
      error: commitError,
      executedData: committedData,
    } = useVoiceStore.getState();

    if (newStatus === 'success') {
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: lastExecutedAction || 'Đã lưu bản nháp.',
        visibilityTime: 3000,
      });
      trackEvent('voice_execute_success', {
        flow: 'voice',
        step: 'commit_review',
        status: 'success',
        metadata: {
          intent: reviewDraft?.intent ?? parsedCommand?.intent,
          action: committedData?.type,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });

      setTimeout(() => reset(), 2000);
      return;
    }

    if (newStatus === 'error' && commitError) {
      trackEvent('voice_execute_failure', {
        category: 'error',
        flow: 'voice',
        step: 'commit_review',
        status: 'failure',
        metadata: {
          intent: reviewDraft?.intent ?? parsedCommand?.intent,
          message: commitError,
        },
      });
      Toast.show({
        type: 'error',
        text1: 'Chưa lưu được',
        text2: commitError,
      });
    }
  };

  const handleQuickCommand = (text: string) => {
    if (!guardVoiceAiReady('quick_command')) {
      return;
    }

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
      if (!guardVoiceAiReady('text')) {
        return;
      }

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
        return 'Đang nghe';
      case 'processing':
        return 'Đang xử lý';
      case 'parsing':
        return 'Đang phân tích';
      case 'review':
        return 'Cần xác nhận';
      case 'executing':
      case 'committing':
        return 'Đang lưu';
      case 'success':
        return 'Đã lưu';
      case 'error':
        return 'Lỗi';
      default:
        return 'Chạm để nói';
    }
  };

  /* ═══ Build chat messages from state ═══ */
  const chatMessages: ChatMessage[] = [];
  if (recognizedText && status !== 'idle') {
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
  const hasTypedCommand = recognizedText.trim().length > 0;
  const isBusy =
    status === 'processing' ||
    status === 'parsing' ||
    status === 'executing' ||
    status === 'committing';
  const micTitle = isRecording
    ? 'Đang nghe'
    : isVoiceAiBlocked
      ? 'Tạm dừng'
      : isBusy
        ? getStatusLabel()
        : 'Sẵn sàng';
  const micHint = isRecording
    ? 'Chạm để dừng'
    : isVoiceAiBlocked
      ? 'AI chưa khả dụng'
      : 'Nói món, cân nặng hoặc câu hỏi calo';

  return (
    <View
      style={[S.container, { paddingTop: insets.top }]}
      testID={TEST_IDS.voice.screen}
    >
      <MoChiIslandSpacer />

      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={S.header}>
        <View style={S.headerInner}>
          <Pressable style={S.headerBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={P.primary} />
          </Pressable>
          <ThemedText style={S.headerTitle}>Trợ lý AI</ThemedText>
          <View style={S.headerState}>
            <View style={S.headerStateDot} />
            <ThemedText style={S.headerStateText}>AI</ThemedText>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        ref={chatScrollRef}
        style={S.scrollView}
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isVoiceAiBlocked && !isRecording && (
          <Animated.View
            entering={FadeInUp.delay(80)}
            style={[S.statusCard, S.availabilityCard]}
          >
            <Ionicons name="cloud-offline-outline" size={18} color={P.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText style={S.availabilityTitle}>
                {isAiStatusLoading && !aiStatus
                  ? 'AI đang kiểm tra'
                  : voiceAvailability.title}
              </ThemedText>
              <ThemedText style={S.availabilityText}>
                {voiceAvailability.message ??
                  'Bạn vẫn có thể nhập nhật ký thủ công trong lúc chờ AI sẵn sàng.'}
              </ThemedText>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(90)} style={S.voicePanel}>
          <LinearGradient
            colors={['rgba(30, 36, 52, 0.96)', 'rgba(14, 19, 34, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.voicePanelGradient}
          >
            <View style={S.voicePanelHeader}>
              <View style={S.voicePanelCopy}>
                <ThemedText style={S.voicePanelTitle}>{micTitle}</ThemedText>
                <ThemedText style={S.voicePanelHint}>{micHint}</ThemedText>
              </View>
              <View style={[S.voiceStatePill, isRecording && S.voiceStatePillActive]}>
                <View style={[S.voiceStateDot, isRecording && S.voiceStateDotActive]} />
                <ThemedText
                  style={[S.voiceStateText, isRecording && S.voiceStateTextActive]}
                >
                  {isRecording ? 'Ghi âm' : 'Sẵn sàng'}
                </ThemedText>
              </View>
            </View>

            <View style={S.voiceSection}>
              <Animated.View style={[S.ring, S.ring3, ring3Style]} />
              <Animated.View style={[S.ring, S.ring2, ring2Style]} />
              <Animated.View style={[S.ring, S.ring1, ring1Style]} />

              <AnimatedPressable
                onPress={handleToggleRecording}
                style={[
                  S.micBtnOuter,
                  buttonAnimatedStyle,
                  isVoiceAiBlocked && !isRecording && S.disabledControl,
                ]}
                testID="voice-mic-button"
              >
                <View style={S.micBtnGlassWrap}>
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
                      <Ionicons name="mic" size={32} color="#fff" />
                    )}
                  </LinearGradient>
                </View>
              </AnimatedPressable>

              <ThemedText
                style={[S.listeningLabel, isRecording && S.listeningLabelActive]}
              >
                {getStatusLabel()}
              </ThemedText>

              {isRecording && (
                <Animated.View entering={FadeIn.delay(160)}>
                  <Pressable style={S.cancelBtn} onPress={handleCancelRecording}>
                    <Ionicons name="close" size={16} color={P.onSurfaceVariant} />
                    <ThemedText style={S.cancelBtnText}>Hủy</ThemedText>
                  </Pressable>
                </Animated.View>
              )}
            </View>

            {isRecording && recognizedText !== '' && (
              <Animated.View entering={FadeIn.delay(160)} style={S.transcriptWrap}>
                <ThemedText style={S.transcriptText} numberOfLines={3}>
                  {recognizedText}
                </ThemedText>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>

        {!isRecording && (
          <Animated.View entering={FadeInUp.delay(140)} style={S.commandDock}>
            <View style={S.commandBar}>
              <Ionicons name="sparkles" size={18} color={P.primary} />
              <TextInput
                style={S.textInput}
                placeholder="Nhập lệnh..."
                placeholderTextColor={P.onSurfaceVariant + '70'}
                value={recognizedText}
                onChangeText={setRecognizedText}
                multiline
                numberOfLines={1}
                testID={TEST_IDS.voice.textInput}
              />
              <Pressable
                onPress={handleSendText}
                disabled={!hasTypedCommand || status === 'parsing' || isVoiceAiBlocked}
                style={[
                  S.sendBtn,
                  (!hasTypedCommand || status === 'parsing' || isVoiceAiBlocked) &&
                    S.sendBtnDisabled,
                ]}
              >
                <Ionicons name="arrow-up" size={18} color="#003915" />
              </Pressable>
            </View>

            <View style={S.quickCommandRow}>
              {QUICK_COMMANDS.map((cmd) => (
                <Pressable
                  key={cmd.label}
                  style={[S.quickCommand, isVoiceAiBlocked && S.disabledControl]}
                  onPress={() => handleQuickCommand(cmd.text)}
                >
                  <Ionicons name={cmd.icon} size={15} color={P.primary} />
                  <ThemedText style={S.quickCommandText}>{cmd.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {!isRecording && hasTypedCommand && (
          <Animated.View entering={FadeInUp.delay(180)} style={S.actionsRow}>
            <Pressable
              onPress={() => {
                reset();
                setRecognizedText('');
              }}
              style={S.resetBtn}
              testID={TEST_IDS.voice.resetButton}
            >
              <Ionicons name="close" size={17} color={P.onSurfaceVariant} />
              <ThemedText style={S.resetBtnText}>Xóa</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSendText}
              disabled={!hasTypedCommand || status === 'parsing' || isVoiceAiBlocked}
              style={[
                S.analyzeBtn,
                {
                  opacity:
                    !hasTypedCommand || status === 'parsing' || isVoiceAiBlocked
                      ? 0.5
                      : 1,
                },
              ]}
              testID={TEST_IDS.voice.processButton}
            >
              <LinearGradient
                colors={[P.primary, P.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.analyzeBtnGrad}
              >
                <Ionicons name="sparkles" size={17} color="#003915" />
                <ThemedText style={S.analyzeBtnText}>
                  {status === 'parsing' ? 'Đang phân tích' : 'Phân tích'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

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
                <View style={[S.bubble, msg.type === 'user' ? S.bubbleUser : S.bubbleAi]}>
                  <ThemedText style={S.bubbleText}>{msg.text}</ThemedText>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {!isRecording && parsedCommand && parsedCommand.intent !== 'UNKNOWN' && (
          <View style={S.resultSection}>
            <VoiceResultCard
              command={parsedCommand}
              onExecute={handleExecute}
              onCommit={handleCommitReview}
              onDraftChange={setReviewDraft}
              isExecuting={status === 'executing'}
              isCommitting={status === 'committing'}
              executedData={executedData}
              reviewDraft={reviewDraft}
            />
          </View>
        )}

        {!isRecording &&
          status !== 'idle' &&
          status !== 'error' &&
          status !== 'review' &&
          !error && (
          <Animated.View entering={FadeInUp.delay(200)} style={S.statusCard}>
            <View style={S.statusDot} />
            <ThemedText style={S.statusText}>{getStatusLabel()}</ThemedText>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   Styles — Voice Assistant redesign
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.surface,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0E1322', // Solid — tránh lỗi 2 màu trên Android
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 226, 119, 0.08)',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: '#ffffff',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerState: {
    minWidth: 42,
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(75, 226, 119, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.16)',
  },
  headerStateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: P.primary,
  },
  headerStateText: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    color: P.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  chatArea: {
    gap: 12,
    marginBottom: 16,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: P.primaryContainer + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: 'rgba(75, 226, 119, 0.12)',
    borderRadius: 18,
    borderTopRightRadius: 4,
    borderColor: 'rgba(75, 226, 119, 0.18)',
  },
  bubbleAi: {
    backgroundColor: P.surfaceContainerHigh + '90',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: P.primary + '80',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: P.onSurface,
    lineHeight: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(75, 226, 119, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.18)',
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
    fontFamily: 'Inter_700Bold',
    color: P.primary,
  },
  availabilityCard: {
    alignItems: 'flex-start',
    marginBottom: 18,
    borderColor: P.primary + '35',
  },
  availabilityTitle: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    color: P.primary,
    marginBottom: 2,
  },
  availabilityText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: P.onSurfaceVariant,
    lineHeight: 17,
  },
  resultSection: {
    marginBottom: 14,
  },
  commandDock: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(22, 27, 43, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  commandBar: {
    minHeight: 52,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(7, 11, 20, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.12)',
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: P.onSurface,
    minHeight: 42,
    maxHeight: 76,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.primary,
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  quickCommandRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickCommand: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickCommandText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: P.onSurface,
    lineHeight: 15,
  },
  transcriptWrap: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(7, 11, 20, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.14)',
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: P.onSurface,
    lineHeight: 20,
  },
  voicePanel: {
    marginBottom: 14,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
  },
  voicePanelGradient: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  voicePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voicePanelCopy: {
    flex: 1,
  },
  voicePanelTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: P.onSurface,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  voicePanelHint: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: P.onSurfaceVariant,
    lineHeight: 17,
  },
  voiceStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  voiceStatePillActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.24)',
  },
  voiceStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P.primary,
  },
  voiceStateDotActive: {
    backgroundColor: '#ef4444',
  },
  voiceStateText: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    color: P.primary,
  },
  voiceStateTextActive: {
    color: '#fecaca',
  },
  voiceSection: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 2,
    minHeight: 188,
    alignSelf: 'center',
    width: '100%',
  },
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: 999,
    borderStyle: 'solid', // Android: dashed+borderRadius không hoạt động, dùng solid
  },
  ring1: {
    width: 122,
    height: 122,
    marginLeft: -61,
    marginTop: -61,
    borderWidth: 2,
    borderColor: 'rgba(75, 226, 119, 0.36)',
  },
  ring2: {
    width: 154,
    height: 154,
    marginLeft: -77,
    marginTop: -77,
    borderWidth: 1.5,
    borderColor: 'rgba(75, 226, 119, 0.2)',
  },
  ring3: {
    width: 184,
    height: 184,
    marginLeft: -92,
    marginTop: -92,
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.1)',
    borderStyle: 'solid', // Android: dotted+borderRadius không hoạt động, dùng solid
  },
  micBtnOuter: {
    width: 96,
    height: 96,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnGlassWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 12,
  },
  micBtnInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  durationText: {
    fontSize: 19,
    fontFamily: 'Inter_800ExtraBold',
    color: '#ffffff',
  },
  listeningLabel: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: P.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  listeningLabelActive: {
    color: '#fecaca',
  },
  cancelBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: P.onSurfaceVariant,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  resetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resetBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: P.onSurfaceVariant,
  },
  analyzeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 15,
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
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    color: '#003915',
  },
  disabledControl: {
    opacity: 0.55,
  },
});

export default VoiceScreen;
