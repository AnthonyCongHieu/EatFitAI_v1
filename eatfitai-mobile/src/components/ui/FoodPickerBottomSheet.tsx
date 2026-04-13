import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '../ThemedText';
import { ThemedTextInput } from '../ThemedTextInput';
import { BottomSheet } from '../BottomSheet';
import { ListItem } from '../ListItem';
import { Skeleton } from '../Skeleton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { foodService, type FoodItem } from '../../services/foodService';
import { TEST_IDS } from '../../testing/testIds';

type FoodPickerBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (foodItem: FoodItem) => Promise<void> | void;
  initialQuery?: string;
  title?: string;
};

export const FoodPickerBottomSheet = ({
  visible,
  onClose,
  onSelectFood,
  initialQuery = '',
  title = 'Tìm món thay thế',
}: FoodPickerBottomSheetProps): React.ReactElement => {
  const { theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingFoodId, setSubmittingFoodId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchFoods = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setFoods([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await foodService.searchAllFoods(trimmedQuery, 20);
      setFoods(result.items);
    } catch {
      setFoods([]);
      setError('Không thể tìm món ăn. Thử lại nhé.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSearchQuery(initialQuery);
    searchFoods(initialQuery).catch(() => undefined);
  }, [initialQuery, searchFoods, visible]);

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
        searchFoods(text).catch(() => undefined);
      }, 250);
    },
    [searchFoods],
  );

  const handleSelectFood = useCallback(
    async (foodItem: FoodItem) => {
      setSubmittingFoodId(foodItem.id);
      try {
        await Promise.resolve(onSelectFood(foodItem));
      } finally {
        setSubmittingFoodId(null);
      }
    },
    [onSelectFood],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} height={620}>
      <View style={styles.container}>
        <ThemedTextInput
          placeholder="Nhập tên món, ví dụ: cơm, rice, chicken"
          value={searchQuery}
          onChangeText={handleSearchChange}
          style={styles.searchInput}
          autoFocus={false}
          testID={TEST_IDS.foodPicker.searchInput}
        />

        {error ? (
          <View
            style={[
              styles.messageBox,
              {
                backgroundColor:
                  theme.mode === 'dark'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(239, 68, 68, 0.08)',
                borderColor:
                  theme.mode === 'dark'
                    ? 'rgba(239, 68, 68, 0.28)'
                    : 'rgba(239, 68, 68, 0.18)',
              },
            ]}
          >
            <ThemedText variant="bodySmall" color="danger">
              {error}
            </ThemedText>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.skeletonContainer}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={styles.skeletonItem}>
                <Skeleton width="80%" height={18} />
                <Skeleton width="55%" height={14} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={foods}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const isSubmitting = submittingFoodId === item.id;
              return (
                <ListItem
                  title={item.name}
                  subtitle={item.nameEn || undefined}
                  onPress={() => handleSelectFood(item)}
                  disabled={Boolean(submittingFoodId)}
                  testID={index === 0 ? TEST_IDS.foodPicker.firstResult : undefined}
                  rightComponent={
                    isSubmitting ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : item.calories ? (
                      <ThemedText variant="caption" color="textSecondary">
                        {item.calories} kcal/100g
                      </ThemedText>
                    ) : undefined
                  }
                />
              );
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={foods.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={
              searchQuery.trim() ? (
                <View style={styles.emptyState}>
                  <ThemedText variant="body" weight="600">
                    Không tìm thấy món phù hợp
                  </ThemedText>
                  <ThemedText
                    variant="bodySmall"
                    color="textSecondary"
                    style={styles.emptySubtext}
                  >
                    Thử đổi từ khóa hoặc tìm bằng tên tiếng Anh.
                  </ThemedText>
                </View>
              ) : null
            }
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
  messageBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  skeletonContainer: {
    paddingTop: 8,
  },
  skeletonItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 8,
  },
});

export default FoodPickerBottomSheet;
