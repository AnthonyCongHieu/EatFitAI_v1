// Màn hình Nhật ký bữa ăn - Redesigned với UI/UX hiện đại
// Features: Summary header, improved date selector, beautiful meal cards

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, Dimensions, Platform, RefreshControl } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { Button } from '../../../components/Button';
import { BottomSheet } from '../../../components/BottomSheet';
import { ThemedTextInput } from '../../../components/ThemedTextInput';
import { AppCard } from '../../../components/ui/AppCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { diaryService, type DiaryEntry } from '../../../services/diaryService';
import { MEAL_TYPE_LABELS, type MealTypeId } from '../../../types';
import type { RootStackParamList } from '../../types';
import { t } from '../../../i18n/vi';
import Toast from 'react-native-toast-message';
import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import { FoodEntryCard } from '../../../components/ui/FoodEntryCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEST_IDS } from '../../../testing/testIds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Emoji cho từng loại bữa ăn
const MEAL_EMOJIS: Record<MealTypeId, string> = {
  1: '🌅', // Breakfast
  2: '☀️', // Lunch
  3: '🌙', // Dinner
  4: '🍵', // Snack
};

// Helper function to get meal gradient from theme
const getMealGradient = (
  mealType: MealTypeId,
  mealGradients: typeof import('../../../theme/themes').lightTheme.mealGradients,
): readonly [string, string] => {
  const gradientMap: Record<MealTypeId, readonly [string, string]> = {
    1: mealGradients.breakfast,
    2: mealGradients.lunch,
    3: mealGradients.dinner,
    4: mealGradients.snack,
  };
  return gradientMap[mealType] || mealGradients.lunch;
};

const MealDiaryScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MealDiary'>>();
  const insets = useSafeAreaInsets();

  // Nếu có selectedDate từ params (từ MonthStats), parse và set
  const initialDate = useMemo(() => {
    const paramDate = route.params?.selectedDate;
    if (paramDate) {
      return new Date(paramDate);
    }
    return new Date();
  }, [route.params?.selectedDate]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [editGrams, setEditGrams] = useState('');
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const queryClient = useQueryClient();
  const dateListRef = useRef<FlatList<Date>>(null);

  // Date options: -30 to +7 days (mở rộng để xem xa hơn)
  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -30; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push(date);
    }
    return options;
  }, []);

  const todayIndex = 30; // index của ngày hôm nay trong mảng (vị trí 0-indexed của ngày -30+30=0)

  // Auto-scroll to today
  useEffect(() => {
    setTimeout(() => {
      dateListRef.current?.scrollToIndex({
        index: todayIndex,
        animated: false,
        viewPosition: 0.5,
      });
    }, 100);
  }, [todayIndex]);

  // Format date for display (date chips - only weekday name)
  const formatDateChip = useCallback((date: Date) => {
    const weekdays = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
    return weekdays[date.getDay()];
  }, []);

  // Format date for date picker button (with Hôm nay/Hôm qua)
  const formatDateLabel = useCallback((date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    if (date.toDateString() === tomorrow.toDateString()) return 'Ngày mai';

    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
    });
  }, []);

  // Format date for API
  const formatDateForApi = useCallback((date: Date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const dateKey = useMemo(() => formatDateForApi(selectedDate), [formatDateForApi, selectedDate]);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const {
    data: entriesData,
    isLoading: isEntriesLoading,
    refetch,
  } = useQuery({
    queryKey: ['diary-entries', dateKey],
    queryFn: () => diaryService.getEntriesByDate(dateKey),
  });
  const entries = entriesData ?? [];

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Group entries by meal type
  const groupedEntries = useMemo(() => {
    const groups = new Map<MealTypeId, DiaryEntry[]>();
    entries.forEach((entry) => {
      const mealType = entry.mealType;
      if (!groups.has(mealType)) groups.set(mealType, []);
      groups.get(mealType)!.push(entry);
    });

    return Array.from(groups.entries())
      .sort((a, b) => {
        const order: Record<number, number> = { 1: 1, 2: 2, 4: 3, 3: 4 };
        return (order[a[0]] || 99) - (order[b[0]] || 99);
      })
      .map(([mealType, mealEntries]) => ({
        mealType,
        title: MEAL_TYPE_LABELS[mealType],
        entries: mealEntries,
      }));
  }, [entries]);

  // Calculate totals
  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fat: acc.fat + (entry.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [entries]);

  const handleDateSelect = useCallback((date: Date) => setSelectedDate(date), []);

  const handleEditGrams = useCallback((entry: DiaryEntry) => {
    setEditingEntry(entry);
    const rawValue = entry.quantityText?.split(' ')[0] || '';
    const numericOnly = rawValue.replace(/[^0-9.]/g, '');
    setEditGrams(numericOnly);
    setShowEditSheet(true);
  }, []);

  const handleSaveGrams = useCallback(async () => {
    if (!editingEntry) return;
    const cleanedValue = editGrams.replace(/[^0-9.]/g, '');
    const grams = parseFloat(cleanedValue);
    if (isNaN(grams) || grams <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Số gram không hợp lệ',
        text2: 'Vui lòng nhập số lớn hơn 0',
      });
      return;
    }

    try {
      await diaryService.updateEntry(editingEntry.id, { grams });
      // ⚡ Invalidate cache thay vì refetch trực tiếp
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      setShowEditSheet(false);
      setEditingEntry(null);
      Toast.show({
        type: 'success',
        text1: 'Đã cập nhật',
        text2: `Khẩu phần: ${grams}g`,
      });
    } catch (error: any) {
      console.error('Failed to update entry:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi cập nhật',
        text2: error?.message || 'Không thể cập nhật khẩu phần. Thử lại sau.',
      });
    }
  }, [editingEntry, editGrams, queryClient]);

  const handleAddManual = useCallback(() => {
    navigation.navigate('FoodSearch');
  }, [navigation]);

  // Render date item với design đẹp hơn
  const renderDateItem = useCallback(
    ({ item: date }: { item: Date }) => {
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      const dayNum = date.getDate();
      const dayName = formatDateChip(date);

      return (
        <Pressable
          onPress={() => handleDateSelect(date)}
          style={{ width: (SCREEN_WIDTH - 32) / 5 }}
          accessibilityRole="button"
          accessibilityLabel={`${dayName} ngày ${dayNum}${isToday ? ', hôm nay' : ''}${isSelected ? ', đang chọn' : ''}`}
          accessibilityState={{ selected: isSelected }}
        >
          <Animated.View
            style={[
              styles.dateChip,
              isSelected && styles.dateChipSelected,
              isToday && !isSelected && styles.dateChipToday,
            ]}
          >
            <ThemedText
              variant="caption"
              weight="500"
              style={[styles.dateChipLabel, isSelected && { color: '#fff' }]}
            >
              {dayName}
            </ThemedText>
            <View style={[
              styles.dateChipNumber,
              isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }
            ]}>
              <ThemedText
                variant="h4"
                weight="700"
                style={{ color: isSelected ? '#fff' : theme.colors.text, textAlign: 'center' }}
              >
                {dayNum}
              </ThemedText>
            </View>
          </Animated.View>
        </Pressable>
      );
    },
    [selectedDate, handleDateSelect, formatDateChip, theme, isDark],
  );

  // Render summary header
  const renderSummaryHeader = () => {
    if (entries.length === 0) return null;

    return (
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginBottom: 20 }}>
        <LinearGradient
          colors={isDark
            ? ['rgba(102, 126, 234, 0.15)', 'rgba(118, 75, 162, 0.15)']
            : ['#667eea', '#764ba2']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          {/* Calories main */}
          <View style={styles.summaryMain}>
            <ThemedText style={styles.summaryCalories}>{Math.round(totals.calories)}</ThemedText>
            <ThemedText style={styles.summaryLabel}>kcal hôm nay</ThemedText>
          </View>

          {/* Macro pills */}
          <View style={styles.summaryMacros}>
            <View style={[styles.macroPill, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <ThemedText style={[styles.macroValue, { color: isDark ? '#fca5a5' : '#fff' }]}>
                {totals.protein.toFixed(0)}g
              </ThemedText>
              <ThemedText style={styles.macroLabel}>Protein</ThemedText>
            </View>
            <View style={[styles.macroPill, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <ThemedText style={[styles.macroValue, { color: isDark ? '#93c5fd' : '#fff' }]}>
                {totals.carbs.toFixed(0)}g
              </ThemedText>
              <ThemedText style={styles.macroLabel}>Carbs</ThemedText>
            </View>
            <View style={[styles.macroPill, { backgroundColor: 'rgba(234, 179, 8, 0.2)' }]}>
              <ThemedText style={[styles.macroValue, { color: isDark ? '#fde047' : '#fff' }]}>
                {totals.fat.toFixed(0)}g
              </ThemedText>
              <ThemedText style={styles.macroLabel}>Fat</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render food card dẹp hơn với FoodEntryCard
  const renderFoodCard = useCallback(
    (entry: DiaryEntry, index: number) => {
      const handleDelete = async () => {
        try {
          await diaryService.deleteEntry(entry.id);
          // ⚡ Invalidate cache thay vì refetch trực tiếp
          queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
          queryClient.invalidateQueries({ queryKey: ['home-summary'] });
          Toast.show({
            type: 'success',
            text1: 'Đã xóa',
            text2: `Đã xóa ${entry.foodName}`,
          });
        } catch (error: any) {
          console.error('Failed to delete entry:', error);
          Toast.show({
            type: 'error',
            text1: 'Lỗi xóa',
            text2: error?.message || 'Không thể xóa món ăn. Thử lại sau.',
          });
        }
      };

      return (
        <FoodEntryCard
          key={entry.id}
          id={entry.id}
          foodName={entry.foodName}
          calories={entry.calories || 0}
          protein={entry.protein || 0}
          carbs={entry.carbs || 0}
          fat={entry.fat || 0}
          quantityText={entry.quantityText ?? undefined}
          sourceMethod={entry.sourceMethod as 'ai' | 'manual' | 'search'}
          onPress={() => handleEditGrams(entry)}
          onEdit={() => handleEditGrams(entry)}
          onDelete={handleDelete}
        />
      );
    },
    [handleEditGrams, queryClient],
  );

  // Render meal section với design đẹp hơn
  const renderMealSection = useCallback(
    ({
      item,
      index,
    }: {
      item: { mealType: MealTypeId; title: string; entries: DiaryEntry[] };
      index: number;
    }) => {
      const emoji = MEAL_EMOJIS[item.mealType];
      const mealCalories = item.entries.reduce((sum, e) => sum + (e.calories || 0), 0);

      return (
        <View
          style={{ marginBottom: 20, paddingHorizontal: 16 }}
        >
          {/* Meal header */}
          <View style={styles.mealHeader}>
            <View style={styles.mealTitle}>
              <ThemedText style={{ fontSize: 20, marginRight: 8 }}>{emoji}</ThemedText>
              <ThemedText variant="h4" weight="700">
                {item.title}
              </ThemedText>
            </View>
            <View style={styles.mealCalories}>
              <ThemedText variant="body" color="primary" weight="600">
                {Math.round(mealCalories)} kcal
              </ThemedText>
            </View>
          </View>

          {/* Food cards */}
          <View style={{ gap: 8 }}>
            {item.entries.map((entry, idx) => renderFoodCard(entry, idx))}
          </View>
        </View>
      );
    },
    [renderFoodCard],
  );

  // Render empty state đẹp hơn với AnimatedEmptyState
  const renderEmptyState = () => (
    <AnimatedEmptyState
      variant="no-food"
      title="Chưa có dữ liệu hôm nay"
      description="Hãy chụp ảnh hoặc tìm kiếm để thêm món ăn vào nhật ký."
      primaryAction={{
        label: 'Thêm món ăn',
        onPress: handleAddManual,
        icon: 'add-circle-outline',
      }}
      secondaryAction={{
        label: 'Chụp ảnh món ăn',
        onPress: () => navigation.navigate('AiCamera'),
      }}
      compact
    />
  );

  const isEmpty = entries.length === 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    screenHeader: {
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      marginRight: 40,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      alignSelf: 'flex-start',
    },
    dateIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePickerContainer: {
      backgroundColor: isDark ? theme.colors.card : '#fff',
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      overflow: 'hidden',
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    datePickerDoneBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    dateSelector: {
      position: 'relative',
      marginBottom: 16,
    },
    scrollArrow: {
      position: 'absolute',
      top: 16, // (64 height - 32 button) / 2 = 16
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    dateChip: {
      width: '90%',
      height: 72,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: isDark ? 'rgba(74, 144, 226, 0.08)' : 'rgba(59, 130, 246, 0.05)',
    },
    dateChipSelected: {
      backgroundColor: theme.colors.primary,
    },
    dateChipToday: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '15',
    },
    dateChipLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      marginBottom: 4,
    },
    dateChipNumber: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    summaryCard: {
      borderRadius: 24,
      padding: 24,
      marginHorizontal: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: 'rgba(255,255,255,0.1)',
      ...theme.shadows.lg,
    },
    summaryMain: {
      alignItems: 'center',
      marginBottom: 20,
    },
    caloriesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fireEmoji: {
      fontSize: 32,
    },
    summaryCalories: {
      fontSize: 48,
      fontWeight: '800',
      color: isDark ? theme.colors.text : '#fff',
      letterSpacing: -1,
      lineHeight: 56,
    },
    summaryLabel: {
      fontSize: 14,
      color: isDark ? theme.colors.textSecondary : 'rgba(255,255,255,0.85)',
      marginTop: 4,
      fontWeight: '500',
    },
    summaryMacros: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    macroPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 14,
    },
    macroItem: {
      alignItems: 'center',
      flex: 1,
    },
    macroValue: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
    },
    macroLabel: {
      fontSize: 11,
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.8)',
      marginTop: 2,
      fontWeight: '500',
    },
    macroDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    mealHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    mealTitle: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    mealCalories: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    foodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    foodMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    foodMacros: {
      marginTop: 2,
    },
    foodBadge: {
      marginLeft: 12,
    },
    sourceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtons: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    editSheetContent: {
      gap: 16,
    },
    editInput: {
      marginBottom: 16,
    },
  });

  return (
    <Screen scroll={false} testID={TEST_IDS.mealDiary.screen}>
      <View style={styles.container}>
        {/* Custom Header với Back button - centered like EditProfileScreen */}
        <View style={[styles.screenHeader, { paddingTop: 10 }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={8}
            >
              <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
            </Pressable>
            <View style={styles.headerCenter}>
              <ThemedText variant="h3" weight="700">
                Nhật ký bữa ăn
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Date label với nút chọn lịch */}
        <View style={styles.header}>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.datePickerButton}
          >
            <View style={styles.dateIconWrapper}>
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
            </View>
            <ThemedText variant="h4" weight="600">
              {formatDateLabel(selectedDate)}
            </ThemedText>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {/* Native Date Picker Modal */}
        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerHeader}>
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDoneBtn}>
                  <ThemedText variant="body" weight="600" color="primary">Xong</ThemedText>
                </Pressable>
              </View>
            )}
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, date?: Date) => {
                if (Platform.OS !== 'ios') {
                  setShowDatePicker(false);
                }
                if (date) {
                  setSelectedDate(date);
                  const idx = dateOptions.findIndex(
                    (d) => d.toDateString() === date.toDateString()
                  );
                  if (idx >= 0) {
                    dateListRef.current?.scrollToIndex({
                      index: idx,
                      animated: true,
                      viewPosition: 0.5,
                    });
                  }
                }
              }}
              maximumDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
              minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
            />
          </View>
        )}

        {/* Date Selector - scroll để xem thêm ngày */}
        <View style={styles.dateSelector}>
          <FlatList
            ref={dateListRef}
            data={dateOptions}
            renderItem={renderDateItem}
            keyExtractor={(item) => item.toISOString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            snapToInterval={(SCREEN_WIDTH - 32) / 5}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: (SCREEN_WIDTH - 32) / 5,
              offset: ((SCREEN_WIDTH - 32) / 5) * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                dateListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: false,
                });
              }, 100);
            }}
          />
        </View>

        {/* Content */}
        {isEntriesLoading ? (
          <View style={styles.emptyContainer}>
            <ThemedText variant="body" color="textSecondary">
              Đang tải...
            </ThemedText>
          </View>
        ) : isEmpty ? (
          renderEmptyState()
        ) : (
          <FlashList
            data={groupedEntries}
            renderItem={({ item, index }) => renderMealSection({ item, index })}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={renderSummaryHeader}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}

        {/* FAB Add Button */}
        {!isEmpty && (
          <Pressable
            onPress={handleAddManual}
            style={({ pressed }) => [
              {
                position: 'absolute',
                bottom: 24,
                right: 24,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                ...theme.shadows.lg,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
            testID={TEST_IDS.mealDiary.addManualButton}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        )}

        {/* Back to Today button - bottom center */}
        {!isToday && (
          <Pressable
            onPress={() => setSelectedDate(new Date())}
            style={({ pressed }) => [
              {
                position: 'absolute',
                bottom: 90,
                left: '50%',
                transform: [{ translateX: -70 }, { scale: pressed ? 0.95 : 1 }],
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 24,
                gap: 6,
                ...theme.shadows.md,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="today-outline" size={16} color="#fff" />
            <ThemedText variant="bodySmall" weight="600" style={{ color: '#fff' }}>
              Quay lại hôm nay
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Edit Grams Bottom Sheet */}
      <BottomSheet
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        title="Chỉnh sửa khẩu phần"
        height={300}
      >
        <View style={styles.editSheetContent}>
          <ThemedText variant="body" weight="600">
            Nhập số gram mới:
          </ThemedText>
          <ThemedTextInput
            value={editGrams}
            onChangeText={(text) => {
              const numericOnly = text.replace(/[^0-9.]/g, '');
              setEditGrams(numericOnly);
            }}
            placeholder="Ví dụ: 150"
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleSaveGrams}
            style={styles.editInput}
          />
          <Button title="💾 Lưu thay đổi" onPress={handleSaveGrams} />
        </View>
      </BottomSheet>
    </Screen>
  );
};

export default MealDiaryScreen;
