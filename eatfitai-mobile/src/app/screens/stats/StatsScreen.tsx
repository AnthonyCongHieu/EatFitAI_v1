/**
 * StatsScreen — Emerald Nebula 3D unified stats (Ngày / Tuần / Tháng)
 *
 * Sections:
 *  1. Hero card with calorie ring + macro bars (3D tilt via gyroscope)
 *  2. "Phân bổ bữa ăn" – stacked bar + 4-up meal-type breakdown card (3D tilt)
 *  3. Lượng Nước – hydration tracker (3D tilt)
 *  4. Week: bar chart + summary cards
 *  5. Month: calendar heatmap + summary
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../../../components/ThemedText';
import { useStatsStore } from '../../../store/useStatsStore';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { summaryService } from '../../../services/summaryService';
import { handleApiError } from '../../../utils/errorHandler';
import { StatsSkeleton } from '../../../components/skeletons/StatsSkeleton';
import {
  TrendChart,
  CalendarHeatmap,
} from '../../../components/stats';
import Tilt3DCard from '../../../components/ui/Tilt3DCard';
import type { RootStackParamList } from '../../types';
import {
  formatShortWeekdayLabel,
  formatWeekRangeLabel,
} from '../../../utils/dateDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ═══════════════════════════════════════════════
   Emerald Nebula Palette (synced with HomeScreen)
   ═══════════════════════════════════════════════ */
const C = {
  bg: '#0a0e1a',
  surfaceLow: '#111827',
  surface: '#1a1f2f',
  surfaceHigh: '#1e2435',
  surfaceHighest: '#2a2f40',
  surfaceLowest: '#090e1c',
  primary: '#4be277',
  primaryDark: '#22c55e',
  primaryContainer: '#22c55e',
  onPrimary: '#003915',
  onPrimaryContainer: '#004b1e',
  secondary: '#96d59d',
  secondaryFixed: '#b2f2b7',
  tertiary: '#ffb5ab',
  tertiaryContainer: '#ff8b7c',
  tertiaryFixed: '#ffdad5',
  onSurface: '#dee1f7',
  textMuted: '#94a3b8',
  outline: 'rgba(255,255,255,0.06)',
  outlineVariant: 'rgba(61,74,61,0.35)',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  indigo: '#818cf8',
  rose: '#fb7185',
  danger: '#ff6b6b',
};

/* ─── Meal type colors for distribution ─── */
const MEAL_COLORS: Record<number, { color: string; label: string }> = {
  1: { color: C.primary, label: 'BỮA SÁNG' },
  2: { color: C.primaryDark, label: 'BỮA TRƯA' },
  3: { color: C.secondary, label: 'BỮA TỐI' },
  4: { color: C.secondaryFixed, label: 'BỮA PHỤ' },
};

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

/* ─── Date helper (Hanoi UTC+7) ─── */
const formatViDate = (): string => {
  const now = new Date();
  const hanoiNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = hanoiNow.getUTCDate();
  const month = hanoiNow.getUTCMonth() + 1;
  return `Hôm nay, ${day} Thg ${month}`;
};

const cardWidth = SCREEN_WIDTH - 32;

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
const StatsScreen = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  /* ─── Tab ─── */
  const [activeTab, setActiveTab] = useState<TabOption>('today');

  /* ─── Data: Today ─── */
  const summary = useDiaryStore((s) => s.summary);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);

  /* ─── Data: Week ─── */
  const weekSummary = useStatsStore((s) => s.weekSummary);
  const isLoadingWeek = useStatsStore((s) => s.isLoading);
  const fetchWeekSummary = useStatsStore((s) => s.fetchWeekSummary);
  const selectedWeekDate = useStatsStore((s) => s.selectedDate);
  const goToPreviousWeek = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useStatsStore.getState().goToPreviousWeek();
  }, []);
  const goToNextWeek = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useStatsStore.getState().goToNextWeek();
  }, []);

  /* ─── Data: Month ─── */
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [currentMonth] = useState(() => new Date());

  useEffect(() => {
    fetchWeekSummary();
    fetchSummary();
  }, []);

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

  /* ─── Derived data ─── */
  const todayCalories = Number(summary?.totalCalories ?? 0);
  const targetCalories = Number(summary?.targetCalories ?? 2200);
  const protein = Number(summary?.protein ?? 0);
  const carbs = Number(summary?.carbs ?? 0);
  const fat = Number(summary?.fat ?? 0);
  const targetProtein = Number(summary?.targetProtein ?? 120);
  const targetCarbs = Number(summary?.targetCarbs ?? 280);
  const targetFat = Number(summary?.targetFat ?? 60);
  const progress = targetCalories > 0 ? Math.min(1, todayCalories / targetCalories) : 0;

  /* ─── Meal distribution from summary ─── */
  const mealDistribution = useMemo(() => {
    if (!summary?.meals) return [];
    const typeMap: Record<number, number> = {};
    for (const meal of summary.meals) {
      const mealType = meal.mealType ?? 4;
      const cal = meal.entries.reduce((s, e) => s + (e.calories || 0), 0);
      typeMap[mealType] = (typeMap[mealType] || 0) + cal;
    }
    return [1, 2, 3, 4].map((id) => ({
      id,
      calories: Math.round(typeMap[id] || 0),
      ...MEAL_COLORS[id],
    }));
  }, [summary]);

  const totalMealCal = mealDistribution.reduce((s, m) => s + m.calories, 0);

  /* ─── CalorieRing SVG ─── */
  const ringSize = 180;
  const strokeWidth = 12;
  const center = ringSize / 2;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  /* ─── Week chart data ─── */
  const isFutureWeek = useMemo(() => {
    const startOfWeek = new Date(selectedWeekDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startOfWeek > today;
  }, [selectedWeekDate]);

  /* ─── Tab change ─── */
  const handleTabChange = (tab: TabOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  /* ─── Refresh ─── */
  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'today') {
      fetchSummary();
      fetchWeekSummary();
    } else if (activeTab === 'week') {
      fetchWeekSummary();
    } else {
      fetchMonthData();
    }
  }, [activeTab, fetchSummary, fetchWeekSummary, fetchMonthData]);

  const handleDayPress = useCallback(
    (date: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('MealDiary', { selectedDate: date });
    },
    [navigation],
  );

  const isLoading = activeTab === 'month' ? isLoadingMonth : isLoadingWeek;

  if (isLoading && !weekSummary && !monthData && !summary) {
    return <StatsSkeleton />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ══════════ HEADER ══════════ */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <ThemedText style={styles.headerTitle}>{formatViDate()}</ThemedText>
      </Animated.View>

      {/* ══════════ TAB SWITCHER ══════════ */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.tabBar}>
        <View style={styles.tabContainer}>
          {(['today', 'week', 'month'] as TabOption[]).map((tab) => {
            const active = activeTab === tab;
            const label = tab === 'today' ? 'Ngày' : tab === 'week' ? 'Tuần' : 'Tháng';
            return (
              <Pressable
                key={tab}
                onPress={() => handleTabChange(tab)}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <ThemedText
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* ══════════ SCROLLABLE CONTENT ══════════ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
            progressBackgroundColor={C.surfaceHigh}
          />
        }
      >
        {/* ═══════════════════════════════════════
            TODAY TAB
           ═══════════════════════════════════════ */}
        {activeTab === 'today' && (
          <>
            {/* ── Hero Card: Calorie Ring + Macros ── */}
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Tilt3DCard
                width={cardWidth}
                height={320}
                maxTilt={6}
                showReflection={false}
                useDeviceMotion={true}
                activeTouch={false}
              >
                <View style={styles.heroCard}>
                  {/* Metallic sheen overlay */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <View style={styles.heroContent}>
                    {/* Left: Calorie Ring */}
                    <View style={styles.ringSection}>
                      <Svg width={ringSize} height={ringSize}>
                        <Defs>
                          <SvgGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor={C.primary} />
                            <Stop offset="100%" stopColor={C.primaryDark} />
                          </SvgGradient>
                        </Defs>
                        {/* Track */}
                        <Circle
                          cx={center}
                          cy={center}
                          r={radius}
                          stroke={C.surfaceLowest}
                          strokeWidth={strokeWidth}
                          fill="none"
                        />
                        {/* Progress */}
                        <Circle
                          cx={center}
                          cy={center}
                          r={radius}
                          stroke="url(#emeraldGrad)"
                          strokeWidth={strokeWidth}
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          transform={`rotate(-90 ${center} ${center})`}
                        />
                      </Svg>
                      {/* Center text */}
                      <View style={styles.ringCenter}>
                        <ThemedText style={styles.ringValue}>
                          {Math.round(todayCalories).toLocaleString()}
                        </ThemedText>
                        <ThemedText style={styles.ringLabel}>KCAL NẠP</ThemedText>
                      </View>
                    </View>

                    {/* Right: Macro Bars */}
                    <View style={styles.macroSection}>
                      {/* Protein */}
                      <View style={styles.macroGroup}>
                        <View style={styles.macroLabelRow}>
                          <ThemedText style={styles.macroName}>PROTEIN</ThemedText>
                          <ThemedText style={[styles.macroValue, { color: C.primary }]}>
                            {Math.round(protein)}/{targetProtein}g
                          </ThemedText>
                        </View>
                        <View style={styles.macroTrack}>
                          <View
                            style={[
                              styles.macroFill,
                              {
                                width: `${Math.min(100, (protein / Math.max(targetProtein, 1)) * 100)}%`,
                                backgroundColor: C.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Carbs */}
                      <View style={styles.macroGroup}>
                        <View style={styles.macroLabelRow}>
                          <ThemedText style={styles.macroName}>CARBS</ThemedText>
                          <ThemedText style={[styles.macroValue, { color: C.secondary }]}>
                            {Math.round(carbs)}/{targetCarbs}g
                          </ThemedText>
                        </View>
                        <View style={styles.macroTrack}>
                          <View
                            style={[
                              styles.macroFill,
                              {
                                width: `${Math.min(100, (carbs / Math.max(targetCarbs, 1)) * 100)}%`,
                                backgroundColor: C.secondary,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Fat */}
                      <View style={styles.macroGroup}>
                        <View style={styles.macroLabelRow}>
                          <ThemedText style={styles.macroName}>FAT</ThemedText>
                          <ThemedText style={[styles.macroValue, { color: C.tertiaryContainer }]}>
                            {Math.round(fat)}/{targetFat}g
                          </ThemedText>
                        </View>
                        <View style={styles.macroTrack}>
                          <View
                            style={[
                              styles.macroFill,
                              {
                                width: `${Math.min(100, (fat / Math.max(targetFat, 1)) * 100)}%`,
                                backgroundColor: C.tertiaryContainer,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── Phân bổ bữa ăn ── */}
            <Animated.View entering={FadeInUp.delay(250).springify()}>
              <Tilt3DCard
                width={cardWidth}
                height={220}
                maxTilt={5}
                showReflection={false}
                useDeviceMotion={true}
                activeTouch={false}
              >
                <View style={styles.distributionCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Title */}
                  <View style={styles.distTitleRow}>
                    <ThemedText style={styles.distTitle}>Phân bổ bữa ăn</ThemedText>
                    <View style={styles.distDot} />
                  </View>

                  {/* Stacked Bar */}
                  <View style={styles.stackedBarTrack}>
                    {mealDistribution.map((meal) => {
                      const pct = totalMealCal > 0
                        ? (meal.calories / totalMealCal) * 100
                        : 25;
                      return (
                        <View
                          key={meal.id}
                          style={[
                            styles.stackedBarSegment,
                            {
                              width: `${pct}%`,
                              backgroundColor: meal.color,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  {/* 4 meal grid */}
                  <View style={styles.mealGrid}>
                    {mealDistribution.map((meal) => (
                      <View key={meal.id} style={styles.mealGridItem}>
                        <View style={styles.mealDotRow}>
                          <View
                            style={[styles.mealDot, { backgroundColor: meal.color }]}
                          />
                          <ThemedText style={styles.mealLabel}>
                            {meal.label}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.mealCalValue}>
                          {meal.calories} kcal
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── Lượng Nước ── */}
            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <Tilt3DCard
                width={cardWidth}
                height={130}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion={true}
                activeTouch={false}
              >
                <View style={styles.waterCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Header */}
                  <View style={styles.waterHeader}>
                    <View style={styles.waterTitleRow}>
                      <View style={styles.waterIcon}>
                        <Ionicons name="water" size={20} color={C.primary} />
                      </View>
                      <ThemedText style={styles.waterTitle}>LƯỢNG NƯỚC</ThemedText>
                    </View>
                    <View style={styles.waterValueRow}>
                      <ThemedText style={styles.waterValue}>1.25L</ThemedText>
                      <ThemedText style={styles.waterTarget}> / 2.0L</ThemedText>
                    </View>
                  </View>

                  {/* Water drops */}
                  <View style={styles.waterDrops}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons
                        key={`filled-${i}`}
                        name="water"
                        size={28}
                        color={C.primary}
                        style={{ opacity: 0.9 }}
                      />
                    ))}
                    {[6, 7, 8].map((i) => (
                      <Ionicons
                        key={`empty-${i}`}
                        name="water-outline"
                        size={28}
                        color={C.surfaceHighest}
                      />
                    ))}
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>
          </>
        )}

        {/* ═══════════════════════════════════════
            WEEK TAB
           ═══════════════════════════════════════ */}
        {activeTab === 'week' && weekSummary && (
          <>
            {/* Week Navigation */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <View style={styles.weekNav}>
                <Pressable onPress={goToPreviousWeek} style={styles.weekNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={C.primary} />
                </Pressable>
                <View style={{ alignItems: 'center' }}>
                  <ThemedText style={styles.weekNavTitle}>
                    {formatWeekRangeLabel(selectedWeekDate)}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={goToNextWeek}
                  style={[styles.weekNavBtn, isFutureWeek && { opacity: 0.3 }]}
                  disabled={isFutureWeek}
                >
                  <Ionicons name="chevron-forward" size={20} color={C.primary} />
                </Pressable>
              </View>
            </Animated.View>

            {/* ── Week Chart Card ── */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Tilt3DCard
                width={cardWidth}
                height={300}
                maxTilt={5}
                showReflection={false}
                useDeviceMotion={true}
                activeTouch={false}
              >
                <View style={styles.weekChartCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <ThemedText style={styles.sectionTitle}>Tuần này</ThemedText>

                  {/* Simple bar chart */}
                  <View style={styles.barChartRow}>
                    {weekSummary.days.map((day, i) => {
                      const maxCal = Math.max(
                        ...weekSummary.days.map((d) => d.calories),
                        1,
                      );
                      const barHeight = (day.calories / maxCal) * 120;
                      const label = formatShortWeekdayLabel(new Date(day.date));
                      return (
                        <Pressable
                          key={day.date}
                          style={styles.barItem}
                          onPress={() => handleDayPress(day.date)}
                        >
                          <ThemedText style={styles.barValue}>
                            {day.calories > 0 ? Math.round(day.calories) : ''}
                          </ThemedText>
                          <View style={styles.barTrack}>
                            <LinearGradient
                              colors={[C.primary, C.primaryDark]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={[
                                styles.barFill,
                                { height: Math.max(barHeight, 4) },
                              ]}
                            />
                          </View>
                          <ThemedText style={styles.barLabel}>{label}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── Week Summary Cards ── */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <View style={styles.summaryRow}>
                {/* Average */}
                <View style={styles.summaryCard}>
                  <ThemedText style={{ fontSize: 22 }}>📊</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {Math.round(
                      weekSummary.days.reduce((s, d) => s + d.calories, 0) /
                        Math.max(weekSummary.days.filter((d) => d.calories > 0).length, 1),
                    ).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.summaryLabel}>TB/ngày</ThemedText>
                </View>

                {/* Total */}
                <View style={styles.summaryCard}>
                  <ThemedText style={{ fontSize: 22 }}>🔥</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {Math.round(weekSummary.totalCalories).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.summaryLabel}>Tổng tuần</ThemedText>
                </View>

                {/* Goal */}
                <View style={styles.summaryCard}>
                  <ThemedText style={{ fontSize: 22 }}>🎯</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {weekSummary.days.filter(
                      (d) => d.targetCalories && d.calories >= d.targetCalories * 0.9,
                    ).length}
                    /{weekSummary.days.length}
                  </ThemedText>
                  <ThemedText style={styles.summaryLabel}>Đạt mục tiêu</ThemedText>
                </View>
              </View>
            </Animated.View>

            {/* ── Week Macro Distribution ── */}
            <Animated.View entering={FadeInUp.delay(400).springify()}>
              <Tilt3DCard
                width={cardWidth}
                height={180}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion={true}
                activeTouch={false}
              >
                <View style={styles.weekMacroCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ThemedText style={styles.sectionTitle}>Macro tuần</ThemedText>
                  <View style={styles.weekMacroRow}>
                    <View style={styles.weekMacroItem}>
                      <ThemedText style={[styles.weekMacroValue, { color: C.primary }]}>
                        {Math.round(weekSummary.totalProtein)}g
                      </ThemedText>
                      <ThemedText style={styles.weekMacroLabel}>Protein</ThemedText>
                    </View>
                    <View style={styles.weekMacroDivider} />
                    <View style={styles.weekMacroItem}>
                      <ThemedText style={[styles.weekMacroValue, { color: C.secondary }]}>
                        {Math.round(weekSummary.totalCarbs)}g
                      </ThemedText>
                      <ThemedText style={styles.weekMacroLabel}>Carbs</ThemedText>
                    </View>
                    <View style={styles.weekMacroDivider} />
                    <View style={styles.weekMacroItem}>
                      <ThemedText style={[styles.weekMacroValue, { color: C.tertiaryContainer }]}>
                        {Math.round(weekSummary.totalFat)}g
                      </ThemedText>
                      <ThemedText style={styles.weekMacroLabel}>Fat</ThemedText>
                    </View>
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>
          </>
        )}

        {/* ═══════════════════════════════════════
            MONTH TAB
           ═══════════════════════════════════════ */}
        {activeTab === 'month' && (
          <>
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Tilt3DCard
                width={cardWidth}
                height={360}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion={true}
                activeTouch={false}
              >
                <View style={styles.monthCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ThemedText style={styles.sectionTitle}>
                    Tháng {currentMonth.getMonth() + 1} năm {currentMonth.getFullYear()}
                  </ThemedText>

                  {isLoadingMonth ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color={C.primary} size="large" />
                    </View>
                  ) : monthData ? (
                    <CalendarHeatmap
                      year={currentMonth.getFullYear()}
                      month={currentMonth.getMonth()}
                      data={monthData.days}
                      onDayPress={handleDayPress}
                    />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <ThemedText style={{ color: C.textMuted }}>
                        Không có dữ liệu
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* Month summary */}
            {monthData && (
              <Animated.View entering={FadeInUp.delay(250).springify()}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCard}>
                    <ThemedText style={{ fontSize: 22 }}>🔥</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {Math.round(monthData.totalCalories / 1000)}k
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Tổng kcal</ThemedText>
                  </View>
                  <View style={styles.summaryCard}>
                    <ThemedText style={{ fontSize: 22 }}>📅</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {monthData.daysLogged}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Ngày HĐ</ThemedText>
                  </View>
                  <View style={styles.summaryCard}>
                    <ThemedText style={{ fontSize: 22 }}>📊</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {Math.round(monthData.averageCalories).toLocaleString()}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>TB/ngày</ThemedText>
                  </View>
                </View>
              </Animated.View>
            )}
          </>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.primary} size="large" />
            <ThemedText style={{ color: C.textMuted, marginTop: 12 }}>
              Đang tải...
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  /* ─── Header ─── */
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -0.3,
  },

  /* ─── Tab Switcher ─── */
  tabBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(47, 52, 69, 0.4)',
    borderRadius: 16,
    padding: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: C.primaryContainer,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
  },
  tabLabelActive: {
    color: C.onPrimaryContainer,
    fontWeight: '700',
  },

  /* ─── Hero Card ─── */
  heroCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
    minHeight: 300,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ringSection: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1.5,
    lineHeight: 38,
  },
  ringLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  /* Macros */
  macroSection: {
    flex: 1,
    gap: 20,
    justifyContent: 'center',
  },
  macroGroup: {
    gap: 6,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  macroName: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  macroTrack: {
    height: 8,
    backgroundColor: C.surfaceLowest,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 4,
  },

  /* ─── Phân bổ bữa ăn ─── */
  distributionCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
    minHeight: 200,
  },
  distTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  distTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  distDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  stackedBarTrack: {
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 18,
  },
  stackedBarSegment: {
    height: '100%',
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  mealGridItem: {
    width: '50%',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  mealDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mealLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mealCalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onSurface,
    paddingLeft: 16,
  },

  /* ─── Lượng Nước ─── */
  waterCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
    minHeight: 120,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waterIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(75, 226, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  waterValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  waterValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  waterTarget: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  waterDrops: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  /* ─── Week Tab ─── */
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outline,
    padding: 12,
  },
  weekNavBtn: {
    padding: 8,
    borderRadius: 12,
  },
  weekNavTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  weekChartCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
    minHeight: 280,
  },

  /* Simple bar chart */
  barChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
  },
  barTrack: {
    width: 18,
    height: 120,
    backgroundColor: C.surfaceLowest,
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 9,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
  },

  /* Summary row */
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surfaceLow,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.outline,
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onSurface,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.5,
  },

  /* Week macro card */
  weekMacroCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
    minHeight: 160,
  },
  weekMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  weekMacroItem: {
    alignItems: 'center',
    gap: 6,
  },
  weekMacroValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  weekMacroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  weekMacroDivider: {
    width: 1,
    height: 40,
    backgroundColor: C.outlineVariant,
  },

  /* Section title */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
    marginBottom: 4,
  },

  /* Month */
  monthCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
    minHeight: 340,
  },

  /* Loading */
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
});

export default StatsScreen;
