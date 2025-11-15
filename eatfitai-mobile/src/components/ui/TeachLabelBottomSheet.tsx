import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../ThemedText';
import { ThemedTextInput } from '../ThemedTextInput';
import { BottomSheet } from '../BottomSheet';
import { useAppTheme } from '../../theme/ThemeProvider';
import { foodService, type FoodItem } from '../../services/foodService';
import { ListItem } from '../ListItem';
import { Skeleton } from '../Skeleton';

type TeachLabelBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (foodItem: FoodItem) => void;
  currentLabel: string;
};

export const TeachLabelBottomSheet = ({
  visible,
  onClose,
  onSelectFood,
  currentLabel,
}: TeachLabelBottomSheetProps): JSX.Element => {
  const { theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && currentLabel) {
      setSearchQuery(currentLabel);
      searchFoods(currentLabel);
    }
  }, [visible, currentLabel]);

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

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchFoods(text);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchFoods]);

  const handleSelectFood = useCallback((food: FoodItem) => {
    try {
      onSelectFood(food);
      onClose();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể chọn món ăn. Vui lòng thử lại.',
      });
    }
  }, [onSelectFood, onClose]);

  const renderFoodItem = useCallback(({ item }: { item: FoodItem }) => (
    <ListItem
      title={item.name}
      subtitle={item.brand ? `Thương hiệu: ${item.brand}` : undefined}
      onPress={() => handleSelectFood(item)}
      rightComponent={
        item.calories ? (
          <ThemedText style={styles.calories}>
            {item.calories} kcal/100g
          </ThemedText>
        ) : undefined
      }
    />
  ), [handleSelectFood]);

  const renderSkeleton = useCallback(() => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} style={styles.skeletonItem}>
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={16} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  ), []);

  const keyExtractor = useCallback((item: FoodItem) => item.id, []);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Chọn món ăn đúng"
      snapPoints={[0.5, 0.8]}
    >
      <View style={styles.container}>
        <ThemedTextInput
          placeholder="Tìm kiếm món ăn..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          style={styles.searchInput}
          autoFocus
        />

        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
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
                  <ThemedText style={styles.emptySubtext}>
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
    paddingHorizontal: 16,
  },
  searchInput: {
    marginBottom: 16,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  skeletonContainer: {
    paddingVertical: 8,
  },
  skeletonItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  calories: {
    fontSize: 12,
    color: '#666',
  },
});

export default TeachLabelBottomSheet;