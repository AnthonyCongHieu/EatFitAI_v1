import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { EN, enStyles } from '../../../theme/emeraldNebula';
import { aiService, isAiOfflineError } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type {
  NutritionInsight,
  NutritionRecommendation,
  AdaptiveTarget,
} from '../../../types/aiEnhanced';
import {
  translateToVietnamese,
  translateRecommendationType,
} from '../../../utils/translate';
import { t } from '../../../i18n/vi';
import Toast from 'react-native-toast-message';
import { TEST_IDS } from '../../../testing/testIds';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/* ─── ScoreGauge ─── */
const ScoreGauge = ({
  score,
  size = 120,
  color,
}: {
  score: number;
  size?: number;
  color: string;
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={EN.surfaceHighest}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <ThemedText style={{ color, fontSize: 32, fontWeight: '700', lineHeight: 36 }}>
          {Math.round(score)}
        </ThemedText>
        <ThemedText style={{ color: EN.textMuted, fontSize: 14 }}>
          /100
        </ThemedText>
      </View>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   NutritionInsightsScreen — Emerald Nebula
   ═══════════════════════════════════════════════ */
const NutritionInsightsScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();

  const [insights, setInsights] = useState<NutritionInsight | null>(null);
  const [adaptiveTarget, setAdaptiveTarget] = useState<AdaptiveTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiOffline, setAiOffline] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const formatTargetMetric = (value: number | null | undefined): string =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? String(Math.round(value))
      : '--';

  const hasCompleteTarget = (
    target:
      | AdaptiveTarget['currentTarget']
      | AdaptiveTarget['suggestedTarget']
      | null
      | undefined,
  ): boolean =>
    Boolean(
      target &&
      typeof target.targetCalories === 'number' &&
      target.targetCalories > 0 &&
      typeof target.targetProtein === 'number' &&
      target.targetProtein > 0 &&
      typeof target.targetCarbs === 'number' &&
      target.targetCarbs > 0 &&
      typeof target.targetFat === 'number' &&
      target.targetFat > 0,
    );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    setAiOffline(false);

    try {
      const [insightsResult, adaptiveResult] = await Promise.allSettled([
        aiService.getNutritionInsights({ analysisDays: 30 }),
        aiService.getAdaptiveTarget({ analysisDays: 14 }),
      ]);

      let nextInsights: NutritionInsight | null = null;
      let nextAdaptiveTarget: AdaptiveTarget | null = null;
      const errorMessages: string[] = [];
      let hasAiOfflineFailure = false;

      if (insightsResult.status === 'fulfilled') {
        nextInsights = insightsResult.value;
      } else if (isAiOfflineError(insightsResult.reason)) {
        hasAiOfflineFailure = true;
      } else {
        errorMessages.push(
          insightsResult.reason?.message || t('nutrition_insights.error_title'),
        );
      }

      if (adaptiveResult.status === 'fulfilled') {
        nextAdaptiveTarget = adaptiveResult.value;
      } else if (isAiOfflineError(adaptiveResult.reason)) {
        hasAiOfflineFailure = true;
      } else {
        errorMessages.push(
          adaptiveResult.reason?.message || t('nutrition_insights.error_title'),
        );
      }

      setInsights(nextInsights);
      setAdaptiveTarget(nextAdaptiveTarget);

      if (!nextInsights && !nextAdaptiveTarget) {
        if (hasAiOfflineFailure) {
          setAiOffline(true);
          setError('AI tạm không khả dụng lúc này.');
        } else {
          setError(errorMessages[0] || t('nutrition_insights.error_title'));
        }
      } else if (hasAiOfflineFailure || errorMessages.length > 0) {
        setNotice(
          hasAiOfflineFailure
            ? 'Một vài phân tích AI đang tạm offline. Ứng dụng đang hiện phần dữ liệu khả dụng.'
            : 'Không tải đủ một phần dữ liệu AI. Đang hiện phần khả dụng.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const applyAdaptiveTarget = async () => {
    if (!adaptiveTarget || !hasCompleteTarget(adaptiveTarget.suggestedTarget)) return;
    setApplying(true);
    try {
      await aiService.applyAdaptiveTarget(adaptiveTarget.suggestedTarget);
      Toast.show({
        type: 'success',
        text1: t('nutrition_insights.apply_success'),
        visibilityTime: 2000,
      });
      navigation.goBack();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: t('nutrition_insights.apply_error'),
        text2: err?.message,
      });
    } finally {
      setApplying(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return EN.danger;
      case 'medium':
        return EN.warning;
      case 'low':
        return EN.info;
      default:
        return EN.onSurface;
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return EN.danger;
      case 'medium':
        return EN.warning;
      case 'low':
        return EN.info;
      default:
        return EN.outline;
    }
  };

  /* ─── Error / Empty states ─── */
  if (error) {
    const normalizedError = error.toLowerCase();
    const isNoTargetError =
      normalizedError.includes('nutrition target') ||
      normalizedError.includes('no active');

    return (
      <SubScreenLayout
        title={t('nutrition_insights.title')}
        subtitle={t('nutrition_insights.subtitle')}
        testID={TEST_IDS.nutritionInsights.screen}
      >
        <View style={S.center}>
          {isNoTargetError ? (
            <AnimatedEmptyState
              title="Chưa thiết lập mục tiêu dinh dưỡng"
              description="Bạn cần tạo mục tiêu calories, protein, carbs và fat trước khi xem phân tích AI."
              primaryAction={{
                label: 'Thiết lập ngay',
                onPress: () => navigation.navigate('NutritionSettings' as never),
              }}
              secondaryAction={{
                label: t('nutrition_insights.retry'),
                onPress: loadData,
              }}
            />
          ) : aiOffline ? (
            <AnimatedEmptyState
              variant="offline"
              title="AI tạm offline"
              description="Ứng dụng vẫn an toàn và bạn có thể thử lại sau. Các tính năng có AI sẽ quay lại khi backend AI sẵn sàng."
              primaryAction={{
                label: t('nutrition_insights.retry'),
                onPress: loadData,
              }}
              secondaryAction={{
                label: 'Mở cài đặt mục tiêu',
                onPress: () => navigation.navigate('NutritionSettings' as never),
              }}
            />
          ) : (
            <AnimatedEmptyState
              variant="error"
              title={t('nutrition_insights.error_title')}
              description={error}
              primaryAction={{
                label: t('nutrition_insights.retry'),
                onPress: loadData,
              }}
            />
          )}
        </View>
      </SubScreenLayout>
    );
  }

  /* ─── Recommendation card ─── */
  const renderRecommendation = (rec: NutritionRecommendation, index: number) => (
    <Animated.View
      key={index}
      entering={FadeInUp.delay(100 + index * 60)}
      style={[
        S.recommendationCard,
        { borderLeftColor: getPriorityBorderColor(rec.priority) },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons
          name="bulb"
          size={20}
          color={getPriorityColor(rec.priority)}
          style={{ marginRight: 8 }}
        />
        <ThemedText style={[S.recTitle, { flex: 1 }]}>
          {translateRecommendationType(rec.type)}
        </ThemedText>
      </View>
      <ThemedText style={S.recMessage}>
        {translateToVietnamese(rec.message)}
      </ThemedText>
      <ThemedText style={S.recReasoning}>
        {translateToVietnamese(rec.reasoning)}
      </ThemedText>
    </Animated.View>
  );

  /* ─── Main render ─── */
  return (
    <SubScreenLayout
      title={t('nutrition_insights.title')}
      subtitle={t('nutrition_insights.subtitle')}
      loading={loading}
      testID={TEST_IDS.nutritionInsights.screen}
      onRefresh={loadData}
    >
      {/* Notice banner */}
      {notice && (
        <View style={S.noticeCard}>
          <Ionicons name="cloud-offline-outline" size={20} color={EN.warning} />
          <ThemedText style={{ flex: 1, fontSize: 14, color: EN.onSurface }}>
            {notice}
          </ThemedText>
        </View>
      )}

      {/* Adherence Score */}
      {insights && (
        <>
          <Animated.View entering={FadeInUp.delay(100)} style={S.headerCard}>
            <View style={{ marginRight: 16 }}>
              <ScoreGauge score={insights.adherenceScore} color={EN.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={S.sectionCardTitle}>
                {t('nutrition_insights.adherence_score')}
              </ThemedText>
              <ThemedText style={S.sectionCardSubtitle}>
                {t('nutrition_insights.adherence_desc')}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons
                  name={
                    insights.progressTrend === 'improving'
                      ? 'trending-up'
                      : insights.progressTrend === 'declining'
                        ? 'trending-down'
                        : 'remove'
                  }
                  size={20}
                  color={
                    insights.progressTrend === 'improving'
                      ? EN.success
                      : insights.progressTrend === 'declining'
                        ? EN.danger
                        : EN.warning
                  }
                />
                <ThemedText style={{ marginLeft: 6, fontWeight: '600', fontSize: 15, color: EN.onSurface }}>
                  {insights.progressTrend === 'improving'
                    ? t('nutrition_insights.trend_improving')
                    : insights.progressTrend === 'declining'
                      ? t('nutrition_insights.trend_declining')
                      : t('nutrition_insights.trend_stable')}
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          {/* Recommendations */}
          <ThemedText style={S.sectionLabel}>
            {t('nutrition_insights.recommendations_title')}
          </ThemedText>
          {insights.recommendations.length > 0 ? (
            insights.recommendations.map(renderRecommendation)
          ) : (
            <View style={[enStyles.card, { alignItems: 'center', padding: 24 }]}>
              <Ionicons name="trophy-outline" size={40} color={EN.warning} />
              <ThemedText style={{ marginTop: 8, textAlign: 'center', color: EN.onSurface, fontSize: 15 }}>
                {t('nutrition_insights.no_recommendations')}
              </ThemedText>
            </View>
          )}

          {/* Meal Timing */}
          {insights.mealTimingInsight && (
            <>
              <ThemedText style={S.sectionLabel}>
                {t('nutrition_insights.meal_timing_title')}
              </ThemedText>
              <Animated.View entering={FadeInUp.delay(200)} style={enStyles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="time-outline" size={24} color={EN.info} style={{ marginRight: 8 }} />
                  <ThemedText style={S.sectionCardTitle}>
                    {t('nutrition_insights.meal_timing_title')}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: EN.onSurface, fontSize: 15, marginBottom: 8 }}>
                  {t('nutrition_insights.meal_timing_avg')}:{' '}
                  <ThemedText style={{ fontWeight: '700', color: EN.onSurface }}>
                    {insights.mealTimingInsight.averageMealsPerDay.toFixed(1)}{' '}
                    {t('nutrition_insights.meals_per_day')}
                  </ThemedText>
                </ThemedText>
                {insights.mealTimingInsight.insights.map((insight, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', marginTop: 4 }}>
                    <ThemedText style={{ color: EN.textMuted, marginRight: 6 }}>
                      {'–'}
                    </ThemedText>
                    <ThemedText style={{ flex: 1, fontSize: 14, color: EN.textMuted }}>
                      {translateToVietnamese(insight)}
                    </ThemedText>
                  </View>
                ))}
              </Animated.View>
            </>
          )}
        </>
      )}

      {/* Adaptive Target */}
      {adaptiveTarget &&
        adaptiveTarget.confidenceScore > 50 &&
        hasCompleteTarget(adaptiveTarget.suggestedTarget) && (
          <>
            <ThemedText style={S.sectionLabel}>
              {t('nutrition_insights.adaptive_title')}
            </ThemedText>
            <Animated.View entering={FadeInUp.delay(300)} style={enStyles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="analytics" size={24} color={EN.primary} style={{ marginRight: 8 }} />
                <ThemedText style={S.sectionCardTitle}>
                  {t('nutrition_insights.ai_suggestion')}
                </ThemedText>
              </View>

              {/* Current vs Suggested comparison */}
              <View style={S.targetComparison}>
                <View style={S.targetCol}>
                  <ThemedText style={{ fontSize: 12, color: EN.textMuted, marginBottom: 4 }}>
                    {t('nutrition_insights.current')}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 24, fontWeight: '700', color: EN.onSurface }}>
                    {formatTargetMetric(adaptiveTarget.currentTarget.targetCalories)}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: EN.textMuted }}>
                    kcal
                  </ThemedText>
                </View>
                <View style={{ justifyContent: 'center' }}>
                  <Ionicons name="arrow-forward-circle" size={32} color={EN.primary} />
                </View>
                <View style={[S.targetCol, S.targetColHighlighted]}>
                  <ThemedText style={{ fontSize: 12, color: EN.primary, marginBottom: 4, fontWeight: '700' }}>
                    {t('nutrition_insights.suggested')}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 24, fontWeight: '700', color: EN.primary }}>
                    {formatTargetMetric(adaptiveTarget.suggestedTarget.targetCalories)}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: EN.primary }}>
                    kcal
                  </ThemedText>
                </View>
              </View>

              {/* Reasoning */}
              <View style={S.reasoningBox}>
                <ThemedText style={{ fontStyle: 'italic', fontSize: 14, color: EN.textMuted }}>
                  "
                  {adaptiveTarget.adjustmentReasons
                    .map((reason) => translateToVietnamese(reason))
                    .join('. ')}
                  "
                </ThemedText>
              </View>

              <Pressable
                onPress={applyAdaptiveTarget}
                disabled={applying}
                style={({ pressed }) => [
                  S.submitButton,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  applying && { opacity: 0.5 },
                ]}
                testID={TEST_IDS.nutritionInsights.applyAdaptiveButton}
              >
                <LinearGradient
                  colors={[EN.primary, EN.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {applying ? (
                  <ActivityIndicator color="#003915" size="small" />
                ) : (
                  <ThemedText style={S.submitButtonText}>
                    {`${t('nutrition_insights.apply_change')} (${t('nutrition_insights.confidence')}: ${Math.round(adaptiveTarget.confidenceScore)}%)`}
                  </ThemedText>
                )}
              </Pressable>
            </Animated.View>
          </>
        )}
    </SubScreenLayout>
  );
};

/* ─── Styles ─── */
const S = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  headerCard: {
    ...enStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: EN.onSurface,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: EN.onSurface,
    marginBottom: 4,
  },
  sectionCardSubtitle: {
    fontSize: 13,
    color: EN.textMuted,
  },
  recommendationCard: {
    ...enStyles.card,
    borderLeftWidth: 4,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: EN.onSurface,
  },
  recMessage: {
    fontSize: 15,
    color: EN.onSurface,
    marginBottom: 6,
  },
  recReasoning: {
    fontSize: 13,
    color: EN.textMuted,
  },
  noticeCard: {
    ...enStyles.card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderTopColor: EN.warning + '40',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  targetComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  targetCol: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    backgroundColor: EN.surfaceHighest,
    borderRadius: 14,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: EN.outline,
  },
  targetColHighlighted: {
    borderColor: EN.primary + '50',
    backgroundColor: EN.primary + '12',
  },
  reasoningBox: {
    backgroundColor: EN.surfaceHighest,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  submitButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: EN.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#003915',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

export default NutritionInsightsScreen;
