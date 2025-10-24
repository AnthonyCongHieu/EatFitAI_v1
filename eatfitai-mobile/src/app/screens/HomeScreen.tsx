import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../../components/ThemedText';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../types';

const MEAL_TITLE_MAP: Record<string, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
  snack: 'Ăn vặt',
};

type AddOption = 'search' | 'custom' | 'ai';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddEntryModal = ({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (option: AddOption) => void }): JSX.Element => {
  const { theme } = useAppTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Card>
          <ThemedText variant="h3">Thêm món</ThemedText>
          <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.md }}>
            Chọn cách thêm món vào nhật ký
          </ThemedText>
          <Button title="Tìm món có sẵn" onPress={() => onSelect('search')} />
          <View style={{ height: 8 }} />
          <Button variant="outline" title="Tạo món thủ công" onPress={() => onSelect('custom')} />
          <View style={{ height: 8 }} />
          <Button variant="secondary" title="Gợi ý AI" onPress={() => onSelect('ai')} />
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose} style={{ alignItems: 'center', marginTop: 8 }}>
            <ThemedText variant="body" color="muted">Đóng</ThemedText>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
};

const formatNumber = (value?: number | null, suffix = ''): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return `${Math.round(value)}${suffix}`;
};

const formatDate = (dateValue: string | undefined): string => {
  if (!dateValue) return 'Hôm nay';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Hôm nay';
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(date);
};

const HomeScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const summary = useDiaryStore((s) => s.summary);
  const isLoading = useDiaryStore((s) => s.isLoading);
  const isRefreshing = useDiaryStore((s) => s.isRefreshing);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);
  const refreshSummary = useDiaryStore((s) => s.refreshSummary);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchSummary().catch(() => Toast.show({ type: 'error', text1: 'Không thể tải nhật ký hôm nay' }));
  }, [fetchSummary]);

  const handleRefresh = useCallback(() => {
    refreshSummary().catch(() => Toast.show({ type: 'error', text1: 'Tải lại thất bại' }));
  }, [refreshSummary]);

  const handleDelete = useCallback(
    (entryId: string, foodName: string) => {
      Alert.alert('Xóa món', `Xác nhận xóa "${foodName}" khỏi nhật ký?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            deleteEntry(entryId)
              .then(() => Toast.show({ type: 'success', text1: 'Đã xóa món' }))
              .catch(() => Toast.show({ type: 'error', text1: 'Xóa thất bại' }));
          },
        },
      ]);
    },
    [deleteEntry],
  );

  const handleAddOption = useCallback(
    (option: AddOption) => {
      setShowAddModal(false);
      if (option === 'search') return navigation.navigate('FoodSearch');
      if (option === 'custom') return navigation.navigate('CustomDish');
      if (option === 'ai') return navigation.navigate('AiCamera');
    },
    [navigation],
  );

  const calorieDiffText = useMemo(() => {
    if (!summary || typeof summary.totalCalories !== 'number' || typeof summary.targetCalories !== 'number') return null;
    const diff = summary.totalCalories - summary.targetCalories;
    if (diff === 0) return 'Bạn đang bằng với mục tiêu';
    if (diff > 0) return `Vượt ${Math.abs(diff)} kcal so với mục tiêu`;
    return `Thấp hơn ${Math.abs(diff)} kcal so với mục tiêu`;
  }, [summary]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Screen
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      >
        <Card>
          <ThemedText variant="h2">Nhật ký hôm nay</ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">{formatDate(summary?.date)}</ThemedText>

          <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
            <View style={[styles.box, { backgroundColor: theme.colors.primaryLight }]}>
              <ThemedText variant="caption" color="primary" weight="600" style={{ textTransform: 'uppercase' }}>
                Tiêu thụ
              </ThemedText>
              <ThemedText variant="h2" color="primary">
                {formatNumber(summary?.totalCalories, ' kcal')}
              </ThemedText>
            </View>
            <View style={[styles.box, { backgroundColor: theme.colors.secondaryLight }]}>
              <ThemedText variant="caption" color="secondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Mục tiêu
              </ThemedText>
              <ThemedText variant="h2" color="secondary">
                {formatNumber(summary?.targetCalories, ' kcal')}
              </ThemedText>
            </View>
          </View>

          {calorieDiffText ? (
            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
              {calorieDiffText}
            </ThemedText>
          ) : null}

          <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
            <View style={[styles.box, { backgroundColor: theme.colors.background }]}>
              <ThemedText variant="caption" color="textSecondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Protein
              </ThemedText>
              <ThemedText variant="h4">{formatNumber(summary?.protein, ' g')}</ThemedText>
            </View>
            <View style={[styles.box, { backgroundColor: theme.colors.background }]}>
              <ThemedText variant="caption" color="textSecondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Carb
              </ThemedText>
              <ThemedText variant="h4">{formatNumber(summary?.carbs, ' g')}</ThemedText>
            </View>
            <View style={[styles.box, { backgroundColor: theme.colors.background }]}>
              <ThemedText variant="caption" color="textSecondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Fat
              </ThemedText>
              <ThemedText variant="h4">{formatNumber(summary?.fat, ' g')}</ThemedText>
            </View>
          </View>

          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}>
            <Button title="+ Thêm món" onPress={() => setShowAddModal(true)} />
            <Button variant="outline" title="AI dinh dưỡng" onPress={() => navigation.navigate('AiNutrition')} />
          </View>
        </Card>

        {isLoading ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={theme.colors.primary} />
              <ThemedText variant="body" color="textSecondary">Đang tải nhật ký...</ThemedText>
            </View>
          </Card>
        ) : summary && summary.meals.length > 0 ? (
          summary.meals.map((meal) => (
            <Card key={meal.mealType}>
              <View style={styles.mealHeader}>
                <View>
                  <ThemedText variant="h4">{MEAL_TITLE_MAP[meal.mealType] ?? meal.title}</ThemedText>
                  <ThemedText variant="bodySmall" color="textSecondary">{formatNumber(meal.totalCalories, ' kcal')}</ThemedText>
                </View>
                <ThemedText variant="bodySmall" color="textSecondary">{meal.entries.length} món</ThemedText>
              </View>

              {meal.entries.map((entry: any) => (
                <View key={entry.id} style={[styles.entryRow, { borderColor: theme.colors.border }]}> 
                  <View style={styles.entryInfo}>
                    <ThemedText variant="body" weight="600">{entry.foodName}</ThemedText>
                    <ThemedText variant="bodySmall" color="textSecondary">
                      {formatNumber(entry.calories, ' kcal')} · {entry.quantityText ?? 'Không rõ khẩu phần'}
                    </ThemedText>
                  </View>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => handleDelete(entry.id, entry.foodName)} style={styles.deleteChip}>
                    <ThemedText variant="button" color="danger">Xoá</ThemedText>
                  </Pressable>
                </View>
              ))}
            </Card>
          ))
        ) : (
          <Card>
            <ThemedText variant="body" color="textSecondary">Chưa có món nào hôm nay</ThemedText>
          </Card>
        )}
      </Screen>

      <AddEntryModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSelect={handleAddOption} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  box: { flex: 1, padding: 12, borderRadius: 12, gap: 4 },
  muted: { opacity: 0.7 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTotal: { opacity: 0.9 },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  entryInfo: { flex: 1, paddingRight: 12 },
  entryName: { fontFamily: 'Inter_600SemiBold' },
  entryMeta: { opacity: 0.75, fontSize: 13 },
  deleteChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'transparent' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalHint: { opacity: 0.8 },
});

export default HomeScreen;

