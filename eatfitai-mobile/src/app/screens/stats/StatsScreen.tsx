import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp, SlideInRight, SlideInLeft } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { AppCard } from '../../../components/ui/AppCard';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import {
    StatsHeroCard,
    TabSwitcher,
    TrendChart,
    CalendarHeatmap,
    InsightBubble,
    SimpleAnimatedCounter,
} from '../../../components/stats';
import { summaryService } from '../../../services/summaryService';
import { useStatsStore } from '../../../store/useStatsStore';
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
    const [activeTab, setActiveTab] = useState<TabOption>('week');
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    // Data states
    const weekSummary = useStatsStore((state) => state.weekSummary);
    const isLoadingWeek = useStatsStore((state) => state.isLoading);
    const fetchWeekSummary = useStatsStore((state) => state.fetchWeekSummary);

    const [monthData, setMonthData] = useState<MonthSummary | null>(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => new Date());

    // Fetch data on mount
    useEffect(() => {
        fetchWeekSummary();
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
                })
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
    const handleDayPress = (date: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('MealDiary', { selectedDate: date });
    };

    // Generate insight based on data
    const getInsight = (): { text: string; trend?: { value: number; isPositive: boolean } } => {
        if (!weekSummary?.days.length) {
            return { text: 'Bắt đầu ghi nhận bữa ăn để xem thống kê!' };
        }

        const avgCalories = weekSummary.days.reduce((sum, d) => sum + d.calories, 0) /
            Math.max(weekSummary.days.filter(d => d.calories > 0).length, 1);

        const target = todayData?.targetCalories || 2000;
        const percentage = Math.round((avgCalories / target) * 100);

        if (percentage >= 90 && percentage <= 110) {
            return {
                text: 'Tuyệt vời! Bạn đang duy trì tốt mục tiêu dinh dưỡng.',
                trend: { value: 5, isPositive: true }
            };
        } else if (percentage < 90) {
            return {
                text: 'Bạn đang ăn ít hơn mục tiêu. Hãy bổ sung thêm bữa phụ!',
                trend: { value: 100 - percentage, isPositive: false }
            };
        } else {
            return {
                text: 'Bạn đang vượt mục tiêu. Cân nhắc điều chỉnh khẩu phần.',
                trend: { value: percentage - 100, isPositive: false }
            };
        }
    };

    const insight = getInsight();

    const styles = StyleSheet.create({
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.lg,
        },
        tabContainer: {
            marginBottom: theme.spacing.sm,
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
            backgroundColor: isDark ? 'rgba(60, 60, 80, 0.6)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: theme.radius.lg,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
        },
    });

    const isLoading = activeTab === 'month' ? isLoadingMonth : isLoadingWeek;

    if (isLoading && !weekSummary && !monthData) {
        return <StatsSkeleton />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScreenHeader title="Thống kê" subtitle="Theo dõi tiến độ dinh dưỡng" />

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
                {/* Hero Card */}
                <StatsHeroCard
                    value={todayData?.calories || 0}
                    target={todayData?.targetCalories || 2000}
                    unit="kcal"
                    label="Hôm nay"
                    insight={insight.text}
                />

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
                </View>

                {/* Today View */}
                {activeTab === 'today' && weekSummary && (
                    <Animated.View
                        key="today"
                        entering={slideDirection === 'right' ? SlideInRight.springify() : SlideInLeft.springify()}
                    >
                        <AppCard>
                            <ThemedText variant="h4" weight="700" style={styles.sectionTitle}>
                                Chi tiết hôm nay
                            </ThemedText>

                            {todayData?.calories ? (
                                <>
                                    {/* Macro breakdown */}
                                    <MacroPieChart
                                        protein={weekSummary.totalProtein / 7}
                                        carbs={weekSummary.totalCarbs / 7}
                                        fat={weekSummary.totalFat / 7}
                                    />
                                </>
                            ) : (
                                <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
                                    <ThemedText style={{ fontSize: 48, marginBottom: theme.spacing.md }}>📝</ThemedText>
                                    <ThemedText variant="body" color="textSecondary">
                                        Chưa có dữ liệu hôm nay
                                    </ThemedText>
                                    <ThemedText variant="caption" color="textSecondary">
                                        Thêm bữa ăn để bắt đầu theo dõi
                                    </ThemedText>
                                </View>
                            )}
                        </AppCard>
                    </Animated.View>
                )}

                {/* Week View */}
                {activeTab === 'week' && weekSummary && (
                    <Animated.View
                        key="week"
                        entering={slideDirection === 'right' ? SlideInRight.springify() : SlideInLeft.springify()}
                    >
                        {/* Insight */}
                        <InsightBubble
                            icon="💡"
                            text={insight.text}
                            type={insight.trend?.isPositive ? 'success' : 'info'}
                            trend={insight.trend}
                        />

                        {/* Trend Chart */}
                        <AppCard style={{ marginTop: theme.spacing.lg }}>
                            <ThemedText variant="h4" weight="700" style={styles.sectionTitle}>
                                Tuần này
                            </ThemedText>
                            <TrendChart
                                data={weekSummary.days.map(d => ({
                                    date: d.date,
                                    calories: d.calories,
                                    targetCalories: d.targetCalories ?? undefined
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
                                        Math.max(weekSummary.days.filter(d => d.calories > 0).length, 1)
                                    )}
                                    variant="h4"
                                    weight="700"
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
                        entering={slideDirection === 'right' ? SlideInRight.springify() : SlideInLeft.springify()}
                    >
                        <AppCard>
                            <ThemedText variant="h4" weight="700" style={styles.sectionTitle}>
                                {currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
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
                                                Ngày log
                                            </ThemedText>
                                        </View>

                                        <View style={styles.summaryCard}>
                                            <ThemedText style={{ fontSize: 20 }}>📊</ThemedText>
                                            <SimpleAnimatedCounter
                                                value={Math.round(monthData.averageCalories)}
                                                variant="h4"
                                                weight="700"
                                            />
                                            <ThemedText variant="caption" color="textSecondary">
                                                TB/ngày
                                            </ThemedText>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
                                    <ThemedText style={{ fontSize: 48, marginBottom: theme.spacing.md }}>📊</ThemedText>
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
        </View>
    );
};

export default StatsScreen;
