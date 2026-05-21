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
  type AiUsageQuotaFeature,
} from '../../../services/aiQuotaService';
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
};

const getRemaining = (feature: AiUsageQuotaFeature): number => {
  if (!feature.isLimited) {
    return Number.POSITIVE_INFINITY;
  }

  const limit = feature.limit ?? 0;
  return Math.max(0, feature.remaining ?? limit - feature.used);
};

const summarizeLimitedQuota = (features: AiUsageQuotaFeature[]) => {
  const limitedFeatures = features.filter(
    (feature) => feature.key !== 'vision_scan' && feature.isLimited && feature.limit != null,
  );

  if (limitedFeatures.length === 0) {
    return {
      isUnlimited: true,
      remaining: Number.POSITIVE_INFINITY,
      limit: Number.POSITIVE_INFINITY,
      ratio: 1,
      label: 'Không giới hạn',
    };
  }

  const limit = limitedFeatures.reduce((sum, feature) => sum + (feature.limit ?? 0), 0);
  const remaining = limitedFeatures.reduce((sum, feature) => sum + getRemaining(feature), 0);
  const ratio = limit > 0 ? Math.max(0, Math.min(1, remaining / limit)) : 0;

  return {
    isUnlimited: false,
    remaining,
    limit,
    ratio,
    label: `Còn ${remaining}/${limit} lượt`,
  };
};

const resolveScanQuota = (features: AiUsageQuotaFeature[]) => {
  const scanQuota = features.find((feature) => feature.key === 'vision_scan');

  if (!scanQuota || !scanQuota.isLimited || scanQuota.limit == null) {
    return {
      isUnlimited: true,
      label: 'Không giới hạn',
      ratio: 1,
    };
  }

  const remaining = getRemaining(scanQuota);
  const ratio = scanQuota.limit > 0 ? Math.max(0, Math.min(1, remaining / scanQuota.limit)) : 0;

  return {
    isUnlimited: false,
    label: `Còn ${remaining}/${scanQuota.limit} lượt`,
    ratio,
  };
};

const QuotaBar = ({
  icon,
  title,
  subtitle,
  value,
  ratio,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: string;
  ratio: number;
  color: string;
}): React.ReactElement => {
  const fillWidth = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` as `${number}%`;

  return (
    <View style={S.quotaBlock}>
      <View style={S.quotaTopRow}>
        <View style={[S.quotaIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={S.quotaCopy}>
          <ThemedText style={S.quotaTitle}>{title}</ThemedText>
          <ThemedText style={S.quotaSubtitle}>{subtitle}</ThemedText>
        </View>
        <ThemedText style={[S.quotaValue, { color }]}>{value}</ThemedText>
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
  };

  const {
    data,
    isLoading,
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
  const scanQuota = resolveScanQuota(features);
  const limitedQuota = summarizeLimitedQuota(features);
  const limitedColor =
    !limitedQuota.isUnlimited && limitedQuota.remaining <= 0 ? P.error : P.primary;

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
          ) : (
            <View style={S.quotaList}>
              <QuotaBar
                icon="scan-outline"
                title="Quét món bằng AI"
                subtitle="Dùng cho camera và nhận diện món ăn."
                value={scanQuota.label}
                ratio={scanQuota.ratio}
                color={P.primary}
              />
              <QuotaBar
                icon="chatbubbles-outline"
                title="Ghi chú và truy vấn AI"
                subtitle="Gồm voice, công thức, mục tiêu và phân tích dinh dưỡng."
                value={limitedQuota.label}
                ratio={limitedQuota.ratio}
                color={limitedColor}
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
  quotaTitle: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P_STATIC.onSurface,
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
});

export default AIQuotaScreen;
