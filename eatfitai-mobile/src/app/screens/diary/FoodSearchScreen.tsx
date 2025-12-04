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

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const favs = await foodService.getFavorites();
      setFavoriteIds(new Set(favs.map(f => f.id)));
      if (activeTab === 'favorites') {
        setItems(favs);
        setTotal(favs.length);
      }
    } catch (error) {
      console.error('Failed to load favorites', error);
    }
  };

  const handleToggleFavorite = async (item: FoodItem) => {
    try {
      const { isFavorite } = await foodService.toggleFavorite(Number(item.id));
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFavorite) next.add(item.id);
        else next.delete(item.id);
        return next;
      });

      // If in favorites tab and removed, refresh list
      if (activeTab === 'favorites' && !isFavorite) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        setTotal(prev => prev - 1);
      }

      Toast.show({
        type: 'success',
        text1: isFavorite ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích',
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
      if (hour < 10) mealType = 1; // Breakfast
      else if (hour > 15) mealType = 3; // Dinner

      await mealService.addMealItems(date, mealType, [{
        foodItemId: Number(item.id),
        grams: 100,
      }]);

      Toast.show({
        type: 'success',
        text1: 'Đã thêm nhanh',
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
      loadFavorites();
    }
  };

  const loadFoods = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (activeTab === 'favorites') return; // Favorites are loaded differently

      if (!query.trim()) {
        Toast.show({
          type: 'info',
          text1: 'Vui lòng nhập từ khóa tìm kiếm',
          text2: 'Ví dụ: gà, cơm, salad...',
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
    loadFoods(1, false).catch(() => { });
  }, [loadFoods, searchGlow, theme.animation.normal, theme.animation.slow, activeTab]);

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'favorites') return;
    if (!hasMore || isLoading || isLoadingMore) return;
    loadFoods(page + 1, true).catch(() => { });
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
                  navigation.navigate('FoodDetail', { foodId: item.id, source: item.source })
                }
              >
                {/* Thumbnail Image */}
                {item.thumbnail ? (
                  <AppImage
                    source={{ uri: getFoodImageUrl(item.thumbnail) }}
                    style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
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
                    entering={FadeIn.delay(index * 50 + 100).duration(theme.animation.fast)}
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
                    navigation.navigate('FoodDetail', { foodId: item.id, source: item.source })
                  }
                >
                  <ThemedText variant="button" color="primary">
                    Xem
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </AppCard>
        </Animated.View>
      )
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
      <ScreenHeader
        title="Tìm kiếm món ăn"
        subtitle="Tìm và thêm món ăn vào nhật ký dinh dưỡng"
      />

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, gap: theme.spacing.md }}>
        <Pressable
          onPress={() => handleTabChange('search')}
          style={{
            flex: 1,
            paddingVertical: theme.spacing.sm,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'search' ? theme.colors.primary : 'transparent',
          }}
        >
          <ThemedText
            variant="h4"
            color={activeTab === 'search' ? 'primary' : 'textSecondary'}
          >
            Tìm kiếm
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleTabChange('favorites')}
          style={{
            flex: 1,
            paddingVertical: theme.spacing.sm,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'favorites' ? theme.colors.primary : 'transparent',
          }}
        >
          <ThemedText
            variant="h4"
            color={activeTab === 'favorites' ? 'primary' : 'textSecondary'}
          >
            Yêu thích
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === 'search' && (
        <Animated.View
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            useAnimatedStyle(() => ({
              shadowColor: theme.colors.primary,
              shadowOpacity: searchGlow.value * 0.3,
              shadowRadius: searchGlow.value * 8,
              elevation: searchGlow.value * 5,
            })),
          ]}
        >
          <ThemedTextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Nhập từ khóa tìm kiếm..."
            autoCapitalize="none"
            returnKeyType="search"
            style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }}
            accessibilityLabel="Tìm kiếm món ăn"
            accessibilityHint="Nhập tên món ăn bạn muốn tìm"
          />
          <View style={{ width: 90 }}>
            <Button
              variant="primary"
              size="sm"
              onPress={handleSearch}
              fullWidth
              title="Tìm"
              accessibilityLabel="Bắt đầu tìm kiếm"
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
              {activeTab === 'search' ? 'Đang tìm kiếm...' : 'Đang tải danh sách yêu thích...'}
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
              onRefresh={() => activeTab === 'search' ? loadFoods(1, false) : loadFavorites()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          ListEmptyComponent={
            (hasSearched || activeTab === 'favorites') ? (
              <View style={styles.centerBox}>
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: theme.colors.card, ...theme.shadows.md },
                  ]}
                >
                  <ThemedText variant="h4" color="textSecondary">
                    {activeTab === 'search' ? '🍽️ Không tìm thấy kết quả' : '❤️ Chưa có món yêu thích'}
                  </ThemedText>
                  <ThemedText
                    variant="bodySmall"
                    color="muted"
                    style={{ marginTop: theme.spacing.sm }}
                  >
                    {activeTab === 'search'
                      ? 'Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả'
                      : 'Hãy thả tim các món ăn bạn thích để lưu vào đây nhé!'}
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

      {(hasSearched || activeTab === 'favorites') ? (
        <View
          style={[
            styles.totalBar,
            { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
          ]}
        >
          <ThemedText variant="bodySmall" color="textSecondary">
            {activeTab === 'search' ? 'Tổng kết quả: ' : 'Tổng món yêu thích: '}
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
