import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { SlideInRight, SlideInLeft } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

import Screen from '../../../components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { AppCard } from '../../../components/ui/AppCard';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import {
  StatsHeroCard,
  TabSwitcher,
  TrendChart,
  CalendarHeatmap,
  SimpleAnimatedCounter,
} from '../../../components/stats';
import { summaryService } from '../../../services/summaryService';
import { useStatsStore } from '../../../store/useStatsStore';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { handleApiError } from '../../../utils/errorHandler';
import { StatsSkeleton } from '../../../components/skeletons/StatsSkeleton';
import { MacroPieChart } from '../../../components/charts/MacroPieChart';

type TabOption = 'today' | 'week' | 'month';

interface DayData {
  date: string;
  calories: number;
  targetCalories?: number;
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

/**
 * StatsScreen - Unified stats screen với tabs
 * 2026 UI/UX: Scrollytelling, Hero metrics, Liquid glass, Micro-interactions
 */
const StatsScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabOption>('today');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Data states
  const weekSummary = useStatsStore((state) => state.weekSummary);
  const isLoadingWeek = useStatsStore((state) => state.isLoading);
  const fetchWeekSummary = useStatsStore((state) => state.fetchWeekSummary);

  // Get data from diary summary (same source as HomeScreen)
  const summary = useDiaryStore((state) => state.summary);
  const fetchSummary = useDiaryStore((state) => state.fetchSummary);

  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [currentMonth] = useState(() => new Date());

  // Fetch data on mount - both week summary and diary summary for today tab
  useEffect(() => {
    fetchWeekSummary();
    fetchSummary(); // Đồng bộ với HomeScreen
  }, []);

  // Fetch month data when tab changes to month
  useEffect(() => {
    if (activeTab === 'month' && !monthData) {
      fetchMonthData();
    }
  }, [activeTab]);

  const fetchMonthData = useCallback(async () => {
    setIsLoadingMonth(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]!;
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]!;

      const result = await summaryService.getNutritionSummary(startDate, endDate);

      const days: DayData[] = Object.entries(result.dailyCalories || {}).map(
        ([date, calories]) => ({
          date,
          calories: Number(calories) || 0,
        }),
      );

      const daysLogged = days.filter((d) => d.calories > 0).length;
      setMonthData({
        days,
        totalCalories: result.totalCalories || 0,
        totalProtein: result.totalProtein || 0,
        totalCarbs: result.totalCarbs || 0,
        totalFat: result.totalFat || 0,
        averageCalories: daysLogged > 0 ? (result.totalCalories || 0) / daysLogged : 0,
        daysLogged,
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsLoadingMonth(false);
    }
  }, [currentMonth]);

  // Handle tab change with animation direction
  const handleTabChange = (newTab: TabOption) => {
    const tabOrder: TabOption[] = ['today', 'week', 'month'];
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);
    setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
    setActiveTab(newTab);
  };

  // Today's data from week summary
  const todayData = useMemo(() => {
    if (!weekSummary?.days) return null;
    const today = new Date().toISOString().split('T')[0];
    return weekSummary.days.find((d) => d.date === today);
  }, [weekSummary]);
  const hasTargetCalories =
    typeof summary?.targetCalories === 'number' && summary.targetCalories > 0;

  // Handle refresh
  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'week' || activeTab === 'today') {
      fetchWeekSummary();
    } else {
      fetchMonthData();
    }
  };

  // Navigate to day detail
  const handleDayPress = (date: string, _calories?: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('MealDiary', { selectedDate: date });
  };

  const styles = StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.lg,
    },
    tabContainer: {
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    sectionTitle: {
      marginBottom: theme.spacing.sm,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    summaryCard: {
      flex: 1,
      padding: theme.spacing.md,
      // Solid colors để fix 2 màu trên Android
      backgroundColor: isDark ? '#1A2744' : '#EEF4FF',
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#2A3F68' : '#D0E4FF',
    },
  });

  const isLoading = activeTab === 'month' ? isLoadingMonth : isLoadingWeek;

  if (isLoading && !weekSummary && !monthData) {
    return <StatsSkeleton />;
  }

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Fixed Custom Header - matching ProfileScreen */}
      <View
        style={{ alignItems: 'center', paddingTop: 70, paddingBottom: theme.spacing.lg }}
      >
        <ThemedText variant="h2" weight="700">
          Thống kê
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary">
          Theo dõi tiến độ dinh dưỡng
        </ThemedText>
      </View>

      {/* Fixed Tab Switcher - with header */}
      <View style={styles.tabContainer}>
        <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      </View>

      <Screen
        contentContainerStyle={[styles.content, { paddingTop: theme.spacing.md }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Today View */}
        {activeTab === 'today' && weekSummary && (
          <Animated.View
            key="today"
            entering={
              slideDirection === 'right'
                ? SlideInRight.springify()
                : SlideInLeft.springify()
            }
          >
            {/* Hero Card - only on Today tab */}
            {/* Sử dụng summary từ useDiaryStore để đồng bộ với HomeScreen */}
            <StatsHeroCard
              value={summary?.totalCalories || 0}
              target={hasTargetCalories ? (summary?.targetCalories ?? null) : null}
              targetStatus={
                summary ? (hasTargetCalories ? 'loaded' : 'missing') : 'loading'
              }
              unit="kcal"
              label="Hôm nay"
            />

            {/* Macro Chart without title */}
            {todayData?.calories ? (
              <View style={{ marginTop: theme.spacing.lg }}>
                <MacroPieChart
                  protein={summary?.protein || 0}
                  carbs={summary?.carbs || 0}
                  fat={summary?.fat || 0}
                />
              </View>
            ) : null}
          </Animated.View>
        )}

        {/* Week View */}
        {activeTab === 'week' && weekSummary && (
          <Animated.View
            key="week"
            entering={
              slideDirection === 'right'
                ? SlideInRight.springify()
                : SlideInLeft.springify()
            }
          >
            {/* Trend Chart */}
            <AppCard>
              <ThemedText variant="h4" weight="700" style={styles.sectionTitle}>
                Tuần này
              </ThemedText>
              <TrendChart
                data={weekSummary.days.map((d) => ({
                  date: d.date,
                  calories: d.calories,
                  targetCalories: d.targetCalories ?? undefined,
                }))}
                highlightBest
                onBarPress={(day) => handleDayPress(day.date)}
              />
            </AppCard>

            {/* Summary Stats */}
            <View style={[styles.summaryRow, { marginTop: theme.spacing.lg }]}>
              <View style={styles.summaryCard}>
                <ThemedText style={{ fontSize: 24 }}>📊</ThemedText>
                <SimpleAnimatedCounter
                  value={Math.round(
                    weekSummary.days.reduce((sum, d) => sum + d.calories, 0) /
                      Math.max(weekSummary.days.filter((d) => d.calories > 0).length, 1),
                  )}
                  variant="h4"
                  weight="700"
                  suffix=" kcal"
                />
                <ThemedText variant="caption" color="textSecondary">
                  TB/ngày
                </ThemedText>
              </View>

              <View style={styles.summaryCard}>
                <ThemedText style={{ fontSize: 24 }}>🔥</ThemedText>
                <SimpleAnimatedCounter
                  value={weekSummary.totalCalories}
                  variant="h4"
                  weight="700"
                  suffix=" kcal"
                />
                <ThemedText variant="caption" color="textSecondary">
                  Tổng tuần
                </ThemedText>
              </View>
            </View>

            {/* Macro Chart */}
            <View style={{ marginTop: theme.spacing.lg }}>
              <MacroPieChart
                protein={weekSummary.totalProtein}
                carbs={weekSummary.totalCarbs}
                fat={weekSummary.totalFat}
              />
            </View>
          </Animated.View>
        )}

        {/* Month View */}
        {activeTab === 'month' && (
          <Animated.View
            key="month"
            entering={
              slideDirection === 'right'
                ? SlideInRight.springify()
                : SlideInLeft.springify()
            }
          >
            <AppCard>
              <ThemedText variant="h4" weight="700" style={styles.sectionTitle}>
                {`Tháng ${currentMonth.getMonth() + 1} năm ${currentMonth.getFullYear()}`}
              </ThemedText>

              {monthData ? (
                <>
                  <CalendarHeatmap
                    year={currentMonth.getFullYear()}
                    month={currentMonth.getMonth()}
                    data={monthData.days}
                    onDayPress={handleDayPress}
                  />

                  {/* Month Summary */}
                  <View style={[styles.summaryRow, { marginTop: theme.spacing.md }]}>
                    <View style={styles.summaryCard}>
                      <ThemedText style={{ fontSize: 20 }}>🔥</ThemedText>
                      <SimpleAnimatedCounter
                        value={Math.round(monthData.totalCalories / 1000)}
                        variant="h4"
                        weight="700"
                        suffix="k"
                      />
                      <ThemedText variant="caption" color="textSecondary">
                        Tổng kcal
                      </ThemedText>
                    </View>

                    <View style={styles.summaryCard}>
                      <ThemedText style={{ fontSize: 20 }}>📅</ThemedText>
                      <SimpleAnimatedCounter
                        value={monthData.daysLogged}
                        variant="h4"
                        weight="700"
                      />
                      <ThemedText variant="caption" color="textSecondary">
                        Ngày HĐ
                      </ThemedText>
                    </View>

                    <View style={styles.summaryCard}>
                      <ThemedText style={{ fontSize: 20 }}>📊</ThemedText>
                      <SimpleAnimatedCounter
                        value={Math.round(monthData.averageCalories)}
                        variant="h4"
                        weight="700"
                        suffix=" kcal"
                      />
                      <ThemedText variant="caption" color="textSecondary">
                        TB/ngày
                      </ThemedText>
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 48, marginBottom: theme.spacing.md }}>
                    📊
                  </ThemedText>
                  <ThemedText variant="body" color="textSecondary">
                    Đang tải dữ liệu tháng...
                  </ThemedText>
                </View>
              )}
            </AppCard>

            {/* Macro for month */}
            {monthData && monthData.daysLogged > 0 && (
              <View style={{ marginTop: theme.spacing.lg }}>
                <MacroPieChart
                  protein={monthData.totalProtein}
                  carbs={monthData.totalCarbs}
                  fat={monthData.totalFat}
                />
              </View>
            )}
          </Animated.View>
        )}
      </Screen>
    </LinearGradient>
  );
};

export default StatsScreen;
