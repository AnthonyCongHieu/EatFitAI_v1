// Màn hình tìm kiếm món ăn để thêm vào nhật ký

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  Image,
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

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import ThemedTextInput from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { AppCard } from '../../../components/ui/AppCard';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodItem } from '../../../services/foodService';
import { SkeletonList } from '../../../components/Skeleton';
import { getFoodImageUrl } from '../../../utils/imageHelpers';
import { handleApiError } from '../../../utils/errorHandler';

const PAGE_SIZE = 20;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodSearch'>;

const FoodSearchScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const styles = StyleSheet.create({
    container: { flex: 1 },
    searchBar: {
      flexDirection: 'row',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xxl,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      alignItems: 'center',
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

  // Animation values
  const searchGlow = useSharedValue(0);

  const loadFoods = useCallback(
    async (pageToLoad: number, append: boolean) => {
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
    [query],
  );

  const handleSearch = useCallback(() => {
    searchGlow.value = withTiming(1, { duration: theme.animation.normal });
    setTimeout(() => {
      searchGlow.value = withTiming(0, { duration: theme.animation.slow });
    }, 1000);
    loadFoods(1, false).catch(() => {});
  }, [loadFoods, searchGlow, theme.animation.normal, theme.animation.slow]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    loadFoods(page + 1, true).catch(() => {});
  }, [hasMore, isLoading, isLoadingMore, page, loadFoods]);

  const renderItem = useCallback(
    ({ item, index }: { item: FoodItem; index: number }) => (
      <Animated.View
        entering={FadeIn.delay(index * 50)
          .duration(theme.animation.normal)
          .springify()}
        layout={Layout.springify()}
      >
        <AppCard style={{ marginBottom: theme.spacing.xs, padding: theme.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              navigation.navigate('FoodDetail', { foodId: item.id, source: item.source })
            }
            style={styles.foodCardContent}
          >
            {/* Thumbnail Image */}
            {item.thumbnail ? (
              <Image
                source={{ uri: getFoodImageUrl(item.thumbnail) }}
                style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                resizeMode="cover"
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
            <Animated.View
              entering={FadeIn.delay(index * 50 + 150).duration(theme.animation.fast)}
            >
              <ThemedText variant="button" color="primary">
                Xem
              </ThemedText>
            </Animated.View>
          </Pressable>
        </AppCard>
      </Animated.View>
    ),
    [
      navigation,
      theme.animation.normal,
      theme.animation.fast,
      theme.spacing.xs,
      theme.colors.border,
      getFoodImageUrl,
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
              Đang tìm kiếm...
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
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.centerBox}>
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: theme.colors.card, ...theme.shadows.md },
                  ]}
                >
                  <ThemedText variant="h4" color="textSecondary">
                    🍽️ Không tìm thấy kết quả
                  </ThemedText>
                  <ThemedText
                    variant="bodySmall"
                    color="muted"
                    style={{ marginTop: theme.spacing.sm }}
                  >
                    Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả
                  </ThemedText>
                  <ThemedText
                    variant="bodySmall"
                    color="muted"
                    style={{ marginTop: theme.spacing.xs }}
                  >
                    Gợi ý: gà, cơm, salad, sữa, bánh mì...
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

      {hasSearched ? (
        <View
          style={[
            styles.totalBar,
            { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
          ]}
        >
          <ThemedText variant="bodySmall" color="textSecondary">
            Tổng kết quả:{' '}
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
