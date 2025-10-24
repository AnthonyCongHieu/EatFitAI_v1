// Màn hình tìm kiếm món ăn để thêm vào nhật ký

import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodItem } from '../../../services/foodService';
import Skeleton, { SkeletonList } from '../../../components/Skeleton';

const PAGE_SIZE = 20;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodSearch'>;

const FoodSearchScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadFoods = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!query.trim()) {
        Toast.show({ type: 'info', text1: 'Vui lòng nhập từ khóa' });
        return;
      }

      if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const result = await foodService.searchFoods(query.trim(), pageToLoad, PAGE_SIZE);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setPage(result.page);
        setTotal(result.total);
        setHasMore(result.hasMore);
        setHasSearched(true);
      } catch {
        Toast.show({ type: 'error', text1: 'Tìm kiếm thất bại' });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query],
  );

  const handleSearch = useCallback(() => {
    loadFoods(1, false).catch(() => {});
  }, [loadFoods]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    loadFoods(page + 1, true).catch(() => {});
  }, [hasMore, isLoading, isLoadingMore, page, loadFoods]);

  const renderItem = useCallback(
    ({ item }: { item: FoodItem }) => (
      <Animated.View entering={FadeIn.duration(160)} layout={Layout.springify()}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.foodRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
        >
          <View style={styles.foodInfo}>
            <ThemedText variant="h4" style={styles.foodName}>{item.name}</ThemedText>
            {item.brand ? <ThemedText variant="bodySmall" color="textSecondary">{item.brand}</ThemedText> : null}
            <ThemedText variant="bodySmall" color="textSecondary">
              {item.calories != null ? `${Math.round(item.calories)} kcal` : '-- kcal'} •
              {item.protein != null ? ` ${Math.round(item.protein)}g P` : ' --g P'} •
              {item.carbs != null ? ` ${Math.round(item.carbs)}g C` : ' --g C'} •
              {item.fat != null ? ` ${Math.round(item.fat)}g F` : ' --g F'}
            </ThemedText>
          </View>
          <ThemedText variant="button" color="primary">Xem</ThemedText>
        </Pressable>
      </Animated.View>
    ),
    [navigation, theme.colors.border, theme.colors.card],
  );

  const renderSkeleton = () => (
    <SkeletonList count={4} itemHeight={80} spacing={12} style={{ marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md }} />
  );

  return (
    <Screen scroll={false} style={styles.container}>
      <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <ThemedTextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="Nhập từ khóa..."
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }}
        />
        <View style={{ width: 90 }}>
          <Button variant="primary" size="sm" onPress={handleSearch} fullWidth title="Tìm" />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
            Đang tìm kiếm...
          </ThemedText>
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
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.centerBox}>
                <ThemedText variant="h4" color="textSecondary">Không tìm thấy kết quả</ThemedText>
                <ThemedText variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.sm }}>
                  Thử tìm kiếm với từ khóa khác
                </ThemedText>
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

      {hasSearched ? (
        <View style={[styles.totalBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
          <ThemedText variant="bodySmall" color="textSecondary">
            Tổng kết quả: <ThemedText variant="bodySmall" weight="600">{total}</ThemedText>
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  foodInfo: { flex: 1, gap: 4 },
  foodName: { marginBottom: 2 },
  centerBox: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingTop: 40, 
    width: '100%',
    paddingHorizontal: 24,
  },
  footerLoading: { paddingVertical: 16, alignItems: 'center' },
  totalBar: { 
    padding: 16, 
    alignItems: 'center',
    borderTopWidth: 1,
  },
});

export default FoodSearchScreen;
