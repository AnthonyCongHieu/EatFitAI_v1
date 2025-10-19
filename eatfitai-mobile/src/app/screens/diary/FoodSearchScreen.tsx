// MÃ n hÃ¬nh tÃ¬m kiáº¿m mÃ³n Äƒn Ä‘á»ƒ thÃªm vÃ o nháº­t kÃ½

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
import { useListSkeleton } from '../../../hooks/useListSkeleton';

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

  const getSkeletonItems = useListSkeleton(4);

  const loadFoods = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!query.trim()) {
        Toast.show({ type: 'info', text1: 'Vui lÃ²ng nháº­p tá»« khÃ³a' });
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
        Toast.show({ type: 'error', text1: 'TÃ¬m kiáº¿m tháº¥t báº¡i' });
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
            <ThemedText style={styles.foodName}>{item.name}</ThemedText>
            {item.brand ? <ThemedText style={styles.foodBrand}>{item.brand}</ThemedText> : null}
            <ThemedText style={styles.foodMeta}>
              {item.calories != null ? `${Math.round(item.calories)} kcal` : '-- kcal'} -
              {item.protein != null ? ` ${Math.round(item.protein)}g P` : ' --g P'} -
              {item.carbs != null ? ` ${Math.round(item.carbs)}g C` : ' --g C'} -
              {item.fat != null ? ` ${Math.round(item.fat)}g F` : ' --g F'}
            </ThemedText>
          </View>
          <ThemedText style={[styles.detailLink, { color: theme.colors.primary }]}>Xem</ThemedText>
        </Pressable>
      </Animated.View>
    ),
    [navigation, theme.colors.border],
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {getSkeletonItems().map((key) => (
        <View key={key} style={[styles.skeletonItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <View style={[styles.skeletonLine, { width: '60%', backgroundColor: theme.colors.border, opacity: 0.6 }]} />
          <View style={[styles.skeletonLine, { width: '40%', backgroundColor: theme.colors.border, opacity: 0.45 }]} />
          <View style={[styles.skeletonLine, { width: '80%', backgroundColor: theme.colors.border, opacity: 0.55 }]} />
        </View>
      ))}
    </View>
  );

  return (
    <Screen scroll={false} style={styles.container}>
      <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <ThemedTextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="Nháº­p tá»« khÃ³a..."
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }}
        />
        <View style={{ width: 90 }}>
          <Button variant="primary" onPress={handleSearch} fullWidth>
            <ThemedText style={styles.searchButtonText}>TÃ¬m</ThemedText>
          </Button>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.primary} />
          <ThemedText style={styles.loadingText}>Äang tÃ¬m kiáº¿m...</ThemedText>
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
                <ThemedText style={styles.emptyText}>KhÃ´ng tÃ¬m tháº¥y káº¿t quáº£</ThemedText>
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
        <View style={styles.totalBar}>
          <ThemedText>Tá»•ng káº¿t quáº£: {total}</ThemedText>
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
  searchButtonText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
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
  foodName: { fontFamily: 'Inter_600SemiBold' },
  foodBrand: { fontSize: 13, opacity: 0.7 },
  foodMeta: { fontSize: 13, opacity: 0.7 },
  detailLink: { fontFamily: 'Inter_600SemiBold' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 40, width: '100%' },
  loadingText: { opacity: 0.7 },
  emptyText: { opacity: 0.7 },
  footerLoading: { paddingVertical: 16 },
  totalBar: { padding: 16, alignItems: 'center' },
  skeletonContainer: { width: '100%', gap: 12, marginTop: 24, paddingHorizontal: 16 },
  skeletonItem: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  skeletonLine: { height: 14, borderRadius: 999 },
});

export default FoodSearchScreen;

