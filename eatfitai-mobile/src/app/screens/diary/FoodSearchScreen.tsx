// Food search screen for adding foods to the diary
// Emerald Nebula 3D UI

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  TextInput,
} from 'react-native';
import Animated, {
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import { AppImage } from '../../../components/ui/AppImage';
import type { RootStackParamList } from '../../types';
import { trackEvent } from '../../../services/analytics';
import { foodService, type CommonMealTemplate, type FoodItem } from '../../../services/foodService';
import { getFoodImageUrl } from '../../../utils/imageHelpers';
import { handleApiError } from '../../../utils/errorHandler';
import {
  addItemsToTodayDiary,
  getSuggestedMealType,
  getTodayDate,
  invalidateDiaryQueries,
} from '../../../services/diaryFlowService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import { t } from '../../../i18n/vi';
import { useUserPreferenceStore } from '../../../store/useUserPreferenceStore';
import { filterFoodsByPreferences } from '../../../utils/foodPreferenceFilter';
import { TEST_IDS } from '../../../testing/testIds';

const PAGE_SIZE = 20;
const RECENT_SEARCHES_KEY = '@eatfit_recent_searches';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodSearch'>;
type FoodSearchRouteProp = RouteProp<RootStackParamList, 'FoodSearch'>;

const getFoodItemKey = (item: { id: string; source?: 'catalog' | 'user' }) =>
  `${item.source ?? 'catalog'}:${item.id}`;

/* ═══ Palette ═══ */
const P = {
  primary: '#4be277',
  primaryDark: '#22c55e',
  surface: '#0e1322',
  surfaceContainer: '#161b2b',
  surfaceContainerHigh: '#25293a',
  surfaceContainerHighest: '#2f3445',
  surfaceContainerLowest: '#090e1c',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  onPrimary: '#003915',
  glassBg: 'rgba(47, 52, 69, 0.4)',
  glassHover: 'rgba(47, 52, 69, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.05)',
  macroP: '#34d399', // emerald-400
  macroC: '#fbbf24', // amber-400
  macroF: '#fb7185', // rose-400
};

const FoodSearchScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FoodSearchRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const preferences = useUserPreferenceStore((s) => s.preferences);
  const fetchPreferences = useUserPreferenceStore((s) => s.fetchPreferences);

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [commonMeals, setCommonMeals] = useState<CommonMealTemplate[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isQuickAdding, setIsQuickAdding] = useState<string | null>(null);
  const [applyingCommonMealId, setApplyingCommonMealId] = useState<string | null>(null);

  // Read quick-add preferences
  const initialTab = route.params?.initialTab;
  const autoFocus = route.params?.autoFocus ?? false;
  const showQuickSuggestions = route.params?.showQuickSuggestions ?? true;
  const selectedDate = route.params?.selectedDate;
  const returnToDiaryOnSave = route.params?.returnToDiaryOnSave ?? false;
  const initialQuery = route.params?.initialQuery;

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {}
  };

  const loadRecentFoods = useCallback(async () => {
    try {
      const foods = await foodService.getRecentFoods(PAGE_SIZE);
      setRecentFoods(foods);
    } catch (error) {
      setRecentFoods([]);
    }
  }, []);

  const loadCommonMeals = useCallback(async () => {
    try {
      const templates = await foodService.getCommonMeals();
      setCommonMeals(templates);
    } catch (error) {
      setCommonMeals([]);
    }
  }, []);

  useEffect(() => {
    loadFavorites(initialTab === 'favorites');
    if (initialTab === 'favorites') setActiveTab('favorites');
    loadRecentSearches();
    if (showQuickSuggestions) {
      loadRecentFoods().catch(() => undefined);
      loadCommonMeals().catch(() => undefined);
    }
  }, [initialTab, loadCommonMeals, loadRecentFoods, showQuickSuggestions]);

  // When navigated with initialQuery (e.g. from barcode scan fallback), auto-search
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery.trim());
      runSearch(initialQuery.trim(), false).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const saveRecentSearch = async (term: string) => {
    try {
      const filtered = recentSearches.filter(searchTerm => searchTerm.toLowerCase() !== term.toLowerCase());
      const newSearches = [term, ...filtered].slice(0, 10);
      setRecentSearches(newSearches);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
    } catch (e) {}
  };

  useEffect(() => {
    fetchPreferences().catch(() => undefined);
  }, [fetchPreferences]);

  const loadFavorites = async (setAsList = false) => {
    if (setAsList) setIsLoading(true);
    try {
      const favs = await foodService.getFavorites();
      setFavoriteIds(new Set(favs.map((f) => getFoodItemKey(f))));
      setErrorMessage(null);
      if (setAsList || activeTab === 'favorites') setItems(favs);
    } catch (error) {
      if (setAsList || activeTab === 'favorites') setErrorMessage(t('common.tryAgainLater'));
    } finally {
      if (setAsList) setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (item: FoodItem) => {
    if (item.source === 'user') {
      return;
    }

    try {
      const { isFavorite } = await foodService.toggleFavorite(Number(item.id));
      const key = getFoodItemKey(item);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavorite) next.add(key);
        else next.delete(key);
        return next;
      });
      if (activeTab === 'favorites' && !isFavorite) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }
      Toast.show({
        type: 'success',
        text1: isFavorite ? t('food_search.added_favorite') : t('food_search.removed_favorite'),
        visibilityTime: 2000,
      });
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleQuickAdd = async (item: FoodItem) => {
    setIsQuickAdding(item.id);
    try {
      await addItemsToTodayDiary(
        item.source === 'user'
          ? [{ source: 'user', userFoodItemId: Number(item.id), grams: 100 }]
          : [{ source: 'catalog', foodItemId: Number(item.id), grams: 100 }],
        { date: selectedDate },
      );
      Toast.show({
        type: 'success',
        text1: t('food_search.quick_add_success'),
        text2: `${item.name} (100g) - ${item.calories || 0} kcal`,
      });
      trackEvent('diary_add_quick_success', {
        flow: 'food_search',
        step: 'quick_add',
        status: 'success',
        metadata: {
          foodId: item.id,
          source: item.source,
          foodName: item.name,
        },
      });
      await invalidateDiaryQueries(queryClient);
      if (showQuickSuggestions) {
        await loadRecentFoods();
      }
      if (returnToDiaryOnSave) {
        navigation.replace('MealDiary', selectedDate ? { selectedDate } : undefined);
      }
    } catch (error) {
      trackEvent('diary_add_quick_failure', {
        category: 'error',
        flow: 'food_search',
        step: 'quick_add',
        status: 'failure',
        metadata: {
          foodId: item.id,
          source: item.source,
          message: (error as { message?: string } | null)?.message,
        },
      });
      handleApiError(error);
    } finally {
      setIsQuickAdding(null);
    }
  };

  const handleApplyCommonMeal = async (template: CommonMealTemplate) => {
    setApplyingCommonMealId(template.id);
    try {
      await foodService.applyCommonMeal({
        customDishId: template.id,
        targetDate: selectedDate ?? getTodayDate(),
        mealTypeId: getSuggestedMealType(),
        grams: template.defaultGrams > 0 ? template.defaultGrams : undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Đã thêm món thường dùng',
        text2: `${template.name} (${Math.round(template.defaultGrams || 0)}g)`,
      });
      trackEvent('common_meal_apply_success', {
        flow: 'food_search',
        step: 'common_meal',
        status: 'success',
        metadata: {
          customDishId: template.id,
          templateName: template.name,
        },
      });
      await invalidateDiaryQueries(queryClient);
      if (returnToDiaryOnSave) {
        navigation.replace('MealDiary', selectedDate ? { selectedDate } : undefined);
      }
    } catch (error) {
      trackEvent('common_meal_apply_failure', {
        category: 'error',
        flow: 'food_search',
        step: 'common_meal',
        status: 'failure',
        metadata: {
          customDishId: template.id,
          message: (error as { message?: string } | null)?.message,
        },
      });
      handleApiError(error);
    } finally {
      setApplyingCommonMealId(null);
    }
  };

  const handleTabChange = (tab: 'search' | 'favorites') => {
    setActiveTab(tab);
    setItems([]);
    setHasSearched(false);
    setErrorMessage(null);
    if (tab === 'favorites') loadFavorites(true);
    if (tab === 'search' && showQuickSuggestions) {
      loadRecentFoods().catch(() => undefined);
      loadCommonMeals().catch(() => undefined);
    }
  };

  const runSearch = useCallback(
    async (searchTerm: string, append = false) => {
      if (activeTab === 'favorites') return;
      if (!searchTerm.trim()) {
        Toast.show({
          type: 'info',
          text1: t('food_search.empty_search'),
          text2: t('food_search.empty_search_hint'),
        });
        return;
      }
      setIsLoading(true);
      setErrorMessage(null);
      trackEvent('food_search_submit', {
        flow: 'food_search',
        step: 'search',
        status: append ? 'paginate' : 'submitted',
        metadata: {
          query: searchTerm.trim(),
          tab: activeTab,
        },
      });
      try {
        const result = await foodService.searchAllFoods(searchTerm.trim(), PAGE_SIZE);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasSearched(true);
        setErrorMessage(null);
        trackEvent('food_search_results', {
          flow: 'food_search',
          step: 'results',
          status: 'success',
          metadata: {
            query: searchTerm.trim(),
            resultCount: result.items.length,
            tab: activeTab,
          },
        });
        if (!append && result.items.length > 0) {
          saveRecentSearch(searchTerm.trim());
        }
      } catch (error: any) {
        setHasSearched(true);
        setItems([]);
        setErrorMessage(error?.response?.data?.message ?? error?.message ?? t('common.tryAgainLater'));
        trackEvent('food_search_failure', {
          category: 'error',
          flow: 'food_search',
          step: 'search',
          status: 'failure',
          metadata: {
            query: searchTerm.trim(),
            tab: activeTab,
            message: error?.response?.data?.message ?? error?.message,
          },
        });
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab],
  );

  const handleSearch = useCallback(() => {
    if (activeTab === 'favorites') return;
    runSearch(query, false).catch(() => {});
  }, [activeTab, query, runSearch]);

  const handleQuickSuggestion = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery);
      runSearch(nextQuery, false).catch(() => {});
    },
    [runSearch],
  );

  useFocusEffect(
    useCallback(() => {
      if (showQuickSuggestions && activeTab === 'search') {
        loadRecentFoods().catch(() => undefined);
        loadCommonMeals().catch(() => undefined);
      }
    }, [activeTab, loadCommonMeals, loadRecentFoods, showQuickSuggestions]),
  );

  const handleOpenCommonMeals = useCallback(() => {
    navigation.navigate('CommonMeals');
  }, [navigation]);

  const filteredResults = useMemo(() => filterFoodsByPreferences(items, preferences), [items, preferences]);
  const filteredRecentFoods = useMemo(
    () => filterFoodsByPreferences(recentFoods, preferences),
    [recentFoods, preferences],
  );
  const visibleItems = filteredResults.items;
  const visibleRecentFoods = filteredRecentFoods.items;
  const shouldShowSuggestionShelves = activeTab === 'search' && !query.trim();

  // ═══ Render ═══ //
  const renderItem = ({ item, index }: { item: FoodItem; index: number }) => {
    const isFav = favoriteIds.has(getFoodItemKey(item));
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} layout={Layout.springify()}>
        <Pressable
          testID={index === 0 ? TEST_IDS.foodSearch.firstResultCard : undefined}
          nativeID={index === 0 ? TEST_IDS.foodSearch.firstResultCard : undefined}
          accessibilityLabel={index === 0 ? TEST_IDS.foodSearch.firstResultCard : undefined}
          onPress={() => {
            trackEvent('food_detail_opened', {
              flow: 'food_search',
              step: 'food_detail',
              status: 'opened',
              metadata: {
                foodId: item.id,
                source: item.source,
                foodName: item.name,
              },
            });
            navigation.navigate('FoodDetail', {
              foodId: item.id,
              source: item.source,
              selectedDate,
              returnToDiaryOnSave,
            });
          }}
          style={({ pressed }) => [S.resultCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        >
          <View style={S.resultCardLeft}>
            <View style={S.thumbnailBox}>
              {item.thumbnail ? (
                <AppImage
                  source={{ uri: getFoodImageUrl(item.thumbnail) }}
                  style={S.thumbnail}
                />
              ) : (
                <Ionicons name="fast-food" size={24} color={P.onSurfaceVariant} />
              )}
            </View>
            <View style={S.resultInfo}>
              <ThemedText style={S.resultTitle} numberOfLines={1}>{item.name}</ThemedText>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <ThemedText style={S.per100g}>100g</ThemedText>
                <ThemedText style={S.resultCaloriesSmall}>
                  {item.calories != null ? Math.round(item.calories) : '--'} kcal
                </ThemedText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={S.macroDots}>
                  <View style={[S.macroDot, { backgroundColor: P.macroP }]} />
                  <ThemedText style={S.macroText}>P: {item.protein != null ? Math.round(item.protein) : '--'}g</ThemedText>
                </View>
                <View style={S.macroDots}>
                  <View style={[S.macroDot, { backgroundColor: P.macroC }]} />
                  <ThemedText style={S.macroText}>C: {item.carbs != null ? Math.round(item.carbs) : '--'}g</ThemedText>
                </View>
                <View style={S.macroDots}>
                  <View style={[S.macroDot, { backgroundColor: P.macroF }]} />
                  <ThemedText style={S.macroText}>F: {item.fat != null ? Math.round(item.fat) : '--'}g</ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={S.resultCardRight}>
            {item.source !== 'user' && (
              <Pressable
                hitSlop={12}
                onPress={() => handleToggleFavorite(item)}
                style={({ pressed }) => [
                  { padding: 4, marginRight: 8 },
                  pressed && { transform: [{ scale: 0.7 }], opacity: 0.7 },
                ]}
              >
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? P.primary : P.onSurfaceVariant} />
              </Pressable>
            )}

            <Pressable
              testID={index === 0 ? TEST_IDS.foodSearch.firstAddButton : undefined}
              nativeID={index === 0 ? TEST_IDS.foodSearch.firstAddButton : undefined}
              accessibilityLabel={index === 0 ? TEST_IDS.foodSearch.firstAddButton : undefined}
              hitSlop={8}
              onPress={() => handleQuickAdd(item)}
              disabled={isQuickAdding === item.id}
              style={({ pressed }) => [S.addBtn, pressed && { transform: [{ scale: 0.9 }], opacity: 0.7 }]}
            >
              {isQuickAdding === item.id ? (
                <ActivityIndicator size="small" color={P.primary} />
              ) : (
                <Ionicons name="add-circle" size={28} color={P.primary} />
              )}
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderCommonMeal = ({
    template,
    index,
  }: {
    template: CommonMealTemplate;
    index: number;
  }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} layout={Layout.springify()}>
        <View style={S.resultCard}>
          <View style={S.resultCardLeft}>
            <View style={S.thumbnailBox}>
              <Ionicons name="restaurant" size={24} color={P.primary} />
            </View>
            <View style={S.resultInfo}>
              <ThemedText style={S.resultTitle} numberOfLines={1}>{template.name}</ThemedText>
              {template.description ? (
                <ThemedText style={S.templateDescription} numberOfLines={2}>
                  {template.description}
                </ThemedText>
              ) : null}
              <View style={S.templateMetaRow}>
                <ThemedText style={S.per100g}>{Math.round(template.defaultGrams || 0)}g</ThemedText>
                <ThemedText style={S.resultCaloriesSmall}>
                  {template.calories != null ? Math.round(template.calories) : '--'} kcal
                </ThemedText>
              </View>
              <ThemedText style={S.templateMetaText}>
                {template.ingredientCount} nguyên liệu
              </ThemedText>
            </View>
          </View>

          <View style={S.resultCardRight}>
            <Pressable
              hitSlop={8}
              onPress={() => handleApplyCommonMeal(template)}
              disabled={applyingCommonMealId === template.id}
              style={({ pressed }) => [S.addBtn, pressed && { transform: [{ scale: 0.9 }], opacity: 0.7 }]}
            >
              {applyingCommonMealId === template.id ? (
                <ActivityIndicator size="small" color={P.primary} />
              ) : (
                <Ionicons name="add-circle" size={28} color={P.primary} />
              )}
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View
      style={[S.container, { paddingTop: insets.top }]}
      testID={TEST_IDS.foodSearch.screen}
      nativeID={TEST_IDS.foodSearch.screen}
      accessibilityLabel={TEST_IDS.foodSearch.screen}
      collapsable={false}
    >
      {/* ═══ Header ═══ */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <Pressable style={S.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={P.onSurface} />
          </Pressable>
          <ThemedText style={S.headerTitle}>{t('food_search.title')}</ThemedText>
        </View>
        <Pressable
          style={S.iconBtn}
          onPress={() => navigation.navigate('DietaryRestrictions')}
        >
          <Ionicons name="options-outline" size={22} color={P.onSurfaceVariant} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══ Search Input Area ═══ */}
        {activeTab === 'search' && (
          <View style={S.searchArea}>
            <View style={S.searchInputBox}>
              <Ionicons name="search" size={20} color={P.onSurfaceVariant} style={{ marginRight: 10 }} />
              <TextInput
                testID={TEST_IDS.foodSearch.queryInput}
                nativeID={TEST_IDS.foodSearch.queryInput}
                accessibilityLabel={TEST_IDS.foodSearch.queryInput}
                style={S.searchInput}
                placeholder="Tìm kiếm món ăn, công thức..."
                placeholderTextColor={P.onSurfaceVariant + '80'}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                autoFocus={autoFocus}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={P.onSurfaceVariant} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ═══ Filter Chips ═══ */}
        <View style={S.chipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipsContent}>
            <Pressable
              style={[S.chip, activeTab === 'search' && S.chipActive]}
              onPress={() => handleTabChange('search')}
            >
              <ThemedText style={[S.chipText, activeTab === 'search' && S.chipTextActive]}>
                Tất cả
              </ThemedText>
            </Pressable>
            <Pressable
              style={[S.chip, activeTab === 'favorites' && S.chipActive]}
              onPress={() => handleTabChange('favorites')}
            >
              <ThemedText style={[S.chipText, activeTab === 'favorites' && S.chipTextActive]}>
                Món yêu thích
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>

        {/* ═══ Content ═══ */}
        {isLoading ? (
          <View style={S.centerBox}>
            <ActivityIndicator color={P.primary} size="large" />
          </View>
        ) : errorMessage ? (
          <View style={{ marginTop: 24 }}>
            <AnimatedEmptyState
              variant="error"
              title="Tìm kiếm thất bại"
              description={errorMessage}
              primaryAction={{ label: 'Thử lại', onPress: () => activeTab === 'favorites' ? loadFavorites(true) : handleSearch() }}
            />
          </View>
        ) : !shouldShowSuggestionShelves && items.length > 0 ? (
          <View style={S.resultsArea}>
            <View style={S.sectionHeader}>
              <ThemedText style={S.sectionTitle}>
                {activeTab === 'favorites' ? 'MÓN YÊU THÍCH' : `KẾT QUẢ CHO "${query}"`}
              </ThemedText>
            </View>
            <View style={{ gap: 12 }}>
              {visibleItems.map((item, idx) => (
                <View key={getFoodItemKey(item)}>{renderItem({ item, index: idx })}</View>
              ))}
            </View>
          </View>
        ) : (
          /* Empty / Default States */
          shouldShowSuggestionShelves ? (
            <View style={S.recentArea}>
              {showQuickSuggestions && visibleRecentFoods.length > 0 && (
                <View style={S.resultsArea}>
                  <View style={S.sectionHeader}>
                    <ThemedText style={S.sectionTitle}>MÓN GẦN ĐÂY</ThemedText>
                  </View>
                  <View style={{ gap: 12 }}>
                    {visibleRecentFoods.map((item, idx) => (
                      <View key={getFoodItemKey(item)}>{renderItem({ item, index: idx })}</View>
                    ))}
                  </View>
                </View>
              )}
              {showQuickSuggestions && (
                <View style={S.resultsArea}>
                  <View style={S.sectionHeader}>
                    <ThemedText style={S.sectionTitle}>Món thường dùng</ThemedText>
                    <Pressable onPress={handleOpenCommonMeals} hitSlop={8}>
                      <ThemedText style={S.sectionAction}>Quản lý</ThemedText>
                    </Pressable>
                  </View>
                  {commonMeals.length > 0 ? (
                    <View style={{ gap: 12 }}>
                      {commonMeals.map((template, idx) => (
                        <View key={template.id}>{renderCommonMeal({ template, index: idx })}</View>
                      ))}
                    </View>
                  ) : (
                    <View style={S.commonMealEmptyCard}>
                      <ThemedText style={S.commonMealEmptyTitle}>
                        Chưa có món thường dùng nào
                      </ThemedText>
                      <ThemedText style={S.commonMealEmptyDescription}>
                        Tạo mẫu bữa ăn bạn hay lặp lại để thêm nhanh vào nhật ký.
                      </ThemedText>
                      <Pressable
                        onPress={handleOpenCommonMeals}
                        style={({ pressed }) => [
                          S.commonMealEmptyButton,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={P.primary} />
                        <ThemedText style={S.commonMealEmptyButtonText}>Tạo món thường dùng</ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
              <View style={S.sectionHeader}>
                <ThemedText style={S.sectionTitle}>Tìm kiếm gần đây</ThemedText>
              </View>
              <View style={{ gap: 8 }}>
                {recentSearches.length > 0 ? recentSearches.map((term, i) => (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [S.recentItem, pressed && { backgroundColor: P.glassHover }]}
                    onPress={() => handleQuickSuggestion(term)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name="time-outline" size={20} color={P.onSurfaceVariant} />
                      <ThemedText style={S.recentText}>{term}</ThemedText>
                    </View>
                    <Ionicons name="arrow-undo-outline" size={16} color={P.onSurfaceVariant} style={{ transform: [{ scaleX: -1 }] }} />
                  </Pressable>
                )) : (
                  <ThemedText style={{ color: P.onSurfaceVariant, fontSize: 13, marginTop: 4 }}>
                    Chưa có tìm kiếm nào gần đây.
                  </ThemedText>
                )}
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 24 }}>
              <AnimatedEmptyState
                variant={activeTab === 'search' ? 'no-search-results' : 'no-favorites'}
                title={activeTab === 'search' ? 'Không tìm thấy kết quả' : 'Chưa có món yêu thích'}
                description={activeTab === 'search' ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Lưu món ăn yêu thích để truy cập nhanh chóng.'}
              />
            </View>
          )
        )}
      </ScrollView>

      {/* Floating Scan Button removed as requested to "bỏ vài thứ thừa" */}
    </View>
  );
};

/* ═══ Styles ═══ */
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: P.surfaceContainerLowest + '90',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: P.onSurface, letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  searchArea: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchInput: {
    flex: 1,
    color: P.onSurface,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  cancelBtn: { color: P.primary, fontFamily: 'Inter_600SemiBold', fontSize: 15, paddingHorizontal: 4 },

  chipsWrapper: { marginBottom: 24, marginHorizontal: -20 },
  chipsContent: { paddingHorizontal: 20, gap: 12 },
  chip: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: P.surfaceContainerHigh,
  },
  chipActive: {
    backgroundColor: P.primary,
    shadowColor: P.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  chipText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: P.onSurfaceVariant },
  chipTextActive: { color: P.onPrimary, fontFamily: 'Inter_700Bold' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: P.onSurfaceVariant, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionAction: { fontSize: 12, fontFamily: 'Inter_700Bold', color: P.primary },

  recentArea: { gap: 12 },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: P.glassBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  recentText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: P.onSurface },

  resultsArea: { gap: 12 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: P.glassBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  resultCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  thumbnailBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: P.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: { width: '100%', height: '100%', borderRadius: 18 },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: P.onSurface, marginBottom: 4 },
  templateDescription: { fontSize: 12, fontFamily: 'Inter_400Regular', color: P.onSurfaceVariant, marginBottom: 6 },
  templateMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  templateMetaText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: P.onSurfaceVariant },
  commonMealEmptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.glassBorder,
    backgroundColor: P.glassBg,
    padding: 16,
    gap: 10,
  },
  commonMealEmptyTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: P.onSurface },
  commonMealEmptyDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: P.onSurfaceVariant,
    lineHeight: 18,
  },
  commonMealEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(75, 226, 119, 0.12)',
  },
  commonMealEmptyButtonText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: P.primary },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  per100g: { fontSize: 13, fontFamily: 'Inter_500Medium', color: P.onSurfaceVariant },
  macroDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: P.onSurfaceVariant },

  resultCardRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultCaloriesSmall: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: P.primary },
  addBtn: { width: 32, height: 32, backgroundColor: P.primary + '20', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  centerBox: { paddingTop: 40, alignItems: 'center' },
});

export default FoodSearchScreen;
