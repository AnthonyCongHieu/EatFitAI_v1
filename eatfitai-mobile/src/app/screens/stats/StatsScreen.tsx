/**
 * StatsScreen — Emerald Nebula 3D unified stats
 * Faithfully follows the HTML template design reference.
 *
 * Tabs: Ngày / Tuần / Tháng
 * Today: Hero card (ring+macros), Phân bổ bữa ăn, Lượng Nước
 * Week: bar chart + summary
 * Month: calendar heatmap + summary
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
import { CalendarHeatmap } from '../../../components/stats';
import Tilt3DCard from '../../../components/ui/Tilt3DCard';
import type { RootStackParamList } from '../../types';
import { waterService, type WaterIntakeData } from '../../../services/waterService';
import { useQuery } from '@tanstack/react-query';
import {
  formatShortWeekdayLabel,
  formatWeekRangeLabel,
} from '../../../utils/dateDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ═══════════════════════════════════════════════
   Palette — exact match with HTML template
   ═══════════════════════════════════════════════ */
const P = {
  // Surfaces (from template tailwind config)
  bg: '#0a0e1a',
  surface: '#0a0e1a',
  surfaceContainerLowest: '#090e1c',
  surfaceContainerLow: '#161b2b',
  surfaceContainer: '#1a1f2f',
  surfaceContainerHigh: '#25293a',
  surfaceContainerHighest: '#2f3445',
  surfaceBright: '#343949',
  // Primary
  primary: '#4be277',
  primaryContainer: '#22c55e',
  onPrimary: '#003915',
  onPrimaryContainer: '#004b1e',
  // Secondary
  secondary: '#96d59d',
  secondaryFixed: '#b2f2b7',
  // Tertiary
  tertiary: '#ffb5ab',
  tertiaryContainer: '#ff8b7c',
  tertiaryFixed: '#ffdad5',
  // Text
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  textSlate400: '#94a3b8',
  textSlate500: '#64748b',
  // Outline
  outline: '#869585',
  outlineVariant: '#3d4a3d',
  // Misc
  error: '#ffb4ab',
  glassCard: 'rgba(47, 52, 69, 0.4)',
};

/* ─── Meal type meta ─── */
const MEAL_META: Record<number, { color: string; label: string }> = {
  1: { color: '#fbbf24', label: 'BỮA SÁNG' },   // Amber
  2: { color: '#34d399', label: 'BỮA TRƯA' },   // Emerald
  3: { color: '#22d3ee', label: 'BỮA TỐI' },    // Cyan
  4: { color: '#c084fc', label: 'BỮA PHỤ' },    // Purple
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
  const offset = now.getTime() + 7 * 60 * 60 * 1000;
  const hanoi = new Date(offset);
  return `Hôm nay, ${hanoi.getUTCDate()} Thg ${hanoi.getUTCMonth() + 1}`;
};

const cardW = SCREEN_WIDTH - 48; // px-6 * 2

/* ═════════════════════════════════════════════════
   RING CONSTANTS
   ═════════════════════════════════════════════════ */
const RING_SIZE = 192; // w-48 h-48
const RING_STROKE = 12;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
const StatsScreen = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

  /* ─── Data: Water ─── */
  const { data: statsWaterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-stats'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    staleTime: 30000,
    enabled: activeTab === 'today',
  });
  const statsWaterAmount = statsWaterData?.amountMl ?? 0;
  const statsWaterTarget = statsWaterData?.targetMl ?? 2000;

  useEffect(() => {
    fetchWeekSummary();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'month' && !monthData) fetchMonthData();
  }, [activeTab]);

  const fetchMonthData = useCallback(async () => {
    setIsLoadingMonth(true);
    try {
      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth();
      const s = new Date(y, m, 1).toISOString().split('T')[0]!;
      const e = new Date(y, m + 1, 0).toISOString().split('T')[0]!;
      const result = await summaryService.getNutritionSummary(s, e);
      const days: DayData[] = Object.entries(result.dailyCalories || {}).map(
        ([date, cal]) => ({ date, calories: Number(cal) || 0 }),
      );
      const logged = days.filter((d) => d.calories > 0).length;
      setMonthData({
        days,
        totalCalories: result.totalCalories || 0,
        totalProtein: result.totalProtein || 0,
        totalCarbs: result.totalCarbs || 0,
        totalFat: result.totalFat || 0,
        averageCalories: logged > 0 ? (result.totalCalories || 0) / logged : 0,
        daysLogged: logged,
      });
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoadingMonth(false);
    }
  }, [currentMonth]);

  /* ─── Derived values ─── */
  const todayCal = Number(summary?.totalCalories ?? 0);
  const targetCal = Number(summary?.targetCalories ?? 2200);
  const protein = Number(summary?.protein ?? 0);
  const carbs = Number(summary?.carbs ?? 0);
  const fat = Number(summary?.fat ?? 0);
  const targetP = Number(summary?.targetProtein ?? 120);
  const targetC = Number(summary?.targetCarbs ?? 280);
  const targetF = Number(summary?.targetFat ?? 60);
  const progress = targetCal > 0 ? Math.min(1, todayCal / targetCal) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  /* ─── Meal distribution ─── */
  const mealDist = useMemo(() => {
    if (!summary?.meals) return [];
    const map: Record<number, number> = {};
    for (const meal of summary.meals) {
      const t = meal.mealType ?? 4;
      const c = meal.entries.reduce((s, e) => s + (e.calories || 0), 0);
      map[t] = (map[t] || 0) + c;
    }
    return [1, 2, 3, 4].map((id) => ({
      id,
      calories: Math.round(map[id] || 0),
      ...(MEAL_META[id] ?? MEAL_META[4]),
    }));
  }, [summary]);

  const totalMealCal = mealDist.reduce((s, m) => s + m.calories, 0);

  /* ─── Week helpers ─── */
  const isFutureWeek = useMemo(() => {
    const sw = new Date(selectedWeekDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return sw > now;
  }, [selectedWeekDate]);

  /* ─── Handlers ─── */
  const handleTabChange = (tab: TabOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'today') { fetchSummary(); fetchWeekSummary(); }
    else if (activeTab === 'week') fetchWeekSummary();
    else fetchMonthData();
  }, [activeTab, fetchSummary, fetchWeekSummary, fetchMonthData]);

  const handleDayPress = useCallback(
    (date: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('MealDiary', { selectedDate: date });
    },
    [navigation],
  );

  const isLoading = activeTab === 'month' ? isLoadingMonth : isLoadingWeek;

  if (isLoading && !weekSummary && !monthData && !summary) return <StatsSkeleton />;

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={P.bg} />

      {/* ══════ FIXED HEADER ══════ */}
      <View style={S.headerBar}>
        <ThemedText style={S.headerTitle}>{formatViDate()}</ThemedText>
      </View>

      {/* ══════ TAB SWITCHER ══════ */}
      <View style={S.tabWrap}>
        <View style={S.tabPill}>
          {(['today', 'week', 'month'] as TabOption[]).map((tab) => {
            const on = activeTab === tab;
            const label = tab === 'today' ? 'Ngày' : tab === 'week' ? 'Tuần' : 'Tháng';
            return (
              <Pressable
                key={tab}
                onPress={() => handleTabChange(tab)}
                style={[S.tabBtn, on && S.tabBtnOn]}
              >
                <ThemedText style={[S.tabTxt, on && S.tabTxtOn]}>{label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ══════ SCROLL ══════ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[P.primary]}
            tintColor={P.primary}
            progressBackgroundColor={P.surfaceContainerHigh}
          />
        }
      >

        {/* ═══════════ TODAY ═══════════ */}
        {activeTab === 'today' && (
          <>
            {/* ── HERO CARD ── */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Tilt3DCard
                width={cardW}
                height={440}
                maxTilt={6}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.heroCard}>
                  {/* Metallic sheen */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Ring — centered top */}
                  <View style={S.heroRingWrap}>
                    <View style={S.heroRing}>
                      <Svg
                        width={RING_SIZE}
                        height={RING_SIZE}
                        style={{ transform: [{ rotate: '-90deg' }] }}
                      >
                        <Defs>
                          <SvgGradient id="ringG" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor={P.primary} />
                            <Stop offset="100%" stopColor={P.primaryContainer} />
                          </SvgGradient>
                        </Defs>
                        {/* Track */}
                        <Circle
                          cx={RING_CENTER}
                          cy={RING_CENTER}
                          r={RING_RADIUS}
                          stroke={P.surfaceContainerLowest}
                          strokeWidth={RING_STROKE}
                          fill="none"
                        />
                        {/* Progress */}
                        <Circle
                          cx={RING_CENTER}
                          cy={RING_CENTER}
                          r={RING_RADIUS}
                          stroke="url(#ringG)"
                          strokeWidth={RING_STROKE}
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={dashOffset}
                        />
                      </Svg>
                      {/* Center text */}
                      <View style={S.ringCenter}>
                        <ThemedText style={S.ringBig}>
                          {Math.round(todayCal).toLocaleString()}
                        </ThemedText>
                        <ThemedText style={S.ringUnit}>KCAL NẠP</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Macros — full width below ring */}
                  <View style={S.heroMacros}>
                    {/* Protein: emerald gradient */}
                    <MacroBar
                      label="PROTEIN"
                      value={protein}
                      target={targetP}
                      valueColor="#34d399" /* emerald-400 */
                      gradientFrom="#10b981" /* emerald-500 */
                      gradientTo="#6ee7b7" /* emerald-300 */
                    />
                    {/* Carbs: secondary gradient */}
                    <MacroBar
                      label="CARBS"
                      value={carbs}
                      target={targetC}
                      valueColor={P.secondary}
                      gradientFrom={P.secondary}
                      gradientTo={P.secondaryFixed}
                    />
                    {/* Fat: tertiary gradient */}
                    <MacroBar
                      label="FAT"
                      value={fat}
                      target={targetF}
                      valueColor={P.tertiaryContainer}
                      gradientFrom={P.tertiaryContainer}
                      gradientTo={P.tertiaryFixed}
                    />
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── PHÂN BỔ BỮA ĂN ── */}
            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <Tilt3DCard
                width={cardW}
                height={totalMealCal > 0 ? 220 : 140}
                maxTilt={5}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.distCard}>
                  {/* Title row */}
                  <View style={S.distHead}>
                    <ThemedText style={S.distTitle}>Phân bổ bữa ăn</ThemedText>
                    <View style={S.dotGreen} />
                  </View>

                  {totalMealCal > 0 ? (
                    <>
                      {/* Stacked bar */}
                      <View style={S.stackTrack}>
                        {mealDist.map((m) => (
                          <View
                            key={m.id}
                            style={{
                              flex: m.calories || 0.01,
                              height: '100%',
                              backgroundColor: m.color,
                            }}
                          />
                        ))}
                      </View>

                      {/* 2x2 grid */}
                      <View style={S.distGrid}>
                        {mealDist.map((m) => (
                          <View key={m.id} style={S.distGridItem}>
                            <View style={S.distDotRow}>
                              <View style={[S.distDot, { backgroundColor: m.color }]} />
                              <ThemedText style={S.distLabel}>{m.label}</ThemedText>
                            </View>
                            <ThemedText style={S.distVal}>{m.calories} kcal</ThemedText>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ThemedText style={{ color: P.textSlate500, fontSize: 13 }}>
                        Chưa có dữ liệu bữa ăn
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── LƯỢNG NƯỚC ── */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <Tilt3DCard
                width={cardW}
                height={130}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.waterCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Header */}
                  <View style={S.waterHead}>
                    <View style={S.waterLeft}>
                      <View style={S.waterIconBox}>
                        <Ionicons name="water" size={20} color={P.primary} />
                      </View>
                      <ThemedText style={S.waterLabel}>LƯỢNG NƯỚC</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <ThemedText style={S.waterBig}>
                        {(statsWaterAmount / 1000).toFixed(1)}L
                      </ThemedText>
                      <ThemedText style={S.waterSmall}>
                        {' '}/ {(statsWaterTarget / 1000).toFixed(1)}L
                      </ThemedText>
                    </View>
                  </View>
                  {/* Drops */}
                  <View style={S.waterDrops}>
                    {Array.from({ length: 8 }).map((_, i) => {
                      const filled = i < Math.floor((statsWaterAmount / statsWaterTarget) * 8);
                      return (
                        <Ionicons
                          key={i}
                          name="water"
                          size={28}
                          color={filled ? '#22d3ee' : P.surfaceContainerHighest}
                        />
                      );
                    })}
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>
          </>
        )}

        {/* ═══════════ WEEK ═══════════ */}
        {activeTab === 'week' && weekSummary && (
          <>
            {/* Week nav */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <View style={S.weekNav}>
                <Pressable onPress={goToPreviousWeek} style={S.wkBtn}>
                  <Ionicons name="chevron-back" size={20} color={P.primary} />
                </Pressable>
                <ThemedText style={S.wkTitle}>
                  {formatWeekRangeLabel(selectedWeekDate)}
                </ThemedText>
                <Pressable
                  onPress={goToNextWeek}
                  style={[S.wkBtn, isFutureWeek && { opacity: 0.3 }]}
                  disabled={isFutureWeek}
                >
                  <Ionicons name="chevron-forward" size={20} color={P.primary} />
                </Pressable>
              </View>
            </Animated.View>

            {/* Bar chart card */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Tilt3DCard
                width={cardW}
                height={300}
                maxTilt={5}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.chartCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ThemedText style={S.secTitle}>Tuần này</ThemedText>

                  <View style={S.bars}>
                    {weekSummary.days.map((day) => {
                      const maxC = Math.max(...weekSummary.days.map((d) => d.calories), 1);
                      const h = (day.calories / maxC) * 130;
                      return (
                        <Pressable
                          key={day.date}
                          style={S.barCol}
                          onPress={() => handleDayPress(day.date)}
                        >
                          <ThemedText style={S.barVal}>
                            {day.calories > 0 ? Math.round(day.calories) : ''}
                          </ThemedText>
                          <View style={S.barTrack}>
                            <LinearGradient
                              colors={[P.primary, P.primaryContainer]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={[S.barFill, { height: Math.max(h, 4) }]}
                            />
                          </View>
                          <ThemedText style={S.barLbl}>
                            {formatShortWeekdayLabel(new Date(day.date))}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* Summary row */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <View style={S.sumRow}>
                <SummaryChip emoji="📊" value={`${Math.round(
                  weekSummary.days.reduce((s, d) => s + d.calories, 0) /
                    Math.max(weekSummary.days.filter((d) => d.calories > 0).length, 1),
                ).toLocaleString()}`} label="TB/ngày" />
                <SummaryChip emoji="🔥" value={`${Math.round(weekSummary.totalCalories).toLocaleString()}`} label="Tổng tuần" />
                <SummaryChip emoji="🎯" value={`${weekSummary.days.filter(
                  (d) => d.targetCalories && d.calories >= d.targetCalories * 0.9,
                ).length}/${weekSummary.days.length}`} label="Đạt mục tiêu" />
              </View>
            </Animated.View>

            {/* Macro card */}
            <Animated.View entering={FadeInUp.delay(400).springify()}>
              <Tilt3DCard
                width={cardW}
                height={150}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.macroCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ThemedText style={S.secTitle}>Macro tuần</ThemedText>
                  <View style={S.macroRow}>
                    <View style={S.macroItem}>
                      <ThemedText style={[S.macroV, { color: P.primary }]}>
                        {Math.round(weekSummary.totalProtein)}g
                      </ThemedText>
                      <ThemedText style={S.macroL}>Protein</ThemedText>
                    </View>
                    <View style={S.macroDivider} />
                    <View style={S.macroItem}>
                      <ThemedText style={[S.macroV, { color: P.secondary }]}>
                        {Math.round(weekSummary.totalCarbs)}g
                      </ThemedText>
                      <ThemedText style={S.macroL}>Carbs</ThemedText>
                    </View>
                    <View style={S.macroDivider} />
                    <View style={S.macroItem}>
                      <ThemedText style={[S.macroV, { color: P.tertiaryContainer }]}>
                        {Math.round(weekSummary.totalFat)}g
                      </ThemedText>
                      <ThemedText style={S.macroL}>Fat</ThemedText>
                    </View>
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>
          </>
        )}

        {/* ═══════════ MONTH ═══════════ */}
        {activeTab === 'month' && (
          <>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Tilt3DCard
                width={cardW}
                height={360}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.monthCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ThemedText style={S.secTitle}>
                    Tháng {currentMonth.getMonth() + 1}/{currentMonth.getFullYear()}
                  </ThemedText>

                  {isLoadingMonth ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color={P.primary} size="large" />
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
                      <ThemedText style={{ color: P.textSlate500 }}>Không có dữ liệu</ThemedText>
                    </View>
                  )}
                </View>
              </Tilt3DCard>
            </Animated.View>

            {monthData && (
              <Animated.View entering={FadeInUp.delay(250).springify()}>
                <View style={S.sumRow}>
                  <SummaryChip emoji="🔥" value={`${Math.round(monthData.totalCalories / 1000)}k`} label="Tổng kcal" />
                  <SummaryChip emoji="📅" value={`${monthData.daysLogged}`} label="Ngày HĐ" />
                  <SummaryChip emoji="📊" value={`${Math.round(monthData.averageCalories).toLocaleString()}`} label="TB/ngày" />
                </View>
              </Animated.View>
            )}
          </>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={P.primary} size="large" />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

/** Macro progress bar — gradient fill matching HTML template */
const MacroBar = ({
  label,
  value,
  target,
  valueColor,
  gradientFrom,
  gradientTo,
}: {
  label: string;
  value: number;
  target: number;
  valueColor: string;
  gradientFrom: string;
  gradientTo: string;
}) => (
  <View style={S.mBar}>
    <View style={S.mBarHead}>
      <ThemedText style={S.mBarLabel}>{label}</ThemedText>
      <ThemedText style={[S.mBarValue, { color: valueColor }]}>
        {Math.round(value)}/{target}g
      </ThemedText>
    </View>
    <View style={S.mBarTrack}>
      <LinearGradient
        colors={[gradientFrom, gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          S.mBarFill,
          { width: `${Math.min(100, (value / Math.max(target, 1)) * 100)}%` },
        ]}
      />
    </View>
  </View>
);

/** Summary chip for week/month */
const SummaryChip = ({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) => (
  <View style={S.sumCard}>
    <ThemedText style={{ fontSize: 20 }}>{emoji}</ThemedText>
    <ThemedText style={S.sumVal}>{value}</ThemedText>
    <ThemedText style={S.sumLbl}>{label}</ThemedText>
  </View>
);

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  /* Header */
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: P.primary,
    letterSpacing: -0.3,
  },

  /* Tabs — glass-card pill style */
  tabWrap: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  tabPill: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: P.glassCard,
    borderRadius: 16,
    padding: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 12 },
  tabBtnOn: {
    backgroundColor: P.primaryContainer,
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  tabTxt: { fontSize: 14, fontWeight: '800', color: P.textSlate400 },
  tabTxtOn: { color: P.onPrimaryContainer, fontWeight: '900' },

  /* Scroll */
  scroll: { paddingHorizontal: 24, paddingBottom: 140, gap: 20 },

  /* ── Hero Card — vertical layout (ring top, macros bottom) ── */
  heroCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderRadius: 24,
    padding: 28,
    overflow: 'hidden',
    minHeight: 420,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  heroRingWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  heroRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringBig: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 42,
  },
  ringUnit: {
    fontSize: 12,
    fontWeight: '800',
    color: P.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  heroMacros: { gap: 20 },

  /* Macro bar sub-component */
  mBar: { gap: 6 },
  mBarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  mBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate400,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mBarValue: { fontSize: 14, fontWeight: '800' },
  mBarTrack: {
    height: 8,
    backgroundColor: P.surfaceContainerLowest,
    borderRadius: 99,
    overflow: 'hidden',
  },
  mBarFill: { height: '100%', borderRadius: 99 },

  /* ── Phân bổ bữa ăn ── */
  distCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 130,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  distHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  distTitle: { fontSize: 16, fontWeight: '800', color: P.onSurface },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: P.primary },

  stackTrack: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 18,
  },

  distGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  distGridItem: { width: '50%', paddingVertical: 8 },
  distDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  distDot: { width: 8, height: 8, borderRadius: 4 },
  distLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  distVal: { fontSize: 20, fontWeight: '800', color: P.onSurface, paddingLeft: 16 },

  /* ── Lượng Nước ── */
  waterCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  waterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(75,226,119,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: P.onSurface,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  waterBig: { fontSize: 22, fontWeight: '800', color: '#fff' },
  waterSmall: { fontSize: 12, color: P.textSlate500 },
  waterDrops: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },

  /* ── WEEK ── */
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  wkBtn: { padding: 8, borderRadius: 12 },
  wkTitle: { fontSize: 15, fontWeight: '800', color: P.onSurface },

  chartCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    overflow: 'hidden',
    minHeight: 280,
  },
  secTitle: { fontSize: 16, fontWeight: '800', color: P.onSurface, marginBottom: 8 },

  bars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    marginTop: 8,
  },
  barCol: { alignItems: 'center', flex: 1, gap: 4 },
  barVal: { fontSize: 9, fontWeight: '800', color: P.textSlate400 },
  barTrack: {
    width: 20,
    height: 140,
    backgroundColor: P.surfaceContainerLowest,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { width: '100%', borderRadius: 10 },
  barLbl: { fontSize: 10, fontWeight: '800', color: P.textSlate400, textTransform: 'uppercase' },

  /* Summary row */
  sumRow: { flexDirection: 'row', gap: 10 },
  sumCard: {
    flex: 1,
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 4,
  },
  sumVal: { fontSize: 16, fontWeight: '800', color: P.onSurface },
  sumLbl: { fontSize: 10, fontWeight: '800', color: P.textSlate400 },

  /* Macro card */
  macroCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 140,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
  },
  macroItem: { alignItems: 'center', gap: 6 },
  macroV: { fontSize: 24, fontWeight: '800' },
  macroL: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate400,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  macroDivider: { width: 1, height: 40, backgroundColor: 'rgba(61,74,61,0.35)' },

  /* Month */
  monthCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 340,
  },
});

export default StatsScreen;
