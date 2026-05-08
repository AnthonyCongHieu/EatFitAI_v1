/**
 * MealDiaryScreen — Full meal diary with Emerald Nebula 3D aesthetic
 * Features: Week strip, daily summary card, meal group cards with tilt,
 * floating add button, pull-to-refresh.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Swipeable from '../../../components/Swipeable';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../../../components/ThemedText';
import { BottomSheet } from '../../../components/BottomSheet';
import { ThemedTextInput } from '../../../components/ThemedTextInput';
import { diaryService, type DiaryEntry, type DaySummary, type DiaryMealGroup } from '../../../services/diaryService';
import { invalidateDiaryQueries } from '../../../services/diaryFlowService';
import { MEAL_TYPE_LABELS, type MealTypeId } from '../../../types';
import type { RootStackParamList } from '../../types';
import Tilt3DCard from '../../../components/ui/Tilt3DCard';
import { TEST_IDS } from '../../../testing/testIds';

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
  primary: '#4be277',
  primaryContainer: '#22c55e',
  onPrimary: '#003915',
  onSurface: '#dee1f7',
  textMuted: '#94a3b8',
  outline: 'rgba(255,255,255,0.06)',
  outlineVariant: 'rgba(61,74,61,0.35)',
  danger: '#ff6b6b',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  indigo: '#818cf8',
  rose: '#fb7185',
};

/* ─── Meal icons & colors ─── */
const MEAL_ICONS: Record<MealTypeId, { icon: string; color: string }> = {
  1: { icon: 'sunny-outline', color: '#fbbf24' },      // Breakfast - amber
  2: { icon: 'sunny', color: '#34d399' },               // Lunch - emerald
  3: { icon: 'moon-outline', color: C.indigo },          // Dinner - indigo
  4: { icon: 'cafe-outline', color: C.rose },            // Snack - rose
};

const MEAL_ADD_LABELS: Record<MealTypeId, string> = {
  1: 'Thêm bữa sáng',
  2: 'Thêm bữa trưa',
  3: 'Thêm bữa tối',
  4: 'Thêm món ăn vặt',
};

/* ─── Date helpers (Hanoi UTC+7) ─── */
const VIET_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const isToday = (d: Date): boolean => {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getWeekDays = (): Date[] => {
  const today = new Date();
  const dayOfWeek = today.getDay();
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

const formatDateForApi = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/* ─── Food emoji helper ─── */
const getFoodEmoji = (foodName: string): string => {
  const name = foodName.toLowerCase();
  if (name.includes('cơm') || name.includes('rice')) return '🍚';
  if (name.includes('phở') || name.includes('noodle')) return '🍜';
  if (name.includes('gà') || name.includes('chicken')) return '🍗';
  if (name.includes('cá') || name.includes('fish')) return '🐟';
  if (name.includes('salad') || name.includes('rau')) return '🥗';
  if (name.includes('trứng') || name.includes('egg')) return '🥚';
  if (name.includes('sữa') || name.includes('milk')) return '🥛';
  if (name.includes('bánh')) return '🍞';
  if (name.includes('canh') || name.includes('soup')) return '🍲';
  if (name.includes('yến mạch') || name.includes('oat')) return '🥣';
  return '🍽️';
};

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
const MealDiaryScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MealDiary'>>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const initialDate = useMemo(() => {
    const paramDate = route.params?.selectedDate;
    if (paramDate) return new Date(paramDate);
    return new Date();
  }, [route.params?.selectedDate]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dateKey = useMemo(() => formatDateForApi(selectedDate), [selectedDate]);

  /* ─── Data fetching ─── */
  const { data: daySummary, isLoading, refetch } = useQuery<DaySummary>({
    queryKey: ['meal-diary', dateKey],
    queryFn: () => diaryService.getDayCombined(dateKey),
  });

  const entries = useMemo(() => {
    if (!daySummary?.meals) return [];
    return daySummary.meals
      .flatMap((m: DiaryMealGroup) => m.entries)
      .sort((a: DiaryEntry, b: DiaryEntry) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }, [daySummary]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc: { calories: number; protein: number; carbs: number; fat: number }, e: DiaryEntry) => ({
        calories: acc.calories + (e.calories || 0),
        protein: acc.protein + (e.protein || 0),
        carbs: acc.carbs + (e.carbs || 0),
        fat: acc.fat + (e.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [entries]);

  const targetCalories = Number(daySummary?.targetCalories ?? 2200);
  const remaining = Math.max(0, targetCalories - totals.calories);
  const progress = Math.min(1, totals.calories / Math.max(targetCalories, 1));

  // Group entries by meal type, ensuring all 4 meal types are shown
  const mealGroups = useMemo(() => {
    const groups = new Map<MealTypeId, DiaryEntry[]>();
    entries.forEach((e: DiaryEntry) => {
      const mt = e.mealType as MealTypeId;
      if (!groups.has(mt)) groups.set(mt, []);
      groups.get(mt)!.push(e);
    });

    // Ensure all 4 meal types exist
    const allTypes: MealTypeId[] = [1, 2, 3, 4];
    return allTypes.map((mt) => {
      const groupEntries = groups.get(mt) || [];
      return {
        mealType: mt,
        title: MEAL_TYPE_LABELS[mt],
        entries: groupEntries,
        totalCalories: groupEntries.reduce((s, e) => s + (e.calories || 0), 0),
        totalProtein: groupEntries.reduce((s, e) => s + (e.protein || 0), 0),
        totalCarbs: groupEntries.reduce((s, e) => s + (e.carbs || 0), 0),
        totalFat: groupEntries.reduce((s, e) => s + (e.fat || 0), 0),
      };
    });
  }, [entries]);

  const weekDays = useMemo(() => getWeekDays(), []);

  /* ─── Handlers ─── */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDateSelect = useCallback((date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
  }, []);

  const handleAddManual = useCallback((defaultMealType?: MealTypeId) => {
    navigation.navigate('FoodSearch', {
      selectedDate: dateKey,
      returnToDiaryOnSave: true,
      defaultMealType,
    });
  }, [dateKey, navigation]);

  const navigateToDetail = useCallback((entry: DiaryEntry) => {
    if (entry.recipeId) {
      navigation.navigate('RecipeDetail', {
        recipeId: entry.recipeId,
        recipeName: entry.foodName,
        diaryEntryId: entry.id,
        currentGrams: entry.grams ?? undefined,
      });
      return;
    }
    
    let source: 'catalog' | 'user' = 'catalog';
    let foodId: number | null | string = entry.foodItemId ?? null;

    if (entry.userDishId) {
      source = 'user';
      foodId = entry.userDishId;
    } else if (entry.sourceMethod === 'user') {
       source = 'user';
    }

    if (!foodId && entry.id) {
       // fallback, could be useful if backend maps properly
       foodId = entry.id;
    }

    if (!foodId) {
      Toast.show({ type: 'info', text1: 'Không có dữ liệu chi tiết' });
      return;
    }

    navigation.navigate('FoodDetail', {
      foodId: String(foodId),
      source,
      selectedDate: dateKey,
      returnToDiaryOnSave: true,
      diaryEntryId: entry.id,
      currentGrams: entry.grams ?? undefined,
      defaultMealType: entry.mealType,
    });
  }, [navigation, dateKey]);

  const handleDeleteEntry = useCallback(async (entry: DiaryEntry) => {
    Alert.alert('Xóa món ăn', `Bạn có chắc muốn xóa "${entry.foodName}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await diaryService.deleteEntry(entry.id);
            await invalidateDiaryQueries(queryClient);
            Toast.show({ type: 'success', text1: 'Đã xóa', text2: `Đã xóa ${entry.foodName}` });
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Lỗi xóa', text2: err?.message || 'Thử lại sau.' });
          }
        },
      },
    ]);
  }, [queryClient]);

  const cardWidth = SCREEN_WIDTH - 32;

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <View
      style={[styles.root, { paddingTop: insets.top }]}
      testID={TEST_IDS.mealDiary.screen}
      nativeID={TEST_IDS.mealDiary.screen}
      collapsable={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[C.surfaceLow, C.bg, C.bg]}
        locations={[0, 0.25, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ══════════ HEADER ══════════ */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={C.textMuted} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Nhật ký ăn uống</ThemedText>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.headerBtn}
            testID={TEST_IDS.mealDiary.datePickerButton}
          >
            <Ionicons name="calendar-outline" size={22} color={C.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* ══════════ WEEK STRIP ══════════ */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.weekStrip}>
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <Pressable
              key={day.toISOString()}
              style={styles.weekDay}
              onPress={() => handleDateSelect(day)}
            >
              <ThemedText style={[styles.weekDayLabel, selected && styles.weekDayLabelSelected]}>
                {VIET_DAYS[day.getDay()]}
              </ThemedText>
              <View style={[styles.weekDayNumWrap, selected && styles.weekDayNumWrapSelected]}>
                <ThemedText style={[styles.weekDayNum, selected && styles.weekDayNumSelected]}>
                  {day.getDate()}
                </ThemedText>
              </View>
              {today && !selected && <View style={styles.weekTodayDot} />}
            </Pressable>
          );
        })}
      </Animated.View>

      {/* ══════════ SCROLLABLE CONTENT ══════════ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160, gap: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
            progressBackgroundColor={C.surfaceHigh}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.primary} size="large" />
            <ThemedText style={{ color: C.textMuted, marginTop: 12 }}>Đang tải...</ThemedText>
          </View>
        ) : (
          <>
            {/* ── Daily Summary ── */}
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Tilt3DCard width={cardWidth} height={140} maxTilt={6} showReflection={false} useDeviceMotion={true} activeTouch={false}>
                <View style={styles.summaryCard}>
                  {/* Top row */}
                  <View style={styles.summaryTopRow}>
                    <View>
                      <ThemedText style={styles.summaryCalories}>
                        {Math.round(totals.calories).toLocaleString()} kcal
                      </ThemedText>
                      <ThemedText style={styles.summaryRemaining}>
                        {Math.round(remaining).toLocaleString()} còn lại
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={styles.summaryTargetLabel}>MỤC TIÊU HÀNG NGÀY</ThemedText>
                      <ThemedText style={styles.summaryTargetValue}>
                        {Math.round(targetCalories).toLocaleString()} kcal
                      </ThemedText>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <Animated.View
                      entering={FadeIn.delay(400)}
                      style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
                    />
                  </View>
                </View>
              </Tilt3DCard>
            </Animated.View>

            {/* ── Meal Sections ── */}
            {mealGroups.map((group, gIdx) => (
              <Animated.View
                key={group.mealType}
                entering={FadeInUp.delay(200 + gIdx * 80).springify()}
              >
                <Tilt3DCard width={cardWidth} height={group.entries.length > 0 ? 300 : 180} maxTilt={5} showReflection={false} useDeviceMotion={true} activeTouch={false}>
                  <View style={styles.mealCard}>
                    {/* Meal Header */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.mealHeader,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handleAddManual(group.mealType)}
                    >
                      <View style={styles.mealTitleRow}>
                        <Ionicons
                          name={MEAL_ICONS[group.mealType].icon as any}
                          size={20}
                          color={MEAL_ICONS[group.mealType].color}
                        />
                        <ThemedText style={styles.mealTitle}>{group.title}</ThemedText>
                      </View>
                      <View style={styles.mealHeaderActions}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                           <View style={{ flexDirection: 'row', gap: 6 }}>
                             <ThemedText style={{ fontSize: 12, color: C.textMuted }}><Ionicons name="flash" size={12} color="#ef4444" /> {Math.round(group.totalProtein || 0)}g</ThemedText>
                             <ThemedText style={{ fontSize: 12, color: C.textMuted }}><Ionicons name="leaf" size={12} color="#3b82f6" /> {Math.round(group.totalCarbs || 0)}g</ThemedText>
                             <ThemedText style={{ fontSize: 12, color: C.textMuted }}><Ionicons name="water" size={12} color="#fbbf24" /> {Math.round(group.totalFat || 0)}g</ThemedText>
                           </View>
                           <ThemedText style={styles.mealCalories}>
                             {Math.round(group.totalCalories)} kcal
                           </ThemedText>
                        </View>
                      </View>
                    </Pressable>

                    {/* Food entries */}
                    {group.entries.length > 0 ? (
                      <View style={styles.mealContent}>
                        {group.entries.map((entry) => (
                          <View key={entry.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12, overflow: 'hidden' }}>
                            <Swipeable
                              rightActions={[
                              {
                                key: 'delete',
                                label: 'Xóa',
                                color: '#ef4444',
                                icon: <Ionicons name="trash-outline" size={20} color="#fff" />,
                                onPress: () => handleDeleteEntry(entry),
                              },
                            ]}
                          >
                            <Pressable
                              style={[styles.entryRow, { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: C.surfaceHigh }]}
                              onPress={() => navigateToDetail(entry)}
                            >
                              {/* Food image */}
                              <View style={[styles.entryImageWrap, { width: 60, height: 60, borderRadius: 12 }]}>
                                {entry.photoUrl ? (
                                  <Image
                                    source={{ uri: entry.photoUrl }}
                                    style={[styles.entryImage, { width: 60, height: 60, borderRadius: 12 }]}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <ThemedText style={{ fontSize: 32 }}>{getFoodEmoji(entry.foodName)}</ThemedText>
                                )}
                              </View>
  
                              {/* Info */}
                              <View style={[styles.entryInfo, { marginLeft: 12, justifyContent: 'space-between', paddingVertical: 2 }]}>
                                <ThemedText style={[styles.entryName, { fontSize: 16, fontWeight: '700' }]} numberOfLines={1}>
                                  {entry.foodName}
                                </ThemedText>
                                <ThemedText style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
                                  {entry.quantityText || '1 khẩu phần'} • {Math.round(entry.calories || 0)} cal
                                </ThemedText>
                                
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="flash" size={14} color="#ef4444" />
                                    <ThemedText style={{ fontSize: 13, color: C.textMuted, fontWeight: '500' }}>{Math.round(entry.protein || 0)}g</ThemedText>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="leaf" size={14} color="#3b82f6" />
                                    <ThemedText style={{ fontSize: 13, color: C.textMuted, fontWeight: '500' }}>{Math.round(entry.carbs || 0)}g</ThemedText>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="water" size={14} color="#fbbf24" />
                                    <ThemedText style={{ fontSize: 13, color: C.textMuted, fontWeight: '500' }}>{Math.round(entry.fat || 0)}g</ThemedText>
                                  </View>
                                </View>
                              </View>
                            </Pressable>
                            </Swipeable>
                          </View>
                        ))}


                      </View>
                    ) : (
                      /* Empty state for this meal */
                      <View style={styles.mealEmptyWrap}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.mealEmptyBtn,
                            pressed && { backgroundColor: 'rgba(75,226,119,0.06)' },
                          ]}
                          onPress={() => handleAddManual(group.mealType)}
                        >
                          <View style={styles.mealEmptyIcon}>
                            <Ionicons name="add" size={24} color={C.primary} />
                          </View>
                          <ThemedText style={styles.mealEmptyText}>
                            {MEAL_ADD_LABELS[group.mealType]}
                          </ThemedText>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </Tilt3DCard>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ══════════ BACK TO TODAY ══════════ */}
      {!isToday(selectedDate) && (
        <Pressable
          onPress={() => setSelectedDate(new Date())}
          style={({ pressed }) => [
            styles.backToToday,
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          testID={TEST_IDS.mealDiary.backToTodayButton}
        >
          <Ionicons name="today-outline" size={16} color="#fff" />
          <ThemedText style={styles.backToTodayText}>Quay lại hôm nay</ThemedText>
        </Pressable>
      )}

      {/* ══════════ DATE PICKER MODAL ══════════ */}
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerDone}
              >
                <ThemedText style={{ color: C.primary, fontWeight: '700' }}>Xong</ThemedText>
              </Pressable>
            )}
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
              minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
              onChange={(event: any, date?: Date) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          </View>
        </View>
      )}


    </View>
  );
};

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  /* ─── Header ─── */
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surfaceLow,
    borderBottomWidth: 1,
    borderBottomColor: C.outline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: -0.3,
  },

  /* ─── Week strip ─── */
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weekDayLabelSelected: {
    color: C.onSurface,
    fontWeight: '900',
  },
  weekDayNumWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayNumWrapSelected: {
    backgroundColor: C.primaryContainer,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  weekDayNum: {
    fontSize: 16,
    fontWeight: '800',
    color: C.onSurface,
  },
  weekDayNumSelected: {
    color: C.onPrimary,
  },
  weekTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.primary,
    marginTop: -2,
  },

  /* ─── Loading ─── */
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  /* ─── Summary Card ─── */
  summaryCard: {
    backgroundColor: C.surfaceLow,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outline,
    overflow: 'hidden',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  summaryCalories: {
    fontSize: 28,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -1,
    lineHeight: 38,
  },
  summaryRemaining: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    marginTop: 2,
  },
  summaryTargetLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  summaryTargetValue: {
    fontSize: 15,
    fontWeight: '800',
    color: C.onSurface,
    marginTop: 2,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: C.surfaceHighest,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  /* ─── Meal Card ─── */
  mealCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outline,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.onSurface,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '800',
    color: C.primary,
  },

  /* ─── Meal content (with entries) ─── */
  mealContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },

  /* Entry row */
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  entryImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryImage: {
    width: '100%',
    height: '100%',
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '800',
    color: C.onSurface,
  },
  entryQuantity: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    marginTop: 2,
  },
  entryCalories: {
    fontSize: 14,
    fontWeight: '800',
    color: C.primary,
  },

  /* ─── Macro pills ─── */
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  macroPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  macroPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  /* ─── Meal empty state ─── */
  mealEmptyWrap: {
    padding: 12,
    gap: 10,
  },
  mealEmptyBtn: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.outlineVariant,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mealEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(75,226,119,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmptyText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textMuted,
  },
  copyDayButton: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  copyDayButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.onPrimary,
  },
  copyMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(75,226,119,0.28)',
    backgroundColor: 'rgba(75,226,119,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  copyMealButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },

  /* ─── Floating AI Robot FAB ─── */
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
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
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
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

  /* ─── Back to Today ─── */
  backToToday: {
    position: 'absolute',
    bottom: 84,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  backToTodayText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },

  /* ─── Date Picker Overlay ─── */
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 100,
  },
  datePickerContainer: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 20,
    overflow: 'hidden',
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
});

export default MealDiaryScreen;
