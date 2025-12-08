import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  VictoryBar,
  VictoryChart,
  VictoryTheme,
  VictoryTooltip,
  VictoryAxis,
  VictoryStack,
} from 'victory-native';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import Icon from '../../../components/Icon';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useStatsStore } from '../../../store/useStatsStore';
import { handleApiError } from '../../../utils/errorHandler';
import { StatsSkeleton } from '../../../components/skeletons/StatsSkeleton';
import { MacroPieChart } from '../../../components/charts/MacroPieChart';
import { glassStyles } from '../../../components/ui/GlassCard';
import { t } from '../../../i18n/vi';
import { LinearGradient } from 'expo-linear-gradient';


const formatWeekRange = (dateStr: string): string => {
  const start = new Date(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('vi-VN', formatOptions)} - ${end.toLocaleDateString('vi-VN', formatOptions)}`;
};

const isCurrentWeek = (dateStr: string): boolean => {
  const today = new Date();
  const startOfWeek = new Date(dateStr);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  return today >= startOfWeek && today <= endOfWeek;
};

const WeekStatsScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const styles = StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },
    loadingBox: {
      paddingVertical: theme.spacing.xl,
      alignItems: 'center',
    },
    summaryRow: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
      marginTop: theme.spacing.lg,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: isDark ? 'rgba(60, 60, 80, 0.6)' : 'rgba(255, 255, 255, 0.8)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    weekNavigation: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: isDark ? 'rgba(40, 40, 60, 0.7)' : 'rgba(255, 255, 255, 0.9)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      marginBottom: theme.spacing.lg,
    },
    navButton: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.button,
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
  });

  const weekSummary = useStatsStore((state) => state.weekSummary);
  const selectedDate = useStatsStore((state) => state.selectedDate);
  const isLoading = useStatsStore((state) => state.isLoading);
  const fetchWeekSummary = useStatsStore((state) => state.fetchWeekSummary);
  const refreshWeekSummary = useStatsStore((state) => state.refreshWeekSummary);
  const goToPreviousWeek = useCallback(() => {
    try {
      useStatsStore.getState().goToPreviousWeek();
    } catch (err) {
      if (__DEV__) {
        console.error('Error navigating to previous week:', err);
      }
    }
  }, []);

  const goToNextWeek = useCallback(() => {
    try {
      useStatsStore.getState().goToNextWeek();
    } catch (err) {
      if (__DEV__) {
        console.error('Error navigating to next week:', err);
      }
    }
  }, []);

  const error = useStatsStore((state) => state.error);

  // Animation states
  const [highlightedCard, setHighlightedCard] = useState<number | null>(null);
  const cardScale = useSharedValue(1);

  const isFutureWeek = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startOfWeek > today;
  }, [selectedDate]);

  useEffect(() => {
    fetchWeekSummary().catch(handleApiError);
  }, [fetchWeekSummary]);

  useEffect(() => {
    if (error) {
      handleApiError(error);
    }
  }, [error]);

  const handleRefresh = useCallback(() => {
    refreshWeekSummary().catch(handleApiError);
  }, [refreshWeekSummary]);

  const handleCardPress = useCallback(
    (index: number) => {
      setHighlightedCard(highlightedCard === index ? null : index);
      cardScale.value = withSpring(highlightedCard === index ? 1 : 1.02, {
        damping: 15,
        stiffness: 300,
      });
    },
    [highlightedCard, cardScale],
  );

  // Animated styles for summary cards - moved to top level to follow React Hook rules
  const card0AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: highlightedCard === 0 ? cardScale.value : 1 }],
  }));

  const card1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: highlightedCard === 1 ? cardScale.value : 1 }],
  }));

  const card2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: highlightedCard === 2 ? cardScale.value : 1 }],
  }));

  const chartData = useMemo(() => {
    return (weekSummary?.days ?? []).map((day) => ({
      x: new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' }),
      y: day.calories,
      target: day.targetCalories ?? undefined,
    }));
  }, [weekSummary]);

  const targetLine = useMemo(() => {
    return chartData
      .filter((day) => typeof day.target === 'number')
      .map((day) => ({ x: day.x, y: day.target as number }));
  }, [chartData]);

  if (isLoading && !weekSummary) {
    return <StatsSkeleton />;
  }

  // Kiểm tra trường hợp không có dữ liệu
  const hasNoData = !weekSummary || !weekSummary.days || weekSummary.days.length === 0;

  return (
    <Screen
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <ScreenHeader title={t('stats.weekTitle')} subtitle={t('stats.weekSubtitle')} />

      {/* Week Navigation */}
      <View style={styles.weekNavigation}>
        <Pressable
          onPress={goToPreviousWeek}
          style={styles.navButton}
          disabled={isLoading}
          accessibilityLabel={t('stats.previousWeek')}
        >
          <Icon name="chevron-back" size="md" color="primary" />
        </Pressable>

        <View style={{ alignItems: 'center' }}>
          <ThemedText variant="h4" weight="600">
            {formatWeekRange(selectedDate)}
          </ThemedText>
          {isCurrentWeek(selectedDate) && (
            <ThemedText variant="caption" color="primary">{t('stats.thisWeek')}</ThemedText>
          )}
        </View>

        <Pressable
          onPress={goToNextWeek}
          style={[styles.navButton, isFutureWeek && styles.navButtonDisabled]}
          disabled={isLoading || isFutureWeek}
          accessibilityLabel={t('stats.nextWeek')}
        >
          <Icon name="chevron-forward" size="md" color={isFutureWeek ? 'textSecondary' : 'primary'} />
        </Pressable>
      </View>

      <AppCard>
        <SectionHeader
          title={t('stats.weekTitle')}
          subtitle={t('stats.calorieComparison')}
        />

        {isLoading && !weekSummary ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <ThemedText
              variant="body"
              color="textSecondary"
              style={{ marginTop: theme.spacing.md }}
            >
              {t('stats.loading')}
            </ThemedText>
          </View>
        ) : hasNoData ? (
          <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }}>
            <ThemedText variant="h4" color="textSecondary">📊</ThemedText>
            <ThemedText
              variant="body"
              color="textSecondary"
              style={{ textAlign: 'center' }}
            >
              {t('stats.noData')}
            </ThemedText>
            <ThemedText
              variant="caption"
              color="textSecondary"
              style={{ textAlign: 'center' }}
            >
              {t('stats.addFoodPrompt')}
            </ThemedText>
          </View>
        ) : (
          <VictoryChart
            height={220}
            theme={VictoryTheme.material}
            padding={{ top: 20, bottom: 40, left: 45, right: 15 }}
            domainPadding={{ x: 20, y: [0, 10] }}
            style={{ background: { fill: 'transparent' } }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: {
                  fill: theme.colors.textSecondary,
                  fontSize: 10,
                  fontWeight: '500',
                },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: theme.colors.textSecondary, fontSize: 9 },
                grid: { stroke: 'transparent' },
              }}
            />

            {/* Stack để 2 bars cùng vị trí */}
            <VictoryStack>
              {/* Data bars - Xanh lá (vẽ trước, ở dưới) */}
              <VictoryBar
                data={chartData}
                x="x"
                y="y"
                cornerRadius={{ top: 6 }}
                barWidth={22}
                style={{
                  data: {
                    fill: '#4ade80',
                  },
                }}
                labels={({ datum }) => `${datum.y}`}
                labelComponent={
                  <VictoryTooltip
                    renderInPortal={false}
                    style={{ fontSize: 10, fill: '#fff', fontWeight: '700' }}
                    flyoutStyle={{
                      fill: '#22c55e',
                      stroke: 'transparent',
                    }}
                    cornerRadius={5}
                    pointerLength={4}
                  />
                }
              />
              {/* Phần còn lại - Xám (vẽ sau, ở trên) */}
              <VictoryBar
                data={chartData.map((d: any) => {
                  const maxVal = Math.max(...chartData.map((item: any) => item.y)) * 1.15;
                  return { x: d.x, y: Math.max(0, maxVal - d.y) };
                })}
                x="x"
                y="y"
                cornerRadius={{ top: 6 }}
                barWidth={22}
                style={{
                  data: {
                    fill: isDark ? 'rgba(55, 65, 60, 0.7)' : 'rgba(180, 190, 185, 0.5)',
                  },
                }}
              />
            </VictoryStack>
          </VictoryChart>
        )}

        {weekSummary && weekSummary.days.length > 0 && (
          <View style={styles.summaryRow}>
            {/* Average per day card - Blue gradient */}
            <Animated.View
              style={[{ flex: 1, borderRadius: 20, overflow: 'hidden' }, card0AnimatedStyle]}
              entering={FadeInUp.delay(200).duration(400).springify()}
            >
              <Pressable onPress={() => handleCardPress(0)}>
                <LinearGradient
                  colors={isDark ? ['#1e3a5f', '#2c5282'] : ['#ebf8ff', '#bee3f8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: theme.spacing.md,
                    alignItems: 'center',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(66, 153, 225, 0.3)' : 'rgba(66, 153, 225, 0.2)',
                  }}
                >
                  <ThemedText style={{ fontSize: 24, marginBottom: 4 }}>📊</ThemedText>
                  <ThemedText variant="caption" color="textSecondary" weight="600">
                    {t('stats.averagePerDay')}
                  </ThemedText>
                  <ThemedText variant="h3" weight="700" style={{ color: isDark ? '#63b3ed' : '#2b6cb0' }}>
                    {Math.round(
                      weekSummary.days.reduce((sum, day) => sum + day.calories, 0) /
                      weekSummary.days.length,
                    )}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">kcal</ThemedText>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Total week card - Purple gradient */}
            <Animated.View
              style={[{ flex: 1, borderRadius: 20, overflow: 'hidden' }, card1AnimatedStyle]}
              entering={FadeInUp.delay(300).duration(400).springify()}
            >
              <Pressable onPress={() => handleCardPress(1)}>
                <LinearGradient
                  colors={isDark ? ['#44337a', '#553c9a'] : ['#faf5ff', '#e9d8fd']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: theme.spacing.md,
                    alignItems: 'center',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(159, 122, 234, 0.3)' : 'rgba(159, 122, 234, 0.2)',
                  }}
                >
                  <ThemedText style={{ fontSize: 24, marginBottom: 4 }}>🔥</ThemedText>
                  <ThemedText variant="caption" color="textSecondary" weight="600">
                    {t('stats.totalWeek')}
                  </ThemedText>
                  <ThemedText variant="h3" weight="700" style={{ color: isDark ? '#b794f4' : '#6b46c1' }}>
                    {Math.round(weekSummary.days.reduce((sum, day) => sum + day.calories, 0) / 1000 * 10) / 10}k
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">kcal</ThemedText>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Target achieved card - Green gradient */}
            <Animated.View
              style={[{ flex: 1, borderRadius: 20, overflow: 'hidden' }, card2AnimatedStyle]}
              entering={FadeInUp.delay(400).duration(400).springify()}
            >
              <Pressable onPress={() => handleCardPress(2)}>
                <LinearGradient
                  colors={isDark ? ['#22543d', '#276749'] : ['#f0fff4', '#c6f6d5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: theme.spacing.md,
                    alignItems: 'center',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(72, 187, 120, 0.3)' : 'rgba(72, 187, 120, 0.2)',
                  }}
                >
                  <ThemedText style={{ fontSize: 24, marginBottom: 4 }}>🎯</ThemedText>
                  <ThemedText variant="caption" color="textSecondary" weight="600">
                    {t('stats.targetAchieved')}
                  </ThemedText>
                  <ThemedText variant="h3" weight="700" style={{ color: isDark ? '#68d391' : '#276749' }}>
                    {weekSummary.days.filter(
                      (day) => day.targetCalories && day.calories >= day.targetCalories,
                    ).length}/{weekSummary.days.length}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">ngày</ThemedText>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        )}

      </AppCard>


      {weekSummary && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <MacroPieChart
            protein={weekSummary.totalProtein || 0}
            carbs={weekSummary.totalCarbs || 0}
            fat={weekSummary.totalFat || 0}
          />
        </View>
      )}
    </Screen>
  );
};

export default WeekStatsScreen;
