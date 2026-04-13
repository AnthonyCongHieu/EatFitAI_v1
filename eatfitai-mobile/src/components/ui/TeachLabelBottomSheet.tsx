import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../ThemedText';
import { ThemedTextInput } from '../ThemedTextInput';
import { BottomSheet } from '../BottomSheet';
import { foodService, type FoodItem } from '../../services/foodService';
import { ListItem } from '../ListItem';
import { Skeleton } from '../Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';

type TeachLabelBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (foodItem: FoodItem) => Promise<void> | void;
  currentLabel: string;
};

export const TeachLabelBottomSheet = ({
  visible,
  onClose,
  onSelectFood,
  currentLabel,
}: TeachLabelBottomSheetProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingFoodId, setSubmittingFoodId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic styles using theme
  const dynamicStyles = {
    errorContainer: {
      padding: theme.spacing.md,
      backgroundColor:
        theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      borderRadius: theme.radius.sm,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor:
        theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
    },
    errorText: {
      color: theme.colors.danger,
      textAlign: 'center' as const,
    },
    skeletonItem: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    calories: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  };
  const searchFoods = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFoods([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await foodService.searchAllFoods(query, 20);
      setFoods(result.items);
    } catch (err) {
      setError('Không thể tìm kiếm món ăn. Vui lòng thử lại.');
      setFoods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && currentLabel) {
      setSearchQuery(currentLabel);
      searchFoods(currentLabel);
    }
  }, [visible, currentLabel, searchFoods]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchFoods(text);
      }, 300);
    },
    [searchFoods],
  );

  const handleSelectFood = useCallback(
    async (food: FoodItem) => {
      setSubmittingFoodId(food.id);

      try {
        await Promise.resolve(onSelectFood(food));
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Không thể chọn món ăn. Vui lòng thử lại.',
        });
      } finally {
        setSubmittingFoodId(null);
      }
    },
    [onSelectFood],
  );

  const renderFoodItem = useCallback(
    ({ item }: { item: FoodItem }) => {
      const isSubmitting = submittingFoodId === item.id;

      return (
        <ListItem
          title={item.name}
          subtitle={item.brand ? `Thương hiệu: ${item.brand}` : undefined}
          onPress={() => handleSelectFood(item)}
          disabled={Boolean(submittingFoodId)}
          rightComponent={
            isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : item.calories ? (
              <ThemedText style={dynamicStyles.calories}>
                {item.calories} kcal/100g
              </ThemedText>
            ) : undefined
          }
        />
      );
    },
    [dynamicStyles.calories, handleSelectFood, submittingFoodId, theme.colors.primary],
  );

  const renderSkeleton = useCallback(
    () => (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={dynamicStyles.skeletonItem}>
            <Skeleton width="80%" height={20} />
            <Skeleton width="60%" height={16} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    ),
    [dynamicStyles.skeletonItem],
  );

  const keyExtractor = useCallback((item: FoodItem) => item.id, []);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Chọn món ăn đúng">
      <View style={[styles.container, { paddingHorizontal: theme.spacing.lg }]}>
        <ThemedTextInput
          placeholder="Tìm kiếm món ăn..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          style={styles.searchInput}
          autoFocus
        />

        {error && (
          <View style={dynamicStyles.errorContainer}>
            <ThemedText style={dynamicStyles.errorText}>{error}</ThemedText>
          </View>
        )}

        {loading ? (
          renderSkeleton()
        ) : (
          <FlatList
            ref={flatListRef}
            data={foods}
            keyExtractor={keyExtractor}
            renderItem={renderFoodItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={foods.length === 0 && styles.emptyContainer}
            ListEmptyComponent={
              !loading && searchQuery ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyText}>
                    Không tìm thấy món ăn nào
                  </ThemedText>
                  <ThemedText style={dynamicStyles.emptySubtext}>
                    Thử tìm với từ khóa khác
                  </ThemedText>
                </View>
              ) : null
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
          />
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 16,
  },
  skeletonContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
});

export default TeachLabelBottomSheet;
