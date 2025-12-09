import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import Icon from '../../../components/Icon';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { summaryService } from '../../../services/summaryService';
import { handleApiError } from '../../../utils/errorHandler';
import { StatsSkeleton } from '../../../components/skeletons/StatsSkeleton';
import { MacroPieChart } from '../../../components/charts/MacroPieChart';
import { t } from '../../../i18n/vi';
import { LinearGradient } from 'expo-linear-gradient';

interface DayData {
  date: string;
  calories: number;
  targetCalories?: number | null;
}

interface MonthSummary {
  days: DayData[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  averageCalories: number;
  daysLogged: number;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const formatMonth = (date: Date): string => {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
};

const getMonthDays = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Add empty days for padding at start
  const startPadding = (firstDay.getDay() + 6) % 7; // Monday = 0
  for (let i = 0; i < startPadding; i++) {
    const d = new Date(year, month, 1 - startPadding + i);
    days.push(d);
  }

  // Add all days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
};

const MonthStatsScreen = (): JSX.Element => {
  const { theme } = useAppTheme();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchMonthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const startStr = startDate.toISOString().split('T')[0]!;
      const endStr = endDate.toISOString().split('T')[0]!;

      const result = await summaryService.getNutritionSummary(startStr, endStr);

      // Transform result into day-by-day data
      const dailyCalories = result.dailyCalories || {};
      const days: DayData[] = Object.entries(dailyCalories).map(([date, calories]) => ({
        date,
        calories: Number(calories) || 0,
      }));

      const daysLogged = days.filter((d) => d.calories > 0).length;
      const totalCalories = result.totalCalories || 0;

      setMonthData({
        days,
        totalCalories,
        totalProtein: result.totalProtein || 0,
        totalCarbs: result.totalCarbs || 0,
        totalFat: result.totalFat || 0,
        averageCalories: daysLogged > 0 ? totalCalories / daysLogged : 0,
        daysLogged,
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(year, month + 1, 1);
    if (nextMonth <= new Date()) {
      setCurrentDate(nextMonth);
    }
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth();
  }, [year, month]);

  const isFutureMonth = useMemo(() => {
    const now = new Date();
    return (
      year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth())
    );
  }, [year, month]);

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  const dayDataMap = useMemo(() => {
    const map: Record<string, DayData> = {};
    monthData?.days.forEach((d) => {
      map[d.date] = d;
    });
    return map;
  }, [monthData]);

  const maxCalories = useMemo(() => {
    if (!monthData?.days.length) return 2000;
    return Math.max(...monthData.days.map((d) => d.calories), 2000);
  }, [monthData]);

  const getHeatmapColor = (calories: number): string => {
    if (calories === 0) return theme.colors.border + '30';
    const intensity = Math.min(calories / maxCalories, 1);
    if (intensity < 0.3) return theme.colors.success + '40';
    if (intensity < 0.6) return theme.colors.success + '70';
    if (intensity < 0.9) return theme.colors.success;
    return theme.colors.warning; // Exceeded
  };

  const renderCalendarCell = (date: Date, index: number) => {
    const dateStr = date.toISOString().split('T')[0]!;
    const isCurrentMonthDay = date.getMonth() === month;
    const dayData = dayDataMap[dateStr];
    const calories = dayData?.calories || 0;

    return (
      <View
        key={index}
        style={[
          styles.calendarCell,
          {
            backgroundColor: isCurrentMonthDay
              ? getHeatmapColor(calories)
              : 'transparent',
            opacity: isCurrentMonthDay ? 1 : 0.3,
          },
        ]}
      >
        <ThemedText
          variant="caption"
          color={calories > 0 ? undefined : 'textSecondary'}
          weight={calories > 0 ? '600' : '400'}
        >
          {date.getDate()}
        </ThemedText>
        {calories > 0 && (
          <ThemedText variant="caption" style={{ fontSize: 8 }}>
            {Math.round(calories / 100)}
          </ThemedText>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    navigation: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      ...theme.shadows.sm,
    },
    navButton: {
      padding: theme.spacing.sm,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calendarCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      gap: 2,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    summaryItem: {
      flex: 1,
      minWidth: '45%',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      alignItems: 'center',
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
  });

  if (isLoading && !monthData) {
    return <StatsSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title={t('stats.monthTitle')} subtitle={t('stats.monthSubtitle')} />

      <Screen
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchMonthData}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Month Navigation */}
        <View style={styles.navigation}>
          <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
            <Icon name="chevron-back" size="md" color="primary" />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <ThemedText variant="h4" weight="600">
              {formatMonth(currentDate)}
            </ThemedText>
            {isCurrentMonth && (
              <ThemedText variant="caption" color="primary">
                {t('stats.thisMonth')}
              </ThemedText>
            )}
          </View>
          <Pressable
            onPress={goToNextMonth}
            style={styles.navButton}
            disabled={isCurrentMonth || isFutureMonth}
          >
            <Icon
              name="chevron-forward"
              size="md"
              color={isCurrentMonth || isFutureMonth ? 'textSecondary' : 'primary'}
            />
          </Pressable>
        </View>

        {/* Calendar Heatmap */}
        <Animated.View entering={FadeInUp.springify()}>
          <AppCard>
            <SectionHeader
              title={t('stats.calendarTitle')}
              subtitle={t('stats.calendarSubtitle')}
            />

            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((day, i) => (
                <View key={i} style={styles.weekdayCell}>
                  <ThemedText variant="caption" color="textSecondary" weight="600">
                    {day}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {monthDays.map((date, index) => renderCalendarCell(date, index))}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: theme.colors.border + '30' },
                  ]}
                />
                <ThemedText variant="caption" color="textSecondary">
                  Chưa log
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: theme.colors.success + '40' },
                  ]}
                />
                <ThemedText variant="caption" color="textSecondary">
                  Ít
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: theme.colors.success }]}
                />
                <ThemedText variant="caption" color="textSecondary">
                  Nhiều
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: theme.colors.warning }]}
                />
                <ThemedText variant="caption" color="textSecondary">
                  Vượt
                </ThemedText>
              </View>
            </View>
          </AppCard>
        </Animated.View>

        {/* Monthly Summary */}
        {monthData && monthData.daysLogged > 0 ? (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <AppCard>
              <SectionHeader title="Tổng kết tháng" />
              <View style={styles.summaryGrid}>
                {/* Total Calories - Blue gradient */}
                <LinearGradient
                  colors={
                    theme.mode === 'dark'
                      ? ['#1e3a5f', '#2c5282']
                      : ['#ebf8ff', '#bee3f8']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    padding: theme.spacing.md,
                    borderRadius: 16,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor:
                      theme.mode === 'dark'
                        ? 'rgba(66, 153, 225, 0.3)'
                        : 'rgba(66, 153, 225, 0.2)',
                  }}
                >
                  <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>🔥</ThemedText>
                  <ThemedText
                    variant="h3"
                    weight="700"
                    style={{ color: theme.mode === 'dark' ? '#63b3ed' : '#2b6cb0' }}
                  >
                    {Math.round((monthData.totalCalories / 1000) * 10) / 10}k
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    Tổng Calories
                  </ThemedText>
                </LinearGradient>

                {/* Average per day - Purple gradient */}
                <LinearGradient
                  colors={
                    theme.mode === 'dark'
                      ? ['#44337a', '#553c9a']
                      : ['#faf5ff', '#e9d8fd']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    padding: theme.spacing.md,
                    borderRadius: 16,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor:
                      theme.mode === 'dark'
                        ? 'rgba(159, 122, 234, 0.3)'
                        : 'rgba(159, 122, 234, 0.2)',
                  }}
                >
                  <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>📊</ThemedText>
                  <ThemedText
                    variant="h3"
                    weight="700"
                    style={{ color: theme.mode === 'dark' ? '#b794f4' : '#6b46c1' }}
                  >
                    {Math.round(monthData.averageCalories)}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    TB/ngày
                  </ThemedText>
                </LinearGradient>

                {/* Days logged - Green gradient */}
                <LinearGradient
                  colors={
                    theme.mode === 'dark'
                      ? ['#22543d', '#276749']
                      : ['#f0fff4', '#c6f6d5']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    padding: theme.spacing.md,
                    borderRadius: 16,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor:
                      theme.mode === 'dark'
                        ? 'rgba(72, 187, 120, 0.3)'
                        : 'rgba(72, 187, 120, 0.2)',
                  }}
                >
                  <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>📅</ThemedText>
                  <ThemedText
                    variant="h3"
                    weight="700"
                    style={{ color: theme.mode === 'dark' ? '#68d391' : '#276749' }}
                  >
                    {monthData.daysLogged}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    Ngày đã log
                  </ThemedText>
                </LinearGradient>

                {/* Protein - Orange gradient */}
                <LinearGradient
                  colors={
                    theme.mode === 'dark'
                      ? ['#744210', '#975a16']
                      : ['#fffaf0', '#feebc8']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    padding: theme.spacing.md,
                    borderRadius: 16,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor:
                      theme.mode === 'dark'
                        ? 'rgba(237, 137, 54, 0.3)'
                        : 'rgba(237, 137, 54, 0.2)',
                  }}
                >
                  <ThemedText style={{ fontSize: 20, marginBottom: 4 }}>💪</ThemedText>
                  <ThemedText
                    variant="h3"
                    weight="700"
                    style={{ color: theme.mode === 'dark' ? '#f6ad55' : '#c05621' }}
                  >
                    {Math.round(monthData.totalProtein)}g
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    Protein
                  </ThemedText>
                </LinearGradient>
              </View>
            </AppCard>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <AppCard>
              <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
                <ThemedText variant="h4" color="textSecondary">
                  📊
                </ThemedText>
                <ThemedText
                  variant="body"
                  color="textSecondary"
                  style={{ textAlign: 'center' }}
                >
                  Chưa có dữ liệu cho tháng này
                </ThemedText>
                <ThemedText
                  variant="caption"
                  color="textSecondary"
                  style={{ textAlign: 'center' }}
                >
                  {t('stats.addFoodPrompt')}
                </ThemedText>
              </View>
            </AppCard>
          </Animated.View>
        )}

        {/* Macro Pie Chart */}
        {monthData && monthData.daysLogged > 0 && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <MacroPieChart
              protein={monthData.totalProtein}
              carbs={monthData.totalCarbs}
              fat={monthData.totalFat}
            />
          </Animated.View>
        )}
      </Screen>
    </View>
  );
};

export default MonthStatsScreen;
