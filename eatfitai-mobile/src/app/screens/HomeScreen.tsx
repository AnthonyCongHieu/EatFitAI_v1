import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../../components/ThemedText';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import GradientBackground from '../../components/GradientBackground';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../types';
import { MEAL_TYPE_LABELS, type MealTypeId } from '../../types';
import { diaryService } from '../../services/diaryService';
import { healthService } from '../../services/healthService';

const MEAL_TITLE_MAP: Record<MealTypeId, string> = {
  1: 'Bá»¯a sÃ¡ng',
  2: 'Bá»¯a trÆ°a',
  3: 'Bá»¯a tá»‘i',
  4: 'Ä‚n váº·t',
};

type AddOption = 'search' | 'custom' | 'ai';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddEntryModal = ({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (option: AddOption) => void }): JSX.Element => {
  const { theme } = useAppTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Card>
          <ThemedText variant="h3">ThÃªm mÃ³n</ThemedText>
          <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.md }}>
            Chá»n cÃ¡ch thÃªm mÃ³n vÃ o nháº­t kÃ½
          </ThemedText>
          <Button title="TÃ¬m mÃ³n cÃ³ sáºµn" onPress={() => onSelect('search')} />
          <View style={{ height: 8 }} />
          <Button variant="outline" title="Táº¡o mÃ³n thá»§ cÃ´ng" onPress={() => onSelect('custom')} />
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose} style={{ alignItems: 'center', marginTop: 8 }}>
            <ThemedText variant="body" color="muted">ÄÃ³ng</ThemedText>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
};

const formatNumber = (value?: number | null, suffix = '', decimals = 0): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  if (decimals === 0) {
    return `${Math.round(value)}${suffix}`;
  }
  return `${value.toFixed(decimals)}${suffix}`;
};

const formatDate = (dateValue: string | undefined): string => {
  if (!dateValue) return 'HÃ´m nay';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'HÃ´m nay';
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
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    fetchSummary().catch((error: any) => {
      const status = error?.response?.status;
      if (status === 401) {
        Toast.show({ type: 'error', text1: 'PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ háº¿t háº¡n', text2: 'Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i' });
      } else if (status >= 500) {
        Toast.show({ type: 'error', text1: 'Lá»—i mÃ¡y chá»§', text2: 'Vui lÃ²ng thá»­ láº¡i sau' });
      } else if (!navigator.onLine) {
        Toast.show({ type: 'error', text1: 'KhÃ´ng cÃ³ káº¿t ná»‘i máº¡ng', text2: 'Kiá»ƒm tra káº¿t ná»‘i vÃ  thá»­ láº¡i' });
      } else {
        Toast.show({ type: 'error', text1: 'KhÃ´ng thá»ƒ táº£i nháº­t kÃ½ hÃ´m nay', text2: 'KÃ©o xuá»‘ng Ä‘á»ƒ thá»­ láº¡i' });
      }
    });
  }, [fetchSummary]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await healthService.pingRoot();
      if (!cancelled) setServerDown(!res.ok);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = useCallback(() => {
    refreshSummary().catch((error: any) => {
      const status = error?.response?.status;
      if (status === 401) {
        Toast.show({ type: 'error', text1: 'PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ háº¿t háº¡n', text2: 'Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i' });
      } else if (status >= 500) {
        Toast.show({ type: 'error', text1: 'Lá»—i mÃ¡y chá»§', text2: 'Vui lÃ²ng thá»­ láº¡i sau' });
      } else if (!navigator.onLine) {
        Toast.show({ type: 'error', text1: 'KhÃ´ng cÃ³ káº¿t ná»‘i máº¡ng', text2: 'Kiá»ƒm tra káº¿t ná»‘i vÃ  thá»­ láº¡i' });
      } else {
        Toast.show({ type: 'error', text1: 'Táº£i láº¡i tháº¥t báº¡i', text2: 'KÃ©o xuá»‘ng Ä‘á»ƒ thá»­ láº¡i' });
      }
    });
  }, [refreshSummary]);

  const handleDelete = useCallback(
    (entryId: string, foodName: string) => {
      Alert.alert('XÃ³a mÃ³n', `XÃ¡c nháº­n xÃ³a "${foodName}" khá»i nháº­t kÃ½?`, [
        { text: 'Há»§y', style: 'cancel' },
        {
          text: 'XÃ³a',
          style: 'destructive',
          onPress: () => {
            diaryService
              .deleteEntry(entryId)
              .then(() => {
                Toast.show({ type: 'success', text1: 'ÄÃ£ xÃ³a mÃ³n khá»i nháº­t kÃ½', text2: 'Nháº­t kÃ½ Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t' });
                refreshSummary().catch(() => {});
              })
              .catch((error: any) => {
                const status = error?.response?.status;
                if (status === 404) {
                  Toast.show({ type: 'error', text1: 'MÃ³n Äƒn khÃ´ng tá»“n táº¡i', text2: 'MÃ³n nÃ y cÃ³ thá»ƒ Ä‘Ã£ bá»‹ xÃ³a trÆ°á»›c Ä‘Ã³' });
                } else if (status === 403) {
                  Toast.show({ type: 'error', text1: 'KhÃ´ng cÃ³ quyá»n xÃ³a mÃ³n nÃ y', text2: 'Chá»‰ cÃ³ thá»ƒ xÃ³a mÃ³n do báº¡n thÃªm' });
                } else if (status >= 500) {
                  Toast.show({ type: 'error', text1: 'Lá»—i mÃ¡y chá»§', text2: 'Vui lÃ²ng thá»­ láº¡i sau' });
                } else if (!navigator.onLine) {
                  Toast.show({ type: 'error', text1: 'KhÃ´ng cÃ³ káº¿t ná»‘i máº¡ng', text2: 'Kiá»ƒm tra káº¿t ná»‘i vÃ  thá»­ láº¡i' });
                } else {
                  Toast.show({ type: 'error', text1: 'XÃ³a tháº¥t báº¡i', text2: 'Vui lÃ²ng thá»­ láº¡i hoáº·c liÃªn há»‡ há»— trá»£' });
                }
              });
          },
        },
      ]);
    },
    [refreshSummary],
  );

  const handleAddOption = useCallback(
    (option: AddOption) => {
      setShowAddModal(false);
      if (option === 'search') return navigation.navigate('FoodSearch');
      if (option === 'custom') return navigation.navigate('CustomDish');
      // Skip AI option as per task requirements
    },
    [navigation],
  );

  const calorieDiffText = useMemo(() => {
    if (!summary || typeof summary.totalCalories !== 'number' || typeof summary.targetCalories !== 'number') return null;
    const diff = summary.totalCalories - summary.targetCalories;
    if (diff === 0) return 'Báº¡n Ä‘ang báº±ng vá»›i má»¥c tiÃªu';
    if (diff > 0) return `VÆ°á»£t ${Math.abs(diff)} kcal so vá»›i má»¥c tiÃªu`;
    return `Tháº¥p hÆ¡n ${Math.abs(diff)} kcal so vá»›i má»¥c tiÃªu`;
  }, [summary]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Screen
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      >
        {serverDown && (
          <View style={{ padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.danger + '20' }}>
            <ThemedText color="danger" weight="600">Không thể kết nối máy chủ</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">Kiểm tra API_BASE_URL hoặc mạng LAN</ThemedText>
          </View>
        )}
        <Card>
          <ThemedText variant="h2">Nháº­t kÃ½ hÃ´m nay</ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary">{formatDate(summary?.date)}</ThemedText>

          <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
            <View style={[styles.box, { backgroundColor: theme.colors.primaryLight }]}>
              <ThemedText variant="caption" color="primary" weight="600" style={{ textTransform: 'uppercase' }}>
                TiÃªu thá»¥
              </ThemedText>
              <ThemedText variant="h2" color="primary">
                {formatNumber(summary?.totalCalories, ' kcal')}
              </ThemedText>
            </View>
            <View style={[styles.box, { backgroundColor: theme.colors.secondaryLight }]}>
              <ThemedText variant="caption" color="secondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Má»¥c tiÃªu
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
            <Button title="+ ThÃªm mÃ³n" onPress={() => setShowAddModal(true)} />
          </View>
        </Card>

        {isLoading ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={theme.colors.primary} />
              <ThemedText variant="body" color="textSecondary">Äang táº£i nháº­t kÃ½...</ThemedText>
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
                <ThemedText variant="bodySmall" color="textSecondary">{meal.entries.length} mÃ³n</ThemedText>
              </View>

              {meal.entries.map((entry: any) => (
                <View key={entry.id} style={[styles.entryRow, { borderColor: theme.colors.border }]}> 
                  <View style={styles.entryInfo}>
                    <ThemedText variant="body" weight="600">{entry.foodName}</ThemedText>
                    <ThemedText variant="bodySmall" color="textSecondary">
                      {formatNumber(entry.calories, ' kcal')} Â· {entry.quantityText ?? 'KhÃ´ng rÃµ kháº©u pháº§n'}
                    </ThemedText>
                  </View>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => handleDelete(entry.id, entry.foodName)} style={styles.deleteChip}>
                    <ThemedText variant="button" color="danger">XoÃ¡</ThemedText>
                  </Pressable>
                </View>
              ))}
            </Card>
          ))
        ) : (
          <Card>
            <ThemedText variant="body" color="textSecondary">ChÆ°a cÃ³ mÃ³n nÃ o hÃ´m nay</ThemedText>
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

