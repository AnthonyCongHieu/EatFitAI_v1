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
  Path,
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
import { useProfileStore } from '../../../store/useProfileStore';
import { summaryService } from '../../../services/summaryService';
import { handleApiError } from '../../../utils/errorHandler';
import { StatsSkeleton } from '../../../components/skeletons/StatsSkeleton';
import { CalendarHeatmap } from '../../../components/stats';
import Tilt3DCard from '../../../components/ui/Tilt3DCard';
import { TEST_IDS } from '../../../testing/testIds';
import type { RootStackParamList } from '../../types';
import { waterService, type WaterIntakeData, type MonthlyWaterData } from '../../../services/waterService';
import { profileService } from '../../../services/profileService';
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

/* ─── Month helpers ─── */
interface WeekAvg { label: string; avg: number; }

/** Split month days into exactly 4 weeks and compute average cal per week */
const getWeekAverages = (days: DayData[]): WeekAvg[] => {
  const weeks = Array.from({ length: 4 }, (_, i) => ({ label: `Tuần ${i + 1}`, sum: 0, count: 0 }));
  days.forEach(d => {
    if (d.calories > 0) {
      const dayDate = new Date(d.date);
      let wIdx = Math.floor((dayDate.getDate() - 1) / 7);
      if (wIdx > 3) wIdx = 3;
      const week = weeks[wIdx]!;
      week.sum += d.calories;
      week.count += 1;
    }
  });
  return weeks.map(w => ({
    label: w.label,
    avg: w.count > 0 ? Math.round(w.sum / w.count) : 0,
  }));
};

/** Generate a smooth SVG path from [0..1] normalised points */
const generateSplinePath = (
  points: { x: number; y: number }[],
  width: number,
  height: number,
  padding: number = 0,
): { line: string; area: string } => {
  if (points.length < 2) return { line: 'M0,0', area: 'M0,0' };
  const mapped = points.map(p => ({
    x: padding + p.x * (width - padding * 2),
    y: padding + (1 - p.y) * (height - padding * 2),
  }));
  let line = `M${mapped[0]!.x},${mapped[0]!.y}`;
  for (let i = 1; i < mapped.length; i++) {
    const prev = mapped[i - 1]!;
    const curr = mapped[i]!;
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    line += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
  }
  const lastPt = mapped[mapped.length - 1]!;
  const area = `${line} L${lastPt.x},${height} L${mapped[0]!.x},${height} Z`;
  return { line, area };
};

/** Find the day closest to target calories (best performance day) */
const findBestDay = (days: DayData[], target: number): DayData | null => {
  if (days.length === 0) return null;
  const logged = days.filter(d => d.calories > 0);
  if (logged.length === 0) return null;
  return logged.reduce((best, d) => {
    const diff = Math.abs(d.calories - target);
    const bestDiff = Math.abs(best.calories - target);
    return diff < bestDiff ? d : best;
  });
};

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
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    staleTime: 30000,
    enabled: activeTab === 'today',
  });
  const statsWaterAmount = statsWaterData?.amountMl ?? 0;
  const statsWaterTarget = statsWaterData?.targetMl ?? 2000;

  /* ─── Data: Profile ─── */
  const profile = useProfileStore((s) => s.profile);
  const profileWeight = profile?.weightKg || 0;
  const profileTargetWeight = profile?.targetWeightKg || 0;

  /* ─── Data: Month extras (weight change + water average) ─── */
  const [monthlyWater, setMonthlyWater] = useState<MonthlyWaterData | null>(null);
  const [weightChange, setWeightChange] = useState<number | null>(null);

  useEffect(() => {
    fetchWeekSummary();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'month') {
      if (!monthData) fetchMonthData();
      fetchMonthExtras();
    }
  }, [activeTab, fetchMonthData, fetchMonthExtras]);

  /** Fetch monthly water average + weight change */
  const fetchMonthExtras = useCallback(async () => {
    try {
      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth() + 1;
      // Monthly water
      const water = await waterService.getMonthlyWaterIntake(y, m);
      setMonthlyWater(water);
      // Weight change from body metrics history
      const history = await profileService.getBodyMetricsHistory(60);
      if (history.length >= 2) {
        const sorted = [...history].sort((a, b) =>
          (a.measuredDate || '').localeCompare(b.measuredDate || '')
        );
        const first = sorted[0]?.weightKg;
        const last = sorted[sorted.length - 1]?.weightKg;
        if (first && last) setWeightChange(Number((last - first).toFixed(1)));
      }
    } catch (e) { 
      console.log('fetchMonthExtras Error:', e);
    }
  }, [currentMonth]);

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
    <View
      style={[S.root, { paddingTop: insets.top }]}
      testID={TEST_IDS.stats.screen}
    >
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
            const testID =
              tab === 'today'
                ? TEST_IDS.stats.todayTabButton
                : tab === 'week'
                  ? TEST_IDS.stats.weekTabButton
                  : TEST_IDS.stats.monthTabButton;
            return (
              <Pressable
                key={tab}
                onPress={() => handleTabChange(tab)}
                style={[S.tabBtn, on && S.tabBtnOn]}
                testID={testID}
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
                        <Ionicons name="water" size={20} color="#3b82f6" />
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
                          color={filled ? '#3b82f6' : P.surfaceContainerHighest}
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
        {activeTab === 'week' && weekSummary && (() => {
          const wkTotalCal = Math.round(weekSummary.totalCalories);
          const wkTargetCal = targetCal * 7;
          const wkProgress = wkTargetCal > 0 ? Math.min(1, wkTotalCal / wkTargetCal) : 0;
          const wkDashOffset = RING_CIRCUMFERENCE * (1 - wkProgress);
          const wkLoggedDays = weekSummary.days.filter(d => d.calories > 0);
          const wkAvgCal = wkLoggedDays.length > 0
            ? Math.round(wkLoggedDays.reduce((s, d) => s + d.calories, 0) / wkLoggedDays.length)
            : 0;
          const wkMaxC = Math.max(...weekSummary.days.map(d => d.calories), 1);
          // Find the best day in the week (highest cal)
          const wkBestDay = wkLoggedDays.length > 0
            ? wkLoggedDays.reduce((best, d) => d.calories > best.calories ? d : best)
            : null;
          const wkBestDayIdx = wkBestDay ? weekSummary.days.findIndex(d => d.date === wkBestDay.date) : -1;
          // Find the worst day in the week (lowest cal)
          const wkWorstDay = wkLoggedDays.length > 0
            ? wkLoggedDays.reduce((worst, d) => d.calories < worst.calories ? d : worst)
            : null;
          // Only show worst if it's different from best (requires at least 2 logged days)
          const wkWorstDayIdx = wkWorstDay && wkLoggedDays.length > 1 && wkWorstDay.date !== wkBestDay?.date
            ? weekSummary.days.findIndex(d => d.date === wkWorstDay.date) : -1;

          // Protein target for progress bar
          const wkTargetProtein = targetP * 7;
          const wkProteinPct = wkTargetProtein > 0 ? Math.min(1, weekSummary.totalProtein / wkTargetProtein) : 0;
          // Carbs target
          const wkTargetCarbs = targetC * 7;
          const wkCarbsPct = wkTargetCarbs > 0 ? Math.min(1, weekSummary.totalCarbs / wkTargetCarbs) : 0;
          // Fat target
          const wkTargetFat = targetF * 7;
          const wkFatPct = wkTargetFat > 0 ? Math.min(1, weekSummary.totalFat / wkTargetFat) : 0;

          return (
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

            {/* ── VITALITY RING CARD ── */}
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Tilt3DCard
                width={cardW}
                height={340}
                maxTilt={6}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.wkRingCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Ring */}
                  <View style={S.heroRingWrap}>
                    <View style={S.heroRing}>
                      <Svg
                        width={RING_SIZE}
                        height={RING_SIZE}
                        style={{ transform: [{ rotate: '-90deg' }] }}
                      >
                        <Defs>
                          <SvgGradient id="wkRingG" x1="0%" y1="0%" x2="100%" y2="0%">
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
                          stroke="url(#wkRingG)"
                          strokeWidth={RING_STROKE}
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={wkDashOffset}
                        />
                      </Svg>
                      {/* Center text */}
                      <View style={S.ringCenter}>
                        <ThemedText style={S.ringBig}>
                          {wkTotalCal.toLocaleString()}
                        </ThemedText>
                        <ThemedText style={[S.wkRingUnit]}>
                          / {wkTargetCal.toLocaleString()} kcal
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  {/* Title + subtitle */}
                  <ThemedText style={S.wkRingTitle}>Tổng Năng Lượng</ThemedText>
                  <ThemedText style={S.wkRingSub}>
                    Bạn đã đạt {Math.round(wkProgress * 100)}% mục tiêu tuần
                  </ThemedText>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── GLASSMORPHISM BAR CHART ── */}
            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <Tilt3DCard
                width={cardW}
                height={300}
                maxTilt={5}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.wkGlassChart}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Header row */}
                  <View style={S.wkChartHeader}>
                    <ThemedText style={S.wkChartTitle}>Biểu Đồ Calo</ThemedText>
                    <View style={S.wkAvgBadge}>
                      <ThemedText style={S.wkAvgBadgeText}>
                        TRUNG BÌNH: {wkAvgCal.toLocaleString()}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Chart Legend */}
                  <View style={S.wkChartLegend}>
                     <View style={S.wkLegendItem}>
                        <View style={[S.wkLegendDot, { backgroundColor: P.primary }]} />
                        <ThemedText style={S.wkLegendText}>Cao nhất</ThemedText>
                     </View>
                     <View style={S.wkLegendItem}>
                        <View style={[S.wkLegendDot, { backgroundColor: P.tertiaryContainer }]} />
                        <ThemedText style={S.wkLegendText}>Thấp nhất</ThemedText>
                     </View>
                  </View>

                  {/* Bars */}
                  <View style={S.wkBarsArea}>
                    {/* Background grid lines */}
                    <View style={StyleSheet.absoluteFill}>
                      <View style={S.wkGridLine} />
                      <View style={[S.wkGridLine, { top: '33%' }]} />
                      <View style={[S.wkGridLine, { top: '66%' }]} />
                    </View>

                    {weekSummary.days.map((day, idx) => {
                      const h = (day.calories / wkMaxC) * 140;
                      const isBest = idx === wkBestDayIdx;
                      const isWorst = idx === wkWorstDayIdx;
                      return (
                        <Pressable
                          key={day.date}
                          style={S.wkBarCol}
                          onPress={() => handleDayPress(day.date)}
                        >
                          <View style={[S.wkBarTrack, { height: Math.max(h, 4) }]}>
                            {isBest ? (
                              <LinearGradient
                                colors={['rgba(75,226,119,0.2)', P.primary]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 0, y: 0 }}
                                style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
                              />
                            ) : isWorst ? (
                              <LinearGradient
                                colors={['rgba(255,139,124,0.2)', P.tertiaryContainer]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 0, y: 0 }}
                                style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
                              />
                            ) : (
                              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
                            )}
                            {/* Dot on top */}
                            <View style={[
                              S.wkBarDot,
                              isBest && S.wkBarDotBest,
                              isWorst && S.wkBarDotWorst,
                              (!isBest && !isWorst) && { backgroundColor: 'rgba(255,255,255,0.2)', shadowOpacity: 0 }
                            ]} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Day labels */}
                  <View style={S.wkDayLabels}>
                    {weekSummary.days.map((day, idx) => (
                      <ThemedText
                        key={day.date}
                        style={[
                          S.wkDayLbl,
                          idx === wkBestDayIdx && S.wkDayLblBest,
                        ]}
                      >
                        {formatShortWeekdayLabel(new Date(day.date))}
                      </ThemedText>
                    ))}
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── MACROS BENTO GRID ── */}
            {/* Protein — full width */}
            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <Tilt3DCard
                width={cardW}
                height={130}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.wkProteinCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={S.wkProteinHead}>
                    <View style={S.wkProteinIcon}>
                      <Ionicons name="egg" size={16} color={P.secondary} />
                    </View>
                    <ThemedText style={S.wkProteinTitle}>Đạm (Protein)</ThemedText>
                  </View>
                  <View style={S.wkProteinBottom}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <ThemedText style={S.wkProteinVal}>
                          {Math.round(weekSummary.totalProtein)}
                        </ThemedText>
                        <ThemedText style={S.wkProteinTarget}>
                          {' '}/ {Math.round(wkTargetProtein)}g
                        </ThemedText>
                      </View>
                    </View>
                    <View style={S.wkProteinBarTrack}>
                      <LinearGradient
                        colors={[P.secondary, P.secondaryFixed]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.wkProteinBarFill, { width: `${Math.round(wkProteinPct * 100)}%` as any }]}
                      />
                    </View>
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* Carbs — full width */}
            <Animated.View entering={FadeInUp.delay(400).springify()}>
              <Tilt3DCard
                width={cardW}
                height={130}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.wkProteinCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={S.wkProteinHead}>
                    <View style={[S.wkProteinIcon, { backgroundColor: 'rgba(255,139,124,0.15)' }]}>
                      <Ionicons name="fast-food" size={16} color={P.tertiaryContainer} />
                    </View>
                    <ThemedText style={S.wkProteinTitle}>Tinh bột</ThemedText>
                  </View>
                  <View style={S.wkProteinBottom}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <ThemedText style={S.wkProteinVal}>
                          {Math.round(weekSummary.totalCarbs)}
                        </ThemedText>
                        <ThemedText style={S.wkProteinTarget}>
                          {' '}/ {Math.round(wkTargetCarbs)}g
                        </ThemedText>
                      </View>
                    </View>
                    <View style={S.wkProteinBarTrack}>
                      <LinearGradient
                        colors={[P.tertiaryContainer, '#ffb4ab']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.wkProteinBarFill, { width: `${Math.round(wkCarbsPct * 100)}%` as any, shadowColor: P.tertiaryContainer }]}
                      />
                    </View>
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* Fat — full width */}
            <Animated.View entering={FadeInUp.delay(450).springify()}>
              <Tilt3DCard
                width={cardW}
                height={130}
                maxTilt={4}
                showReflection={false}
                useDeviceMotion
                activeTouch={false}
              >
                <View style={S.wkProteinCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={S.wkProteinHead}>
                    <View style={[S.wkProteinIcon, { backgroundColor: 'rgba(88,185,255,0.15)' }]}>
                      <Ionicons name="water" size={16} color="#58B9FF" />
                    </View>
                    <ThemedText style={S.wkProteinTitle}>Chất béo</ThemedText>
                  </View>
                  <View style={S.wkProteinBottom}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <ThemedText style={S.wkProteinVal}>
                          {Math.round(weekSummary.totalFat)}
                        </ThemedText>
                        <ThemedText style={S.wkProteinTarget}>
                          {' '}/ {Math.round(wkTargetFat)}g
                        </ThemedText>
                      </View>
                    </View>
                    <View style={S.wkProteinBarTrack}>
                      <LinearGradient
                        colors={['#58B9FF', '#a8d5ff']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.wkProteinBarFill, { width: `${Math.round(wkFatPct * 100)}%` as any, shadowColor: '#58B9FF' }]}
                      />
                    </View>
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>
          </>
          );
        })()}

        {/* ═══════════ MONTH ═══════════ */}
        {activeTab === 'month' && (() => {
          const CHART_W = cardW - 48;
          const CHART_H = 120;
          const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
          const weekAvgs = monthData ? getWeekAverages(monthData.days) : [];
          const chartDomainMax = Math.max(targetCal * 1.5, 1);
          const chartPoints = weekAvgs.map((w, i) => ({
            x: i / 3, // 4 items (0,1,2,3) mapped to [0..1]
            y: Math.min(1, Math.max(0, w.avg / chartDomainMax)),
          }));
          const { line: splineLine, area: splineArea } = generateSplinePath(chartPoints, CHART_W, CHART_H, 4);
          const goalDays = monthData ? monthData.days.filter(d => d.calories >= (targetCal * 0.8) && d.calories > 0).length : 0;
          const goalPct = daysInMonth > 0 ? Math.round((goalDays / daysInMonth) * 100) : 0;
          const bestDay = monthData ? findBestDay(monthData.days, targetCal) : null;
          const bestDayDate = bestDay ? new Date(bestDay.date) : null;

          return (
            <>
              {/* ── MONTHLY TREND HERO CHART ── */}
              <Animated.View entering={FadeInDown.delay(100).springify()}>
                <Tilt3DCard
                  width={cardW}
                  height={260}
                  maxTilt={5}
                  showReflection={false}
                  useDeviceMotion
                  activeTouch={false}
                >
                  <View style={S.mthChartCard}>

                    {isLoadingMonth ? (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={P.primary} size="large" />
                      </View>
                    ) : monthData && weekAvgs.length > 0 ? (
                      <View style={{ flex: 1 }}>
                        {/* Goal line */}
                        <View style={{ position: 'absolute', top: '25%', left: 0, right: 0, zIndex: 10 }}>
                          <ThemedText style={{ ...S.mthGoalLabel, textAlign: 'right', marginBottom: 4 }}>
                            Mục tiêu: {Math.round(targetCal).toLocaleString()} kcal
                          </ThemedText>
                          <View style={{ height: 1, width: '100%', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                        </View>

                        {/* SVG Spline Chart */}
                        <View style={{ height: CHART_H, marginTop: 16 }}>
                          <Svg width={CHART_W} height={CHART_H} style={{ overflow: 'visible' }}>
                            <Defs>
                              <SvgGradient id="mthChartGrad" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0%" stopColor={P.primary} stopOpacity={0.25} />
                                <Stop offset="100%" stopColor={P.primary} stopOpacity={0} />
                              </SvgGradient>
                            </Defs>
                            {/* Area fill */}
                            <Path d={splineArea} fill="url(#mthChartGrad)" />
                            {/* Line */}
                            <Path
                              d={splineLine}
                              fill="none"
                              stroke={P.primary}
                              strokeWidth={3}
                              strokeLinecap="round"
                            />
                            {/* Dots */}
                            {chartPoints.map((pt, i) => {
                              const cx = 4 + pt.x * (CHART_W - 8);
                              const cy = 4 + (1 - pt.y) * (CHART_H - 8);
                              return (
                                <Circle
                                  key={i}
                                  cx={cx}
                                  cy={cy}
                                  r={4}
                                  fill={P.primary}
                                />
                              );
                            })}
                          </Svg>
                        </View>

                        {/* Week labels */}
                        <View style={S.mthWeekLabels}>
                          {weekAvgs.map((w, i) => (
                            <ThemedText key={i} style={S.mthWeekLbl}>{w.label}</ThemedText>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ThemedText style={{ color: P.textSlate500, fontSize: 13 }}>Không có dữ liệu</ThemedText>
                      </View>
                    )}
                  </View>
                </Tilt3DCard>
              </Animated.View>

              {/* ── GOAL COMPLETION CARD ── */}
              {monthData && (
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                  <Tilt3DCard
                    width={cardW}
                    height={140}
                    maxTilt={4}
                    showReflection={false}
                    useDeviceMotion
                    activeTouch={false}
                  >
                    <View style={S.mthFloatCard}>
                      <ThemedText style={S.mthFloatLabel}>HOÀN THÀNH MỤC TIÊU</ThemedText>
                      <ThemedText style={S.mthFloatPct}>{goalPct}%</ThemedText>
                      <ThemedText style={S.mthFloatSub}>
                        {goalDays} / {daysInMonth} ngày đạt chuẩn Calo
                      </ThemedText>
                    </View>
                  </Tilt3DCard>
                </Animated.View>
              )}

              {/* ── PERSISTENCE HEATMAP ── */}
              <Animated.View entering={FadeInUp.delay(300).springify()}>
                <View style={S.mthHeatHead}>
                  <ThemedText style={S.mthHeatTitle}>MỨC ĐỘ KIÊN TRÌ</ThemedText>
                  <ThemedText style={S.mthHeatBadge}>THÁNG NÀY</ThemedText>
                </View>
                <Tilt3DCard
                  width={cardW}
                  height={monthData ? 280 : 140}
                  maxTilt={4}
                  showReflection={false}
                  useDeviceMotion
                  activeTouch={false}
                >
                  <View style={S.mthHeatCard}>
                    {isLoadingMonth ? (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={P.primary} size="large" />
                      </View>
                    ) : (
                      <View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 12 }}>
                          {Array.from({ length: (() => {
                            const firstDayFormat = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                            const emptyPrefixDays = firstDayFormat === 0 ? 6 : firstDayFormat - 1;
                            const totalCells = emptyPrefixDays + daysInMonth;
                            return Math.ceil(totalCells / 7) * 7;
                          })() }).map((_, i) => {
                            const firstDayFormat = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                            const emptyPrefixDays = firstDayFormat === 0 ? 6 : firstDayFormat - 1;
                            const d = i - emptyPrefixDays + 1;
                            
                            const isRealDay = d > 0 && d <= daysInMonth;
                            
                            let bgColor = 'rgba(255,255,255,0.03)'; // Default
                            let txtColor = P.textSlate500;
                            let opacity = 0.5;
                            
                            if (isRealDay) {
                              const dData = monthData?.days.find(md => {
                                 const dateObj = new Date(md.date);
                                 return dateObj.getDate() === d && dateObj.getMonth() === currentMonth.getMonth();
                              });
                              const cal = dData?.calories || 0;
                              if (cal > 0) {
                                txtColor = '#fff';
                                opacity = 1;
                                const pct = cal / targetCal;
                                if (pct < 0.3) bgColor = '#3f3f46'; // Rất ít
                                else if (pct < 0.7) bgColor = 'rgba(75, 226, 119, 0.3)'; // Ít
                                else if (pct < 1.0) bgColor = 'rgba(75, 226, 119, 0.7)'; // Nhiều
                                else bgColor = P.primary; // Tuyệt đối
                              }
                            }
                            
                            return (
                              <View 
                                key={i} 
                                style={{
                                  width: (cardW - 48) / 7 - 8,
                                  aspectRatio: 1,
                                  borderRadius: 8,
                                  backgroundColor: isRealDay ? bgColor : 'transparent',
                                  margin: 4,
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }} 
                              >
                                {isRealDay && (
                                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: txtColor, opacity }}>
                                    {d}
                                  </ThemedText>
                                )}
                              </View>
                            );
                          })}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)' }}/>
                            <ThemedText style={{ fontSize: 10, color: P.textSlate400, fontWeight: '700' }}>Chưa có</ThemedText>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#3f3f46' }}/>
                            <ThemedText style={{ fontSize: 10, color: P.textSlate400, fontWeight: '700' }}>Rất ít</ThemedText>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(75, 226, 119, 0.3)' }}/>
                            <ThemedText style={{ fontSize: 10, color: P.textSlate400, fontWeight: '700' }}>Ít</ThemedText>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(75, 226, 119, 0.7)' }}/>
                            <ThemedText style={{ fontSize: 10, color: P.textSlate400, fontWeight: '700' }}>Nhiều</ThemedText>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: P.primary }}/>
                            <ThemedText style={{ fontSize: 10, color: P.textSlate400, fontWeight: '700' }}>Tuyệt đối</ThemedText>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </Tilt3DCard>
              </Animated.View>

              {/* ── AVERAGE ENERGY INSIGHT ── */}
              {monthData && (
                <Animated.View entering={FadeInUp.delay(350).springify()}>
                  <Tilt3DCard
                    width={cardW}
                    height={80}
                    maxTilt={3}
                    showReflection={false}
                    useDeviceMotion
                    activeTouch={false}
                  >
                    <View style={S.mthEnergyCard}>
                      <View>
                        <ThemedText style={S.mthEnergyLabel}>NĂNG LƯỢNG TRUNG BÌNH</ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <ThemedText style={S.mthEnergyVal}>
                            {Math.round(monthData.averageCalories).toLocaleString()}
                          </ThemedText>
                          <ThemedText style={S.mthEnergyUnit}> kcal/ngày</ThemedText>
                        </View>
                      </View>
                      <View style={S.mthEnergyIcon}>
                        <Ionicons
                          name={monthData.averageCalories <= targetCal ? 'trending-down' : 'trending-up'}
                          size={24}
                          color={P.primary}
                        />
                      </View>
                    </View>
                  </Tilt3DCard>
                </Animated.View>
              )}

              {/* ── AVERAGE WATER INSIGHT ── */}
              {monthData && (
                <Animated.View entering={FadeInUp.delay(380).springify()} style={{ marginTop: 12 }}>
                  <Tilt3DCard
                    width={cardW}
                    height={80}
                    maxTilt={3}
                    showReflection={false}
                    useDeviceMotion
                    activeTouch={false}
                  >
                    <View style={[S.mthEnergyCard, { paddingVertical: 16 }]}>
                      <View>
                        <ThemedText style={S.mthEnergyLabel}>LƯỢNG NƯỚC TRUNG BÌNH</ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <ThemedText style={S.mthEnergyVal}>
                            {Math.round(monthlyWater?.averageMl || 0).toLocaleString()}
                          </ThemedText>
                          <ThemedText style={S.mthEnergyUnit}> ml/ngày</ThemedText>
                        </View>
                      </View>
                      <View style={[S.mthEnergyIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                        <Ionicons
                          name="water-outline"
                          size={24}
                          color="#3b82f6"
                        />
                      </View>
                    </View>
                  </Tilt3DCard>
                </Animated.View>
              )}

              {/* ── UNIFIED 4 CARDS GRID ── */}
              {monthData && (
                <Animated.View entering={FadeInUp.delay(400).springify()} style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    
                    {/* Chip 1: Tổng Calo Tiêu Thụ */}
                    <Tilt3DCard width={(cardW - 12) / 2} height={140} maxTilt={5} showReflection={false} useDeviceMotion activeTouch={false}>
                      <View style={[S.mthUniformCard, { width: (cardW - 12) / 2 }]}>
                        <Ionicons name="flame" size={24} color={P.secondary} style={{ marginBottom: 8 }} />
                        <ThemedText style={S.mthUniformLabel} numberOfLines={1} adjustsFontSizeToFit>TỔNG CALO TIÊU THỤ</ThemedText>
                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <ThemedText style={S.mthUniformVal}>
                              {Math.round(monthData.totalCalories).toLocaleString()}
                            </ThemedText>
                            <ThemedText style={[S.mthEnergyUnit, { marginLeft: 4, textTransform: 'none' }]}>kcal</ThemedText>
                          </View>
                        </View>
                      </View>
                    </Tilt3DCard>

                    {/* Chip 2: Ngày tốt nhất */}
                    <Tilt3DCard width={(cardW - 12) / 2} height={140} maxTilt={5} showReflection={false} useDeviceMotion activeTouch={false}>
                      <View style={[S.mthUniformCard, { width: (cardW - 12) / 2 }]}>
                        <Ionicons name="trophy" size={24} color={P.tertiary} style={{ marginBottom: 8 }} />
                        <ThemedText style={S.mthUniformLabel} numberOfLines={1} adjustsFontSizeToFit>NGÀY TỐT NHẤT</ThemedText>
                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <ThemedText style={S.mthUniformVal}>
                              {bestDayDate ? bestDayDate.getDate() : '--'}
                            </ThemedText>
                            {bestDayDate && (
                              <ThemedText style={[S.mthUniformVal, { marginLeft: 8 }]}>
                                Tháng {bestDayDate.getMonth() + 1}
                              </ThemedText>
                            )}
                          </View>
                        </View>
                      </View>
                    </Tilt3DCard>

                    {/* Chip 3: Cân nặng (số kg đã giảm/tăng) */}
                    <Tilt3DCard width={(cardW - 12) / 2} height={140} maxTilt={5} showReflection={false} useDeviceMotion activeTouch={false}>
                      <View style={[S.mthUniformCard, { width: (cardW - 12) / 2 }]}>
                        <Ionicons name="analytics" size={24} color="#34d399" style={{ marginBottom: 8 }} />
                        <ThemedText style={S.mthUniformLabel} numberOfLines={1} adjustsFontSizeToFit>CÂN NẶNG THAY ĐỔI</ThemedText>
                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                          <ThemedText style={S.mthUniformVal} numberOfLines={1} adjustsFontSizeToFit>
                            {weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : '-- kg'}
                          </ThemedText>
                           <ThemedText style={weightChange !== null && weightChange < 0 ? S.mthUniformTagGreen : S.mthUniformTagGray}>
                            {weightChange !== null ? (weightChange < 0 ? 'GIẢM TỐT' : weightChange === 0 ? 'GIỮ ỔN ĐỊNH' : 'TĂNG') : 'ĐANG THEO DÕI'}
                          </ThemedText>
                        </View>
                      </View>
                    </Tilt3DCard>

                    {/* Chip 4: Nước uống (Tổng lượng tháng) */}
                    <Tilt3DCard width={(cardW - 12) / 2} height={140} maxTilt={5} showReflection={false} useDeviceMotion activeTouch={false}>
                      <View style={[S.mthUniformCard, { width: (cardW - 12) / 2 }]}>
                        <Ionicons name="water" size={24} color="#3b82f6" style={{ marginBottom: 8 }} />
                        <ThemedText style={S.mthUniformLabel} numberOfLines={1} adjustsFontSizeToFit>TỔNG NƯỚC UỐNG</ThemedText>
                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                          <ThemedText style={S.mthUniformVal} numberOfLines={1} adjustsFontSizeToFit>
                            {monthlyWater ? `${(monthlyWater.totalMl / 1000).toFixed(1)} L` : '0.0 L'}
                          </ThemedText>
                          <ThemedText style={S.mthUniformTagGray}>TỔNG LƯỢNG</ThemedText>
                        </View>
                      </View>
                    </Tilt3DCard>

                  </View>
                </Animated.View>
              )}
            </>
          );
        })()}

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

  /* ═══ MONTH TAB ═══ */
  mthChartCard: {
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    minHeight: 240,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mthGoalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mthGoalDash: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(75, 226, 119, 0.3)',
  },
  mthGoalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(75, 226, 119, 0.6)',
  },
  mthWeekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  mthWeekLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate500,
  },

  /* Floating summary */
  mthFloatWrap: {
    marginTop: 0,
    zIndex: 10,
  },
  mthFloatCard: {
    flex: 1,
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mthFloatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate400,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mthFloatPct: {
    fontSize: 40,
    fontWeight: '900',
    color: P.primary,
    letterSpacing: -2,
    lineHeight: 46,
  },
  mthFloatSub: {
    fontSize: 12,
    fontWeight: '600',
    color: P.textSlate500,
    marginTop: 4,
  },

  /* Heatmap section */
  mthHeatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  mthHeatTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: P.onSurface,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  mthHeatBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: P.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mthHeatCard: {
    backgroundColor: 'rgba(37, 41, 58, 0.4)',
    borderRadius: 24,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  /* Energy insight */
  mthEnergyCard: {
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mthEnergyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mthEnergyVal: {
    fontSize: 22,
    fontWeight: '800',
    color: P.onSurface,
  },
  mthEnergyUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: P.onSurface,
    opacity: 0.6,
  },
  mthEnergyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(75, 226, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 2-col grid */
  mthGrid2: {
    flexDirection: 'row',
    gap: 12,
  },

  /* Shared Unified Chips */
  mthUniformCard: {
    height: 140,
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mthUniformLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  mthUniformVal: {
    fontSize: 24,
    fontWeight: '900',
    color: P.onSurface,
  },
  mthUniformTagGray: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSlate500,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mthUniformTagGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* ═══ WEEK TAB REDESIGN ═══ */
  wkRingCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',

    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  wkRingUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: P.onSurfaceVariant,
    marginTop: 4,
  },
  wkRingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: P.primary,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  wkRingSub: {
    fontSize: 13,
    fontWeight: '600',
    color: P.onSurfaceVariant,
    marginTop: 4,
  },

  /* Glassmorphism chart */
  wkGlassChart: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',

    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  wkChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  wkChartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: P.onSurface,
  },
  wkAvgBadge: {
    backgroundColor: 'rgba(75,226,119,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  wkAvgBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: P.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  wkChartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  wkLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wkLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  wkLegendText: {
    fontSize: 10,
    fontWeight: '800',
    color: P.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  wkBarsArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 4,
  },
  wkGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(61,74,61,0.2)',
    top: 0,
  },
  wkBarCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  wkBarTrack: {
    width: 28,
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
  },
  wkBarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: P.primary,
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    shadowColor: P.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  wkBarDotBest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -6,
    borderWidth: 2,
    borderColor: P.surfaceContainer,
    shadowColor: P.primary,
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  wkBarDotWorst: {
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -6,
    borderWidth: 2,
    borderColor: P.surfaceContainer,
    backgroundColor: P.tertiaryContainer,
    shadowColor: P.tertiaryContainer,
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  wkDayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  wkDayLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: P.onSurfaceVariant,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  wkDayLblBest: {
    color: P.primary,
    fontWeight: '900',
  },

  /* Protein card */
  wkProteinCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  wkProteinHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  wkProteinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(23, 84, 40, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wkProteinTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: P.onSurface,
  },
  wkProteinBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  wkProteinVal: {
    fontSize: 26,
    fontWeight: '900',
    color: P.onSurface,
    paddingHorizontal: 4,
  },
  wkProteinTarget: {
    fontSize: 12,
    fontWeight: '600',
    color: P.onSurfaceVariant,
  },
  wkProteinBarTrack: {
    width: 96,
    height: 8,
    backgroundColor: P.surfaceContainerHighest,
    borderRadius: 99,
    overflow: 'hidden',
  },
  wkProteinBarFill: {
    height: '100%',
    borderRadius: 99,
    shadowColor: P.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },

  /* Mini macro cards (Carbs / Fat) */
  wkMiniMacro: {
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'space-between',
    height: 130,
  },
  wkMiniMacroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wkMiniMacroIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wkMiniMacroLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: P.onSurfaceVariant,
  },
  wkMiniMacroVal: {
    fontSize: 28,
    fontWeight: '900',
    color: P.onSurface,
  },
  wkMiniMacroUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: P.onSurfaceVariant,
    marginLeft: 2,
  },
});

export default StatsScreen;
