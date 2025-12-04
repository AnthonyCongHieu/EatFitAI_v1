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
  VictoryArea,
  VictoryChart,
  VictoryTheme,
  VictoryTooltip,
  VictoryAxis,
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
      console.error('Error navigating to previous week:', err);
    }
  }, []);

  const goToNextWeek = useCallback(() => {
    try {
      useStatsStore.getState().goToNextWeek();
    } catch (err) {
      console.error('Error navigating to next week:', err);
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
      <ScreenHeader title="Thống kê tuần" subtitle="Xem tiến độ dinh dưỡng theo tuần" />

      {/* Week Navigation */}
      <View style={styles.weekNavigation}>
        <Pressable
          onPress={goToPreviousWeek}
          style={styles.navButton}
          disabled={isLoading}
          accessibilityLabel="Tuần trước"
        >
          <Icon name="chevron-back" size="md" color="primary" />
        </Pressable>

        <View style={{ alignItems: 'center' }}>
          <ThemedText variant="h4" weight="600">
            {formatWeekRange(selectedDate)}
          </ThemedText>
          {isCurrentWeek(selectedDate) && (
            <ThemedText variant="caption" color="primary">Tuần này</ThemedText>
          )}
        </View>

        <Pressable
          onPress={goToNextWeek}
          style={[styles.navButton, isFutureWeek && styles.navButtonDisabled]}
          disabled={isLoading || isFutureWeek}
          accessibilityLabel="Tuần sau"
        >
          <Icon name="chevron-forward" size="md" color={isFutureWeek ? 'textSecondary' : 'primary'} />
        </Pressable>
      </View>

      <AppCard>
        <SectionHeader
          title="Thống kê 7 ngày"
          subtitle="So sánh calo tiêu thụ với mục tiêu hằng ngày"
        />

        {isLoading && !weekSummary ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <ThemedText
              variant="body"
              color="textSecondary"
              style={{ marginTop: theme.spacing.md }}
            >
              Đang tải...
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
              Chưa có dữ liệu cho tuần này
            </ThemedText>
            <ThemedText
              variant="caption"
              color="textSecondary"
              style={{ textAlign: 'center' }}
            >
              Hãy thêm món ăn vào nhật ký để xem thống kê
            </ThemedText>
          </View>
        ) : (
          <VictoryChart
            height={280}
            theme={VictoryTheme.material}
            padding={{ top: 40, bottom: 60, left: 60, right: 32 }}
            domainPadding={{ x: 20, y: [10, 20] }}
            style={{ background: { fill: theme.colors.background } }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: theme.colors.border },
                tickLabels: { fill: theme.colors.textSecondary, fontSize: 12 },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: theme.colors.border },
                tickLabels: { fill: theme.colors.textSecondary, fontSize: 12 },
                grid: {
                  stroke: theme.colors.border,
                  strokeDasharray: '4,4',
                  opacity: 0.4,
                },
              }}
            />
            <VictoryArea
              data={chartData}
              x="x"
              y="y"
              interpolation="monotoneX"
              style={{
                data: {
                  fill: theme.colors.primary,
                  fillOpacity: 0.3,
                  stroke: theme.colors.primary,
                  strokeWidth: 2,
                },
              }}
              labels={({ datum }) => `${datum.y} kcal`}
              labelComponent={
                <VictoryTooltip
                  renderInPortal={false}
                  style={{ fontSize: 12, fill: theme.colors.text }}
                  flyoutStyle={{ fill: theme.colors.card, stroke: theme.colors.border }}
                />
              }
            />
            {targetLine.length > 0 ? (
              <VictoryArea
                data={targetLine}
                x="x"
                y="y"
                interpolation="monotoneX"
                style={{
                  data: {
                    stroke: theme.colors.secondary,
                    strokeDasharray: '6,6',
                    fillOpacity: 0,
                    strokeWidth: 2,
                  },
                }}
                labels={({ datum }) => `Mục tiêu ${datum.y}`}
                labelComponent={
                  <VictoryTooltip
                    renderInPortal={false}
                    style={{ fontSize: 10, fill: theme.colors.text }}
                    flyoutStyle={{ fill: theme.colors.card, stroke: theme.colors.border }}
                  />
                }
              />
            ) : null}
          </VictoryChart>
        )}

        {weekSummary && weekSummary.days.length > 0 && (
          <View style={styles.summaryRow}>
            <Animated.View
              style={[
                styles.summaryItem,
                highlightedCard === 0 && { backgroundColor: theme.colors.primaryLight },
                useAnimatedStyle(() => ({
                  transform: [{ scale: highlightedCard === 0 ? cardScale.value : 1 }],
                })),
              ]}
              entering={FadeInUp.delay(200).duration(400).springify()}
            >
              <Pressable
                onPress={() => handleCardPress(0)}
                style={{ alignItems: 'center' }}
              >
                <ThemedText variant="caption" color="textSecondary" weight="600">
                  Trung bình/ngày
                </ThemedText>
                <ThemedText variant="h4">
                  {Math.round(
                    weekSummary.days.reduce((sum, day) => sum + day.calories, 0) /
                    weekSummary.days.length,
                  )}{' '}
                  kcal
                </ThemedText>
              </Pressable>
            </Animated.View>
            <Animated.View
              style={[
                styles.summaryItem,
                highlightedCard === 1 && { backgroundColor: theme.colors.secondaryLight },
                useAnimatedStyle(() => ({
                  transform: [{ scale: highlightedCard === 1 ? cardScale.value : 1 }],
                })),
              ]}
              entering={FadeInUp.delay(300).duration(400).springify()}
            >
              <Pressable
                onPress={() => handleCardPress(1)}
                style={{ alignItems: 'center' }}
              >
                <ThemedText variant="caption" color="textSecondary" weight="600">
                  Tổng tuần
                </ThemedText>
                <ThemedText variant="h4">
                  {weekSummary.days.reduce((sum, day) => sum + day.calories, 0)} kcal
                </ThemedText>
              </Pressable>
            </Animated.View>
            <Animated.View
              style={[
                styles.summaryItem,
                highlightedCard === 2 && { backgroundColor: theme.colors.success + '20' },
                useAnimatedStyle(() => ({
                  transform: [{ scale: highlightedCard === 2 ? cardScale.value : 1 }],
                })),
              ]}
              entering={FadeInUp.delay(400).duration(400).springify()}
            >
              <Pressable
                onPress={() => handleCardPress(2)}
                style={{ alignItems: 'center' }}
              >
                <ThemedText variant="caption" color="textSecondary" weight="600">
                  Đạt mục tiêu
                </ThemedText>
                <ThemedText variant="h4" color="success">
                  {
                    weekSummary.days.filter(
                      (day) => day.targetCalories && day.calories >= day.targetCalories,
                    ).length
                  }
                  /{weekSummary.days.length} ngày
                </ThemedText>
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
