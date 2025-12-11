import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../../components/ThemedText';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import ProgressBar from '../../components/ProgressBar';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useAppTheme } from '../../theme/ThemeProvider';
import type { RootStackParamList } from '../types';
import { type MealTypeId } from '../../types';
import { diaryService, type DaySummary } from '../../services/diaryService';
import { healthService } from '../../services/healthService';
import { t } from '../../i18n/vi';
import { handleApiErrorWithCustomMessage } from '../../utils/errorHandler';

// New UI components
import { AppCard } from '../../components/ui/AppCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { AnimatedEmptyState } from '../../components/ui/AnimatedEmptyState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { InsightsCard } from '../../components/ui/InsightsCard';
import CircularProgress from '../../components/ui/CircularProgress';
import SmartQuickActions from '../../components/SmartQuickActions';
import FavoritesList from '../../components/FavoritesList';
import { SmartAddSheet } from '../../components/ui/SmartAddSheet';
import { useGamificationStore } from '../../store/useGamificationStore';
import { StreakCard } from '../../components/gamification/StreakCard';
import { HomeSkeleton } from '../../components/skeletons/HomeSkeleton';
import { GlassCard, glassStyles } from '../../components/ui/GlassCard';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { WelcomeHeader } from '../../components/home/WelcomeHeader';

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
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);

  const navigation = useNavigation<NavigationProp>();
  const summary = useDiaryStore((s) => s.summary);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);
  const refreshSummary = useDiaryStore((s) => s.refreshSummary);
  const { isLoading, isFetching, refetch } = useQuery<DaySummary | null>({
    queryKey: ['home-summary'],
    queryFn: async () => {
      await fetchSummary();
      return useDiaryStore.getState().summary ?? null;
    },
    staleTime: 60000,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const { currentStreak, longestStreak, checkStreak } = useGamificationStore();

  useFocusEffect(
    useCallback(() => {
      checkStreak();
      // Refetch summary khi screen focus lại để đảm bảo dữ liệu mới nhất
      refetch();
    }, [checkStreak, refetch]),
  );

  const showCommonErrors = useCallback(
    (error: any, fallback: { text1: string; text2: string }) => {
      handleApiErrorWithCustomMessage(error, {
        unauthorized: {
          text1: t('common.sessionExpired'),
          text2: t('common.pleaseLoginAgain'),
        },
        server_error: {
          text1: t('common.serverError'),
          text2: t('common.tryAgainLater'),
        },
        network_error: {
          text1: t('common.networkError'),
          text2: t('common.checkConnection'),
        },
        unknown: fallback,
      });
    },
    [],
  );

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
      .catch((err: any) => {
        showCommonErrors(err, {
          text1: t('home.loadDiaryFailed'),
          text2: t('home.pullToRetry'),
        });
      });
  }, [fetchSummary, showCommonErrors]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await healthService.pingRoot();
      if (!cancelled) setServerDown(!res.ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-check server health whenever screen gains focus (tránh kẹt cờ khi ping lần đầu thất bại)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const res = await healthService.pingRoot();
        if (active) setServerDown(!res.ok);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleRefresh = useCallback(() => {
    refetch().catch((err: any) => {
      showCommonErrors(err, {
        text1: t('home.reloadFailed'),
        text2: t('home.pullToRetry'),
      });
    });
  }, [refetch, showCommonErrors]);

  const handleAddOption = useCallback(
    (option: AddOption) => {
      setShowAddModal(false);
      if (option === 'search') return navigation.navigate('FoodSearch');
      if (option === 'custom') return navigation.navigate('CustomDish');
      // Skip AI option as per task requirements
    },
    [navigation],
  );

  const handleQuickAction = useCallback(
    (_mealType: MealTypeId) => {
      // Redirect to Recipe Suggestions (Ingredient Scan) as per user request
      navigation.navigate('RecipeSuggestions', {});
    },
    [navigation],
  );

  const handleAICamera = useCallback(() => {
    // Redirect to Recipe Suggestions (Ingredient Scan) as per user request
    navigation.navigate('RecipeSuggestions', {});
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
                Toast.show({
                  type: 'success',
                  text1: t('common.removed'),
                  text2: t('common.updated'),
                });
                refreshSummary().catch(() => { });
              })
              .catch((err: any) => {
                handleApiErrorWithCustomMessage(err, {
                  not_found: {
                    text1: t('common.notFound'),
                    text2: t('common.mayBeDeleted'),
                  },
                  forbidden: {
                    text1: t('common.noPermission'),
                    text2: t('common.onlyDeleteOwn'),
                  },
                  server_error: {
                    text1: t('common.serverError'),
                    text2: t('common.tryAgainLater'),
                  },
                  network_error: {
                    text1: t('common.networkError'),
                    text2: t('common.checkConnection'),
                  },
                  unknown: {
                    text1: t('common.deleteFailed'),
                    text2: t('common.contactSupport'),
                  },
                });
              });
          },
        },
      ]);
    },
    [refreshSummary],
  );

  // Calculate remaining calories
  const remainingCalories = useMemo(() => {
    if (
      !summary ||
      typeof summary.totalCalories !== 'number' ||
      typeof summary.targetCalories !== 'number'
    )
      return 0;
    return Math.max(0, summary.targetCalories - summary.totalCalories);
  }, [summary]);

  // Calculate progress percentage
  const calorieProgress = useMemo(() => {
    if (
      !summary ||
      typeof summary.totalCalories !== 'number' ||
      typeof summary.targetCalories !== 'number'
    )
      return 0;
    return Math.min(1, summary.totalCalories / summary.targetCalories);
  }, [summary]);

  // Animate values when they change
  useEffect(() => {
    const safeValue = Number.isNaN(remainingCalories) ? 0 : remainingCalories;
    remainingCaloriesValue.value = withTiming(safeValue, {
      duration: theme.animation.normal,
    });
  }, [remainingCalories, remainingCaloriesValue, theme.animation.normal]);

  useEffect(() => {
    const safeValue = Number.isNaN(calorieProgress) ? 0 : calorieProgress;
    calorieProgressValue.value = withTiming(safeValue, {
      duration: theme.animation.slow,
    });
  }, [calorieProgress, calorieProgressValue, theme.animation.slow]);

  useEffect(() => {
    const newValue = summary?.protein ?? 0;
    proteinValue.value = withTiming(Number.isNaN(newValue) ? 0 : newValue, {
      duration: theme.animation.normal,
    });
  }, [summary?.protein, proteinValue, theme.animation.normal]);

  useEffect(() => {
    const newValue = summary?.carbs ?? 0;
    carbsValue.value = withTiming(Number.isNaN(newValue) ? 0 : newValue, {
      duration: theme.animation.normal,
    });
  }, [summary?.carbs, carbsValue, theme.animation.normal]);

  useEffect(() => {
    const newValue = summary?.fat ?? 0;
    fatValue.value = withTiming(Number.isNaN(newValue) ? 0 : newValue, {
      duration: theme.animation.normal,
    });
  }, [summary?.fat, fatValue, theme.animation.normal]);

  // Get today's entries for diary section (first 2-3)
  const todayEntries = useMemo(() => {
    if (!summary?.meals) return [];
    return summary.meals.flatMap((meal) => meal.entries).slice(0, 3);
  }, [summary]);

  // Animated style for remaining calories text (phải đặt ở top-level, không trong JSX)
  const remainingCaloriesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(remainingCaloriesValue.value, [0, 1000], [1, 1.05]),
      },
    ],
  }));

  if (isLoading && !summary) {
    return <HomeSkeleton />;
  }

  return (
    <GradientBackground>
      <Screen
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.xl,
          gap: theme.spacing.xxl,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <WelcomeHeader />

        {serverDown && (
          <View
            style={{
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.danger + '20',
            }}
          >
            <ThemedText color="danger" weight="600">
              {t('app.serverConnectionError')}
            </ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">
              {t('app.checkApiUrl')}
            </ThemedText>
          </View>
        )}

        <StreakCard
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          onPress={() => {
            navigation.navigate('Achievements');
          }}
        />

        {/* Hero Card - Glassmorphism */}
        <Animated.View entering={FadeInUp.duration(theme.animation.slow).springify()}>
          <View
            style={glass.card}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`Còn ${Math.round(remainingCalories)} calo. Đã ăn ${summary?.totalCalories || 0} trong ${summary?.targetCalories || 0} calo mục tiêu.`}
          >
            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <Animated.Text
                style={[styles.animatedNumber, remainingCaloriesAnimatedStyle]}
              >
                <ThemedText variant="h1" weight="700">
                  {t('home.remaining_calories', Math.round(remainingCaloriesValue.value))}
                </ThemedText>
              </Animated.Text>
              <ThemedText variant="body" color="textSecondary">
                {t(
                  'home.eaten_vs_target',
                  summary?.totalCalories || 0,
                  summary?.targetCalories || 0,
                )}
              </ThemedText>
              <ProgressBar
                progress={calorieProgressValue.value}
                height={8}
                color={theme.colors.primary}
                backgroundColor={theme.colors.muted + '30'}
                animated
              />
            </View>
          </View>
        </Animated.View>

        {/* Macro Card - Chất dinh dưỡng đa lượng */}
        <AppCard title="Dinh dưỡng">
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <MetricCard
              icon="fitness"
              value={proteinValue}
              label="Protein"
              color="primary"
              targetValue={summary?.targetProtein ?? undefined}
              progress={
                typeof proteinValue.value === 'number' &&
                  !Number.isNaN(proteinValue.value) &&
                  summary?.targetProtein
                  ? Math.min(1, proteinValue.value / summary.targetProtein)
                  : 0
              }
            />
            <MetricCard
              icon="restaurant"
              value={carbsValue}
              label="Carbs"
              color="secondary"
              targetValue={summary?.targetCarbs ?? undefined}
              progress={
                typeof carbsValue.value === 'number' &&
                  !Number.isNaN(carbsValue.value) &&
                  summary?.targetCarbs
                  ? Math.min(1, carbsValue.value / summary.targetCarbs)
                  : 0
              }
            />
            <MetricCard
              icon="flame"
              value={fatValue}
              label="Chất béo"
              color="warning"
              targetValue={summary?.targetFat ?? undefined}
              progress={
                typeof fatValue.value === 'number' &&
                  !Number.isNaN(fatValue.value) &&
                  summary?.targetFat
                  ? Math.min(1, fatValue.value / summary.targetFat)
                  : 0
              }
            />
          </View>
        </AppCard>

        {/* AI Insights */}
        <InsightsCard />

        {/* Smart Quick Actions - based on time of day */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <AppCard>
            <SmartQuickActions
              onAddMeal={handleQuickAction}
              onScanFood={handleAICamera}
              onSearchFood={() => navigation.navigate('FoodSearch')}
            />
          </AppCard>
        </Animated.View>

        {/* Favorites Section */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <FavoritesList maxItems={6} />
        </Animated.View>

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
                <ThemedText variant="body" color="textSecondary">
                  {t('home.loadingDiary')}
                </ThemedText>
              </View>
            </AppCard>
          ) : todayEntries.length > 0 ? (
            <AppCard>
              {todayEntries.map((entry) => (
                <View
                  key={entry.id}
                  style={[styles.entryRow, { borderColor: theme.colors.border }]}
                >
                  <View style={styles.entryInfo}>
                    <ThemedText variant="body" weight="600">
                      {entry.foodName}
                    </ThemedText>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        marginTop: theme.spacing.xs,
                      }}
                    >
                      <ThemedText variant="bodySmall" color="textSecondary">
                        {formatNumber(entry.calories, ' kcal')}
                      </ThemedText>
                      <ThemedText variant="bodySmall" color="textSecondary">
                        {entry.quantityText ?? t('home.noPortionInfo')}
                      </ThemedText>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor:
                              entry.sourceMethod === 'ai'
                                ? theme.colors.primaryLight
                                : theme.colors.secondaryLight,
                          },
                        ]}
                      >
                        <ThemedText
                          variant="caption"
                          color={entry.sourceMethod === 'ai' ? 'primary' : 'secondary'}
                        >
                          {entry.sourceMethod === 'ai'
                            ? t('home.source_ai')
                            : t('home.source_manual')}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => handleDelete(entry.id, entry.foodName)}
                    style={styles.deleteChip}
                  >
                    <ThemedText variant="button" color="danger">
                      {t('common.delete')}
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
            </AppCard>
          ) : (
            <AnimatedEmptyState
              variant="no-food"
              title={t('home.empty')}
              description="Hãy chụp ảnh hoặc tìm kiếm để thêm món ăn đầu tiên!"
              primaryAction={{
                label: 'Chụp ảnh món ăn',
                onPress: () => navigation.navigate('AiCamera'),
                icon: 'camera-outline',
              }}
              secondaryAction={{
                label: 'Tìm kiếm thực phẩm',
                onPress: () => navigation.navigate('FoodSearch'),
              }}
            />
          )}
        </View>
      </Screen>

      {/* Floating Action Button */}
      <Animated.View
        entering={FadeInUp.delay(500).springify()}
        style={styles.fabContainer}
      >
        <Pressable
          style={[
            styles.fab,
            { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary },
          ]}
          onPress={() => setShowAddModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Thêm món ăn vào nhật ký"
          accessibilityHint="Mở menu để chọn cách thêm món ăn"
        >
          <Icon name="add" size="xl" color="card" />
        </Pressable>
      </Animated.View>

      <SmartAddSheet visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </GradientBackground>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    fabContainer: {
      position: 'absolute',
      bottom: theme.spacing.xl,
      right: theme.spacing.xl,
    },

    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
    },
    entryInfo: { flex: 1, paddingRight: theme.spacing.md },
    deleteChip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    badge: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.radius.sm,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
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
