// AboutScreen — Emerald Nebula Design
// Thông tin ứng dụng: Logo, version, developer info, links

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { feedbackService, type FeedbackSentiment } from '../../../services/feedbackService';
import { EN, enStyles } from '../../../theme/emeraldNebula';
import { showAppToast } from '../../../utils/showAppToast';

type FeedbackAction = {
  id: string;
  label: string;
  category: string;
  sentiment: FeedbackSentiment;
  template: string;
};

const FEEDBACK_ACTIONS: FeedbackAction[] = [
  {
    id: 'good_experience',
    label: 'App mượt, dễ dùng',
    category: 'quality',
    sentiment: 'good',
    template: 'Mình thấy app mượt, giao diện dễ dùng và trải nghiệm theo dõi dinh dưỡng khá ổn.',
  },
  {
    id: 'ai_accuracy',
    label: 'Quét món chưa chính xác',
    category: 'ai_accuracy',
    sentiment: 'bad',
    template: 'Tính năng quét món đôi lúc nhận diện chưa chính xác, mong đội ngũ cải thiện thêm.',
  },
  {
    id: 'performance',
    label: 'App chậm/lag',
    category: 'performance',
    sentiment: 'bad',
    template: 'App hơi chậm hoặc lag ở một vài màn, đặc biệt khi chuyển tab hoặc tải dữ liệu.',
  },
  {
    id: 'quota',
    label: 'Quota AI khó hiểu',
    category: 'quota',
    sentiment: 'idea',
    template: 'Phần quota AI chưa thật dễ hiểu, mình muốn thấy rõ lượt còn lại và thời gian làm mới hơn.',
  },
  {
    id: 'auth_payment',
    label: 'Lỗi đăng nhập/thanh toán',
    category: 'auth_payment',
    sentiment: 'bug',
    template: 'Mình gặp lỗi liên quan đến đăng nhập hoặc thanh toán, cần đội ngũ kiểm tra giúp.',
  },
  {
    id: 'other',
    label: 'Góp ý khác',
    category: 'other',
    sentiment: 'other',
    template: '',
  },
];
const DEFAULT_FEEDBACK_ACTION = FEEDBACK_ACTIONS[0]!;

/* ─── Reusable MenuRow (Emerald Nebula pattern from ProfileScreen) ─── */
interface MenuRowProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  labelColor?: string;
  iconColor?: string;
  showChevron?: boolean;
  statusLabel?: string;
  statusTone?: 'neutral' | 'developing';
  softDisabled?: boolean;
}

const MenuRow = ({
  icon,
  label,
  subtitle,
  onPress,
  labelColor = EN.onSurface,
  iconColor = EN.onSurfaceVariant,
  showChevron = true,
  statusLabel,
  statusTone = 'neutral',
  softDisabled = false,
}: MenuRowProps) => (
  <Pressable
    style={({ pressed }) => [
      enStyles.menuRow,
      softDisabled && S.menuRowSoftDisabled,
      pressed && onPress && { opacity: 0.7 },
    ]}
    onPress={onPress}
    disabled={!onPress}
    accessibilityState={{ disabled: softDisabled }}
  >
    <View style={enStyles.menuIconWrap}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
    </View>
    <View style={S.menuTextWrap}>
      <ThemedText style={{ fontSize: 15, fontFamily: 'BeVietnamPro_500Medium', color: labelColor }} numberOfLines={1}>
        {label}
      </ThemedText>
      {subtitle && (
        <ThemedText style={{ fontSize: 12, color: EN.textMuted, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </ThemedText>
      )}
      {statusLabel && (
        <View style={[S.statusChip, statusTone === 'developing' && S.statusChipDeveloping]}>
          <ThemedText style={[S.statusChipText, statusTone === 'developing' && S.statusChipTextDeveloping]}>
            {statusLabel}
          </ThemedText>
        </View>
      )}
    </View>
    {showChevron && onPress && !softDisabled && (
      <Ionicons name="chevron-forward" size={18} color={EN.onSurfaceVariant} />
    )}
  </Pressable>
);

/* ═══════════════════════════════════════════════
   AboutScreen — Emerald Nebula
   ═══════════════════════════════════════════════ */
const AboutScreen = (): React.ReactElement => {
  const navigation = useNavigation<any>();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState(DEFAULT_FEEDBACK_ACTION.id);
  const [feedbackMessage, setFeedbackMessage] = useState(DEFAULT_FEEDBACK_ACTION.template);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    '1';

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.log('Cannot open URL:', url);
    });
  };

  const handleSendFeedback = () => {
    setFeedbackVisible(true);
  };

  const handleRateApp = () => {
    showAppToast({
      type: 'info',
      text1: 'Tính năng đang phát triển',
      text2: 'Khi app lên Store, bạn sẽ đánh giá trực tiếp tại đây.',
    });
  };

  const handleSelectFeedbackAction = (action: FeedbackAction) => {
    const currentAction = FEEDBACK_ACTIONS.find((item) => item.id === selectedActionId);
    const canReplaceMessage =
      feedbackMessage.trim().length === 0 ||
      (currentAction?.template && feedbackMessage.trim() === currentAction.template);

    setSelectedActionId(action.id);
    if (canReplaceMessage) {
      setFeedbackMessage(action.template);
    }
  };

  const handleSubmitFeedback = async () => {
    const selectedAction =
      FEEDBACK_ACTIONS.find((action) => action.id === selectedActionId) ??
      DEFAULT_FEEDBACK_ACTION;
    const message = feedbackMessage.trim();

    if (message.length < 10) {
      showAppToast({
        type: 'info',
        text1: 'Bạn viết thêm chút nữa nha',
        text2: 'Phản hồi cần ít nhất 10 ký tự để đội ngũ hiểu rõ vấn đề.',
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await feedbackService.submit({
        category: selectedAction.category,
        sentiment: selectedAction.sentiment,
        message,
        appVersion,
        buildNumber: String(buildNumber),
        platform: Platform.OS,
        deviceModel: Device.modelName ?? Device.deviceName ?? undefined,
        screen: 'About',
      });

      showAppToast({
        type: 'success',
        text1: 'Đã gửi phản hồi',
        text2: 'Cảm ơn bạn đã giúp EatFitAI tốt hơn.',
      });
      setFeedbackVisible(false);
      setSelectedActionId(DEFAULT_FEEDBACK_ACTION.id);
      setFeedbackMessage(DEFAULT_FEEDBACK_ACTION.template);
    } catch (error: any) {
      showAppToast({
        type: 'error',
        text1: 'Chưa gửi được phản hồi',
        text2: error?.message || 'Vui lòng thử lại sau.',
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <SubScreenLayout title="Về ứng dụng" subtitle="Thông tin và hỗ trợ">
      {/* ─── Logo Section ─── */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={S.logoCard}>
        {/* Gradient glow behind logo */}
        <View style={S.logoGlow}>
          <LinearGradient
            colors={[EN.primary + '30', 'transparent']}
            style={S.logoGlowGradient}
          />
        </View>
        <Image
          source={require('../../../assets/icon.png')}
          style={S.logoImage}
        />
        <ThemedText style={S.appName}>EatFitAI</ThemedText>
        <ThemedText style={S.version}>
          Phiên bản {appVersion} (Build {buildNumber})
        </ThemedText>

        {/* Feature badges */}
        <View style={S.badgeRow}>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>AI-Powered</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Dinh dưỡng</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Việt Nam</ThemedText>
          </View>
        </View>
      </Animated.View>

      {/* ─── Support Menu ─── */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={enStyles.menuGroup}>
        <MenuRow
          icon="mail-outline"
          label="Gửi phản hồi"
          subtitle="Góp ý trực tiếp cho đội ngũ phát triển"
          iconColor={EN.primary}
          onPress={handleSendFeedback}
        />
        <MenuRow
          icon="star-outline"
          label="Đánh giá ứng dụng"
          subtitle="Tính năng đang phát triển"
          iconColor={EN.amber}
          statusLabel="Đang phát triển"
          statusTone="developing"
          softDisabled
          onPress={handleRateApp}
        />
        <MenuRow
          icon="shield-checkmark-outline"
          label="Điều khoản & Bảo mật"
          subtitle="Xem nội dung đầy đủ trong app"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
      </Animated.View>

      {/* ─── Info Menu ─── */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={enStyles.menuGroup}>
        <MenuRow
          icon="code-slash-outline"
          label="Nhà phát triển"
          subtitle="EatFitAI Team"
          showChevron={false}
        />
        <MenuRow
          icon="globe-outline"
          label="Trang chủ EatFitAI"
          subtitle="Thông tin, tải app và cập nhật chính thức"
          iconColor={EN.cyan}
          onPress={() => handleOpenLink('https://eatfitai-download.pages.dev/')}
        />
      </Animated.View>

      {/* ─── Footer ─── */}
      <Animated.View entering={FadeInUp.delay(400).duration(400)} style={S.footer}>
        <ThemedText style={S.footerText}>
          © 2026 EatFitAI. All rights reserved.
        </ThemedText>
        <ThemedText style={S.footerText}>Made with 💚 in Vietnam</ThemedText>
      </Animated.View>

      <Modal
        visible={feedbackVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={S.feedbackOverlay}
        >
          <Pressable
            style={S.feedbackBackdrop}
            onPress={() => setFeedbackVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Đóng gửi phản hồi"
          />
          <Animated.View entering={FadeInUp.duration(180)} style={S.feedbackSheet}>
            <View style={S.sheetHandle} />
            <View style={S.feedbackHeader}>
              <View style={S.feedbackIcon}>
                <Ionicons name="mail-outline" size={22} color={EN.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={S.feedbackTitle}>Gửi phản hồi</ThemedText>
                <ThemedText style={S.feedbackSubtitle}>
                  Gửi thẳng đến đội ngũ EatFitAI từ tài khoản của bạn.
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setFeedbackVisible(false)}
                hitSlop={10}
                style={({ pressed }) => [S.closeButton, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="close" size={20} color={EN.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView
              style={S.feedbackScroll}
              contentContainerStyle={S.feedbackScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={S.actionChips}>
                {FEEDBACK_ACTIONS.map((action) => {
                  const selected = selectedActionId === action.id;
                  return (
                    <Pressable
                      key={action.id}
                      style={({ pressed }) => [
                        S.actionChip,
                        selected && S.actionChipSelected,
                        pressed && { opacity: 0.78 },
                      ]}
                      onPress={() => handleSelectFeedbackAction(action)}
                    >
                      <ThemedText
                        style={[
                          S.actionChipText,
                          selected && S.actionChipTextSelected,
                        ]}
                      >
                        {action.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={S.feedbackInput}
                value={feedbackMessage}
                onChangeText={setFeedbackMessage}
                multiline
                maxLength={2000}
                placeholder="Viết góp ý, lỗi gặp phải, màn hình liên quan hoặc điều bạn muốn EatFitAI cải thiện..."
                placeholderTextColor={EN.textMuted}
                textAlignVertical="top"
              />
              <ThemedText style={S.inputCounter}>
                {feedbackMessage.trim().length}/2000 ký tự
              </ThemedText>
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                S.submitButton,
                (isSubmittingFeedback || feedbackMessage.trim().length < 10) &&
                  S.submitButtonDisabled,
                pressed && !isSubmittingFeedback && { opacity: 0.82 },
              ]}
              disabled={isSubmittingFeedback || feedbackMessage.trim().length < 10}
              onPress={handleSubmitFeedback}
            >
              {isSubmittingFeedback ? (
                <ActivityIndicator size="small" color="#07130b" />
              ) : (
                <Ionicons name="send" size={17} color="#07130b" />
              )}
              <ThemedText style={S.submitButtonText}>
                {isSubmittingFeedback ? 'Đang gửi...' : 'Gửi phản hồi'}
              </ThemedText>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SubScreenLayout>
  );
};

/* ─── Styles ─── */
const S = StyleSheet.create({
  logoCard: {
    ...enStyles.card,
    alignItems: 'center',
    paddingVertical: 32,
    overflow: 'hidden',
  },
  logoGlow: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlowGradient: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: EN.primary + '30',
  },
  appName: {
    fontSize: 24,
    fontFamily: 'BeVietnamPro_700Bold',
    color: EN.onSurface,
    letterSpacing: -0.5,
  },
  version: {
    fontSize: 13,
    color: EN.textMuted,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: EN.primaryContainer + '18',
    borderWidth: 1,
    borderColor: EN.primary + '30',
    shadowColor: EN.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: EN.primary,
    letterSpacing: 0.3,
  },
  menuRowSoftDisabled: {
    opacity: 0.74,
  },
  menuTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  statusChip: {
    alignSelf: 'flex-start',
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    marginTop: 8,
  },
  statusChipDeveloping: {
    backgroundColor: EN.primary + '12',
    borderColor: EN.primary + '24',
  },
  statusChipText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: EN.onSurfaceVariant,
  },
  statusChipTextDeveloping: {
    color: EN.primary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
    color: EN.onSurfaceVariant + '50',
    letterSpacing: 0.5,
  },
  feedbackOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  feedbackBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  feedbackSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: EN.surface,
    borderWidth: 1,
    borderColor: EN.primary + '24',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  feedbackIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: EN.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'BeVietnamPro_700Bold',
    color: EN.onSurface,
  },
  feedbackSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: EN.textMuted,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackScroll: {
    maxHeight: 440,
  },
  feedbackScrollContent: {
    paddingBottom: 8,
  },
  actionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  actionChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: EN.outline,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  actionChipSelected: {
    borderColor: EN.primary + '45',
    backgroundColor: EN.primary + '18',
  },
  actionChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: EN.onSurfaceVariant,
  },
  actionChipTextSelected: {
    color: EN.primary,
  },
  feedbackInput: {
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: EN.outline,
    backgroundColor: EN.surfaceHighest,
    color: EN.onSurface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  inputCounter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 11,
    color: EN.textMuted,
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: EN.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.46,
  },
  submitButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#07130b',
  },
});

export default AboutScreen;
