import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MeshBackground from '../../../components/ui/MeshBackground';
import { ThemedText } from '../../../components/ThemedText';
import {
  aiQuotaService,
} from '../../../services/aiQuotaService';
import {
  summarizeAiQuota,
  type AiQuotaGroup,
  type AiQuotaTone,
} from '../../../features/quota/aiQuotaPresentation';
import { useEN } from '../../../theme/emeraldNebula';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AIQuota'>;

const P_STATIC = {
  primary: '#4be277',
  surface: '#05070d',
  surfaceLow: '#0f1625',
  surfaceHigh: '#252b3f',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#b7c4d9',
  glassBg: 'rgba(26,31,47,0.78)',
  glassBorder: 'rgba(255,255,255,0.08)',
  error: '#ff8c8c',
  amber: '#f7c052',
  cyan: '#32d7f0',
};

const quotaToneColor = (tone: AiQuotaTone, palette: typeof P_STATIC) => {
  if (tone === 'empty') return palette.error;
  if (tone === 'low') return palette.amber;
  if (tone === 'unlimited') return palette.cyan;
  return palette.primary;
};

const QuotaBar = ({
  icon,
  group,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  group: AiQuotaGroup;
  color: string;
}): React.ReactElement => {
  const fillWidth = `${Math.round(Math.max(0, Math.min(1, group.ratio)) * 100)}%` as `${number}%`;

  return (
    <View style={S.quotaBlock}>
      <View style={S.quotaTopRow}>
        <View style={[S.quotaIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={S.quotaCopy}>
          <View style={S.quotaTitleRow}>
            <ThemedText style={S.quotaTitle}>{group.title}</ThemedText>
            <View style={[S.statusPill, { borderColor: color + '38', backgroundColor: color + '14' }]}>
              <ThemedText style={[S.statusPillText, { color }]}>{group.statusText}</ThemedText>
            </View>
          </View>
          <ThemedText style={S.quotaSubtitle}>{group.subtitle}</ThemedText>
        </View>
        <ThemedText style={[S.quotaValue, { color }]}>{group.label}</ThemedText>
      </View>
      <View style={S.progressTrack}>
        <View style={[S.progressFill, { width: fillWidth, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const AIQuotaScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const EN = useEN();
  const P = {
    ...P_STATIC,
    primary: EN.primary,
    surface: EN.bg,
    surfaceLow: EN.surfaceLow,
    surfaceHigh: EN.surfaceHigh,
    onSurface: EN.onSurface,
    onSurfaceVariant: EN.onSurfaceVariant,
    glassBg: EN.glassBg,
    glassBorder: EN.glassBorder,
    error: EN.danger,
    amber: EN.amber,
    cyan: EN.cyan,
  };

  const {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['ai-quota', 'me'],
    queryFn: aiQuotaService.getStatus,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const features = data?.features ?? [];
  const quotaSummary = summarizeAiQuota({
    features,
    planCode: data?.planCode,
    isPremium: data?.isPremium ?? false,
    resetAtUtc: data?.resetAtUtc,
  });
  const summaryColor = quotaToneColor(quotaSummary.tone, P);
  const scanColor = quotaToneColor(quotaSummary.scan.tone, P);
  const assistantColor = quotaToneColor(quotaSummary.assistant.tone, P);

  return (
    <View style={[S.container, { paddingTop: insets.top, backgroundColor: P.surface }]}>
      <MeshBackground />
      <View style={S.header}>
        <Pressable style={S.headerBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={P.onSurface} />
        </Pressable>
        <ThemedText style={[S.headerTitle, { color: P.onSurface }]}>Lượt AI hôm nay</ThemedText>
        <View style={S.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          S.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[P.primary]}
            tintColor={P.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[S.heroPanel, { backgroundColor: P.glassBg, borderColor: P.glassBorder }]}>
          <View style={[S.heroIcon, { backgroundColor: P.primary + '18' }]}>
            <Ionicons name="sparkles" size={24} color={P.primary} />
          </View>
          <View style={S.heroCopy}>
            <View style={S.heroTitleRow}>
              <ThemedText style={[S.heroTitle, { color: P.onSurface }]}>
                Trung tâm AI hôm nay
              </ThemedText>
              <View style={[S.planBadge, { backgroundColor: P.primary + '14', borderColor: P.primary + '38' }]}>
                <ThemedText style={[S.planBadgeText, { color: P.primary }]}>
                  {quotaSummary.planLabel}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[S.heroSubtitle, { color: P.onSurfaceVariant }]}>
              {quotaSummary.resetText}
            </ThemedText>
          </View>
          <View style={[S.heroStatus, { borderColor: summaryColor + '38', backgroundColor: summaryColor + '12' }]}>
            <View style={[S.heroStatusDot, { backgroundColor: summaryColor }]} />
            <ThemedText style={[S.heroStatusText, { color: summaryColor }]}>
              {quotaSummary.statusText}
            </ThemedText>
          </View>
        </View>

        <View style={[S.panel, { backgroundColor: P.glassBg, borderColor: P.glassBorder }]}>
          <View style={S.panelHeader}>
            <View style={[S.panelIcon, { backgroundColor: P.primary + '18' }]}>
              <Ionicons name="sparkles-outline" size={19} color={P.primary} />
            </View>
            <View style={S.panelCopy}>
              <ThemedText style={[S.panelTitle, { color: P.onSurface }]}>
                Quota theo ngày
              </ThemedText>
              <ThemedText style={[S.panelSubtitle, { color: P.onSurfaceVariant }]}>
                Hai nhóm chính để bạn dễ theo dõi, không liệt kê rườm rà từng tác vụ.
              </ThemedText>
            </View>
          </View>

          {isLoading && !data ? (
            <View style={S.loading}>
              <ActivityIndicator size="small" color={P.primary} />
            </View>
          ) : isError ? (
            <View style={S.errorState}>
              <Ionicons name="cloud-offline-outline" size={24} color={P.error} />
              <ThemedText style={[S.errorTitle, { color: P.onSurface }]}>
                Chưa tải được quota
              </ThemedText>
              <ThemedText style={[S.errorBody, { color: P.onSurfaceVariant }]}>
                Kiểm tra kết nối rồi thử lại để xem lượt AI mới nhất.
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  S.retryButton,
                  { backgroundColor: P.primary + '18', borderColor: P.primary + '38' },
                  pressed && { opacity: 0.76 },
                ]}
                onPress={() => void refetch()}
              >
                <Ionicons name="refresh" size={16} color={P.primary} />
                <ThemedText style={[S.retryText, { color: P.primary }]}>Thử lại</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={S.quotaList}>
              <QuotaBar
                icon="scan-outline"
                group={quotaSummary.scan}
                color={scanColor}
              />
              <QuotaBar
                icon="chatbubbles-outline"
                group={quotaSummary.assistant}
                color={assistantColor}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P_STATIC.surface,
  },
  header: {
    paddingHorizontal: 16,
    minHeight: 52,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 14,
  },
  heroPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    backgroundColor: P_STATIC.glassBg,
    borderColor: P_STATIC.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P_STATIC.onSurfaceVariant,
  },
  planBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  planBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.primary,
  },
  heroStatus: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P_STATIC.primary,
  },
  heroStatusText: {
    maxWidth: 92,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.primary,
  },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: P_STATIC.glassBg,
    borderColor: P_STATIC.glassBorder,
  },
  panelHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  panelIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelCopy: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
  },
  panelSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P_STATIC.onSurfaceVariant,
  },
  loading: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaList: {
    gap: 14,
  },
  quotaBlock: {
    gap: 10,
  },
  quotaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quotaIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaCopy: {
    flex: 1,
  },
  quotaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  quotaTitle: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 9,
    lineHeight: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.primary,
  },
  quotaSubtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P_STATIC.onSurfaceVariant,
  },
  quotaValue: {
    maxWidth: 104,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.primary,
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(226,232,240,0.12)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: P_STATIC.primary,
  },
  errorState: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  errorTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
    textAlign: 'center',
  },
  errorBody: {
    maxWidth: 260,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P_STATIC.onSurfaceVariant,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.primary,
  },
});

export default AIQuotaScreen;
