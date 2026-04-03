// Food search screen for adding foods to the diary
// Styled to match the MealDiaryScreen visual language

import { useCallback, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { AppImage } from '../../../components/ui/AppImage';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodItem } from '../../../services/foodService';
import { getFoodImageUrl } from '../../../utils/imageHelpers';
import { handleApiError } from '../../../utils/errorHandler';
import {
  addItemsToTodayDiary,
  invalidateDiaryQueries,
} from '../../../services/diaryFlowService';

import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import { t } from '../../../i18n/vi';
import { TEST_IDS } from '../../../testing/testIds';

const PAGE_SIZE = 20;
const QUICK_SEARCHES = ['com', 'rice', 'chicken', 'trung', 'sua chua'];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodSearch'>;
type FoodSearchRouteProp = RouteProp<RootStackParamList, 'FoodSearch'>;

const FoodSearchScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FoodSearchRouteProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // Header section - reduced paddingTop to move content up
    headerSection: {
      paddingTop: insets.top - 4,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    // Header row - back button aligned with title (like EditProfileScreen)
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    // Title section - centered
    titleSection: {
      flex: 1,
      alignItems: 'center',
      marginRight: 40,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.3,
      lineHeight: 28,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginTop: 4,
    },
    // Tabs - pill style
    tabContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 10,
    },
    tab: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 24,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabInactive: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    // Search bar - clean modern design
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#fff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      gap: 12,
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    // Summary card for favorites
    summaryCard: {
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: 'rgba(255,255,255,0.1)',
      ...theme.shadows.md,
    },
    summaryMain: {
      alignItems: 'center',
    },
    summaryCount: {
      fontSize: 36,
      fontWeight: '800',
      color: isDark ? theme.colors.text : '#fff',
      letterSpacing: -1,
    },
    summaryLabel: {
      fontSize: 14,
      color: isDark ? theme.colors.textSecondary : 'rgba(255,255,255,0.85)',
      marginTop: 2,
      fontWeight: '500',
    },
    // Food cards - matching MealDiaryScreen style
    foodCard: {
      marginBottom: 8,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.glass.background,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
    },
    foodCardRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    foodImage: {
      width: 60,
      height: 60,
      borderRadius: 12,
      marginRight: 14,
    },
    foodImagePlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 12,
      marginRight: 14,
      backgroundColor: isDark ? 'rgba(100, 100, 140, 0.3)' : 'rgba(0, 0, 0, 0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    foodInfo: {
      flex: 1,
      marginRight: 12,
    },
    foodTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    foodName: {
      fontSize: 16,
      flex: 1,
      marginRight: 8,
      color: theme.colors.text,
    },
    favButton: {
      padding: 4,
    },
    macroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    macroItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    macroIcon: {
      fontSize: 12,
    },
    macroValue: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    addButtonCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    // Quick search chips
    quickSearchContainer: {
      paddingHorizontal: 20,
    },
    quickSearchTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    quickSearchChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickSearchChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
    },
    // Tip box
    tipBox: {
      marginTop: 24,
      padding: 16,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.06)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
    },
    // Others
    loadingCard: {
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.card,
      alignItems: 'center',
    },
    emptyCard: {
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.card,
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
      gap: 8,
      flexGrow: 1,
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingTop: 40,
      width: '100%',
      paddingHorizontal: theme.spacing.xl,
    },
    footerLoading: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    totalBar: {
      padding: 16,
      alignItems: 'center',
      borderTopWidth: 1,
      backgroundColor: theme.colors.card,
      borderTopColor: theme.colors.border,
    },
  });

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isQuickAdding, setIsQuickAdding] = useState<string | null>(null);

  // Animation values
  const searchGlow = useSharedValue(0);
  const searchGlowStyle = useAnimatedStyle(() => ({
    shadowColor: theme.colors.primary,
    shadowOpacity: searchGlow.value * 0.3,
    shadowRadius: searchGlow.value * 8,
    elevation: searchGlow.value * 5,
  }));

  // Read quick-add preferences from route params
  const initialTab = route.params?.initialTab;
  const autoFocus = route.params?.autoFocus ?? false;
  const showQuickSuggestions = route.params?.showQuickSuggestions ?? true;

  // Load favorites on mount and handle initialTab
  useEffect(() => {
    loadFavorites(initialTab === 'favorites');
    if (initialTab === 'favorites') {
      setActiveTab('favorites');
    }
  }, [initialTab]);

  // Load favorites and optionally sync them into the visible list
  const loadFavorites = async (setAsList = false) => {
    if (setAsList) {
      setIsLoading(true);
    }
    try {
      const favs = await foodService.getFavorites();
      console.log('[FoodSearch] Loaded favorites:', favs.length, 'items');
      setFavoriteIds(new Set(favs.map((f) => f.id)));
      // If setAsList is true, or we are already on the favorites tab, refresh items
      if (setAsList || activeTab === 'favorites') {
        setItems(favs);
        }
    } catch (error) {
      console.error('Failed to load favorites', error);
    } finally {
      if (setAsList) {
        setIsLoading(false);
      }
    }
  };

  const handleToggleFavorite = async (item: FoodItem) => {
    try {
      const { isFavorite } = await foodService.toggleFavorite(Number(item.id));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavorite) next.add(item.id);
        else next.delete(item.id);
        return next;
      });

      // If in favorites tab and removed, refresh list
      if (activeTab === 'favorites' && !isFavorite) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }

      Toast.show({
        type: 'success',
        text1: isFavorite
          ? t('food_search.added_favorite')
          : t('food_search.removed_favorite'),
        visibilityTime: 2000,
      });
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleQuickAdd = async (item: FoodItem) => {
    setIsQuickAdding(item.id);
    try {
      await addItemsToTodayDiary([
        {
          foodItemId: Number(item.id),
          grams: 100,
        },
      ]);

      Toast.show({
        type: 'success',
        text1: t('food_search.quick_add_success'),
        text2: `${item.name} (100g) - ${item.calories || 0} kcal`,
      });
      await invalidateDiaryQueries(queryClient);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsQuickAdding(null);
    }
  };

  const handleTabChange = (tab: 'search' | 'favorites') => {
    setActiveTab(tab);
    setItems([]);
    setHasSearched(false);

    if (tab === 'favorites') {
      // Pass true so favorites are also copied into the current items list
      loadFavorites(true);
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

      try {
        const result = await foodService.searchAllFoods(searchTerm.trim(), PAGE_SIZE);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasSearched(true);
      } catch (error: any) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab],
  );

  const triggerSearchGlow = useCallback(() => {
    searchGlow.value = withTiming(1, { duration: theme.animation.normal });
    setTimeout(() => {
      searchGlow.value = withTiming(0, { duration: theme.animation.slow });
    }, 1000);
  }, [searchGlow, theme.animation.normal, theme.animation.slow]);

  const handleSearch = useCallback(() => {
    if (activeTab === 'favorites') return;
    triggerSearchGlow();
    runSearch(query, false).catch(() => { });
  }, [activeTab, query, runSearch, triggerSearchGlow]);

  const handleQuickSuggestion = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
    triggerSearchGlow();
    runSearch(nextQuery, false).catch(() => { });
  }, [runSearch, triggerSearchGlow]);

  // Render a food result card
  const renderItem = ({ item, index }: { item: FoodItem; index: number }) => {
    const isFav = favoriteIds.has(item.id);

    return (
      <Animated.View
        entering={FadeIn.delay(index * 40).duration(300)}
        layout={Layout.springify()}
      >
        <Pressable
          onPress={() =>
            navigation.navigate('FoodDetail', {
              foodId: item.id,
              source: item.source,
            })
          }
          style={({ pressed }) => [
            styles.foodCard,
            pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.foodCardRow}>
            {item.thumbnail && item.thumbnail.trim() !== '' ? (
              <AppImage
                source={{ uri: getFoodImageUrl(item.thumbnail) }}
                style={styles.foodImage}
                onError={() =>
                  console.log('[FoodSearch] Image load error:', item.thumbnail)
                }
              />
            ) : (
              <View style={styles.foodImagePlaceholder}>
                <ThemedText style={{ fontSize: 24 }}>?</ThemedText>
              </View>
            )}
            <View style={styles.foodInfo}>
              <View style={styles.foodTitleRow}>
                <ThemedText weight="600" style={styles.foodName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleToggleFavorite(item)}
                  style={styles.favButton}
                >
                  <ThemedText style={{ fontSize: 16 }}>
                    {isFav ? '*' : '+'}
                  </ThemedText>
                </Pressable>
              </View>
              <ThemedText
                variant="bodySmall"
                color="textSecondary"
                style={{ marginBottom: 6 }}
              >
                {'100g | ' + (item.calories != null ? Math.round(item.calories) + ' cal' : '-- cal')}
              </ThemedText>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <ThemedText style={styles.macroIcon}>P</ThemedText>
                  <ThemedText style={styles.macroValue}>
                    {item.protein != null ? item.protein.toFixed(1) + 'g' : '--g'}
                  </ThemedText>
                </View>
                <View style={styles.macroItem}>
                  <ThemedText style={styles.macroIcon}>C</ThemedText>
                  <ThemedText style={styles.macroValue}>
                    {item.carbs != null ? item.carbs.toFixed(1) + 'g' : '--g'}
                  </ThemedText>
                </View>
                <View style={styles.macroItem}>
                  <ThemedText style={styles.macroIcon}>F</ThemedText>
                  <ThemedText style={styles.macroValue}>
                    {item.fat != null ? item.fat.toFixed(1) + 'g' : '--g'}
                  </ThemedText>
                </View>
              </View>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => handleQuickAdd(item)}
              disabled={isQuickAdding === item.id}
              style={styles.addButtonCircle}
              testID={index === 0 ? TEST_IDS.foodSearch.firstAddButton : 'food-search-add-item-' + item.id}
            >
              {isQuickAdding === item.id ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
              ) : (
                <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
              )}
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    );
  };
  return (
    <Screen scroll={false} style={styles.container} testID={TEST_IDS.foodSearch.screen}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        {/* Back button + Title in same row */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ThemedText style={{ fontSize: 18 }}>{'<'}</ThemedText>
          </Pressable>
          <View style={styles.titleSection}>
            <ThemedText style={styles.headerTitle}>{t('food_search.title')}</ThemedText>
          </View>
        </View>

        {/* Pill-style Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => handleTabChange('search')}
            style={[
              styles.tab,
              activeTab === 'search' ? styles.tabActive : styles.tabInactive,
            ]}
          >
            <ThemedText
              variant="body"
              weight="600"
              style={{
                color: activeTab === 'search' ? '#fff' : theme.colors.textSecondary,
              }}
            >
              {t('food_search.tab_search')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleTabChange('favorites')}
            style={[
              styles.tab,
              activeTab === 'favorites' ? styles.tabActive : styles.tabInactive,
            ]}
          >
            <ThemedText
              variant="body"
              weight="600"
              style={{
                color: activeTab === 'favorites' ? '#fff' : theme.colors.textSecondary,
              }}
            >
              {t('food_search.tab_favorites')}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Card wrapper containing search bar and results */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 16,
          backgroundColor: isDark ? 'rgba(74, 144, 226, 0.06)' : 'rgba(59, 130, 246, 0.03)',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(74, 144, 226, 0.12)' : 'rgba(59, 130, 246, 0.08)',
          padding: 16,
        }}>
          {/* Search bar inside card */}
          {activeTab === 'search' && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={[styles.searchBar, searchGlowStyle, { marginBottom: 16 }]}
            >
              <View style={styles.searchInputWrapper}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <ThemedTextInput
                  testID={TEST_IDS.foodSearch.queryInput}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  placeholder={t('food_search.placeholder')}
                  autoCapitalize="none"
                  autoFocus={autoFocus && activeTab === 'search'}
                  returnKeyType="search"
                  style={{
                    flex: 1,
                    borderWidth: 0,
                    paddingHorizontal: 0,
                    paddingVertical: 8,
                    backgroundColor: 'transparent',
                  }}
                  accessibilityLabel={t('food_search.title')}
                  accessibilityHint={t('food_search.placeholder')}
                />
              </View>
              {/* Custom search button */}
              <Pressable
                onPress={handleSearch}
                style={styles.searchButton}
                testID={TEST_IDS.foodSearch.submitButton}
              >
                <ThemedText variant="body" weight="600" style={{ color: '#fff' }}>
                  {t('food_search.btn_search')}
                </ThemedText>
              </Pressable>
            </Animated.View>
          )}

          {activeTab === 'search' && showQuickSuggestions && (
            <View style={styles.quickSearchContainer}>
              <View style={styles.quickSearchTitle}>
                <Ionicons name="flash-outline" size={18} color={theme.colors.primary} />
                <ThemedText variant="bodySmall" weight="600">
                  Quick add tu Home
                </ThemedText>
              </View>
              <View style={styles.quickSearchChips}>
                {QUICK_SEARCHES.map((chip) => (
                  <Pressable
                    key={chip}
                    style={styles.quickSearchChip}
                    onPress={() => handleQuickSuggestion(chip)}
                  >
                    <ThemedText variant="bodySmall" weight="600" style={{ color: theme.colors.primary }}>
                      {chip}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.tipBox}>
                <ThemedText variant="bodySmall" color="textSecondary">
                  Chạm 1 từ khóa, xem kết quả rồi bấm + để lưu nhanh vào nhật ký.
                </ThemedText>
              </View>
            </View>
          )}

          {/* Results inside card */}
          {isLoading ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <ThemedText
                variant="body"
                color="textSecondary"
                style={{ marginTop: theme.spacing.md }}
              >
                {activeTab === 'search'
                  ? t('food_search.loading_search')
                  : t('food_search.loading_favorites')}
              </ThemedText>
            </View>
          ) : items.length > 0 ? (
            <View style={{ gap: 12 }}>
              {items.map((item, index) => (
                <View key={item.id}>
                  {renderItem({ item, index })}
                </View>
              ))}
            </View>
          ) : hasSearched || activeTab === 'favorites' ? (
            <AnimatedEmptyState
              variant={activeTab === 'search' ? 'no-search-results' : 'no-favorites'}
              title={
                activeTab === 'search'
                  ? t('food_search.no_results')
                  : t('food_search.no_favorites')
              }
              description={
                activeTab === 'search'
                  ? t('food_search.no_results_hint')
                  : t('food_search.no_favorites_hint')
              }
              primaryAction={
                activeTab === 'search'
                  ? {
                    label: 'Thử từ khóa khác',
                    onPress: () => setQuery(''),
                  }
                  : {
                    label: 'Tìm món ăn',
                    onPress: () => handleTabChange('search'),
                  }
              }
            />
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ThemedText variant="body" color="textSecondary">
                Nhập từ khóa để tìm kiếm
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

export default FoodSearchScreen;

