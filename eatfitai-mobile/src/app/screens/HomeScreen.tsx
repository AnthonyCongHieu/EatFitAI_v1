import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
import QuickActionsOverlay from '../../components/home/QuickActionsOverlay';
import { useSmartContext } from '../../hooks/useSmartContext';
import Tilt3DCard from '../../components/ui/Tilt3DCard';
import * as Haptics from 'expo-haptics';
import { TEST_IDS } from '../../testing/testIds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ─── Emerald Nebula palette ─── */
const C = {
  bg: '#0a0e1a',
  surfaceLow: '#111827',
  surface: '#1a1f2f',
  surfaceHigh: '#1e2435',
  surfaceHighest: '#2a2f40',
  primary: '#4be277',
  primaryDark: '#22c55e',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  onSurface: '#dee1f7',
  textMuted: '#94a3b8',
  outline: 'rgba(255,255,255,0.06)',
  danger: '#ff6b6b',
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
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
const WeekDayStrip = ({ selectedDate, onSelectDate }: { selectedDate: Date; onSelectDate: (d: Date) => void }) => {
  const days = useMemo(() => getWeekDays(), []);
  return (
    <View style={weekStyles.container}>
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate);
        const today = isToday(day);
        return (
          <Pressable
            key={day.toISOString()}
            style={weekStyles.dayBtn}
            onPress={() => onSelectDate(day)}
          >
            <ThemedText style={[weekStyles.dayLabel, selected && weekStyles.dayLabelSelected]}>
              {VIET_DAYS[day.getDay()]}
            </ThemedText>
            <View style={[weekStyles.dayNumContainer, selected && weekStyles.dayNumContainerSelected]}>
              <ThemedText style={[weekStyles.dayNum, selected && weekStyles.dayNumSelected]}>
                {day.getDate()}
              </ThemedText>
            </View>
            {today && !selected && <View style={weekStyles.todayDot} />}
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
    backgroundColor: C.surfaceLow,
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: C.outline,
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
    fontWeight: '600',
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  dayLabelSelected: {
    color: C.onSurface,
    fontWeight: '700',
  },
  dayNumContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumContainerSelected: {
    backgroundColor: C.primary,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
  },
  dayNumSelected: {
    color: '#003915',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.primary,
    marginTop: -2,
  },
});
const HomeScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
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
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { currentStreak, longestStreak, weeklyLogs, checkStreak, fetchWeeklyLogs } =
    useGamificationStore();

  const smartContext = useSmartContext(summary);

  useEffect(() => {
    checkStreak();
    fetchWeeklyLogs();
  }, [checkStreak, fetchWeeklyLogs]);

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

  // Robot FAB floating animation & Drag gesture
  const floatAnim = useSharedValue(0);
  const robotOffsetX = useSharedValue(0);
  const robotOffsetY = useSharedValue(0);
  const robotSavedX = useSharedValue(0);
  const robotSavedY = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: robotOffsetX.value },
      { translateY: floatAnim.value + robotOffsetY.value },
    ],
  }));

  const robotPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          robotOffsetX.value = robotSavedX.value + e.translationX;
          robotOffsetY.value = robotSavedY.value + e.translationY;
        })
        .onEnd(() => {
          robotSavedX.value = robotOffsetX.value;
          robotSavedY.value = robotOffsetY.value;
        }),
    [robotOffsetX, robotOffsetY, robotSavedX, robotSavedY],
  );

  // Card width for Tilt3D
  const cardWidth = SCREEN_WIDTH - 40;

  if (isLoading && !summary) {
    return <HomeSkeleton />;
  }

  return (
    <View style={styles.screenBg}>
      {/* Background gradient */}
      <LinearGradient
        colors={[C.surfaceLow, C.bg, C.bg]}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Screen
        testID={TEST_IDS.home.screen}
        useGradient={false}
        horizontalPadding={false}
        useSafeArea={true}
        hasHeader={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 140,
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
          streakCount={currentStreak}
          onNotificationPress={() => navigation.navigate('NotificationsSettings')}
          onAvatarPress={() => navigation.navigate('EditProfile')}
        />

        {/* ══════════ SERVER ERROR ══════════ */}
        {serverDown && (
          <View style={styles.errorBanner}>
            <ThemedText style={{ color: C.danger, fontWeight: '600', fontSize: 13 }}>
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
            useDeviceMotion={true}
            activeTouch={false}
            style={styles.dashboardCard}
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
                  <ThemedText style={styles.ringValue}>
                    {Math.round(remainingCalories).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.ringLabel}>calo còn lại</ThemedText>
                </View>
              </View>

              {/* ── Right: Macro bars ── */}
              <View style={styles.macroSection}>
                <ThemedText style={styles.macroTarget}>
                  Mục tiêu: {Math.round(targetCalories).toLocaleString()} kcal
                </ThemedText>

                {/* Protein */}
                <View style={styles.macroRow}>
                  <View style={styles.macroLabelRow}>
                    <ThemedText style={styles.macroName}>ĐẠM</ThemedText>
                    <ThemedText style={styles.macroValue}>
                      {Math.round(protein)}g / {targetProtein}g
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
                <View style={styles.macroRow}>
                  <View style={styles.macroLabelRow}>
                    <ThemedText style={styles.macroName}>TINH BỘT</ThemedText>
                    <ThemedText style={styles.macroValue}>
                      {Math.round(carbs)}g / {targetCarbs}g
                    </ThemedText>
                  </View>
                  <View style={styles.macroTrack}>
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
                    <ThemedText style={styles.macroName}>CHẤT BÉO</ThemedText>
                    <ThemedText style={styles.macroValue}>
                      {Math.round(fat)}g / {targetFat}g
                    </ThemedText>
                  </View>
                  <View style={styles.macroTrack}>
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
          <WeekDayStrip selectedDate={selectedDate} onSelectDate={(d) => {
            setSelectedDate(d);
            // Refetch diary for the selected date
            const dateStr = d.toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];
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
            <ThemedText style={styles.sectionTitle}>
              {isToday(selectedDate) ? 'Nhật ký hôm nay' : `Nhật ký ${formatShortDate(selectedDate)}`}
            </ThemedText>
            <Pressable onPress={() => navigation.navigate('MealDiary')} testID={TEST_IDS.home.diaryButton}>
              <ThemedText style={styles.seeAll}>XEM TẤT CẢ</ThemedText>
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.diaryContainer}>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={C.primary} />
                <ThemedText style={{ color: C.textMuted, fontSize: 13 }}>{t('home.loadingDiary')}</ThemedText>
              </View>
            ) : todayEntries.length > 0 ? (
              <View style={{ gap: 0 }}>
                {todayEntries.map((entry, index) => {
                  const mealLabel = getMealLabelFromEntry(entry);
                  const emoji = getFoodEmoji(entry.foodName);
                  const isLast = index === todayEntries.length - 1;

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
                           <View style={{ width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8, marginBottom: -16 }} />
                        )}
                      </View>

                      {/* Card Content */}
                      <Pressable
                        style={[styles.diaryEntryCard, { flex: 1, marginBottom: 16 }]}
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
                            <ThemedText style={styles.entryMealLabel}>
                              {getMealLabelFromEntry(entry).toUpperCase()} {timeStr ? `• ${timeStr}` : ''}
                            </ThemedText>
                            <ThemedText style={styles.entryCalories}>
                              {Math.round(entry.calories || 0)} kcal
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.entryFoodName} numberOfLines={1}>
                            {entry.foodName}
                          </ThemedText>
                          <View style={styles.entryMacros}>
                            <View style={styles.entryMacroChipV2}>
                              <ThemedText style={styles.entryMacroTextV2}>Đ: {Math.round(entry.protein || 0)}g</ThemedText>
                            </View>
                            <View style={styles.entryMacroChipV2}>
                              <ThemedText style={styles.entryMacroTextV2}>T: {Math.round(entry.carbs || 0)}g</ThemedText>
                            </View>
                            <View style={styles.entryMacroChipV2}>
                              <ThemedText style={styles.entryMacroTextV2}>B: {Math.round(entry.fat || 0)}g</ThemedText>
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
                <ThemedText style={styles.emptyTitle}>
                  {isToday(selectedDate) ? 'Chưa có món nào hôm nay' : 'Không có dữ liệu'}
                </ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  {isToday(selectedDate)
                    ? 'Hãy chụp ảnh hoặc tìm kiếm để thêm món ăn đầu tiên!'
                    : `Chưa có nhật ký cho ngày ${formatShortDate(selectedDate)}`}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Screen>

      {/* ══════════ FLOATING AI ROBOT FAB (Draggable) ══════════ */}
      <GestureDetector gesture={robotPanGesture}>
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={[styles.fabContainer, floatStyle]}
        >
          <Pressable
            style={styles.fab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowQuickActions(true);
            }}
            testID={TEST_IDS.home.fabButton}
          >
            {/* Robot face */}
            <View style={styles.robotFace}>
              {/* Eyes area */}
              <View style={styles.robotVisor}>
                <View style={styles.robotEye} />
                <View style={styles.robotEye} />
              </View>
              {/* Mouth */}
              <View style={styles.robotMouth} />
            </View>

            {/* Ping dot */}
            <View style={styles.fabPingContainer}>
              <Animated.View entering={FadeIn.delay(800)} style={styles.fabPing} />
              <View style={styles.fabDot} />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {/* ══════════ QUICK ACTIONS OVERLAY ══════════ */}
      <QuickActionsOverlay
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onScanFood={() => navigation.navigate('AiCamera')}
        onAddMeal={() => navigation.navigate('FoodSearch', { autoFocus: true, showQuickSuggestions: true, returnToDiaryOnSave: true })}
        onRecipes={() => navigation.navigate('RecipeSuggestions', {})}
        onWater={() => {
          // Future: water tracking
          Toast.show({ type: 'info', text1: 'Sắp ra mắt', text2: 'Tính năng theo dõi lượng nước sẽ sớm có mặt!' });
        }}
      />
    </View>
  );
};

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: C.bg,
  },

  /* Error */
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.12)',
    gap: 4,
  },

  /* ─── Dashboard Card ─── */
  dashboardCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
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
    width: 140,
    height: 140,
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
    fontSize: 26,
    fontWeight: '800',
    color: C.onSurface,
    lineHeight: 30,
    textAlign: 'center',
  },
  ringLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  /* Macros */
  macroSection: {
    flex: 1,
    gap: 12,
    minWidth: 0,
    justifyContent: 'center',
  },
  macroHeader: {
    marginBottom: 0,
  },
  macroTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  macroTarget: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 10,
  },
  macroRow: {
    gap: 4,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textMuted,
  },
  macroTrack: {
    height: 6,
    backgroundColor: C.surfaceHighest,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
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
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* Diary List Container */
  diaryContainer: {
    gap: 12,
  },

  /* Each meal row as a distinct chip/card */
  diaryEntryCard: {
    backgroundColor: C.surfaceLow,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outline,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    marginBottom: 12,
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
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryCalories: {
    fontSize: 14,
    fontWeight: '800',
    color: C.onSurface,
  },
  entryFoodName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
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
    backgroundColor: C.surfaceHighest,
  },
  entryMacroTextV2: {
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '700',
    color: C.onSurface,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.textMuted,
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
    backgroundColor: C.surfaceHigh,
    borderWidth: 2,
    borderColor: 'rgba(75, 226, 119, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    // Glow
    shadowColor: C.primary,
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
    borderBottomColor: '#94A3B8',
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
    backgroundColor: C.primary,
    opacity: 0.6,
  },
  fabDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: C.bg,
  },
});

export default HomeScreen;
