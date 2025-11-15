import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { Screen } from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { Button } from '../../../components/Button';
import { BottomSheet } from '../../../components/BottomSheet';
import { ThemedTextInput } from '../../../components/ThemedTextInput';
import { AppCard } from '../../../components/ui/AppCard';
import { AppChip } from '../../../components/ui/AppChip';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { diaryService, type DiaryEntry, type DaySummary } from '../../../services/diaryService';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealTypeId } from '../../../types';
import type { RootStackParamList } from '../../types';
import { t } from '../../../i18n/vi';

const DAYS_TO_SHOW = 7; // Show ±3 days from today

const MealDiaryScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [editGrams, setEditGrams] = useState('');
  const [showEditSheet, setShowEditSheet] = useState(false);

  const refreshSummary = useDiaryStore((s) => s.refreshSummary);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    dateSelector: {
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    dateList: {
      paddingVertical: theme.spacing.sm,
    },
    dateItem: {
      marginRight: theme.spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    mealSection: {
      marginBottom: theme.spacing.lg,
    },
    foodCard: {
      marginBottom: theme.spacing.xs,
    },
    foodCardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    foodInfo: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    foodDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    foodActions: {
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
    },
    editButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    emptyMealCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    emptyMealText: {
      textAlign: 'center',
    },
    emptyActions: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    actionButtons: {
      flexDirection: 'row',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionButton: {
      flex: 1,
    },
    editSheetContent: {
      gap: theme.spacing.lg,
    },
    editLabel: {
      marginBottom: theme.spacing.sm,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    editInput: {
      marginBottom: theme.spacing.lg,
    },
    saveButton: {
      marginTop: theme.spacing.sm,
    },
  });

  // Generate date options for horizontal selector
  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();

    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push(date);
    }

    return options;
  }, []);

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('common.today');
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Ngày mai';
    }

    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric'
    });
  }, []);

  // Format date for API
  const formatDateForApi = useCallback((date: Date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Load entries for selected date
  const loadEntries = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = formatDateForApi(date);
      const data = await diaryService.getEntriesByDate(dateStr);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load diary entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [formatDateForApi]);

  // Group entries by meal type
  const groupedEntries = useMemo(() => {
    const groups = new Map<MealTypeId, DiaryEntry[]>();

    entries.forEach(entry => {
      const mealType = entry.mealType;
      if (!groups.has(mealType)) {
        groups.set(mealType, []);
      }
      groups.get(mealType)!.push(entry);
    });

    return Array.from(groups.entries()).map(([mealType, entries]) => ({
      mealType,
      title: MEAL_TYPE_LABELS[mealType],
      entries
    }));
  }, [entries]);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    loadEntries(date);
  }, [loadEntries]);

  // Handle edit grams
  const handleEditGrams = useCallback((entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEditGrams(entry.quantityText?.split(' ')[0] || '');
    setShowEditSheet(true);
  }, []);

  // Save edited grams
  const handleSaveGrams = useCallback(async () => {
    if (!editingEntry) return;

    const grams = parseFloat(editGrams);
    if (isNaN(grams) || grams <= 0) return;

    try {
      await diaryService.updateEntry(editingEntry.id, { grams });
      await loadEntries(selectedDate);
      await refreshSummary();
      setShowEditSheet(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  }, [editingEntry, editGrams, loadEntries, selectedDate, refreshSummary]);

  // Handle add from AI
  const handleAddFromAI = useCallback(() => {
    navigation.navigate('AiCamera');
  }, [navigation]);

  // Handle add manually
  const handleAddManual = useCallback(() => {
    navigation.navigate('FoodSearch');
  }, [navigation]);

  // Load entries when date changes
  useEffect(() => {
    loadEntries(selectedDate);
  }, [loadEntries, selectedDate]);

  // Render date selector item
  const renderDateItem = useCallback(({ item: date }: { item: Date }) => {
    const isSelected = date.toDateString() === selectedDate.toDateString();

    return (
      <Animated.View
        style={[
          styles.dateItem,
          useAnimatedStyle(() => ({
            transform: [{ scale: isSelected ? withSpring(1.05) : withSpring(1) }],
          })),
        ]}
      >
        <Pressable onPress={() => handleDateSelect(date)}>
          <AppChip
            label={formatDate(date)}
            selected={isSelected}
            variant="outline"
          />
        </Pressable>
      </Animated.View>
    );
  }, [selectedDate, handleDateSelect, formatDate]);

  // Render food card
  const renderFoodCard = useCallback((entry: DiaryEntry) => (
    <AppCard key={entry.id} style={styles.foodCard}>
      <View style={styles.foodCardContent}>
        <View style={styles.foodInfo}>
          <ThemedText variant="body" numberOfLines={2}>
            {entry.foodName}
          </ThemedText>
          <View style={styles.foodDetails}>
            <ThemedText variant="caption" color="textSecondary">
              {entry.calories ? `${entry.calories} kcal` : '--'}
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              •
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              {entry.quantityText || '--'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.foodActions}>
          <AppChip
            label={entry.sourceMethod === 'ai' ? 'AI' : 'Tự tạo'}
            variant="solid"
          />
          <Pressable
            style={styles.editButton}
            onPress={() => handleEditGrams(entry)}
          >
            <ThemedText variant="caption" color="primary">
              Sửa
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </AppCard>
  ), [handleEditGrams]);

  // Render meal section
  const renderMealSection = useCallback(({ item, index }: { item: { mealType: MealTypeId; title: string; entries: DiaryEntry[] }; index: number }) => (
    <Animated.View
      key={item.mealType}
      style={styles.mealSection}
      entering={FadeInUp.delay(index * 100).duration(400).springify()}
    >
      <SectionHeader title={item.title} />
      {item.entries.length > 0 ? (
        item.entries.map((entry, entryIndex) => (
          <Animated.View
            key={entry.id}
            entering={FadeInUp.delay((index * 100) + (entryIndex * 50)).duration(300).springify()}
          >
            {renderFoodCard(entry)}
          </Animated.View>
        ))
      ) : (
        <AppCard style={styles.emptyMealCard}>
          <ThemedText variant="bodySmall" color="textSecondary" style={styles.emptyMealText}>
            Chưa có món nào trong bữa ăn này
          </ThemedText>
        </AppCard>
      )}
    </Animated.View>
  ), [renderFoodCard]);

  const isEmpty = entries.length === 0;

  return (
    <Screen>
      <View style={styles.container}>
        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <FlatList
            data={dateOptions}
            renderItem={renderDateItem}
            keyExtractor={(item) => item.toISOString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText variant="body">{t('common.loading')}</ThemedText>
          </View>
        ) : isEmpty ? (
          <EmptyState
            title="Chưa có dữ liệu"
            description="Thử thêm bữa bằng AI hoặc thủ công."
            icon="restaurant"
            action={
              <View style={styles.emptyActions}>
                <View style={styles.actionButton}>
                  <Button
                    title="+ Thêm từ AI"
                    onPress={handleAddFromAI}
                  />
                </View>
                <View style={styles.actionButton}>
                  <Button
                    title="+ Thêm thủ công"
                    variant="outline"
                    onPress={handleAddManual}
                  />
                </View>
              </View>
            }
          />
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {groupedEntries.map((group, index) => renderMealSection({ item: group, index }))}
          </ScrollView>
        )}

        {/* Action Buttons */}
        {!isEmpty && (
          <View style={styles.actionButtons}>
            <View style={styles.actionButton}>
              <Button
                title="+ Thêm từ AI"
                onPress={handleAddFromAI}
              />
            </View>
            <View style={styles.actionButton}>
              <Button
                title="+ Thêm thủ công"
                variant="outline"
                onPress={handleAddManual}
              />
            </View>
          </View>
        )}
      </View>

      {/* Edit Grams Bottom Sheet */}
      <BottomSheet
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        title="Chỉnh sửa gram"
        height={300}
      >
        <View style={styles.editSheetContent}>
          <ThemedText variant="body" style={styles.editLabel}>
            Số gram mới:
          </ThemedText>
          <ThemedTextInput
            value={editGrams}
            onChangeText={setEditGrams}
            placeholder="Nhập số gram"
            keyboardType="numeric"
            style={styles.editInput}
          />
          <View style={styles.saveButton}>
            <Button
              title="Lưu"
              onPress={handleSaveGrams}
            />
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
};

export default MealDiaryScreen;