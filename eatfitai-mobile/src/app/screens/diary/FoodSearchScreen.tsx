// Màn hình tìm kiếm món ăn để thêm vào nhật ký

import { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { AppCard } from '../../../components/ui/AppCard';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { AppImage } from '../../../components/ui/AppImage';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodItem } from '../../../services/foodService';
import { SkeletonList } from '../../../components/Skeleton';
import { getFoodImageUrl } from '../../../utils/imageHelpers';
import { handleApiError } from '../../../utils/errorHandler';
import { mealService } from '../../../services/mealService';
import Icon from '../../../components/Icon';
import { glassStyles } from '../../../components/ui/GlassCard';
import { AnimatedEmptyState } from '../../../components/ui/AnimatedEmptyState';
import { t } from '../../../i18n/vi';

const PAGE_SIZE = 20;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodSearch'>;

const FoodSearchScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const styles = StyleSheet.create({
    container: { flex: 1 },
    searchBar: {
      flexDirection: 'row',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(40, 40, 60, 0.7)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: 12,
    },
    tabActive: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
    foodCard: {
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(40, 40, 60, 0.6)' : 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
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
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.md,
    },
    foodCardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    foodInfo: { flex: 1, gap: theme.spacing.xs },
    foodName: { marginBottom: theme.spacing.xs },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingTop: 40,
      width: '100%',
      paddingHorizontal: theme.spacing.xl,
    },
    footerLoading: { paddingVertical: theme.spacing.lg, alignItems: 'center' },
    totalBar: {
      padding: theme.spacing.lg,
      alignItems: 'center',
      borderTopWidth: 1,
    },
  });
  const navigation = useNavigation<NavigationProp>();

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Load favorites - setAsList dùng để xác định có nên update items list hay không
  const loadFavorites = async (setAsList = false) => {
    if (setAsList) {
      setIsLoading(true);
    }
    try {
      const favs = await foodService.getFavorites();
      console.log('[FoodSearch] Loaded favorites:', favs.length, 'items');
      setFavoriteIds(new Set(favs.map((f) => f.id)));
      // Nếu setAsList = true hoặc đang ở tab favorites, update items
      if (setAsList || activeTab === 'favorites') {
        setItems(favs);
        setTotal(favs.length);
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
        setTotal((prev) => prev - 1);
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
      const date = new Date().toISOString().split('T')[0]!;
      const hour = new Date().getHours();
      let mealType = 2; // Lunch default
      if (hour < 10)
        mealType = 1; // Breakfast
      else if (hour > 15) mealType = 3; // Dinner

      await mealService.addMealItems(date, mealType, [
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
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsQuickAdding(null);
    }
  };

  const handleTabChange = (tab: 'search' | 'favorites') => {
    setActiveTab(tab);
    setItems([]);
    setPage(1);
    setTotal(0);
    setHasSearched(false);

    if (tab === 'favorites') {
      // Truyền true để xác định rằng cần set items list
      loadFavorites(true);
    }
  };

  const loadFoods = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (activeTab === 'favorites') return; // Favorites are loaded differently

      if (!query.trim()) {
        Toast.show({
          type: 'info',
          text1: t('food_search.empty_search'),
          text2: t('food_search.empty_search_hint'),
        });
        return;
      }

      if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const result = await foodService.searchAllFoods(query.trim(), PAGE_SIZE);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setPage(pageToLoad);
        setTotal(result.totalCount ?? result.items.length);
        setHasMore(result.items.length === PAGE_SIZE);
        setHasSearched(true);
      } catch (error: any) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query, activeTab],
  );

  const handleSearch = useCallback(() => {
    if (activeTab === 'favorites') return;
    searchGlow.value = withTiming(1, { duration: theme.animation.normal });
    setTimeout(() => {
      searchGlow.value = withTiming(0, { duration: theme.animation.slow });
    }, 1000);
    loadFoods(1, false).catch(() => {});
  }, [loadFoods, searchGlow, theme.animation.normal, theme.animation.slow, activeTab]);

  // Tìm kiếm trực tiếp với keyword (không dùng state)
  const searchWithKeyword = useCallback(
    async (keyword: string) => {
      if (activeTab === 'favorites') return;

      setQuery(keyword);
      setIsLoading(true);
      setHasSearched(true);

      try {
        const result = await foodService.searchAllFoods(keyword.trim(), PAGE_SIZE);
        setItems(result.items);
        setPage(1);
        setTotal(result.totalCount ?? result.items.length);
        setHasMore(result.items.length === PAGE_SIZE);
      } catch (error: any) {
        handleApiError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab],
  );

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'favorites') return;
    if (!hasMore || isLoading || isLoadingMore) return;
    loadFoods(page + 1, true).catch(() => {});
  }, [hasMore, isLoading, isLoadingMore, page, loadFoods, activeTab]);

  const renderItem = useCallback(
    ({ item, index }: { item: FoodItem; index: number }) => {
      const isFav = favoriteIds.has(item.id);
      return (
        <Animated.View
          entering={FadeIn.delay(index * 50)
            .duration(theme.animation.normal)
            .springify()}
          layout={Layout.springify()}
        >
          <AppCard style={{ marginBottom: theme.spacing.xs, padding: theme.spacing.sm }}>
            <View style={styles.foodCardContent}>
              <Pressable
                style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
                onPress={() =>
                  navigation.navigate('FoodDetail', {
                    foodId: item.id,
                    source: item.source,
                  })
                }
              >
                {/* Thumbnail Image - Bug #4 fix: Check cả null và empty string */}
                {item.thumbnail && item.thumbnail.trim() !== '' ? (
                  <AppImage
                    source={{ uri: getFoodImageUrl(item.thumbnail) }}
                    style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                    // Fallback khi ảnh lỗi: hiển thị placeholder
                    onError={() =>
                      console.log('[FoodSearch] Image load error:', item.thumbnail)
                    }
                  />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: theme.colors.border + '30',
                      marginRight: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText variant="h3" color="textSecondary">
                      🍽️
                    </ThemedText>
                  </View>
                )}

                <View style={styles.foodInfo}>
                  <ThemedText variant="h4" style={styles.foodName}>
                    {item.name}
                  </ThemedText>
                  {item.nameEn ? (
                    <ThemedText
                      variant="caption"
                      color="textSecondary"
                      style={{ fontStyle: 'italic' }}
                    >
                      {item.nameEn}
                    </ThemedText>
                  ) : null}
                  {item.brand ? (
                    <ThemedText variant="bodySmall" color="textSecondary">
                      {item.brand}
                    </ThemedText>
                  ) : null}
                  <Animated.View
                    entering={FadeIn.delay(index * 50 + 100).duration(
                      theme.animation.fast,
                    )}
                  >
                    <ThemedText variant="bodySmall" color="textSecondary">
                      {item.calories != null
                        ? `${Math.round(item.calories)} kcal`
                        : '-- kcal'}{' '}
                      •
                      {item.protein != null
                        ? ` ${item.protein.toFixed(1).replace(/\.0$/, '')}g P`
                        : ' --g P'}{' '}
                      •
                      {item.carbs != null
                        ? ` ${item.carbs.toFixed(1).replace(/\.0$/, '')}g C`
                        : ' --g C'}{' '}
                      •
                      {item.fat != null
                        ? ` ${item.fat.toFixed(1).replace(/\.0$/, '')}g F`
                        : ' --g F'}
                    </ThemedText>
                  </Animated.View>
                </View>
              </Pressable>

              {/* Actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  hitSlop={10}
                  onPress={() => handleToggleFavorite(item)}
                  style={{ padding: 4 }}
                >
                  <ThemedText variant="h3">{isFav ? '❤️' : '🤍'}</ThemedText>
                </Pressable>

                {/* Quick Add Button */}
                <Pressable
                  hitSlop={8}
                  onPress={() => handleQuickAdd(item)}
                  disabled={isQuickAdding === item.id}
                  style={{
                    padding: 8,
                    backgroundColor: theme.colors.primaryLight,
                    borderRadius: 20,
                  }}
                >
                  {isQuickAdding === item.id ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Icon name="add" size="sm" color="primary" />
                  )}
                </Pressable>

                <Pressable
                  onPress={() =>
                    navigation.navigate('FoodDetail', {
                      foodId: item.id,
                      source: item.source,
                    })
                  }
                >
                  <ThemedText variant="button" color="primary">
                    {t('food_search.view_details')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </AppCard>
        </Animated.View>
      );
    },
    [
      navigation,
      theme.animation.normal,
      theme.animation.fast,
      theme.spacing.xs,
      theme.colors.border,
      getFoodImageUrl,
      favoriteIds, // Re-render when favorites change
    ],
  );

  const renderSkeleton = () => (
    <SkeletonList
      count={4}
      itemHeight={80}
      spacing={12}
      style={{ marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md }}
    />
  );

  return (
    <Screen scroll={false} style={styles.container}>
      <ScreenHeader title={t('food_search.title')} subtitle={t('food_search.subtitle')} />

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <Pressable
          onPress={() => handleTabChange('search')}
          style={{
            flex: 1,
            paddingVertical: theme.spacing.sm,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor:
              activeTab === 'search' ? theme.colors.primary : 'transparent',
          }}
        >
          <ThemedText
            variant="h4"
            color={activeTab === 'search' ? 'primary' : 'textSecondary'}
          >
            {t('food_search.tab_search')}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleTabChange('favorites')}
          style={{
            flex: 1,
            paddingVertical: theme.spacing.sm,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor:
              activeTab === 'favorites' ? theme.colors.primary : 'transparent',
          }}
        >
          <ThemedText
            variant="h4"
            color={activeTab === 'favorites' ? 'primary' : 'textSecondary'}
          >
            {t('food_search.tab_favorites')}
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === 'search' && (
        <Animated.View
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            searchGlowStyle,
          ]}
        >
          <ThemedTextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder={t('food_search.placeholder')}
            autoCapitalize="none"
            returnKeyType="search"
            style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }}
            accessibilityLabel={t('food_search.title')}
            accessibilityHint={t('food_search.placeholder')}
          />
          <View style={{ width: 90 }}>
            <Button
              variant="primary"
              size="sm"
              onPress={handleSearch}
              fullWidth
              title={t('food_search.btn_search')}
              accessibilityLabel={t('food_search.btn_search')}
            />
          </View>
        </Animated.View>
      )}

      {isLoading ? (
        <View style={styles.centerBox}>
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: theme.colors.card, ...theme.shadows.md },
            ]}
          >
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
          {renderSkeleton()}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && page === 1}
              onRefresh={() =>
                activeTab === 'search' ? loadFoods(1, false) : loadFavorites()
              }
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          ListEmptyComponent={
            hasSearched || activeTab === 'favorites' ? (
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
            ) : activeTab === 'search' ? (
              /* Gợi ý khi chưa tìm kiếm */
              <View style={{ paddingHorizontal: theme.spacing.md }}>
                {/* Phần Yêu thích */}
                {favoriteIds.size > 0 && (
                  <View style={{ marginBottom: theme.spacing.lg }}>
                    <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                      ❤️ Yêu thích của bạn
                    </ThemedText>
                    <ThemedText
                      variant="caption"
                      color="textSecondary"
                      style={{ marginBottom: theme.spacing.md }}
                    >
                      Nhấn vào tab "Yêu thích" để xem tất cả
                    </ThemedText>
                  </View>
                )}

                {/* Gợi ý tìm kiếm nhanh */}
                <View>
                  <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
                    🔥 Tìm kiếm nhanh
                  </ThemedText>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: theme.spacing.sm,
                    }}
                  >
                    {[
                      'Cơm',
                      'Phở',
                      'Gà',
                      'Trứng',
                      'Cá',
                      'Rau',
                      'Thịt bò',
                      'Bánh mì',
                      'Sữa',
                      'Chuối',
                    ].map((keyword) => (
                      <Pressable
                        key={keyword}
                        onPress={() => searchWithKeyword(keyword)}
                        style={{
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          backgroundColor: isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.1)',
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: isDark
                            ? 'rgba(59, 130, 246, 0.3)'
                            : 'rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        <ThemedText variant="bodySmall" color="primary" weight="600">
                          {keyword}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Tip */}
                <View
                  style={{
                    marginTop: theme.spacing.xl,
                    padding: theme.spacing.md,
                    backgroundColor: isDark
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(34, 197, 94, 0.08)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(34, 197, 94, 0.15)',
                  }}
                >
                  <ThemedText variant="bodySmall" color="textSecondary">
                    💡{' '}
                    <ThemedText variant="bodySmall" weight="600">
                      Mẹo:
                    </ThemedText>{' '}
                    Nhập từ khóa và nhấn "Tìm" để tìm trong 5000+ món ăn Việt Nam
                  </ThemedText>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {hasSearched || activeTab === 'favorites' ? (
        <View
          style={[
            styles.totalBar,
            { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
          ]}
        >
          <ThemedText variant="bodySmall" color="textSecondary">
            {activeTab === 'search'
              ? t('food_search.total_results')
              : t('food_search.total_favorites')}
            <ThemedText variant="bodySmall" weight="600">
              {total}
            </ThemedText>
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
};

export default FoodSearchScreen;
