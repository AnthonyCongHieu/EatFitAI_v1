// Màn hình Nhật ký bữa ăn - Redesigned với UI/UX hiện đại
// Features: Summary header, improved date selector, beautiful meal cards

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, Dimensions, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Emoji cho từng loại bữa ăn
const MEAL_EMOJIS: Record<MealTypeId, string> = {
  1: '🌅', // Breakfast
  2: '☀️', // Lunch
  3: '🌙', // Dinner
  4: '🍵', // Snack
};

// Gradient colors cho từng loại bữa ăn
const MEAL_GRADIENTS: Record<MealTypeId, string[]> = {
  1: ['#FF9A9E', '#FECFEF'], // Breakfast - Hồng nhạt
  2: ['#A8EDEA', '#FED6E3'], // Lunch - Xanh mint
  3: ['#667EEA', '#764BA2'], // Dinner - Tím
  4: ['#FFECD2', '#FCB69F'], // Snack - Cam nhạt
};

const MealDiaryScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MealDiary'>>();

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

  const refreshSummary = useDiaryStore((s) => s.refreshSummary);
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

  // Format date for display
  const formatDate = useCallback((date: Date) => {
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

  const {
    data: entriesData,
    isLoading: isEntriesLoading,
    refetch,
  } = useQuery({
    queryKey: ['diary-entries', dateKey],
    queryFn: () => diaryService.getEntriesByDate(dateKey),
  });
  const entries = entriesData ?? [];

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
      await refetch();
      await refreshSummary();
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
  }, [editingEntry, editGrams, refetch, refreshSummary]);

  const handleAddManual = useCallback(() => {
    navigation.navigate('FoodSearch');
  }, [navigation]);

  // Render date item với design đẹp hơn
  const renderDateItem = useCallback(
    ({ item: date }: { item: Date }) => {
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      const dayNum = date.getDate();

      return (
        <Pressable onPress={() => handleDateSelect(date)} style={{ marginRight: 8 }}>
          <Animated.View
            style={[
              styles.dateChip,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary
                  : isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.05)',
                borderColor: isToday && !isSelected ? theme.colors.primary : 'transparent',
                borderWidth: isToday && !isSelected ? 1.5 : 0,
              },
            ]}
          >
            <ThemedText
              variant="caption"
              weight="600"
              style={{ color: isSelected ? '#fff' : theme.colors.textSecondary }}
            >
              {formatDate(date).split(',')[0]}
            </ThemedText>
            <ThemedText
              variant="h4"
              weight="700"
              style={{ color: isSelected ? '#fff' : theme.colors.text }}
            >
              {dayNum}
            </ThemedText>
          </Animated.View>
        </Pressable>
      );
    },
    [selectedDate, handleDateSelect, formatDate, theme, isDark],
  );

  // Render summary header
  const renderSummaryHeader = () => {
    if (entries.length === 0) return null;

    return (
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginBottom: 16 }}>
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryMain}>
            <ThemedText style={styles.summaryCalories}>{Math.round(totals.calories)}</ThemedText>
            <ThemedText style={styles.summaryLabel}>kcal hôm nay</ThemedText>
          </View>

          <View style={styles.summaryMacros}>
            <View style={styles.macroItem}>
              <ThemedText style={styles.macroValue}>{totals.protein.toFixed(0)}g</ThemedText>
              <ThemedText style={styles.macroLabel}>Protein</ThemedText>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <ThemedText style={styles.macroValue}>{totals.carbs.toFixed(0)}g</ThemedText>
              <ThemedText style={styles.macroLabel}>Carbs</ThemedText>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <ThemedText style={styles.macroValue}>{totals.fat.toFixed(0)}g</ThemedText>
              <ThemedText style={styles.macroLabel}>Fat</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render food card đẹp hơn
  const renderFoodCard = useCallback(
    (entry: DiaryEntry, index: number) => (
      <Animated.View
        key={entry.id}
        entering={FadeIn.delay(index * 50)}
        layout={Layout.springify()}
      >
        <Pressable
          onPress={() => handleEditGrams(entry)}
          style={({ pressed }) => [
            styles.foodCard,
            {
              backgroundColor: isDark ? theme.colors.card : '#fff',
              borderColor: theme.colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" weight="600" numberOfLines={1}>
              {entry.foodName}
            </ThemedText>
            <View style={styles.foodMeta}>
              <ThemedText variant="caption" color="primary" weight="700">
                {Math.round(entry.calories || 0)} kcal
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                {' '}
                • {entry.quantityText || '--'}
              </ThemedText>
            </View>
            <View style={styles.foodMacros}>
              <ThemedText variant="caption" color="textSecondary">
                P {entry.protein?.toFixed(0) || 0}g • C {entry.carbs?.toFixed(0) || 0}g • F{' '}
                {entry.fat?.toFixed(0) || 0}g
              </ThemedText>
            </View>
          </View>

          <View style={styles.foodBadge}>
            {entry.sourceMethod === 'ai' ? (
              <View style={[styles.sourceBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <ThemedText variant="caption" color="primary" weight="600">
                  🤖 AI
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.sourceBadge, { backgroundColor: theme.colors.border }]}>
                <ThemedText variant="caption" color="textSecondary" weight="600">
                  ✏️
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    ),
    [handleEditGrams, isDark, theme],
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
        <Animated.View
          entering={FadeInUp.delay(index * 100).springify()}
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
        </Animated.View>
      );
    },
    [renderFoodCard],
  );

  // Render empty state đẹp hơn
  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="restaurant-outline" size={64} color={theme.colors.primary} />
      </View>
      <ThemedText variant="h3" weight="700" style={{ marginTop: 16, textAlign: 'center' }}>
        Chưa có dữ liệu
      </ThemedText>
      <ThemedText
        variant="body"
        color="textSecondary"
        style={{ marginTop: 8, textAlign: 'center' }}
      >
        Hãy thêm món ăn vào nhật ký.
      </ThemedText>
      <Button
        title="➕ Thêm món ăn"
        variant="primary"
        onPress={handleAddManual}
        style={{ marginTop: 24, minWidth: 180 }}
      />
    </Animated.View>
  );

  const isEmpty = entries.length === 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
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
      width: 56,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    summaryCard: {
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      ...theme.shadows.lg,
    },
    summaryMain: {
      alignItems: 'center',
      marginBottom: 16,
      paddingTop: 8, // Thêm padding để số không bị cắt trên
    },
    summaryCalories: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
      letterSpacing: 1,
      lineHeight: 48, // Đảm bảo lineHeight đủ lớn để không cắt số
      includeFontPadding: true, // Bao gồm font padding
    },
    summaryLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    summaryMacros: {
      flexDirection: 'row',
      justifyContent: 'space-around',
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
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2,
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
    <Screen scroll={false}>
      <View style={styles.container}>
        {/* Date label với nút chọn lịch */}
        <View style={styles.header}>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <ThemedText variant="h4" color="textSecondary">
              {formatDate(selectedDate) === 'Hôm nay'
                ? '📅 Hôm nay'
                : formatDate(selectedDate) === 'Hôm qua'
                  ? '📅 Hôm qua'
                  : `📅 ${formatDate(selectedDate)}`}
            </ThemedText>
            <View
              style={{
                backgroundColor: theme.colors.primaryLight,
                borderRadius: 8,
                padding: 6,
              }}
            >
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
            </View>
          </Pressable>
        </View>

        {/* Native Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) {
                setSelectedDate(date);
                // Cuộn đến ngày được chọn nếu nằm trong range
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
        )}

        {/* Date Selector - scroll để xem thêm ngày */}
        <View style={styles.dateSelector}>
          <FlatList
            ref={dateListRef}
            data={dateOptions}
            renderItem={renderDateItem}
            keyExtractor={(item) => item.toISOString()}
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            getItemLayout={(_, index) => ({
              length: 64,
              offset: 64 * index,
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
            estimatedItemSize={200}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={renderSummaryHeader}
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
          >
            <Ionicons name="add" size={28} color="#fff" />
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
            style={styles.editInput}
          />
          <Button title="💾 Lưu thay đổi" onPress={handleSaveGrams} />
        </View>
      </BottomSheet>
    </Screen>
  );
};

export default MealDiaryScreen;
