// Man hinh tim kiem mon an de them vao nhat ky
// Chu thich bang tieng Viet khong dau

import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { ThemedText } from "../../../components/ThemedText";
import { useAppTheme } from "../../../theme/ThemeProvider";
import type { RootStackParamList } from "../../types";
import { foodService, type FoodItem } from "../../../services/foodService";
import { useListSkeleton } from "../../../hooks/useListSkeleton";

const PAGE_SIZE = 20;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "FoodSearch">;

const FoodSearchScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const [query, setQuery] = useState("");
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
        Toast.show({ type: "info", text1: "Vui long nhap tu khoa" });
        return;
      }

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await foodService.searchFoods(query.trim(), pageToLoad, PAGE_SIZE);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setPage(result.page);
        setTotal(result.total);
        setHasMore(result.hasMore);
        setHasSearched(true);
      } catch (error) {
        Toast.show({ type: "error", text1: "Tim kiem that bai" });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query],
  );

  const handleSearch = useCallback(() => {
    loadFoods(1, false).catch(() => {
      // da hien toast
    });
  }, [loadFoods]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }
    const nextPage = page + 1;
    loadFoods(nextPage, true).catch(() => {
      // da hien toast
    });
  }, [hasMore, isLoading, isLoadingMore, page, loadFoods]);

  const renderItem = useCallback(
    ({ item }: { item: FoodItem }) => (
      <Pressable
        style={[styles.foodRow, { borderColor: theme.colors.border }]}
        onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}
      >
        <View style={styles.foodInfo}>
          <ThemedText style={styles.foodName}>{item.name}</ThemedText>
          {item.brand ? <ThemedText style={styles.foodBrand}>{item.brand}</ThemedText> : null}
          <ThemedText style={styles.foodMeta}>
            {item.calories != null ? `${Math.round(item.calories)} kcal` : "-- kcal"} -
            {item.protein != null ? ` ${Math.round(item.protein)}g P` : " --g P"} -
            {item.carbs != null ? ` ${Math.round(item.carbs)}g C` : " --g C"} -
            {item.fat != null ? ` ${Math.round(item.fat)}g F` : " --g F"}
          </ThemedText>
        </View>
        <ThemedText style={styles.detailLink}>Xem</ThemedText>
      </Pressable>
    ),
    [navigation, theme.colors.border],
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {getSkeletonItems().map((key) => (
        <View key={key} style={[styles.skeletonItem, { borderColor: theme.colors.border }]}>
          <View style={[styles.skeletonLine, { width: "60%" }]} />
          <View style={[styles.skeletonLine, { width: "40%" }]} />
          <View style={[styles.skeletonLine, { width: "80%" }]} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="Nhap tu khoa..."
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, { color: theme.colors.text }]}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <Pressable style={[styles.searchButton, { backgroundColor: theme.colors.primary }]} onPress={handleSearch}>
          <ThemedText style={styles.searchButtonText}>Tim</ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.primary} />
          <ThemedText style={styles.loadingText}>Dang tim kiem...</ThemedText>
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
                <ThemedText style={styles.emptyText}>Khong tim thay ket qua</ThemedText>
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
          <ThemedText>Tong ket qua: {total}</ThemedText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  input: {
    flex: 1,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  foodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  foodInfo: {
    flex: 1,
    gap: 4,
  },
  foodName: {
    fontFamily: "Inter_600SemiBold",
  },
  foodBrand: {
    fontSize: 13,
    opacity: 0.7,
  },
  foodMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  detailLink: {
    color: "#0A8F62",
    fontFamily: "Inter_600SemiBold",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 40,
    width: "100%",
  },
  loadingText: {
    opacity: 0.7,
  },
  emptyText: {
    opacity: 0.7,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  totalBar: {
    padding: 16,
    alignItems: "center",
  },
  skeletonContainer: {
    width: "100%",
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  skeletonItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    backgroundColor: "#F7F9F8",
  },
  skeletonLine: {
    height: 14,
    borderRadius: 999,
    backgroundColor: "#E5EBE9",
  },
});

export default FoodSearchScreen;
