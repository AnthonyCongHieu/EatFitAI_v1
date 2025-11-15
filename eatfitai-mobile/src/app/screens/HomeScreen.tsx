import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../../components/ThemedText';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import ProgressBar from '../../components/ProgressBar';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../types';
import { MEAL_TYPE_LABELS, type MealTypeId } from '../../types';
import { diaryService } from '../../services/diaryService';
import { healthService } from '../../services/healthService';
import { t } from '../../i18n/vi';

// New UI components
import { AppCard } from '../../components/ui/AppCard';
import { AppChip } from '../../components/ui/AppChip';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { EmptyState } from '../../components/ui/EmptyState';

const MEAL_TITLE_MAP: Record<MealTypeId, string> = {
  1: t('mealTypes.breakfast'),
  2: t('mealTypes.lunch'),
  3: t('mealTypes.dinner'),
  4: t('mealTypes.snack'),
};

type AddOption = 'search' | 'custom' | 'ai';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddEntryModal = ({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (option: AddOption) => void }): JSX.Element => {
  const { theme } = useAppTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Card>
          <ThemedText variant="h3">{t('home.addDishTitle')}</ThemedText>
          <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.md }}>
            {t('home.chooseAddMethod')}
          </ThemedText>
          <Button title={t('home.searchExisting')} onPress={() => onSelect('search')} />
          <View style={{ height: 8 }} />
          <Button variant="outline" title={t('home.createCustom')} onPress={() => onSelect('custom')} />
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose} style={{ alignItems: 'center', marginTop: 8 }}>
            <ThemedText variant="body" color="muted">{t('home.close')}</ThemedText>
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
  if (!dateValue) return t('common.today');
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return t('common.today');
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
    fetchSummary()
      .then(() => {
        // Nếu load summary thành công, coi như server đang ổn
        setServerDown(false);
      })
      .catch((error: any) => {
        const status = error?.response?.status;
        if (status === 401) {
          Toast.show({ type: 'error', text1: t('common.sessionExpired'), text2: t('common.pleaseLoginAgain') });
        } else if (status >= 500) {
          Toast.show({ type: 'error', text1: t('common.serverError'), text2: t('common.tryAgainLater') });
        } else if (!navigator.onLine) {
          Toast.show({ type: 'error', text1: t('common.networkError'), text2: t('common.checkConnection') });
        } else {
          Toast.show({ type: 'error', text1: t('home.loadDiaryFailed'), text2: t('home.pullToRetry') });
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

  // Re-check server health whenever screen gains focus (tránh kẹt cờ khi ping lần đầu thất bại)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const res = await healthService.pingRoot();
        if (active) setServerDown(!res.ok);
      })();
      return () => { active = false; };
    }, [])
  );

  const handleRefresh = useCallback(() => {
    refreshSummary().catch((error: any) => {
      const status = error?.response?.status;
      if (status === 401) {
        Toast.show({ type: 'error', text1: t('common.sessionExpired'), text2: t('common.pleaseLoginAgain') });
      } else if (status >= 500) {
        Toast.show({ type: 'error', text1: t('common.serverError'), text2: t('common.tryAgainLater') });
      } else if (!navigator.onLine) {
        Toast.show({ type: 'error', text1: t('common.networkError'), text2: t('common.checkConnection') });
      } else {
        Toast.show({ type: 'error', text1: t('home.reloadFailed'), text2: t('home.pullToRetry') });
      }
    });
  }, [refreshSummary]);

  const handleDelete = useCallback(
    (entryId: string, foodName: string) => {
      Alert.alert(t('common.deleteConfirm'), t('common.deleteItem', foodName), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            diaryService
              .deleteEntry(entryId)
              .then(() => {
                Toast.show({ type: 'success', text1: t('common.removed'), text2: t('common.updated') });
                refreshSummary().catch(() => {});
              })
              .catch((error: any) => {
                const status = error?.response?.status;
                if (status === 404) {
                  Toast.show({ type: 'error', text1: t('common.notFound'), text2: t('common.mayBeDeleted') });
                } else if (status === 403) {
                  Toast.show({ type: 'error', text1: t('common.noPermission'), text2: t('common.onlyDeleteOwn') });
                } else if (status >= 500) {
                  Toast.show({ type: 'error', text1: t('common.serverError'), text2: t('common.tryAgainLater') });
                } else if (!navigator.onLine) {
                  Toast.show({ type: 'error', text1: t('common.networkError'), text2: t('common.checkConnection') });
                } else {
                  Toast.show({ type: 'error', text1: t('common.deleteFailed'), text2: t('common.contactSupport') });
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

  // Calculate remaining calories
  const remainingCalories = useMemo(() => {
    if (!summary || typeof summary.totalCalories !== 'number' || typeof summary.targetCalories !== 'number') return 0;
    return Math.max(0, summary.targetCalories - summary.totalCalories);
  }, [summary]);

  // Calculate progress percentage
  const calorieProgress = useMemo(() => {
    if (!summary || typeof summary.totalCalories !== 'number' || typeof summary.targetCalories !== 'number') return 0;
    return Math.min(1, summary.totalCalories / summary.targetCalories);
  }, [summary]);

  // Get today's entries for diary section (first 2-3)
  const todayEntries = useMemo(() => {
    if (!summary?.meals) return [];
    return summary.meals.flatMap(meal => meal.entries).slice(0, 3);
  }, [summary]);

  // Handle quick action navigation
  const handleQuickAction = useCallback((mealType: MealTypeId) => {
    navigation.navigate('AddMealFromVision', {
      imageUri: '', // Will be set by camera screen
      result: { items: [], unmappedLabels: [] } // Placeholder
    });
  }, [navigation]);

  // Handle AI camera navigation
  const handleAICamera = useCallback(() => {
    navigation.navigate('AiCamera');
  }, [navigation]);

  // Handle view all diary
  const handleViewAllDiary = useCallback(() => {
    navigation.navigate('MealDiary');
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Screen
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      >
        {serverDown && (
          <View style={{ padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.danger + '20' }}>
            <ThemedText color="danger" weight="600">{t('app.serverConnectionError')}</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">{t('app.checkApiUrl')}</ThemedText>
          </View>
        )}

        {/* Hero Card */}
        <AppCard style={{ backgroundColor: theme.colors.card }}>
          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <ThemedText variant="h1" weight="700">
              {t('home.remaining_calories', remainingCalories)}
            </ThemedText>
            <ThemedText variant="body" color="textSecondary">
              {t('home.eaten_vs_target', summary?.totalCalories || 0, summary?.targetCalories || 0)}
            </ThemedText>
            <ProgressBar
              progress={calorieProgress}
              height={8}
              color={theme.colors.primary}
              backgroundColor={theme.colors.muted + '30'}
              animated
            />
          </View>
        </AppCard>

        {/* Macro Card */}
        <AppCard title="Macros">
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Icon name="fitness" size="lg" color="primary" />
              <ThemedText variant="h4" style={{ marginTop: theme.spacing.xs }}>
                {formatNumber(summary?.protein, 'g')}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">Protein</ThemedText>
              <View style={{ marginTop: theme.spacing.xs }}>
                <ProgressBar
                  progress={summary?.protein && summary?.targetCalories ? Math.min(1, (summary.protein * 4) / (summary.targetCalories * 0.3)) : 0}
                  height={4}
                  color={theme.colors.primary}
                />
              </View>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Icon name="restaurant" size="lg" color="secondary" />
              <ThemedText variant="h4" style={{ marginTop: theme.spacing.xs }}>
                {formatNumber(summary?.carbs, 'g')}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">Carb</ThemedText>
              <View style={{ marginTop: theme.spacing.xs }}>
                <ProgressBar
                  progress={summary?.carbs && summary?.targetCalories ? Math.min(1, (summary.carbs * 4) / (summary.targetCalories * 0.5)) : 0}
                  height={4}
                  color={theme.colors.secondary}
                />
              </View>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Icon name="local-dining" size="lg" color="warning" />
              <ThemedText variant="h4" style={{ marginTop: theme.spacing.xs }}>
                {formatNumber(summary?.fat, 'g')}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">Fat</ThemedText>
              <View style={{ marginTop: theme.spacing.xs }}>
                <ProgressBar
                  progress={summary?.fat && summary?.targetCalories ? Math.min(1, (summary.fat * 9) / (summary.targetCalories * 0.2)) : 0}
                  height={4}
                  color={theme.colors.warning}
                />
              </View>
            </View>
          </View>
        </AppCard>

        {/* Quick Actions */}
        <View>
          <SectionHeader title={t('home.quick_actions_title')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <AppChip label={t('home.add_breakfast')} onPress={() => handleQuickAction(1)} />
            <AppChip label={t('home.add_lunch')} onPress={() => handleQuickAction(2)} />
            <AppChip label={t('home.add_dinner')} onPress={() => handleQuickAction(3)} />
            <AppChip label={t('home.add_snack')} onPress={() => handleQuickAction(4)} />
          </View>
        </View>

        {/* Today's Diary */}
        <View>
          <SectionHeader
            title={t('home.diary_today')}
            action={handleViewAllDiary}
            actionText={t('home.see_all')}
          />
          {isLoading ? (
            <AppCard>
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator color={theme.colors.primary} />
                <ThemedText variant="body" color="textSecondary">{t('home.loadingDiary')}</ThemedText>
              </View>
            </AppCard>
          ) : todayEntries.length > 0 ? (
            <AppCard>
              {todayEntries.map((entry) => (
                <View key={entry.id} style={[styles.entryRow, { borderColor: theme.colors.border }]}>
                  <View style={styles.entryInfo}>
                    <ThemedText variant="body" weight="600">{entry.foodName}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
                      <ThemedText variant="bodySmall" color="textSecondary">
                        {formatNumber(entry.calories, ' kcal')}
                      </ThemedText>
                      <ThemedText variant="bodySmall" color="textSecondary">
                        {entry.quantityText ?? t('home.noPortionInfo')}
                      </ThemedText>
                      <View style={[styles.badge, { backgroundColor: entry.sourceMethod === 'ai' ? theme.colors.primaryLight : theme.colors.secondaryLight }]}>
                        <ThemedText variant="caption" color={entry.sourceMethod === 'ai' ? 'primary' : 'secondary'}>
                          {entry.sourceMethod === 'ai' ? t('home.source_ai') : t('home.source_manual')}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => handleDelete(entry.id, entry.foodName)} style={styles.deleteChip}>
                    <ThemedText variant="button" color="danger">{t('common.delete')}</ThemedText>
                  </Pressable>
                </View>
              ))}
            </AppCard>
          ) : (
            <EmptyState
              title={t('home.empty')}
              description="Hãy bắt đầu thêm món ăn đầu tiên của bạn!"
              icon="restaurant"
            />
          )}
        </View>

        {/* AI Highlight Card */}
        <AppCard style={{ backgroundColor: theme.colors.primaryLight }}>
          <Pressable onPress={handleAICamera} style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <Icon name="camera" size="xl" color="primary" />
            <ThemedText variant="h4" color="primary" weight="600">
              {t('home.ai_quick_add')}
            </ThemedText>
          </Pressable>
        </AppCard>
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
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalHint: { opacity: 0.8 },
});

export default HomeScreen;

