import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  Dimensions,
  type ScrollView,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import MeshBackground from '../../components/ui/MeshBackground';

import { ThemedText } from '../../components/ThemedText';
import Screen from '../../components/Screen';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../types';
import { MEAL_TYPE_LABELS, type MealTypeId } from '../../types';
import type { DaySummary, DiaryEntry } from '../../services/diaryService';
import { healthService } from '../../services/healthService';
import { t } from '../../i18n/vi';
import { handleApiErrorWithCustomMessage } from '../../utils/errorHandler';
import { useGamificationStore } from '../../store/useGamificationStore';
import { HomeSkeleton } from '../../components/skeletons/HomeSkeleton';
import { WelcomeHeader } from '../../components/home/WelcomeHeader';
import { useProfileStore } from '../../store/useProfileStore';
import Tilt3DCard from '../../components/ui/Tilt3DCard';
import * as Haptics from 'expo-haptics';
import { TEST_IDS } from '../../testing/testIds';
import { waterService, type WaterIntakeData } from '../../services/waterService';
import type { AppTabsParamList } from '../navigation/AppTabs';
import MoChiInlineNotice from '../../features/mochi/MoChiInlineNotice';
import MoChiScreenState from '../../features/mochi/MoChiScreenState';
import MoChiTutorialTarget from '../../features/mochi/tutorial/MoChiTutorialTarget';
import {
  selectUnreadMoChiNotificationCount,
  useMoChiNotificationInboxStore,
} from '../../features/mochi/mochiNotificationInbox';
import { useMoChiVisibleTargetsStore } from '../../features/mochi/mochiVisibleTargets';
import { formatBusinessDate } from '../../utils/businessDate';
import { useEN } from '../../theme/emeraldNebula';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const WATER_TARGET_VISIBLE_BOTTOM_CLEARANCE = 260;

/* ─── Emerald Nebula palette (static fallback for WeekDayStrip/weekStyles) ─── */
const C_STATIC = {
  bg: '#05070d',
  surfaceLow: '#0f1625',
  surface: '#1a1f2f',
  surfaceHigh: '#252b3f',
  surfaceHighest: '#2f364b',
  primary: '#4be277',
  primaryDark: '#22c55e',
  cyan: '#32d7f0',
  amber: '#f7c052',
  onSurface: '#dee1f7',
  textMuted: '#9aa9c1',
  outline: 'rgba(226,232,240,0.12)',
  danger: '#ff8c8c',
};

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'HomeTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/* ═══════════════════════════════════════════════
   Helper: get meal label from entry time or index
   ═══════════════════════════════════════════════ */
const getMealLabelFromEntry = (entry: DiaryEntry): string => {
  if (entry.mealType && MEAL_TYPE_LABELS[entry.mealType as MealTypeId]) {
    return MEAL_TYPE_LABELS[entry.mealType as MealTypeId];
  }
  // Fallback: guess from recordedAt time
  const h = entry.recordedAt ? new Date(entry.recordedAt).getHours() : new Date().getHours();
  if (h >= 5 && h < 11) return 'Bữa sáng';
  if (h >= 11 && h < 14) return 'Bữa trưa';
  if (h >= 14 && h < 17) return 'Ăn vặt';
  return 'Bữa tối';
};

/* ═══════════════════════════════════════════════
   Helper: get food emoji
   ═══════════════════════════════════════════════ */
const getFoodEmoji = (foodName: string): string => {
  const name = foodName.toLowerCase();
  if (name.includes('cơm') || name.includes('rice')) return '🍚';
  if (name.includes('phở') || name.includes('noodle')) return '🍜';
  if (name.includes('gà') || name.includes('chicken')) return '🍗';
  if (name.includes('cá') || name.includes('fish') || name.includes('hồi')) return '🐟';
  if (name.includes('salad') || name.includes('rau')) return '🥗';
  if (name.includes('trứng') || name.includes('egg')) return '🥚';
  if (name.includes('sữa') || name.includes('milk')) return '🥛';
  if (name.includes('bánh')) return '🍞';
  if (name.includes('canh') || name.includes('soup')) return '🍲';
  return '🍽️';
};

/* ─── Date helpers ─── */
const VIET_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const isToday = (d: Date): boolean => {
  return formatBusinessDate(d) === formatBusinessDate();
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatShortDate = (d: Date): string => `${d.getDate()}/${d.getMonth() + 1}`;

const getWeekDays = (): Date[] => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

/* ─── WeekDayStrip Component ─── */
type WeekPalette = { surfaceLow: string; outline: string; textMuted: string; onSurface: string; primary: string };
const WeekDayStrip = ({ selectedDate, onSelectDate, palette }: { selectedDate: Date; onSelectDate: (d: Date) => void; palette: WeekPalette }) => {
  const days = useMemo(() => getWeekDays(), []);
  return (
    <View style={[weekStyles.container, { backgroundColor: palette.surfaceLow, borderColor: palette.outline }]}>
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate);
        const today = isToday(day);
        return (
          <Pressable
            key={day.toISOString()}
            style={weekStyles.dayBtn}
            onPress={() => onSelectDate(day)}
          >
            <ThemedText style={[weekStyles.dayLabel, { color: palette.textMuted }, selected && { color: palette.onSurface, fontFamily: 'BeVietnamPro_700Bold' }]}>
              {VIET_DAYS[day.getDay()]}
            </ThemedText>
            <View style={[weekStyles.dayNumContainer, selected && { backgroundColor: palette.primary }]}>
              <ThemedText style={[weekStyles.dayNum, { color: palette.onSurface }, selected && weekStyles.dayNumSelected]}>
                {day.getDate()}
              </ThemedText>
            </View>
            {today && !selected && <View style={[weekStyles.todayDot, { backgroundColor: palette.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
};

const weekStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_600SemiBold',
    textTransform: 'uppercase',
  },
  dayNumContainer: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayNum: {
    fontSize: 15,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  dayNumSelected: {
    color: '#003915',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: -2,
  },
});

const _WaterGlassIcon = ({ isPlus }: { isPlus: boolean }) => {
  const color = isPlus ? '#22c55e' : '#64748b';
  const liquidOpacity = isPlus ? 0.9 : 0.4;
  return (
    <View style={{ width: 22, height: 26, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width="22" height="26" viewBox="0 0 24 24" fill="none">
        {/* Fill */}
        <Path d="M5.5 12L6.5 20C6.6 20.6 7.2 21 7.8 21H16.2C16.8 21 17.4 20.6 17.5 20L18.5 12H5.5Z" fill={color} fillOpacity={liquidOpacity} />
        {/* Outline */}
        <Path d="M4 3L6.5 20C6.7 21.1 7.6 22 8.8 22H15.2C16.4 22 17.3 21.1 17.5 20L20 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <ThemedText style={{ position: 'absolute', fontSize: 16, fontFamily: 'BeVietnamPro_600SemiBold', color: '#fff', top: 3, width: '100%', textAlign: 'center' }}>
        {isPlus ? '+' : '−'}
      </ThemedText>
    </View>
  );
};

const HomeScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const EN = useEN();
  // Dynamic palette based on theme
  const C = {
    bg: EN.bg,
    surfaceLow: EN.surfaceLow,
    surface: EN.surface,
    surfaceHigh: EN.surfaceHigh,
    surfaceHighest: EN.surfaceHighest,
    primary: EN.primary,
    primaryDark: EN.primaryContainer,
    cyan: EN.cyan,
    amber: EN.amber,
    onSurface: EN.onSurface,
    textMuted: EN.textMuted,
    outline: EN.outline,
    danger: EN.danger,
  };

  const { profile } = useProfileStore();
  const userName = profile?.fullName || profile?.email?.split('@')[0] || '';
  const avatarUrl = profile?.avatarUrl;

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<AppTabsParamList, 'HomeTab'>>();
  const screenScrollRef = useRef<ScrollView>(null);
  const lastHandledWaterFocusRequestRef = useRef<number | undefined>(undefined);
  const summary = useDiaryStore((s) => s.summary);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);
  const queryClient = useQueryClient();
  const { isLoading, isFetching, isError, refetch } = useQuery<DaySummary | null>({
    queryKey: ['home-summary'],
    queryFn: async () => {
      await fetchSummary();
      return useDiaryStore.getState().summary ?? null;
    },
  });
  const [serverDown, setServerDown] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [waterCardY, setWaterCardY] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const notificationInboxItems = useMoChiNotificationInboxStore((state) => state.items);
  const markMoChiNotificationActed = useMoChiNotificationInboxStore((state) => state.markActed);
  const setMoChiVisibleTarget = useMoChiVisibleTargetsStore((state) => state.setVisibleTarget);
  const unreadNotificationCount = selectUnreadMoChiNotificationCount(notificationInboxItems);
  const homeWaterReminder = useMemo(() => {
    const now = Date.now();

    return notificationInboxItems.find((item) => {
      if (
        item.eventType !== 'water_reminder'
        || item.resolvedAt
        || item.actedAt
        || item.severity === 'passive'
      ) {
        return false;
      }

      const retryAfter = item.retryAfter ? Date.parse(item.retryAfter) : 0;
      return !retryAfter || retryAfter <= now;
    });
  }, [notificationInboxItems]);
  const waterTargetInlineReady = waterCardY != null
    && scrollY + SCREEN_HEIGHT - WATER_TARGET_VISIBLE_BOTTOM_CLEARANCE >= waterCardY;
  useEffect(() => {
    setMoChiVisibleTarget('HomeTab', 'water_reminder', waterTargetInlineReady);
    return () => setMoChiVisibleTarget('HomeTab', 'water_reminder', false);
  }, [setMoChiVisibleTarget, waterTargetInlineReady]);

  const handleHomeScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  }, []);

  // Water intake state
  const { data: waterData } = useQuery<WaterIntakeData>({
    queryKey: ['water-intake-today'],
    queryFn: () => waterService.getWaterIntake(new Date()),
    staleTime: 2 * 60 * 1000, // 2 phút — water data chỉ thay đổi khi user bấm (đã có optimistic update)
  });
  const waterAmount = waterData?.amountMl ?? 0;

  const handleAddWater = useCallback(async (
    options: { showConfirmationToast?: boolean } = {},
  ): Promise<boolean> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic Update
    const prevData = queryClient.getQueryData<WaterIntakeData>(['water-intake-today']);
    queryClient.setQueryData<WaterIntakeData>(['water-intake-today'], (old) => ({
      amountMl: (old?.amountMl ?? 0) + 200,
      targetMl: old?.targetMl ?? 2000,
      date: old?.date ?? formatBusinessDate(),
    }));

    try {
      await waterService.addWater(new Date());
      if (options.showConfirmationToast) {
        Toast.show({
          type: 'success',
          text1: 'Uống nước giỏi lắm! 💧',
          text2: 'Tốt lắm, thêm một ly nước rồi nè! 💧',
        });
      }
      return true;
    } catch (err: any) {
      if (prevData) {
        queryClient.setQueryData(['water-intake-today'], prevData);
      }
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể cập nhật lượng nước' });
      return false;
    }
  }, [queryClient]);

  const handleWaterReminderAction = useCallback(async () => {
    if (!homeWaterReminder) {
      return;
    }

    const added = await handleAddWater({ showConfirmationToast: true });
    if (added) {
      markMoChiNotificationActed(homeWaterReminder.id);
    }
  }, [handleAddWater, homeWaterReminder, markMoChiNotificationActed]);

  const handleSubtractWater = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic Update
    const prevData = queryClient.getQueryData<WaterIntakeData>(['water-intake-today']);
    const newAmount = Math.max(0, (prevData?.amountMl ?? 0) - 200);
    queryClient.setQueryData<WaterIntakeData>(['water-intake-today'], (old) => ({
      amountMl: newAmount,
      targetMl: old?.targetMl ?? 2000,
      date: old?.date ?? formatBusinessDate(),
    }));

    try {
      await waterService.subtractWater(new Date());
    } catch (err: any) {
      if (prevData) {
        queryClient.setQueryData(['water-intake-today'], prevData);
      }
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể cập nhật lượng nước' });
    }
  }, [queryClient]);
  const { currentStreak, checkStreak, fetchWeeklyLogs } = useGamificationStore();

  useEffect(() => {
    checkStreak();
    fetchWeeklyLogs();
  }, [checkStreak, fetchWeeklyLogs]);

  useEffect(() => {
    const focusWaterRequestId = route.params?.focusWaterRequestId;
    if (
      !focusWaterRequestId
      || lastHandledWaterFocusRequestRef.current === focusWaterRequestId
    ) {
      return;
    }

    lastHandledWaterFocusRequestRef.current = focusWaterRequestId;

    // Retry scrolling with increasing delays to handle cases where
    // the water card hasn't laid out yet (e.g., navigating from another tab)
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tryScroll = (delay: number) => {
      const timer = setTimeout(() => {
        if (waterCardY != null) {
          screenScrollRef.current?.scrollTo({ y: Math.max(waterCardY - 24, 0), animated: true });
        }
      }, delay);
      timers.push(timer);
    };

    tryScroll(300);
    tryScroll(600);
    tryScroll(1000);

    return () => timers.forEach(clearTimeout);
  }, [route.params?.focusWaterRequestId, waterCardY]);

  const showCommonErrors = useCallback(
    (error: any, fallback: { text1: string; text2: string }) => {
      handleApiErrorWithCustomMessage(error, {
        unauthorized: { text1: t('common.sessionExpired'), text2: t('common.pleaseLoginAgain') },
        server_error: { text1: t('common.serverError'), text2: t('common.tryAgainLater') },
        network_error: { text1: t('common.networkError'), text2: t('common.checkConnection') },
        unknown: fallback,
      });
    },
    [],
  );

  // Animation values
  const remainingCaloriesValue = useSharedValue(0);
  const calorieProgressValue = useSharedValue(0);

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setServerDown(!!(isError || !summary));
    }
  }, [isError, summary, isLoading, isFetching]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await healthService.warmUpBackend({ maxAttempts: 2, delayMs: 3000, timeoutMs: 12000 });
      if (!cancelled) setServerDown(!res.ok);
    })();
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const res = await healthService.warmUpBackend({ maxAttempts: 2, delayMs: 3000, timeoutMs: 12000 });
        if (active) setServerDown(!res.ok);
      })();
      return () => { active = false; };
    }, []),
  );

  const handleRefresh = useCallback(() => {
    refetch().catch((err: any) => {
      showCommonErrors(err, { text1: t('home.reloadFailed'), text2: t('home.pullToRetry') });
    });
  }, [refetch, showCommonErrors]);

  const handleDelete = useCallback(
    (entryId: string, foodName: string) => {
      Alert.alert(t('common.deleteConfirm'), t('common.deleteItem', foodName), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteEntry(entryId)
              .then(() => {
                Toast.show({ type: 'success', text1: t('common.removed'), text2: t('common.updated') });
                queryClient.invalidateQueries({ queryKey: ['home-summary'] });
                queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
                queryClient.invalidateQueries({ queryKey: ['daily-loop'] });
              })
              .catch((err: any) => {
                handleApiErrorWithCustomMessage(err, {
                  not_found: { text1: t('common.notFound'), text2: t('common.mayBeDeleted') },
                  forbidden: { text1: t('common.noPermission'), text2: t('common.onlyDeleteOwn') },
                  server_error: { text1: t('common.serverError'), text2: t('common.tryAgainLater') },
                  network_error: { text1: t('common.networkError'), text2: t('common.checkConnection') },
                  unknown: { text1: t('common.deleteFailed'), text2: t('common.contactSupport') },
                });
              });
          },
        },
      ]);
    },
    [deleteEntry, queryClient],
  );

  // Calculated values
  const remainingCalories = useMemo(() => {
    if (!summary || typeof summary.totalCalories !== 'number' || typeof summary.targetCalories !== 'number') return 0;
    return Math.max(0, summary.targetCalories - summary.totalCalories);
  }, [summary]);

  const calorieProgress = useMemo(() => {
    if (!summary || typeof summary.totalCalories !== 'number' || typeof summary.targetCalories !== 'number') return 0;
    return Math.min(1, summary.totalCalories / summary.targetCalories);
  }, [summary]);

  useEffect(() => {
    const safeValue = Number.isNaN(remainingCalories) ? 0 : remainingCalories;
    remainingCaloriesValue.value = withTiming(safeValue, { duration: theme.animation.normal });
  }, [remainingCalories, remainingCaloriesValue, theme.animation.normal]);

  useEffect(() => {
    const safeValue = Number.isNaN(calorieProgress) ? 0 : calorieProgress;
    calorieProgressValue.value = withTiming(safeValue, { duration: theme.animation.slow });
  }, [calorieProgress, calorieProgressValue, theme.animation.slow]);

  const todayEntries = useMemo(() => {
    if (!summary?.meals) return [];
    const entries = summary.meals.flatMap((meal) => meal.entries);
    // Sắp xếp: cũ nhất tới mới nhất
    return entries.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tA - tB;
    });
  }, [summary]);

  // Macro data - Ensure strictly numbers for TypeScript
  const protein = Number(summary?.protein ?? 0);
  const carbs = Number(summary?.carbs ?? 0);
  const fat = Number(summary?.fat ?? 0);
  const targetProtein = Number(summary?.targetProtein ?? 120);
  const targetCarbs = Number(summary?.targetCarbs ?? 280);
  const targetFat = Number(summary?.targetFat ?? 60);
  const targetCalories = typeof summary?.targetCalories === 'number' ? summary.targetCalories : 2200;
  // CalorieRing SVG values
  const ringSize = 140;
  const strokeWidth = 10;
  const center = ringSize / 2;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, calorieProgress));

  // Card width for Tilt3D
  const cardWidth = SCREEN_WIDTH - 40;

  if (isLoading && !summary) {
    return <HomeSkeleton />;
  }

  return (
    <View style={[styles.screenBg, { backgroundColor: C.bg }]}>
      {/* Premium Mesh ambient glow background */}
      <MeshBackground />

      <Screen
        testID={TEST_IDS.home.screen}
        scrollViewRef={screenScrollRef}
        useGradient={false}
        horizontalPadding={false}
        useSafeArea={true}
        hasHeader={false}
        onScroll={handleHomeScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 190,
          gap: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* ══════════ HEADER ══════════ */}
        <WelcomeHeader
          userName={userName}
          avatarUrl={avatarUrl}
          streakCount={currentStreak}
          unreadNotificationCount={unreadNotificationCount}
          onAvatarPress={() => navigation.navigate('ProfileTab')}
          onSettingsPress={() => navigation.navigate('AppTabs', { screen: 'ProfileTab' })}
          onNotificationPress={() => navigation.navigate('NotificationCenter')}
          onStreakPress={() => navigation.navigate('Achievements')}
        />

        {/* ══════════ SERVER ERROR ══════════ */}
        {serverDown && (
          <View style={styles.errorBanner}>
            <ThemedText style={{ color: C.danger, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 13 }}>
              {t('app.serverConnectionError')}
            </ThemedText>
            <ThemedText style={{ color: C.textMuted, fontSize: 12 }}>
              {t('app.checkApiUrl')}
            </ThemedText>
          </View>
        )}

        {/* ══════════ DASHBOARD CARD (3D Tilt) ══════════ */}
        <Animated.View entering={FadeInUp.duration(600).springify()}>
          <Tilt3DCard
            maxTilt={6}
            perspective={1200}
            width={cardWidth}
            height={210}
            showReflection={false}
            /* Tilt3D wrapper does not affect inner colors */
            useDeviceMotion={true}
            activeTouch={false}
            style={[styles.dashboardCard, styles.glassDashboardCard, { borderColor: C.outline, backgroundColor: C.surfaceHigh }]}
          >
            {/* Ambient glow top-right */}
            <View style={styles.dashGlow} pointerEvents="none" />

            {/* Row layout: ring left, macros right */}
            <View style={styles.dashContent}>
              {/* ── Left: CalorieRing ── */}
              <View style={styles.ringSection}>
                <Svg width={ringSize} height={ringSize}>
                  <Defs>
                    <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={C.primary} />
                      <Stop offset="100%" stopColor={C.primaryDark} />
                    </SvgGradient>
                  </Defs>
                  {/* Track */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={C.surfaceHighest}
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Progress main ring */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="url(#ringGrad)"
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
                  <ThemedText style={[styles.ringValue, { color: C.onSurface }]}>
                    {Math.round(remainingCalories).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={[styles.ringLabel, { color: C.textMuted }]}>calo còn lại</ThemedText>
                </View>
              </View>

              {/* ── Right: Macro bars ── */}
              <View style={styles.macroSection}>
                <ThemedText style={[styles.macroTarget, { color: C.primary }]}>
                  Mục tiêu: {Math.round(targetCalories).toLocaleString()} kcal
                </ThemedText>

                {/* Protein */}
                <View style={styles.macroRow}>
                  <View style={styles.macroLabelRow}>
                    <ThemedText style={[styles.macroName, { color: C.onSurface }]}>ĐẠM</ThemedText>
                    <ThemedText style={[styles.macroValue, { color: C.textMuted }]}>
                      {Math.round(protein)}g / {targetProtein}g
                    </ThemedText>
                  </View>
                  <View style={[styles.macroTrack, { backgroundColor: C.surfaceHighest }]}>
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
                <View style={styles.macroRow}>
                  <View style={styles.macroLabelRow}>
                    <ThemedText style={[styles.macroName, { color: C.onSurface }]}>TINH BỘT</ThemedText>
                    <ThemedText style={[styles.macroValue, { color: C.textMuted }]}>
                      {Math.round(carbs)}g / {targetCarbs}g
                    </ThemedText>
                  </View>
                  <View style={[styles.macroTrack, { backgroundColor: C.surfaceHighest }]}>
                    <View
                      style={[
                        styles.macroFill,
                        {
                          width: `${Math.min(100, (carbs / Math.max(targetCarbs, 1)) * 100)}%`,
                          backgroundColor: C.cyan,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Fat */}
                <View style={styles.macroRow}>
                  <View style={styles.macroLabelRow}>
                    <ThemedText style={[styles.macroName, { color: C.onSurface }]}>CHẤT BÉO</ThemedText>
                    <ThemedText style={[styles.macroValue, { color: C.textMuted }]}>
                      {Math.round(fat)}g / {targetFat}g
                    </ThemedText>
                  </View>
                  <View style={[styles.macroTrack, { backgroundColor: C.surfaceHighest }]}>
                    <View
                      style={[
                        styles.macroFill,
                        {
                          width: `${Math.min(100, (fat / Math.max(targetFat, 1)) * 100)}%`,
                          backgroundColor: C.amber,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </Tilt3DCard>
        </Animated.View>

        {/* ══════════ WEEK DAY SELECTOR ══════════ */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <WeekDayStrip palette={C} selectedDate={selectedDate} onSelectDate={(d) => {
            setSelectedDate(d);
            // Refetch diary for the selected date
            const dateStr = formatBusinessDate(d);
            const today = formatBusinessDate();
            if (dateStr === today) {
              fetchSummary();
            } else {
              fetchSummary(dateStr);
            }
          }} />
        </Animated.View>

        {/* ══════════ DIARY SECTION ══════════ */}
        <View>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: C.onSurface }]}>
              {isToday(selectedDate) ? 'Nhật ký hôm nay' : `Nhật ký ${formatShortDate(selectedDate)}`}
            </ThemedText>
            <Pressable onPress={() => navigation.navigate('MealDiary')} testID={TEST_IDS.home.diaryButton}>
              <ThemedText style={[styles.seeAll, { color: C.primary }]}>XEM TẤT CẢ</ThemedText>
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.diaryContainer}>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <MoChiScreenState
                  mochiEvent="diary_empty_today"
                  title="Đang tải nhật ký"
                  message={t('home.loadingDiary')}
                  showSpinner
                  variant="compact"
                />
              </View>
            ) : todayEntries.length > 0 ? (
              <View style={{ gap: 0 }}>
                {todayEntries.slice(0, 5).map((entry, index) => {
                  const emoji = getFoodEmoji(entry.foodName);
                  const displayedCount = Math.min(todayEntries.length, 5);
                  const isLast = index === displayedCount - 1;

                  // Định dạng thời gian theo múi giờ Hà Nội (UTC+7)
                  let timeStr = '';
                  if (entry.createdAt) {
                    const dtStr = entry.createdAt.endsWith('Z') ? entry.createdAt : entry.createdAt + 'Z';
                    const dateObj = new Date(dtStr);
                    if (!Number.isNaN(dateObj.getTime())) {
                      const hanoiDate = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
                      const hr = hanoiDate.getUTCHours().toString().padStart(2, '0');
                      const mn = hanoiDate.getUTCMinutes().toString().padStart(2, '0');
                      timeStr = `${hr}:${mn}`;
                    }
                  }

                  return (
                    <Animated.View
                      key={entry.id}
                      entering={FadeInUp.delay(150 + index * 80).springify()}
                      style={{ flexDirection: 'row', paddingHorizontal: 4 }}
                    >
                      {/* Timeline on the left */}
                      <View style={{ width: 20, alignItems: 'center', marginRight: 12 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 24 }} />
                        {!isLast && (
                           <View style={{ width: 1, flex: 1, backgroundColor: C.outline, marginTop: 8, marginBottom: -16 }} />
                        )}
                      </View>

                      {/* Card Content */}
                      <Pressable
                        style={[styles.diaryEntryCard, styles.glassDiaryEntryCard, { flex: 1, marginBottom: 16 }]}
                        onLongPress={() => handleDelete(entry.id, entry.foodName)}
                      >
                        {/* Food image or emoji fallback */}
                        <View style={styles.entryEmoji}>
                          {entry.photoUrl ? (
                            <Image
                              source={{ uri: entry.photoUrl }}
                              style={styles.entryFoodImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <ThemedText style={{ fontSize: 30 }}>{emoji}</ThemedText>
                          )}
                        </View>
                        {/* Info */}
                        <View style={styles.entryInfo}>
                          <View style={styles.entryTopRow}>
                            <ThemedText style={[styles.entryMealLabel, { color: C.primary }]}>
                              {getMealLabelFromEntry(entry).toUpperCase()} {timeStr ? `• ${timeStr}` : ''}
                            </ThemedText>
                            <ThemedText style={[styles.entryCalories, { color: C.onSurface }]}>
                              {Math.round(entry.calories || 0)} kcal
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.entryFoodName, { color: C.onSurface }]} numberOfLines={1}>
                            {entry.foodName}
                          </ThemedText>
                          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4, alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="flash" size={14} color="#ff8c8c" />
                              <ThemedText style={{ fontSize: 13, color: C.textMuted, fontWeight: '500' }}>{Math.round(entry.protein || 0)}g</ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="leaf" size={14} color="#3b82f6" />
                              <ThemedText style={{ fontSize: 13, color: C.textMuted, fontWeight: '500' }}>{Math.round(entry.carbs || 0)}g</ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="water" size={14} color="#f7c052" />
                              <ThemedText style={{ fontSize: 13, color: C.textMuted, fontWeight: '500' }}>{Math.round(entry.fat || 0)}g</ThemedText>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              /* Empty state */
              <View style={styles.emptyState}>
                {isToday(selectedDate) ? (
                  <MoChiInlineNotice mochiEvent="diary_empty_today" compact />
                ) : (
                  <>
                    <ThemedText style={[styles.emptyTitle, { color: C.onSurface }]}>
                      Không có dữ liệu
                    </ThemedText>
                    <ThemedText style={[styles.emptySubtitle, { color: C.textMuted }]}>
                      {`Chưa có nhật ký cho ngày ${formatShortDate(selectedDate)}`}
                    </ThemedText>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ══════════ WATER TRACKING ══════════ */}
        <Animated.View
          entering={FadeInUp.delay(400).springify()}
          onLayout={(e) => setWaterCardY(e.nativeEvent.layout.y)}
        >
          <MoChiTutorialTarget targetId="home_water" highlightProfile="homeWater">
            <View
              style={[
                styles.waterCard,
                styles.glassWaterCard,
                { backgroundColor: C.surfaceHigh, borderColor: C.outline },
              ]}
            >
              <View style={styles.waterLeft}>
                <Ionicons name="water" size={28} color="#3b82f6" />
                <View style={styles.waterLabelWrap}>
                  <ThemedText style={[styles.waterTitle, { color: C.onSurface }]}>Uống nước</ThemedText>
                  <ThemedText style={[styles.waterValue, { color: C.onSurface }]}>
                    {waterAmount} ml
                  </ThemedText>
                </View>
              </View>
              <View style={styles.waterPill}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Trừ một ly nước"
                  onPress={handleSubtractWater}
                  hitSlop={8}
                  style={styles.waterPillBtn}
                >
                  <Ionicons name="remove" size={18} color={C.textMuted} />
                </Pressable>
                <View style={styles.waterPillDivider} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ghi thêm một ly nước"
                  onPress={() => handleAddWater({ showConfirmationToast: true })}
                  hitSlop={8}
                  style={styles.waterPillBtn}
                >
                  <Ionicons name="add" size={18} color={C.primary} />
                </Pressable>
              </View>
            </View>
          </MoChiTutorialTarget>
          {homeWaterReminder && waterTargetInlineReady && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nhắc uống nước. Ghi thêm một ly nước nếu bạn vừa uống xong."
              onPress={handleWaterReminderAction}
              style={styles.moChiWaterReminderNotice}
            >
              <MoChiInlineNotice
                mochiEvent="water_reminder"
                title="Tiếp nước thôi nào! 💧"
                message="Bạn vừa uống một ly nước đúng không nè? Ghi nhận ngay để tớ đếm nhé!"
                compact
                hideSprite
                tone="calm"
              />
            </Pressable>
          )}
        </Animated.View>
      </Screen>
    </View>
  );
};

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: C_STATIC.bg,
  },

  /* Error */
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.12)',
    gap: 4,
  },

  dashboardCard: {
    backgroundColor: C_STATIC.surfaceHigh,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: C_STATIC.outline,
    overflow: 'hidden',
  },
  glassDashboardCard: {
    backgroundColor: 'rgba(24, 31, 49, 0.72)',
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  dashGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(75, 226, 119, 0.06)',
  },
  dashContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  /* Ring */
  ringSection: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 25,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.onSurface,
    lineHeight: 30,
    textAlign: 'center',
  },
  ringLabel: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  /* Macros */
  macroSection: {
    flex: 1,
    gap: 13,
    minWidth: 0,
    justifyContent: 'center',
  },
  macroHeader: {
    marginBottom: 0,
  },
  macroTitle: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  macroTarget: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.primary,
    marginBottom: 10,
  },
  macroRow: {
    gap: 5,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroName: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.onSurface,
  },
  macroValue: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.textMuted,
  },
  macroTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 3,
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* ─── Diary Section ─── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.onSurface,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* Diary List Container */
  diaryContainer: {
    gap: 12,
  },

  /* Each meal row as a distinct chip/card */
  diaryEntryCard: {
    backgroundColor: C_STATIC.surfaceLow,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C_STATIC.outline,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  glassDiaryEntryCard: {
    backgroundColor: 'rgba(18, 27, 45, 0.68)',
    borderColor: 'rgba(255,255,255,0.075)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  entryEmoji: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  entryFoodImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
  },
  entryInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryMealLabel: {
    fontSize: 12,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryCalories: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.onSurface,
  },
  entryFoodName: {
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.onSurface,
  },
  entryMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  entryMacroChipV2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: C_STATIC.surfaceHighest,
  },
  entryMacroTextV2: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#a1a1aa',
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'BeVietnamPro_700Bold',
    color: C_STATIC.onSurface,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C_STATIC.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Loading */
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },

  /* ─── Floating AI Robot FAB ─── */
  fabContainer: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    zIndex: 60,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C_STATIC.surfaceHigh,
    borderWidth: 2,
    borderColor: 'rgba(75, 226, 119, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    // Glow
    shadowColor: C_STATIC.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  robotFace: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#9aa9c1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  robotVisor: {
    width: 28,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  robotEye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22D3EE',
    // Cyan glow
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 2,
  },
  robotMouth: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 1,
    marginTop: 4,
  },

  /* Ping indicators */
  fabPingContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  fabPing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C_STATIC.primary,
    opacity: 0.6,
  },
  fabDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C_STATIC.primary,
    borderWidth: 2,
    borderColor: C_STATIC.bg,
  },
  /* ── Water Tracking ── */
  waterCard: {
    backgroundColor: '#1E2332',
    borderRadius: 18,
    padding: 10,
    paddingHorizontal: 14,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  glassWaterCard: {
    backgroundColor: 'rgba(27, 35, 55, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 3,
  },
  moChiWaterReminderNotice: {
    marginTop: 10,
  },
  waterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterLabelWrap: {
    gap: 2,
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: '#f8fafc',
  },
  waterValue: {
    fontSize: 17,
    fontFamily: 'BeVietnamPro_700Bold',
    color: '#f8fafc',
  },
  waterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131622',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  waterPillBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterPillDivider: {
    width: 2,
    height: 20,
    backgroundColor: '#334155',
    opacity: 0.8,
  },
});

export default HomeScreen;
