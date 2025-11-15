import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate } from 'react-native-reanimated';
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
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { MetricCard } from '../../components/ui/MetricCard';

const MEAL_TITLE_MAP: Record<MealTypeId, string> = {
  1: t('mealTypes.breakfast'),
  2: t('mealTypes.lunch'),
  3: t('mealTypes.dinner'),
  4: t('mealTypes.snack'),
};

type AddOption = 'search' | 'custom' | 'ai';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const formatNumber = (value?: number | null, suffix = '', decimals = 0): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  if (decimals === 0) {
    return `${Math.round(value)}${suffix}`;
  }
  return `${value.toFixed(decimals)}${suffix}`;
};


const HomeScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const styles = getStyles(theme);

  const AddEntryModal = ({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (option: AddOption) => void }): JSX.Element => {
    return (
      <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
          <Card>
            <ThemedText variant="h3">{t('home.addDishTitle')}</ThemedText>
            <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.md }}>
              {t('home.chooseAddMethod')}
            </ThemedText>
            <Button title={t('home.searchExisting')} onPress={() => onSelect('search')} />
            <View style={{ height: theme.spacing.sm }} />
            <Button variant="outline" title={t('home.createCustom')} onPress={() => onSelect('custom')} />
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose} style={{ alignItems: 'center', marginTop: 8 }}>
              <ThemedText variant="body" color="muted">{t('home.close')}</ThemedText>
            </Pressable>
          </Card>
        </View>
      </Modal>
    );
  };

  const navigation = useNavigation<NavigationProp>();
  const summary = useDiaryStore((s) => s.summary);
  const isLoading = useDiaryStore((s) => s.isLoading);
  const isRefreshing = useDiaryStore((s) => s.isRefreshing);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);
  const refreshSummary = useDiaryStore((s) => s.refreshSummary);
  const deleteEntry = useDiaryStore((s) => s.deleteEntry);
  const [showAddModal, setShowAddModal] = useState(false);
  const [serverDown, setServerDown] = useState(false);

  // Animation values
  const remainingCaloriesValue = useSharedValue(0);
  const calorieProgressValue = useSharedValue(0);
  const proteinValue = useSharedValue(0);
  const carbsValue = useSharedValue(0);
  const fatValue = useSharedValue(0);

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

  const handleAddOption = useCallback(
    (option: AddOption) => {
      setShowAddModal(false);
      if (option === 'search') return navigation.navigate('FoodSearch');
      if (option === 'custom') return navigation.navigate('CustomDish');
      // Skip AI option as per task requirements
    },
    [navigation],
  );

  const handleQuickAction = useCallback((mealType: MealTypeId) => {
    navigation.navigate('AddMealFromVision', {
      imageUri: '', // Will be set by camera screen
      result: { items: [], unmappedLabels: [] } // Placeholder
    });
  }, [navigation]);

  const handleAICamera = useCallback(() => {
    navigation.navigate('AiCamera');
  }, [navigation]);

  const handleViewAllDiary = useCallback(() => {
    navigation.navigate('MealDiary');
  }, [navigation]);

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

  // Animate values when they change
  useEffect(() => {
    remainingCaloriesValue.value = withTiming(remainingCalories, { duration: theme.animation.normal });
  }, [remainingCalories, remainingCaloriesValue, theme.animation.normal]);

  useEffect(() => {
    calorieProgressValue.value = withTiming(calorieProgress, { duration: theme.animation.slow });
  }, [calorieProgress, calorieProgressValue, theme.animation.slow]);

  useEffect(() => {
    proteinValue.value = withTiming(summary?.protein || 0, { duration: theme.animation.normal });
  }, [summary?.protein, proteinValue, theme.animation.normal]);

  useEffect(() => {
    carbsValue.value = withTiming(summary?.carbs || 0, { duration: theme.animation.normal });
  }, [summary?.carbs, carbsValue, theme.animation.normal]);

  useEffect(() => {
    fatValue.value = withTiming(summary?.fat || 0, { duration: theme.animation.normal });
  }, [summary?.fat, fatValue, theme.animation.normal]);

  // Get today's entries for diary section (first 2-3)
  const todayEntries = useMemo(() => {
    if (!summary?.meals) return [];
    return summary.meals.flatMap(meal => meal.entries).slice(0, 3);
  }, [summary]);


  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title="Trang chủ"
        subtitle="Theo dõi dinh dưỡng hàng ngày"
      />

      <Screen
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xl, gap: theme.spacing.xxl }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      >
        {serverDown && (
          <View style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.danger + '20' }}>
            <ThemedText color="danger" weight="600">{t('app.serverConnectionError')}</ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">{t('app.checkApiUrl')}</ThemedText>
          </View>
        )}

        {/* Hero Card */}
        <Animated.View entering={FadeInUp.duration(theme.animation.slow).springify()}>
          <AppCard style={{ backgroundColor: theme.colors.card }}>
            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <Animated.Text style={[styles.animatedNumber, useAnimatedStyle(() => ({
                transform: [{ scale: interpolate(remainingCaloriesValue.value, [0, 1000], [1, 1.05]) }]
              }))]}>
                <ThemedText variant="h1" weight="700">
                  {t('home.remaining_calories', Math.round(remainingCaloriesValue.value))}
                </ThemedText>
              </Animated.Text>
              <ThemedText variant="body" color="textSecondary">
                {t('home.eaten_vs_target', summary?.totalCalories || 0, summary?.targetCalories || 0)}
              </ThemedText>
              <ProgressBar
                progress={calorieProgressValue.value}
                height={8}
                color={theme.colors.primary}
                backgroundColor={theme.colors.muted + '30'}
                animated
              />
            </View>
          </AppCard>
        </Animated.View>

        {/* Macro Card */}
        <AppCard title="Macros">
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <MetricCard
              icon="fitness"
              value={proteinValue}
              label="Protein"
              color="primary"
              progress={proteinValue.value && summary?.targetCalories ? Math.min(1, (proteinValue.value * 4) / (summary.targetCalories * 0.3)) : 0}
            />
            <MetricCard
              icon="restaurant"
              value={carbsValue}
              label="Carb"
              color="secondary"
              progress={carbsValue.value && summary?.targetCalories ? Math.min(1, (carbsValue.value * 4) / (summary.targetCalories * 0.5)) : 0}
            />
            <MetricCard
              icon="local-dining"
              value={fatValue}
              label="Fat"
              color="warning"
              progress={fatValue.value && summary?.targetCalories ? Math.min(1, (fatValue.value * 9) / (summary.targetCalories * 0.2)) : 0}
            />
          </View>
        </AppCard>

        {/* Quick Actions */}
        <View>
          <SectionHeader title={t('home.quick_actions_title')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }))}>
              <AppChip label={t('home.add_breakfast')} onPress={() => handleQuickAction(1)} />
            </Animated.View>
            <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }))}>
              <AppChip label={t('home.add_lunch')} onPress={() => handleQuickAction(2)} />
            </Animated.View>
            <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }))}>
              <AppChip label={t('home.add_dinner')} onPress={() => handleQuickAction(3)} />
            </Animated.View>
            <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }))}>
              <AppChip label={t('home.add_snack')} onPress={() => handleQuickAction(4)} />
            </Animated.View>
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

const getStyles = (theme: any) => StyleSheet.create({
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderBottomWidth: 1 },
  entryInfo: { flex: 1, paddingRight: theme.spacing.md },
  deleteChip: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'transparent' },
  badge: { paddingHorizontal: theme.spacing.xs, paddingVertical: 2, borderRadius: theme.radius.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  animatedNumber: {
    fontSize: theme.typography.h1.fontSize,
    fontFamily: theme.typography.h1.fontFamily,
    color: theme.colors.primary,
  },
  macroValue: {
    fontSize: theme.typography.h3.fontSize,
    fontFamily: theme.typography.h3.fontFamily,
    marginTop: theme.spacing.xs,
  },
});

export default HomeScreen;

