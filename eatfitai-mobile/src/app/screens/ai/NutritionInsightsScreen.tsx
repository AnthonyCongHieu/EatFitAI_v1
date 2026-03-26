import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import { useAppTheme } from '../../../theme/ThemeProvider';
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
import { glassStyles } from '../../../components/ui/GlassCard';
import { t } from '../../../i18n/vi';
import Toast from 'react-native-toast-message';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
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
        <ThemedText variant="h2" style={{ color, fontSize: 32, lineHeight: 36 }}>
          {Math.round(score)}
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary">
          /100
        </ThemedText>
      </View>
    </View>
  );
};

const NutritionInsightsScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
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
          setError('AI tam khong kha dung luc nay.');
        } else {
          setError(errorMessages[0] || t('nutrition_insights.error_title'));
        }
      } else if (hasAiOfflineFailure || errorMessages.length > 0) {
        setNotice(
          hasAiOfflineFailure
            ? 'Mot vai phan tich AI dang tam offline. Ung dung dang hien phan du lieu kha dung.'
            : 'Khong tai du mot phan du lieu AI. Dang hien phan kha dung.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const applyAdaptiveTarget = async () => {
    if (!adaptiveTarget) return;
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: 100,
    },
    card: {
      ...glass.card,
      padding: 20,
      marginBottom: theme.spacing.md,
    },
    headerCard: {
      ...glass.card,
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    scoreContainer: {
      marginRight: theme.spacing.lg,
    },
    trendContainer: {
      flex: 1,
    },
    sectionTitle: {
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginLeft: theme.spacing.xs,
    },
    recommendationCard: {
      ...glass.card,
      marginBottom: theme.spacing.md,
      borderLeftWidth: 4,
      padding: theme.spacing.md,
    },
    recHigh: { borderLeftColor: theme.colors.danger },
    recMedium: { borderLeftColor: theme.colors.warning },
    recLow: { borderLeftColor: theme.colors.info },
    targetComparison: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    targetCol: {
      flex: 1,
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: theme.borderRadius.card,
      marginHorizontal: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noticeCard: {
      ...glass.card,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.warning + '40',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.12)',
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return theme.colors.danger;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.info;
      default:
        return theme.colors.text;
    }
  };

  const renderHeader = () => (
    <View style={{ paddingTop: 60, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText style={{ fontSize: 18 }}>{'<'}</ThemedText>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
          <ThemedText variant="h3" weight="700">
            {t('nutrition_insights.title')}
          </ThemedText>
        </View>
      </View>

      <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center', marginTop: 8 }}>
        {t('nutrition_insights.subtitle')}
      </ThemedText>
    </View>
  );

  const renderRecommendation = (rec: NutritionRecommendation, index: number) => (
    <View
      key={index}
      style={[
        styles.recommendationCard,
        rec.priority === 'high'
          ? styles.recHigh
          : rec.priority === 'medium'
            ? styles.recMedium
            : styles.recLow,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.xs,
        }}
      >
        <Ionicons
          name="bulb"
          size={20}
          color={getPriorityColor(rec.priority)}
          style={{ marginRight: theme.spacing.sm }}
        />
        <ThemedText variant="h4" style={{ flex: 1, fontSize: 16 }}>
          {translateRecommendationType(rec.type)}
        </ThemedText>
      </View>
      <ThemedText variant="body" style={{ marginBottom: theme.spacing.sm }}>
        {translateToVietnamese(rec.message)}
      </ThemedText>
      <ThemedText variant="caption" color="textSecondary">
        {translateToVietnamese(rec.reasoning)}
      </ThemedText>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    const normalizedError = error.toLowerCase();
    const isNoTargetError =
      normalizedError.includes('nutrition target') || normalizedError.includes('no active');

    return (
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        {renderHeader()}
        <View style={styles.center}>
          {isNoTargetError ? (
            <AnimatedEmptyState
              title="Chua thiet lap muc tieu dinh duong"
              description="Ban can tao muc tieu calories, protein, carbs va fat truoc khi xem phan tich AI."
              primaryAction={{
                label: 'Thiet lap ngay',
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
              title="AI tam offline"
              description="Ung dung van an toan va ban co the thu lai sau. Cac tinh nang co AI se quay lai khi backend AI san sang."
              primaryAction={{
                label: t('nutrition_insights.retry'),
                onPress: loadData,
              }}
              secondaryAction={{
                label: 'Mo cai dat muc tieu',
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
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        {notice && (
          <View style={styles.noticeCard}>
            <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.warning} />
            <ThemedText variant="bodySmall" style={{ flex: 1 }}>
              {notice}
            </ThemedText>
          </View>
        )}

        {insights && (
          <>
            <Animated.View entering={FadeInDown.delay(100)} style={styles.headerCard}>
              <View style={styles.scoreContainer}>
                <ScoreGauge score={insights.adherenceScore} color={theme.colors.primary} />
              </View>
              <View style={styles.trendContainer}>
                <ThemedText variant="h3" style={{ marginBottom: 4 }}>
                  {t('nutrition_insights.adherence_score')}
                </ThemedText>
                <ThemedText
                  variant="bodySmall"
                  color="textSecondary"
                  style={{ marginBottom: 8 }}
                >
                  {t('nutrition_insights.adherence_desc')}
                </ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                        ? theme.colors.success
                        : insights.progressTrend === 'declining'
                          ? theme.colors.danger
                          : theme.colors.warning
                    }
                  />
                  <ThemedText variant="body" style={{ marginLeft: 6, fontWeight: '600' }}>
                    {insights.progressTrend === 'improving'
                      ? t('nutrition_insights.trend_improving')
                      : insights.progressTrend === 'declining'
                        ? t('nutrition_insights.trend_declining')
                        : t('nutrition_insights.trend_stable')}
                  </ThemedText>
                </View>
              </View>
            </Animated.View>

            <ThemedText variant="h3" style={styles.sectionTitle}>
              {t('nutrition_insights.recommendations_title')}
            </ThemedText>
            {insights.recommendations.length > 0 ? (
              insights.recommendations.map(renderRecommendation)
            ) : (
              <View style={styles.card}>
                <View style={{ alignItems: 'center', padding: theme.spacing.md }}>
                  <Ionicons
                    name="trophy-outline"
                    size={40}
                    color={theme.colors.warning}
                  />
                  <ThemedText
                    variant="body"
                    style={{ marginTop: 8, textAlign: 'center' }}
                  >
                    {t('nutrition_insights.no_recommendations')}
                  </ThemedText>
                </View>
              </View>
            )}

            {insights.mealTimingInsight && (
              <>
                <ThemedText variant="h3" style={styles.sectionTitle}>
                  {t('nutrition_insights.meal_timing_title')}
                </ThemedText>
                <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={24}
                      color={theme.colors.info}
                      style={{ marginRight: 8 }}
                    />
                    <ThemedText variant="h4">
                      {t('nutrition_insights.meal_timing_title')}
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" style={{ marginBottom: 8 }}>
                    {t('nutrition_insights.meal_timing_avg')}:{' '}
                    <ThemedText weight="700">
                      {insights.mealTimingInsight.averageMealsPerDay.toFixed(1)}{' '}
                      {t('nutrition_insights.meals_per_day')}
                    </ThemedText>
                  </ThemedText>
                  {insights.mealTimingInsight.insights.map((insight, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', marginTop: 4 }}>
                      <ThemedText color="textSecondary" style={{ marginRight: 6 }}>
                        {'-'}
                      </ThemedText>
                      <ThemedText
                        variant="bodySmall"
                        color="textSecondary"
                        style={{ flex: 1 }}
                      >
                        {translateToVietnamese(insight)}
                      </ThemedText>
                    </View>
                  ))}
                </Animated.View>
              </>
            )}
          </>
        )}

        {adaptiveTarget && adaptiveTarget.confidenceScore > 50 && (
          <>
            <ThemedText variant="h3" style={styles.sectionTitle}>
              {t('nutrition_insights.adaptive_title')}
            </ThemedText>
            <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
              >
                <Ionicons
                  name="analytics"
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginRight: 8 }}
                />
                <ThemedText variant="h4">
                  {t('nutrition_insights.ai_suggestion')}
                </ThemedText>
              </View>

              <View style={styles.targetComparison}>
                <View style={styles.targetCol}>
                  <ThemedText
                    variant="caption"
                    color="textSecondary"
                    style={{ marginBottom: 4 }}
                  >
                    {t('nutrition_insights.current')}
                  </ThemedText>
                  <ThemedText variant="h2">
                    {adaptiveTarget.currentTarget.targetCalories}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    kcal
                  </ThemedText>
                </View>
                <View style={{ justifyContent: 'center' }}>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={32}
                    color={theme.colors.primary}
                  />
                </View>
                <View
                  style={[
                    styles.targetCol,
                    {
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.colors.primaryLight,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    color="primary"
                    style={{ marginBottom: 4, fontWeight: 'bold' }}
                  >
                    {t('nutrition_insights.suggested')}
                  </ThemedText>
                  <ThemedText variant="h2" color="primary">
                    {adaptiveTarget.suggestedTarget.targetCalories}
                  </ThemedText>
                  <ThemedText variant="caption" color="primary">
                    kcal
                  </ThemedText>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <ThemedText variant="bodySmall" style={{ fontStyle: 'italic' }}>
                  "
                  {adaptiveTarget.adjustmentReasons
                    .map((reason) => translateToVietnamese(reason))
                    .join('. ')}
                  "
                </ThemedText>
              </View>

              <Button
                title={`${t('nutrition_insights.apply_change')} (${t('nutrition_insights.confidence')}: ${Math.round(adaptiveTarget.confidenceScore)}%)`}
                onPress={applyAdaptiveTarget}
                loading={applying}
                variant="primary"
              />
            </Animated.View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default NutritionInsightsScreen;
