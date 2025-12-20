import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  View,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { AppHeader } from '../../../components/ui/AppHeader';
import Icon from '../../../components/Icon';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useStatsStore } from '../../../store/useStatsStore';
import { handleApiError } from '../../../utils/errorHandler';
import { StatsSkeleton } from '../../../components/skeletons/StatsSkeleton';
import { MacroPieChart } from '../../../components/charts/MacroPieChart';
import { glassStyles } from '../../../components/ui/GlassCard';
import { t } from '../../../i18n/vi';

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

const WeekStatsScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      useStatsStore.getState().goToPreviousWeek();
    } catch (err) {
      if (__DEV__) {
        console.error('Error navigating to previous week:', err);
      }
    }
  }, []);

  const goToNextWeek = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      useStatsStore.getState().goToNextWeek();
    } catch (err) {
      if (__DEV__) {
        console.error('Error navigating to next week:', err);
      }
    }
  }, []);

  const error = useStatsStore((state) => state.error);

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

  // Handle date picker change - navigate d?n tu?n ch?a ngày du?c ch?n
  const handleDateChange = useCallback(
    (event: any, date?: Date) => {
      setShowDatePicker(Platform.OS === 'ios'); // iOS gi? picker m?
      if (date) {
        useStatsStore.getState().setSelectedDate(date.toISOString().split('T')[0]!);
      }
    },
    [],
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

  // Ki?m tra tru?ng h?p không có d? li?u
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
      <AppHeader title={t('stats.weekTitle')} subtitle={t('stats.weekSubtitle')} />

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
            <ThemedText variant="caption" color="primary">
              {t('stats.thisWeek')}
            </ThemedText>
          )}
        </View>

        <Pressable
          onPress={goToNextWeek}
          style={[styles.navButton, isFutureWeek && styles.navButtonDisabled]}
          disabled={isLoading || isFutureWeek}
          accessibilityLabel={t('stats.nextWeek')}
        >
          <Icon
            name="chevron-forward"
            size="md"
            color={isFutureWeek ? 'textSecondary' : 'primary'}
          />
        </Pressable>
      </View>

      <AppCard>
        <SectionHeader
          title={t('stats.weekTitle')}
          subtitle={t('stats.calorieComparison')}
        />

        {/* Legend */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.sm,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#4ade80' }} />
            <ThemedText variant="caption" color="textSecondary">Ðã tiêu th?</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: isDark ? 'rgba(55, 65, 60, 0.7)' : 'rgba(180, 190, 185, 0.5)' }} />
            <ThemedText variant="caption" color="textSecondary">Còn l?i</ThemedText>
          </View>
        </View>

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
          <View
            style={{
              paddingVertical: theme.spacing.xl,
              alignItems: 'center',
              gap: theme.spacing.md,
            }}
          >
            <ThemedText variant="h4" color="textSecondary">
              ??
            </ThemedText>
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
            padding={{ top: 20, bottom: 40, left: 45, right: 45 }}
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

            {/* Stack d? 2 bars cùng v? trí */}
            <VictoryStack>
              {/* Data bars - Xanh lá (v? tru?c, ? du?i) */}
              <VictoryBar
                data={chartData}
                x="x"
                y="y"
                cornerRadius={{ top: 6 }}
                barWidth={14}
                style={{
                  data: {
                    fill: theme.colors.chart.bar,
                  },
                }}
                animate={{
                  duration: 600,
                  onLoad: { duration: 400 },
                }}
                labels={({ datum }) => `${datum.y}`}
                labelComponent={
                  <VictoryTooltip
                    renderInPortal={false}
                    style={{ fontSize: 10, fill: '#fff', fontWeight: '700' }}
                    flyoutStyle={{
                      fill: theme.colors.success,
                      stroke: 'transparent',
                    }}
                    cornerRadius={5}
                    pointerLength={4}
                  />
                }
              />
              {/* Ph?n còn l?i - Xám (v? sau, ? trên) */}
              <VictoryBar
                data={chartData.map((d: any) => {
                  const maxVal = Math.max(...chartData.map((item: any) => item.y)) * 1.15;
                  return { x: d.x, y: Math.max(0, maxVal - d.y) };
                })}
                x="x"
                y="y"
                cornerRadius={{ top: 6 }}
                barWidth={14}
                style={{
                  data: {
                    fill: theme.colors.chart.barRemaining,
                  },
                }}
              />
            </VictoryStack>
          </VictoryChart>
        )}

        {/* Compact Summary Cards */}
        {weekSummary && weekSummary.days.length > 0 && (
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }}>
            {/* Average per day */}
            <View style={{
              flex: 1,
              alignItems: 'center',
              padding: theme.spacing.sm,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
              borderRadius: 12,
            }}>
              <ThemedText style={{ fontSize: 16 }}>??</ThemedText>
              <ThemedText
                variant="h4"
                weight="700"
                style={{ color: '#3b82f6', marginTop: 2 }}
              >
                {Math.round(
                  weekSummary.days.reduce((sum, day) => sum + day.calories, 0) /
                  weekSummary.days.length,
                )}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                TB/ngày
              </ThemedText>
            </View>

            {/* Total week */}
            <View style={{
              flex: 1,
              alignItems: 'center',
              padding: theme.spacing.sm,
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
              borderRadius: 12,
            }}>
              <ThemedText style={{ fontSize: 16 }}>??</ThemedText>
              <ThemedText
                variant="h4"
                weight="700"
                style={{ color: '#8b5cf6', marginTop: 2 }}
              >
                {Math.round(
                  weekSummary.days.reduce((sum, day) => sum + day.calories, 0) / 1000 * 10
                ) / 10}k
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                T?ng tu?n
              </ThemedText>
            </View>

            {/* Target achieved */}
            <View style={{
              flex: 1,
              alignItems: 'center',
              padding: theme.spacing.sm,
              backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)',
              borderRadius: 12,
            }}>
              <ThemedText style={{ fontSize: 16 }}>??</ThemedText>
              <ThemedText
                variant="h4"
                weight="700"
                style={{ color: '#22c55e', marginTop: 2 }}
              >
                {weekSummary.days.filter(
                  (day) => day.targetCalories && day.calories >= day.targetCalories * 0.9,
                ).length}/{weekSummary.days.length}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Ð?t m?c tiêu
              </ThemedText>
            </View>
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
