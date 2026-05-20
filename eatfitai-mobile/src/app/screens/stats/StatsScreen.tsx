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
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
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
import MeshBackground from '../../../components/ui/MeshBackground';
import * as Haptics from 'expo-haptics';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CompositeNavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../../../components/ThemedText';
import { useStatsStore } from '../../../store/useStatsStore';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { summaryService } from '../../../services/summaryService';
import type { WeeklyReview } from '../../../services/summaryService';
import { trackEvent } from '../../../services/analytics';
import { handleApiError } from '../../../utils/errorHandler';
import { StatsSkeleton } from '../../../components/skeletons/StatsSkeleton';
import Tilt3DCard from '../../../components/ui/Tilt3DCard';
import { TEST_IDS } from '../../../testing/testIds';
import MoChiInlineNotice from '../../../features/mochi/MoChiInlineNotice';
import MoChiScreenState from '../../../features/mochi/MoChiScreenState';
import type { RootStackParamList } from '../../types';
import { waterService, type WaterIntakeData, type MonthlyWaterData, type WeeklyWaterData } from '../../../services/waterService';
import { profileService } from '../../../services/profileService';
import { useQuery } from '@tanstack/react-query';
import logger from '../../../utils/logger';
import {
  formatShortWeekdayLabel,
  formatWeekRangeLabel,
} from '../../../utils/dateDisplay';
import { formatLocalDate } from '../../../utils/localDate';
import type { AppTabsParamList } from '../../navigation/AppTabs';
import { useEN } from '../../../theme/emeraldNebula';
import { useAppTheme } from '../../../theme/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ═══════════════════════════════════════════════
   Palette — exact match with HTML template
   ═══════════════════════════════════════════════ */
const P_STATIC = {
  // Surfaces (from template tailwind config)
  bg: '#05070d',
  surface: '#05070d',
  surfaceContainerLowest: '#090e1c',
  surfaceContainerLow: '#0f1625',
  surfaceContainer: '#1a1f2f',
  surfaceContainerHigh: '#252b3f',
  surfaceContainerHighest: '#2f364b',
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
  onSurfaceVariant: '#b7c4d9',
  textSlate400: '#9aa9c1',
  textSlate500: '#64748b',
  // Outline
  outline: '#869585',
  outlineVariant: '#3d4a3d',
  // Misc
  error: '#ff8c8c',
  glassCard: 'rgba(47, 52, 69, 0.4)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
};
const P = P_STATIC;

/* ─── Meal type meta ─── */
const MEAL_META: Record<number, { color: string; label: string }> = {
  1: { color: '#f7c052', label: 'BỮA SÁNG' },   // Amber
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

const cardW = SCREEN_WIDTH - 40; // 20px content margins * 2

type StatsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'StatsTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

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
const RING_SIZE = 166; // compact health dashboard ring
const RING_STROKE = 10;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
const StatsScreen = (): React.ReactElement => {
  const insets = useSafeAreaInsets();
  const EN = useEN();
  const { mode } = useAppTheme();
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const P = {
    ...P_STATIC,
    bg: EN.bg,
    surface: EN.bg,
    surfaceContainerLowest: EN.surfaceLow,
    surfaceContainerLow: EN.surfaceLow,
    surfaceContainer: EN.surface,
    surfaceContainerHigh: EN.surfaceHigh,
    surfaceContainerHighest: EN.surfaceHighest,
    primary: EN.primary,
    primaryContainer: EN.primaryContainer,
    onSurface: EN.onSurface,
    onSurfaceVariant: EN.onSurfaceVariant,
    textSlate400: EN.textMuted,
    textSlate500: EN.textMuted,
    outlineVariant: EN.outlineVariant,
    glassCard: EN.glassBg,
    glassBorder: EN.glassBorder,
  };
  const navigation = useNavigation<StatsScreenNavigationProp>();
  const route = useRoute<RouteProp<AppTabsParamList, 'StatsTab'>>();
  const weeklyReviewSource = route.params?.source ?? 'stats';
  const focusWeeklyReview = route.params?.focusWeeklyReview === true;

  const [activeTab, setActiveTab] = useState<TabOption>('today');
  const [hasTrackedWeeklyReviewOpen, setHasTrackedWeeklyReviewOpen] = useState(false);
  const [pendingWeeklyReviewFocus, setPendingWeeklyReviewFocus] = useState(focusWeeklyReview);
  const [isWeeklyReviewFocused, setIsWeeklyReviewFocused] = useState(focusWeeklyReview);

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
    staleTime: 2 * 60 * 1000, // 2 phút — share cache với HomeScreen
    enabled: activeTab === 'today',
  });
  const statsWaterAmount = statsWaterData?.amountMl ?? 0;
  const statsWaterTarget = statsWaterData?.targetMl ?? 2000;

  /* ─── Data: Weekly Water ─── */
  const weekStartDate = selectedWeekDate;
  const weekEndDateStr = useMemo(() => {
    const d = new Date(selectedWeekDate);
    d.setDate(d.getDate() + 6);
    return formatLocalDate(d);
  }, [selectedWeekDate]);
  const { data: weeklyWaterData } = useQuery<WeeklyWaterData>({
    queryKey: ['water-intake-weekly', weekStartDate, weekEndDateStr],
    queryFn: () => waterService.getWeeklyWaterIntake(weekStartDate, weekEndDateStr),
    staleTime: 2 * 60 * 1000,
    enabled: activeTab === 'week',
  });

  // Custom water target (per user, stored locally) — used to compute weekly target correctly
  const [customWaterTargetMl, setCustomWaterTargetMl] = useState<number | null>(null);
  useEffect(() => {
    if (activeTab === 'week') {
      waterService.getCustomWaterTarget().then(setCustomWaterTargetMl);
    }
  }, [activeTab]);
  // Effective daily target: prefer local custom target, then API value, then default 2000
  const effectiveWaterTargetMl = customWaterTargetMl ?? weeklyWaterData?.targetMl ?? 2000;

  /* ─── Data: Profile ─── */

  /* ─── Data: Month extras (weight change + water average) ─── */
  const [monthlyWater, setMonthlyWater] = useState<MonthlyWaterData | null>(null);
  const [weightChange, setWeightChange] = useState<number | null>(null);
  const {
    data: weeklyReview,
    isFetching: isFetchingWeeklyReview,
    refetch: refetchWeeklyReview,
  } = useQuery<WeeklyReview>({
    queryKey: ['analytics', 'weekly-review'],
    queryFn: () => summaryService.getWeeklyReview(),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'week',
  });

  useEffect(() => {
    fetchWeekSummary();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!focusWeeklyReview) {
      return;
    }

    setPendingWeeklyReviewFocus(true);
    setIsWeeklyReviewFocused(true);
  }, [focusWeeklyReview]);

  useEffect(() => {
    if (!pendingWeeklyReviewFocus) {
      return;
    }

    if (activeTab !== 'week') {
      setActiveTab('week');
    }

    setPendingWeeklyReviewFocus(false);
    navigation.setParams({
      focusWeeklyReview: undefined,
    });
  }, [activeTab, navigation, pendingWeeklyReviewFocus]);

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
          (a.measuredDate || '').localeCompare(b.measuredDate || ''),
        );
        const first = sorted[0]?.weightKg;
        const last = sorted[sorted.length - 1]?.weightKg;
        if (first && last) setWeightChange(Number((last - first).toFixed(1)));
      }
    } catch (e) {
      logger.warn('[StatsScreen] fetchMonthExtras failed', e);
    }
  }, [currentMonth]);

  const fetchMonthData = useCallback(async () => {
    setIsLoadingMonth(true);
    try {
      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth();
      const s = formatLocalDate(new Date(y, m, 1));
      const e = formatLocalDate(new Date(y, m + 1, 0));
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

  useEffect(() => {
    if (activeTab === 'month') {
      if (!monthData) fetchMonthData();
      fetchMonthExtras();
    }
  }, [activeTab, monthData, fetchMonthData, fetchMonthExtras]);

  useEffect(() => {
    if (activeTab !== 'week' || !weeklyReview || hasTrackedWeeklyReviewOpen) {
      return;
    }

    trackEvent('weekly_review_open', {
      category: 'product',
      flow: 'retention',
      step: 'weekly_review',
      status: 'opened',
      screen: 'StatsScreen',
      metadata: {
        source: weeklyReviewSource,
        focused: isWeeklyReviewFocused,
        reviewStatus: weeklyReview.status,
        confidence: weeklyReview.confidence,
        dataQuality: weeklyReview.dataQuality,
      },
    });
    setHasTrackedWeeklyReviewOpen(true);
  }, [
    activeTab,
    hasTrackedWeeklyReviewOpen,
    isWeeklyReviewFocused,
    weeklyReview,
    weeklyReviewSource,
  ]);

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
    if (tab !== 'week' && isWeeklyReviewFocused) {
      setIsWeeklyReviewFocused(false);
    }
    setActiveTab(tab);
  };

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'today') { fetchSummary(); fetchWeekSummary(); }
    else if (activeTab === 'week') {
      fetchWeekSummary();
      void refetchWeeklyReview();
    }
    else fetchMonthData();
  }, [activeTab, fetchSummary, fetchWeekSummary, fetchMonthData, refetchWeeklyReview]);

  const handleDayPress = useCallback(
    (date: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('MealDiary', { selectedDate: date });
    },
    [navigation],
  );

  const isLoading =
    activeTab === 'month'
      ? isLoadingMonth
      : isLoadingWeek || (activeTab === 'week' && isFetchingWeeklyReview);

  if (isLoading && !weekSummary && !monthData && !summary) return <StatsSkeleton />;

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <View
      style={[S.root, { paddingTop: insets.top, backgroundColor: P.bg }]}
      testID={TEST_IDS.stats.screen}
    >
      <MeshBackground />
      <StatusBar barStyle={mode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={P.bg} />

      {/* ══════ APP BAR ══════ */}
      <View style={S.appBar}>
        <View style={S.appBarSide} />
        <ThemedText style={[S.appBarTitle, { color: P.onSurface }]}>Thống kê</ThemedText>
        <View style={S.appBarSide} />
      </View>

      {/* ══════ TAB SWITCHER ══════ */}
      <View style={S.tabWrap}>
        <View style={[S.tabPill, { backgroundColor: P.glassCard, borderColor: P.glassBorder }]}>
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
                style={[S.tabBtn, on && S.tabBtnOn, on && { backgroundColor: P.primaryContainer }]}
                testID={testID}
              >
                <ThemedText style={[S.tabTxt, { color: P.onSurfaceVariant }, on && S.tabTxtOn, on && { color: P.onPrimary }]}>{label}</ThemedText>
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
        {activeTab === 'today' && !isLoading && todayCal <= 0 && (
          <MoChiInlineNotice mochiEvent="stats_low_data" routeName="StatsTab" compact tone="calm" />
        )}

        {/* ═══════════ TODAY ═══════════ */}
        {activeTab === 'today' && (
          <>
            <View style={S.dateMetaRow}>
              <Ionicons name="calendar-outline" size={15} color={P.textSlate400} />
              <ThemedText style={S.dateMetaText}>{formatViDate()}</ThemedText>
            </View>

            {/* ── HERO CARD ── */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Tilt3DCard
                width={cardW}
                height={340}
                maxTilt={2}
                showReflection={false}
                useDeviceMotion={false}
                activeTouch={false}
              >
                <View style={[S.heroCard, { backgroundColor: P.glassCard, borderColor: P.glassBorder }]}>
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
                        <ThemedText style={[S.ringBig, { color: P.onSurface }]}>
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
                      label="ĐẠM"
                      value={protein}
                      target={targetP}
                      valueColor="#34d399" /* emerald-400 */
                      gradientFrom="#10b981" /* emerald-500 */
                      gradientTo="#6ee7b7" /* emerald-300 */
                      P={P}
                    />
                    {/* Carbs: secondary gradient */}
                    <MacroBar
                      label="TINH BỘT"
                      value={carbs}
                      target={targetC}
                      valueColor={P.secondary}
                      gradientFrom={P.secondary}
                      gradientTo={P.secondaryFixed}
              P={P}
            />
                    {/* Fat: tertiary gradient */}
                    <MacroBar
                      label="CHẤT BÉO"
                      value={fat}
                      target={targetF}
                      valueColor={P.tertiaryContainer}
                      gradientFrom={P.tertiaryContainer}
                      gradientTo={P.tertiaryFixed}
              P={P}
            />
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── PHÂN BỔ BỮA ĂN ── */}
            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <Tilt3DCard
                width={cardW}
                height={totalMealCal > 0 ? 210 : 128}
                maxTilt={2}
                showReflection={false}
                useDeviceMotion={false}
                activeTouch={false}
              >
                <View style={[S.distCard, { backgroundColor: P.glassCard, borderColor: P.glassBorder }]}>
                  {/* Title row */}
                  <View style={S.distHead}>
                    <ThemedText style={[S.distTitle, { color: P.onSurface }]}>Phân bổ bữa ăn</ThemedText>
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
                height={122}
                maxTilt={2}
                showReflection={false}
                useDeviceMotion={false}
                activeTouch={false}
              >
                  <View style={[S.waterCard, { backgroundColor: P.glassCard, borderColor: P.glassBorder }]}>
                  <LinearGradient
                    colors={['rgba(226,232,240,0.12)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Header */}
                  <View style={S.waterHead}>
                    <View style={S.waterLeft}>
                      <View style={S.waterIconBox}>
                        <Ionicons name="water" size={20} color="#0EA5E9" />
                      </View>
                      <ThemedText style={[S.waterLabel, { color: P.textSlate500 }]}>LƯỢNG NƯỚC</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <ThemedText style={[S.waterBig, { color: P.onSurface }]}>
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
                          color={filled ? '#0EA5E9' : P.surfaceContainerHighest}
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
          const wkMaxDay = Math.max(...weekSummary.days.map(d => d.calories), 1);
          // Scale chart so the target is always visible in the upper half
          const wkMaxC = Math.max(wkMaxDay, (typeof targetCal === 'number' && targetCal > 0 ? targetCal * 1.2 : 1));
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

          // --- NEW: Averages & Days On Track ---
          const wkLoggedDaysCount = wkLoggedDays.length;
          const avgDailyCal = wkLoggedDaysCount > 0 ? Math.round(wkTotalCal / wkLoggedDaysCount) : 0;
          const avgDailyProtein = wkLoggedDaysCount > 0 ? Math.round(weekSummary.totalProtein / wkLoggedDaysCount) : 0;
          const avgDailyCarbs = wkLoggedDaysCount > 0 ? Math.round(weekSummary.totalCarbs / wkLoggedDaysCount) : 0;
          const avgDailyFat = wkLoggedDaysCount > 0 ? Math.round(weekSummary.totalFat / wkLoggedDaysCount) : 0;

          // Days On Track: Calo nạp vào xấp xỉ mức cho phép (từ 70% đến 115% target)
          const daysOnTrack = wkLoggedDays.filter(d => d.calories >= targetCal * 0.7 && d.calories <= targetCal * 1.15).length;

          return (
          <>
            {/* Week nav */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <View style={[S.weekNav, { backgroundColor: P.surfaceContainerLow }]}>
                <Pressable onPress={goToPreviousWeek} style={S.wkBtn}>
                  <Ionicons name="chevron-back" size={20} color={P.primary} />
                </Pressable>
                <ThemedText style={[S.wkTitle, { color: P.onSurface }]}>
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
                    style={[StyleSheet.absoluteFill, S.weekCardGradient]}
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
                        <ThemedText style={[S.ringBig, { color: P.onSurface }]}>
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

                  {/* Averages & Perfect Days */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                    <View style={{ alignItems: 'center' }}>
                      <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 11, fontFamily: 'BeVietnamPro_700Bold', letterSpacing: 0.5 }}>TRUNG BÌNH</ThemedText>
                      <ThemedText style={{ color: P.onSurface, fontSize: 15, fontFamily: 'BeVietnamPro_700Bold', marginTop: 2 }}>{avgDailyCal} <ThemedText style={{ fontSize: 11, fontFamily: 'BeVietnamPro_500Medium' }}>kcal/ngày</ThemedText></ThemedText>
                    </View>
                    <View style={{ width: 1, backgroundColor: P.glassBorder, height: '100%' }} />
                    <View style={{ alignItems: 'center' }}>
                      <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 11, fontFamily: 'BeVietnamPro_700Bold', letterSpacing: 0.5 }}>ĐẠT MỤC TIÊU</ThemedText>
                      <ThemedText style={{ color: P.primary, fontSize: 15, fontFamily: 'BeVietnamPro_700Bold', marginTop: 2 }}>{daysOnTrack} <ThemedText style={{ fontSize: 11, fontFamily: 'BeVietnamPro_500Medium', color: P.primary }}>ngày</ThemedText></ThemedText>
                    </View>
                  </View>
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
                    colors={['rgba(226,232,240,0.12)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, S.weekCardGradient]}
                  />
                  {/* Header row */}
                  <View style={S.wkChartHeader}>
                    <ThemedText style={S.wkChartTitle}>Xu hướng Calo</ThemedText>
                    <View style={S.wkTargetBadge}>
                      <ThemedText style={S.wkTargetBadgeText}>
                        MỤC TIÊU: {Math.round(targetCal).toLocaleString()}
                      </ThemedText>
                      <View style={S.wkTargetLineIcon} />
                    </View>
                  </View>

                  {/* Bars */}
                  <View style={S.wkBarsArea}>
                    {/* Background Target Line */}
                    <View style={[S.wkTargetLine, { bottom: (targetCal / wkMaxC) * 160 }]} />

                    {weekSummary.days.map((day, idx) => {
                      const h = (day.calories / wkMaxC) * 160;
                      const isBest = idx === wkBestDayIdx;
                      const isWorst = idx === wkWorstDayIdx;
                      return (
                        <Pressable
                          key={day.date}
                          style={S.wkBarCol}
                          onPress={() => handleDayPress(day.date)}
                        >
                          <View style={[S.wkBarTrack, { height: Math.max(h, 4) }]}>
                            {isBest && (
                              <ThemedText style={S.wkBarFloatLabel}>{formatShortWeekdayLabel(new Date(day.date))}</ThemedText>
                            )}
                            {isBest ? (
                              <LinearGradient
                                colors={['#4BE277', '#3DB860']}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 0, y: 0 }}
                                style={[StyleSheet.absoluteFill, { borderRadius: 8, shadowColor: '#4BE277', shadowOpacity: 0.6, shadowRadius: 10, elevation: 5 }]}
                              />
                            ) : isWorst ? (
                              <LinearGradient
                                colors={['#2c543f', '#203d2e']}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 0, y: 0 }}
                                style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
                              />
                            ) : (
                              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
                            )}
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
                height={122}
                maxTilt={2}
                showReflection={false}
                useDeviceMotion={false}
                activeTouch={false}
              >
                <View style={S.wkProteinCard}>
                  <LinearGradient
                    colors={['rgba(226,232,240,0.12)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                  />
                  <View style={S.wkProteinHead}>
                    <View style={[S.wkProteinIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="flash" size={16} color="#ff8c8c" />
                    </View>
                    <ThemedText style={S.wkProteinTitle}>Đạm</ThemedText>
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
                      <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 12, marginTop: 4, fontFamily: 'BeVietnamPro_500Medium' }}>
                        Trung bình: {avgDailyProtein} g/ngày
                      </ThemedText>
                    </View>
                    <View style={S.wkProteinBarTrack}>
                      <LinearGradient
                        colors={['#ff8c8c', '#fca5a5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.wkProteinBarFill, { width: `${Math.round(wkProteinPct * 100)}%` as any, shadowColor: '#ff8c8c' }]}
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
                height={122}
                maxTilt={2}
                showReflection={false}
                useDeviceMotion={false}
                activeTouch={false}
              >
                <View style={S.wkProteinCard}>
                  <LinearGradient
                    colors={['rgba(226,232,240,0.12)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                  />
                  <View style={S.wkProteinHead}>
                    <View style={[S.wkProteinIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="leaf" size={16} color="#3b82f6" />
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
                      <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 12, marginTop: 4, fontFamily: 'BeVietnamPro_500Medium' }}>
                        Trung bình: {avgDailyCarbs} g/ngày
                      </ThemedText>
                    </View>
                    <View style={S.wkProteinBarTrack}>
                      <LinearGradient
                        colors={['#3b82f6', '#93c5fd']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.wkProteinBarFill, { width: `${Math.round(wkCarbsPct * 100)}%` as any, shadowColor: '#3b82f6' }]}
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
                height={122}
                maxTilt={2}
                showReflection={false}
                useDeviceMotion={false}
                activeTouch={false}
              >
                <View style={S.wkProteinCard}>
                  <LinearGradient
                    colors={['rgba(226,232,240,0.12)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                  />
                  <View style={S.wkProteinHead}>
                    <View style={[S.wkProteinIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                      <Ionicons name="water" size={16} color="#f7c052" />
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
                      <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 12, marginTop: 4, fontFamily: 'BeVietnamPro_500Medium' }}>
                        Trung bình: {avgDailyFat} g/ngày
                      </ThemedText>
                    </View>
                    <View style={S.wkProteinBarTrack}>
                      <LinearGradient
                        colors={['#f7c052', '#fde047']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.wkProteinBarFill, { width: `${Math.round(wkFatPct * 100)}%` as any, shadowColor: '#f7c052' }]}
                      />
                    </View>
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── WEEKLY WATER ── */}
            <Animated.View entering={FadeInUp.delay(500).springify()}>
              <Tilt3DCard
                width={cardW}
                height={122}
                maxTilt={2}
                showReflection={false}
                useDeviceMotion={false}
                activeTouch={false}
              >
                <View style={S.wkProteinCard}>
                  <LinearGradient
                    colors={['rgba(226,232,240,0.12)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                  />
                  <View style={S.wkProteinHead}>
                    <View style={[S.wkProteinIcon, { backgroundColor: 'rgba(14,165,233,0.15)' }]}>
                      <Ionicons name="water" size={16} color="#0EA5E9" />
                    </View>
                    <ThemedText style={S.wkProteinTitle}>Lượng nước</ThemedText>
                  </View>
                  <View style={S.wkProteinBottom}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <ThemedText style={S.wkProteinVal}>
                          {((weeklyWaterData?.totalMl ?? 0) / 1000).toFixed(1)}
                        </ThemedText>
                        <ThemedText style={S.wkProteinTarget}>
                          {' '}/ {((effectiveWaterTargetMl * 7) / 1000).toFixed(1)}L
                        </ThemedText>
                      </View>
                      <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 12, marginTop: 4, fontFamily: 'BeVietnamPro_500Medium' }}>
                        Trung bình: {((weeklyWaterData?.averageMl ?? 0) / 1000).toFixed(1)} L/ngày
                      </ThemedText>
                    </View>
                    <View style={S.wkProteinBarTrack}>
                      <LinearGradient
                        colors={['#0EA5E9', '#7dd3fc']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[S.wkProteinBarFill, { width: `${Math.min(100, Math.round(((weeklyWaterData?.totalMl ?? 0) / (effectiveWaterTargetMl * 7)) * 100))}%` as any, shadowColor: '#0EA5E9' }]}
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
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <MoChiScreenState
                          mochiEvent="stats_low_data"
                          title="Đang tải thống kê"
                          message="MoChi đang tổng hợp xu hướng trong tháng."
                          showSpinner
                          variant="compact"
                        />
                      </View>
                    ) : monthData && weekAvgs.length > 0 ? (
                      <View style={{ flex: 1 }}>
                        {/* Goal line */}
                        <View style={{ position: 'absolute', top: '25%', left: 0, right: 0, zIndex: 10 }}>
                          <ThemedText style={{ ...S.mthGoalLabel, textAlign: 'right', marginBottom: 4 }}>
                            Mục tiêu: {Math.round(targetCal).toLocaleString()} kcal
                          </ThemedText>
                          <View style={{ height: 1, width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
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
                  <View style={[S.mthHeatCard, { backgroundColor: P.glassCard, borderColor: P.glassBorder }]}>
                    {isLoadingMonth ? (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
                        <ThemedText style={{ color: P.textSlate400, fontSize: 13, fontFamily: 'BeVietnamPro_700Bold', textAlign: 'center' }}>
                          Đang cập nhật dữ liệu từng ngày
                        </ThemedText>
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
                            const txtColor: string = P.textSlate500;
                            let opacity = 0.5;

                            if (isRealDay) {
                              const dData = monthData?.days.find(md => {
                                 const dateObj = new Date(md.date);
                                 return dateObj.getDate() === d && dateObj.getMonth() === currentMonth.getMonth();
                              });
                              const cal = dData?.calories || 0;
                              if (cal > 0) {
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
                                  borderRadius: 999,
                                  backgroundColor: isRealDay ? bgColor : 'transparent',
                                  margin: 4,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isRealDay && (
                                  <ThemedText style={{ fontSize: 11, fontFamily: 'BeVietnamPro_700Bold', color: txtColor, opacity }}>
                                    {d}
                                  </ThemedText>
                                )}
                              </View>
                            );
                          })}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' }}/>
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
                      <View style={[S.mthEnergyIcon, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                        <Ionicons
                          name="water-outline"
                          size={24}
                          color="#0EA5E9"
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
                        <Ionicons name="water" size={24} color="#0EA5E9" style={{ marginBottom: 8 }} />
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
          <View style={{ paddingVertical: 32 }}>
            <MoChiScreenState
              mochiEvent="stats_low_data"
              title="Đang cập nhật thống kê"
              message="MoChi đang làm mới số liệu dinh dưỡng."
              showSpinner
            />
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
  P: any;
}) => (
  <View style={S.mBar}>
    <View style={S.mBarHead}>
      <ThemedText style={[S.mBarLabel, { color: P.textSlate500 }]}>{label}</ThemedText>
      <ThemedText style={[S.mBarValue, { color: valueColor }]}>
        {Math.round(value)}/{target}g
      </ThemedText>
    </View>
    <View style={[S.mBarTrack, { backgroundColor: P.surfaceContainerLowest }]}>
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

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  /* App bar */
  appBar: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appBarSide: { width: 44, height: 44 },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    letterSpacing: -0.2,
  },

  /* Tabs — glass-card pill style */
  tabWrap: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  tabPill: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: P.glassCard,
    borderRadius: 16,
    padding: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  tabTxt: { fontSize: 14, fontFamily: 'BeVietnamPro_700Bold', color: P.textSlate400 },
  tabTxtOn: { color: P.onPrimaryContainer, fontWeight: '700' },

  /* Scroll */
  scroll: { paddingHorizontal: 20, paddingBottom: 140, gap: 16 },
  dateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    marginBottom: -2,
  },
  dateMetaText: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.primary,
    letterSpacing: -0.1,
  },

  /* ── Hero Card — vertical layout (ring top, macros bottom) ── */
  heroCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  heroRingWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heroRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringBig: {
    fontSize: 32,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    letterSpacing: -1.5,
    lineHeight: 38,
  },
  ringUnit: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  heroMacros: { gap: 14 },

  /* Macro bar sub-component */
  mBar: { gap: 5 },
  mBarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  mBarLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.textSlate400,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mBarValue: { fontSize: 14, fontWeight: '700' },
  mBarTrack: {
    height: 7,
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  distHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  distTitle: { fontSize: 16, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface },
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
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.textSlate400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  distVal: { fontSize: 20, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface, paddingLeft: 16 },

  /* ── Lượng Nước ── */
  waterCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  waterBig: { fontSize: 22, fontFamily: 'BeVietnamPro_700Bold', color: '#fff' },
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  wkBtn: { padding: 8, borderRadius: 12 },
  wkTitle: { fontSize: 15, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface },

  weeklyReviewCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.6)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.12)',
    overflow: 'hidden',
  },
  weeklyReviewCardFocused: {
    borderColor: 'rgba(75, 226, 119, 0.4)',
    shadowColor: P.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  weeklyReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  weeklyReviewEyebrow: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_700Bold',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: P.primary,
    marginBottom: 6,
  },
  weeklyReviewTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    lineHeight: 24,
  },
  weeklyReviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(75, 226, 119, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(75, 226, 119, 0.18)',
  },
  weeklyReviewBadgeText: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.primary,
  },
  weeklyReviewMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  weeklyReviewMetric: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  weeklyReviewMetricValue: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    marginBottom: 4,
  },
  weeklyReviewMetricLabel: {
    fontSize: 11,
    color: P.textSlate400,
  },
  weeklyReviewRecommendations: {
    gap: 8,
    marginBottom: 16,
  },
  weeklyReviewRecommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  weeklyReviewRecommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: P.primary,
  },
  weeklyReviewRecommendationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: P.onSurface,
  },
  weeklyReviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  weeklyReviewFooterHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: P.textSlate400,
  },
  weeklyReviewButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: P.primary,
  },
  weeklyReviewButtonDone: {
    backgroundColor: P.surfaceContainerHighest,
  },
  weeklyReviewButtonText: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onPrimary,
  },

  chartCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    overflow: 'hidden',
    minHeight: 280,
  },
  secTitle: { fontSize: 16, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface, marginBottom: 8 },

  bars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    marginTop: 8,
  },
  barCol: { alignItems: 'center', flex: 1, gap: 4 },
  barVal: { fontSize: 9, fontFamily: 'BeVietnamPro_700Bold', color: P.textSlate400 },
  barTrack: {
    width: 20,
    height: 140,
    backgroundColor: P.surfaceContainerLowest,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { width: '100%', borderRadius: 10 },
  barLbl: { fontSize: 10, fontFamily: 'BeVietnamPro_700Bold', color: P.textSlate400, textTransform: 'uppercase' },

  /* Summary row */
  sumRow: { flexDirection: 'row', gap: 10 },
  sumCard: {
    flex: 1,
    backgroundColor: P.surfaceContainerLow,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  sumVal: { fontSize: 16, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface },
  sumLbl: { fontSize: 10, fontFamily: 'BeVietnamPro_700Bold', color: P.textSlate400 },

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
  macroV: { fontSize: 24, fontWeight: '700' },
  macroL: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
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
    borderColor: 'rgba(255,255,255,0.08)',
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
    borderStyle: 'solid', // Android: dashed+borderRadius không hoạt động, dùng solid
    borderColor: 'rgba(75, 226, 119, 0.3)',
  },
  mthGoalLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
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
    fontFamily: 'BeVietnamPro_700Bold',
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mthFloatLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.textSlate400,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mthFloatPct: {
    fontSize: 40,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.primary,
    letterSpacing: -2,
    lineHeight: 46,
  },
  mthFloatSub: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_600SemiBold',
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
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  mthHeatBadge: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
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
    borderColor: 'rgba(255,255,255,0.08)',
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mthEnergyLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.textSlate400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mthEnergyVal: {
    fontSize: 22,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
  },
  mthEnergyUnit: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mthUniformLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.textSlate400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  mthUniformVal: {
    fontSize: 24,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
  },
  mthUniformTagGray: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.textSlate500,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mthUniformTagGreen: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#34d399',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* ═══ WEEK TAB REDESIGN ═══ */
  wkRingCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    minHeight: 340,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  weekCardGradient: {
    borderRadius: 24,
  },
  wkRingUnit: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P.onSurfaceVariant,
    marginTop: 4,
  },
  wkRingTitle: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.primary,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  wkRingSub: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P.onSurfaceVariant,
    marginTop: 4,
  },

  /* Glassmorphism chart */
  wkGlassChart: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    minHeight: 300,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  wkChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10, // Ensure header is above chart bounds
  },
  wkChartTitle: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
  },
  wkTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wkTargetBadgeText: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  wkTargetLineIcon: {
    width: 24,
    height: 1,
    borderWidth: 1,
    borderStyle: 'solid', // Android: dashed+borderRadius không hoạt động, dùng solid
    borderColor: P.primary,
  },
  wkBarsArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 4,
    position: 'relative',
    marginTop: 20,
  },
  wkTargetLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderTopWidth: 1,
    borderStyle: 'solid', // Android: dashed+borderRadius không hoạt động, dùng solid
    borderColor: 'rgba(75, 226, 119, 0.25)',
    zIndex: -1,
  },
  wkBarCol: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  wkBarTrack: {
    width: 32,
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
  },
  wkBarFloatLabel: {
    position: 'absolute',
    top: -22,
    width: '150%',
    left: '-25%',
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.primary,
    textTransform: 'uppercase',
  },
  wkDayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  wkDayLbl: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurfaceVariant,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  wkDayLblBest: {
    color: P.primary,
    fontFamily: 'BeVietnamPro_700Bold',
  },

  /* Protein card */
  wkProteinCard: {
    backgroundColor: 'rgba(22, 27, 43, 0.5)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontFamily: 'BeVietnamPro_700Bold',
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
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
    paddingHorizontal: 8,
    marginLeft: -4, // Bù lại padding để không bị lệch quá xa
  },
  wkProteinTarget: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_600SemiBold',
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
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurfaceVariant,
  },
  wkMiniMacroVal: {
    fontSize: 28,
    fontFamily: 'BeVietnamPro_700Bold',
    color: P.onSurface,
  },
  wkMiniMacroUnit: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: P.onSurfaceVariant,
    marginLeft: 2,
  },
});

export default StatsScreen;
