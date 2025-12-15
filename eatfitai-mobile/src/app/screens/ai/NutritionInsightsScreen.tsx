import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ThemedText } from '../../../components/ThemedText';
import Button from '../../../components/Button';
import { AppCard } from '../../../components/ui/AppCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
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
        <ThemedText variant="h2" style={{ color: color, fontSize: 32, lineHeight: 36 }}>
          {Math.round(score)}
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary">
          /100
        </ThemedText>
      </View>
    </View>
  );
};

const NutritionInsightsScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();

  const [insights, setInsights] = useState<NutritionInsight | null>(null);
  const [adaptiveTarget, setAdaptiveTarget] = useState<AdaptiveTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [insightsData, adaptiveData] = await Promise.all([
        aiService.getNutritionInsights({ analysisDays: 30 }),
        aiService.getAdaptiveTarget({ analysisDays: 14 }),
      ]);
      setInsights(insightsData);
      setAdaptiveTarget(adaptiveData);
    } catch (err: any) {
      setError(err?.message || t('nutrition_insights.error_title'));
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
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
    },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      ...theme.shadows.sm,
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
      marginBottom: theme.spacing.md,
      borderLeftWidth: 4,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      ...theme.shadows.sm,
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
      backgroundColor: theme.colors.background,
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
    progressBarBg: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 4,
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
      <Screen style={styles.container}>
        <ScreenHeader
          title={t('nutrition_insights.title')}
          subtitle={t('nutrition_insights.loading')}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    // Kiểm tra nếu lỗi liên quan đến thiếu NutritionTarget
    const isNoTargetError =
      error.toLowerCase().includes('nutrition target') ||
      error.toLowerCase().includes('no active');

    return (
      <Screen style={styles.container}>
        <ScreenHeader
          title={t('nutrition_insights.title')}
          subtitle={t('nutrition_insights.error_title')}
        />
        <View style={styles.center}>
          <Ionicons
            name={isNoTargetError ? 'nutrition-outline' : 'alert-circle-outline'}
            size={64}
            color={theme.colors.warning}
            style={{ marginBottom: theme.spacing.md }}
          />
          <ThemedText
            variant="h4"
            style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}
          >
            {isNoTargetError
              ? 'Chưa thiết lập mục tiêu dinh dưỡng'
              : t('nutrition_insights.error_title')}
          </ThemedText>
          <ThemedText
            color="textSecondary"
            style={{
              textAlign: 'center',
              marginBottom: theme.spacing.lg,
              paddingHorizontal: 24,
            }}
          >
            {isNoTargetError
              ? 'Bạn cần thiết lập mục tiêu calories, protein, carbs và fat trước khi xem phân tích AI.'
              : error}
          </ThemedText>
          <View style={{ gap: theme.spacing.sm, width: '80%' }}>
            {isNoTargetError ? (
              <Button
                title="Thiết lập mục tiêu ngay"
                onPress={() => navigation.navigate('NutritionSettings' as any)}
                variant="primary"
              />
            ) : (
              <Button
                title={t('nutrition_insights.retry')}
                onPress={loadData}
                variant="secondary"
              />
            )}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container} scroll={false}>
      <ScreenHeader
        title={t('nutrition_insights.title')}
        subtitle={t('nutrition_insights.subtitle')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {insights && (
          <>
            <View style={styles.headerCard}>
              <View style={styles.scoreContainer}>
                <ScoreGauge
                  score={insights.adherenceScore}
                  color={theme.colors.primary}
                />
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
            </View>

            <ThemedText variant="h3" style={styles.sectionTitle}>
              {t('nutrition_insights.recommendations_title')}
            </ThemedText>
            {insights.recommendations.length > 0 ? (
              insights.recommendations.map(renderRecommendation)
            ) : (
              <AppCard>
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
              </AppCard>
            )}

            {insights.mealTimingInsight && (
              <>
                <ThemedText variant="h3" style={styles.sectionTitle}>
                  {t('nutrition_insights.meal_timing_title')}
                </ThemedText>
                <AppCard>
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
                        •
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
                </AppCard>
              </>
            )}
          </>
        )}

        {adaptiveTarget && adaptiveTarget.confidenceScore > 50 && (
          <>
            <ThemedText variant="h3" style={styles.sectionTitle}>
              {t('nutrition_insights.adaptive_title')}
            </ThemedText>
            <AppCard>
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
                  backgroundColor: theme.colors.background,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <ThemedText variant="bodySmall" style={{ fontStyle: 'italic' }}>
                  "
                  {adaptiveTarget.adjustmentReasons
                    .map((r) => translateToVietnamese(r))
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
            </AppCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

export default NutritionInsightsScreen;
