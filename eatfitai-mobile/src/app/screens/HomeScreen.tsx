import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemedText } from '../../components/ThemedText';
import Screen from '../../components/Screen';
import Icon from '../../components/Icon';
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

// InsightsCard removed per user request
import { MacroProgressCard } from '../../components/ui/MacroProgressCard';
import CalorieRing from '../../components/ui/CalorieRing';
import { FoodEntryCard } from '../../components/ui/FoodEntryCard';
import SmartQuickActions from '../../components/SmartQuickActions';
import { SmartAddSheet } from '../../components/ui/SmartAddSheet';
import { useGamificationStore } from '../../store/useGamificationStore';
import { StreakCard } from '../../components/gamification/StreakCard';
import { HomeSkeleton } from '../../components/skeletons/HomeSkeleton';
import { glassStyles } from '../../components/ui/GlassCard';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { WelcomeHeader } from '../../components/home/WelcomeHeader';
import { useSmartContext } from '../../hooks/useSmartContext';
import * as Haptics from 'expo-haptics';
import { TEST_IDS } from '../../testing/testIds';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const styles = getStyles(theme);
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);

  const navigation = useNavigation<NavigationProp>();
  const summary = useDiaryStore((s) => s.summary);
  const fetchSummary = useDiaryStore((s) => s.fetchSummary);
  const queryClient = useQueryClient();
  const { isLoading, isFetching, isError, refetch } = useQuery<DaySummary | null>({
    queryKey: ['home-summary'],
    queryFn: async () => {
      await fetchSummary();
      return useDiaryStore.getState().summary ?? null;
    },
    // staleTime từ global config (2 phút)
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const { currentStreak, longestStreak, weeklyLogs, checkStreak, fetchWeeklyLogs } = useGamificationStore();

  // AI-driven context awareness (2026 trend)
  const smartContext = useSmartContext(summary);

  useEffect(() => {
    checkStreak();
    fetchWeeklyLogs();
    // ⚡ Chỉ chạy 1 lần khi mount - không refetch khi chuyển tab
    // Store nội bộ đã có caching để tránh spam API kể cả khi mount lại
  }, [checkStreak, fetchWeeklyLogs]);

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



  // Tự động set status server dựa trên useQuery
  useEffect(() => {
    if (!isLoading && !isFetching) {
      setServerDown(!!(isError || !summary));
    }
  }, [isError, summary, isLoading, isFetching]);

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
                // ⚡ Invalidate cache để load lại data mới
                queryClient.invalidateQueries({ queryKey: ['home-summary'] });
                queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
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
    [queryClient],
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


  if (isLoading && !summary) {
    return <HomeSkeleton />;
  }

  return (
    <GradientBackground>
      <Screen
        testID={TEST_IDS.home.screen}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.xl,
          gap: theme.spacing.xxl,
          paddingBottom: 50,
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

        <Animated.View entering={FadeInUp.delay(150).springify().damping(15).stiffness(100)}>
          <StreakCard
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            weeklyLogs={weeklyLogs}
            onPress={() => {
              navigation.navigate('Achievements');
            }}
          />
        </Animated.View>

        {/* Hero Card - CalorieRing (macro display removed) */}
        <Animated.View entering={FadeInUp.duration(theme.animation.slow).springify()}>
          <View
            style={glass.card}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`Còn ${Math.round(remainingCalories)} calo. Đã ăn ${summary?.totalCalories || 0} trong ${summary?.targetCalories || 0} calo mục tiêu.`}
          >
            <CalorieRing
              consumed={summary?.totalCalories || 0}
              target={summary?.targetCalories || 2000}
              protein={summary?.protein || 0}
              carbs={summary?.carbs || 0}
              fat={summary?.fat || 0}
              showMacros={false}
              size={180}
            />
          </View>
        </Animated.View>

        {/* Macro Progress Card - right below CalorieRing */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <MacroProgressCard
            protein={summary?.protein || 0}
            carbs={summary?.carbs || 0}
            fat={summary?.fat || 0}
            targetProtein={summary?.targetProtein || 155}
            targetCarbs={summary?.targetCarbs || 220}
            targetFat={summary?.targetFat || 71}
          />
        </Animated.View>

        {/* Smart Context Banner (AI Suggestion) - between CalorieRing and QuickActions */}
        {smartContext.priority >= 2 && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <Pressable
              style={[
                glass.card,
                {
                  padding: theme.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  borderLeftWidth: 3,
                  borderLeftColor: smartContext.fabAction.color || theme.colors.primary,
                },
              ]}
              onPress={() => setShowAddModal(true)}
            >
              <ThemedText style={{ fontSize: 20 }}>💡</ThemedText>
              <ThemedText variant="bodySmall" style={{ flex: 1, fontWeight: '500' }}>
                {smartContext.quickSuggestion}
              </ThemedText>
            </Pressable>
          </Animated.View>
        )}



        {/* Smart Quick Actions - based on time of day */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <AppCard>
            <SmartQuickActions
              onAddMeal={handleQuickAction}
              onScanFood={handleAICamera}
              onSearchFood={() => navigation.navigate('FoodSearch')}
            />
          </AppCard>
        </Animated.View>

        {/* Today's Diary */}
        <View>
          <SectionHeader
            title={t('home.diary_today')}
            action={handleViewAllDiary}
            actionText={t('home.see_all')}
            actionTestID={TEST_IDS.home.diaryButton}
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
                  onDelete={() => handleDelete(entry.id, entry.foodName)}
                />
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

      {/* Context-Aware Floating Action Button (2026 AI Trend) */}
      <Animated.View
        entering={FadeInUp.delay(500).springify()}
        style={styles.fabContainer}
      >
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: smartContext.fabAction.color || theme.colors.primary,
              shadowColor: smartContext.fabAction.color || theme.colors.primary,
            },
          ]}
          onPress={() => setShowAddModal(true)}
          onLongPress={() => {
            // Voice integration - chuyển đến VoiceScreen tab
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            navigation.navigate('VoiceTab' as any); // Navigate to Voice tab
          }}
          accessibilityRole="button"
          accessibilityLabel={smartContext.fabAction.label}
          accessibilityHint={`${smartContext.fabAction.hint}. Nhấn giữ để dùng giọng nói`}
          testID={TEST_IDS.home.fabButton}
        >
          <Icon name={smartContext.fabAction.icon as any} size="xl" color="card" />
        </Pressable>

        {/* Smart badge cho high-priority suggestions */}
        {smartContext.priority >= 3 && (
          <Animated.View
            entering={FadeInUp.delay(700).springify()}
            style={styles.fabBadge}
          >
            <ThemedText variant="caption" style={{ color: '#FFF', fontWeight: '700', fontSize: 10 }}>
              {smartContext.suggestedMeal === 'breakfast' ? 'Sáng' :
                smartContext.suggestedMeal === 'lunch' ? 'Trưa' :
                  smartContext.suggestedMeal === 'dinner' ? 'Tối' : 'HOT'}
            </ThemedText>
          </Animated.View>
        )}
      </Animated.View>

      <SmartAddSheet visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </GradientBackground>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    fabContainer: {
      position: 'absolute',
      bottom: 80, // Tab bar (56px) + safe margin (24px) = không đè lên tabs
      right: theme.spacing.xl,
      zIndex: 999, // Ensure FAB stays on top
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

    fabBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#EF4444', // Bright red
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 32,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowColor: '#000',
      elevation: 3,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
  });

export default HomeScreen;
