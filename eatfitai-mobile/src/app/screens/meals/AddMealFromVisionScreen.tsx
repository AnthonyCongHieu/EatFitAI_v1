import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image, StyleSheet, View, ScrollView, Pressable, Dimensions } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import Screen from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { Skeleton } from '../../../components/Skeleton';
import { TeachLabelBottomSheet } from '../../../components/ui/TeachLabelBottomSheet';
import { AppCard } from '../../../components/ui/AppCard';
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import type { MealTypeId } from '../../../types';
import type { MappedFoodItem } from '../../../types/ai';
import type { FoodItem } from '../../../services/foodService';
import { aiService } from '../../../services/aiService';
import { mealService } from '../../../services/mealService';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { translateIngredient } from '../../../utils/translate';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddMealFromVision'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DetectionItem = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
  mealType: MealTypeId;
};

const AddMealFromVisionScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();

  const { imageUri, result } = route.params;

  const [loading, setLoading] = useState(false);
  const [detectionItems, setDetectionItems] = useState<DetectionItem[]>(() =>
    result.items.map((item) => ({
      item,
      selected: item.isMatched,
      grams: 100,
      mealType: 2, // Mặc định bữa trưa
    })),
  );
  const [teachLabelVisible, setTeachLabelVisible] = useState(false);
  const [currentTeachLabel, setCurrentTeachLabel] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = useMemo(
    () => detectionItems.filter((d) => d.selected),
    [detectionItems],
  );

  const totalCalories = useMemo(() => {
    return selectedItems.reduce((sum, d) => {
      const caloriesPer100g = d.item.caloriesPer100g ?? 0;
      return sum + (caloriesPer100g * d.grams) / 100;
    }, 0);
  }, [selectedItems]);

  const handleToggleSelect = useCallback((targetItem: DetectionItem) => {
    // Cảnh báo nếu chưa matched nhưng vẫn cho phép chọn
    if (!targetItem.item.isMatched && !targetItem.selected) {
      Toast.show({
        type: 'info',
        text1: 'Lưu ý',
        text2: 'Món này chưa được xác nhận, có thể thiếu thông tin dinh dưỡng',
        visibilityTime: 2000,
      });
    }
    setDetectionItems((prev) =>
      prev.map((item) =>
        item === targetItem ? { ...item, selected: !item.selected } : item,
      ),
    );
  }, []);

  const handleTeachLabel = useCallback((label: string) => {
    setCurrentTeachLabel(label);
    setTeachLabelVisible(true);
  }, []);

  const handleSelectFood = async (foodItem: FoodItem) => {
    try {
      await aiService.teachLabel({
        label: currentTeachLabel,
        foodItemId: parseInt(foodItem.id),
      });

      Toast.show({
        type: 'success',
        text1: 'Đã dạy AI',
        text2: `"${currentTeachLabel}" → ${foodItem.name}`,
      });

      // Refresh lại kết quả
      setLoading(true);
      const refreshedResult = await aiService.detectFoodByImage(imageUri);
      setDetectionItems(
        refreshedResult.items.map((item) => ({
          item,
          selected: item.isMatched,
          grams: 100,
          mealType: 2,
        })),
      );
      setLoading(false);
    } catch (err) {
      handleApiErrorWithCustomMessage(err, {
        server_error: { text1: 'Lỗi', text2: 'Máy chủ gặp sự cố' },
        network_error: { text1: 'Không có kết nối', text2: 'Kiểm tra mạng' },
        unknown: { text1: 'Lỗi', text2: 'Không thể dạy AI' },
      });
    }
  };

  const handleAddToDiary = async () => {
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const date = new Date().toISOString().split('T')[0]!;
      const mealType = selectedItems[0]?.mealType ?? 2;

      const items = selectedItems.map((d) => ({
        foodItemId: d.item.foodItemId!,
        grams: d.grams,
      }));

      await mealService.addMealItems(date, mealType, items);

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: `Đã thêm ${selectedItems.length} món vào nhật ký`,
      });

      // ⚡ Invalidate cache để HomeScreen/MealDiary tự động cập nhật
      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      navigation.goBack();
    } catch (err) {
      handleApiErrorWithCustomMessage(err, {
        server_error: { text1: 'Lỗi', text2: 'Máy chủ gặp sự cố' },
        network_error: { text1: 'Không có kết nối', text2: 'Kiểm tra mạng' },
        unknown: { text1: 'Lỗi', text2: 'Không thể thêm vào nhật ký' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lấy tên hiển thị tiếng Việt
  const getDisplayName = (item: MappedFoodItem) => {
    return item.foodName || translateIngredient(item.label);
  };

  const renderFoodItem = (detection: DetectionItem, index: number) => {
    const item = detection.item;
    const displayName = getDisplayName(item);
    const calories = item.caloriesPer100g ?? 0;
    const isMatched = item.isMatched;

    return (
      <Pressable
        key={`${item.label}-${index}`}
        onPress={() => handleToggleSelect(detection)}
        style={[
          styles.foodRow,
          {
            backgroundColor: detection.selected
              ? theme.colors.primary + '15'
              : theme.colors.card,
            borderColor: detection.selected
              ? theme.colors.primary
              : theme.colors.border,
          },
        ]}
      >
        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: detection.selected
                ? theme.colors.primary
                : 'transparent',
              borderColor: detection.selected
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          {detection.selected && (
            <Icon name="checkmark" size="sm" color="card" />
          )}
        </View>

        {/* Info */}
        <View style={styles.foodInfo}>
          <ThemedText variant="body" weight="600" numberOfLines={1}>
            {displayName}
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            {calories} kcal / 100 g
          </ThemedText>
        </View>

        {/* Action button */}
        {!isMatched && (
          <Pressable
            onPress={() => handleTeachLabel(item.label)}
            style={[styles.teachBtn, { backgroundColor: theme.colors.primary + '20' }]}
          >
            <ThemedText variant="caption" color="primary">
              Chọn món đúng
            </ThemedText>
          </Pressable>
        )}
      </Pressable>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <Skeleton height={60} style={{ borderRadius: 12 }} />
        </View>
      ))}
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    imageSection: {
      position: 'relative',
      width: SCREEN_WIDTH - 32,
      height: 140,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 16,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionTitle: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    foodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    foodInfo: {
      flex: 1,
    },
    teachBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    skeletonContainer: {
      paddingHorizontal: 16,
    },
    skeletonCard: {
      marginBottom: 8,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: 24,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    addButton: {
      flex: 1,
    },
  });

  const matchedItems = detectionItems.filter((d) => d.item.isMatched);
  const unmatchedItems = detectionItems.filter((d) => !d.item.isMatched);

  return (
    <Screen style={styles.container} scroll={false}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Preview - Compact */}
        <View style={styles.imageSection}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          <View style={styles.imageOverlay}>
            <Icon name="scan-outline" size="sm" color="card" />
            <ThemedText
              variant="bodySmall"
              style={{ color: '#fff', marginLeft: 6 }}
            >
              AI nhận diện {detectionItems.length} món
            </ThemedText>
          </View>
        </View>

        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {/* Matched Items */}
            {matchedItems.length > 0 && (
              <>
                <View style={styles.sectionTitle}>
                  <ThemedText variant="h4" weight="600">
                    Đã nhận diện ({matchedItems.length})
                  </ThemedText>
                </View>
                {matchedItems.map((d, i) => renderFoodItem(d, i))}
              </>
            )}

            {/* Unmatched Items */}
            {unmatchedItems.length > 0 && (
              <>
                <View style={styles.sectionTitle}>
                  <ThemedText variant="h4" weight="600" color="warning">
                    Cần xác nhận ({unmatchedItems.length})
                  </ThemedText>
                </View>
                {unmatchedItems.map((d, i) => renderFoodItem(d, i + matchedItems.length))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Summary Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.summaryRow}>
          <ThemedText variant="body" color="textSecondary">
            Sẽ thêm: <ThemedText variant="body" weight="700" color="primary">{selectedItems.length}</ThemedText> món
          </ThemedText>
          <ThemedText variant="body" color="textSecondary">
            <ThemedText variant="body" weight="700">{Math.round(totalCalories)}</ThemedText> kcal
          </ThemedText>
        </View>
        <Button
          variant="primary"
          title={isSubmitting ? 'Đang thêm...' : 'Thêm vào nhật ký Bữa trưa'}
          onPress={handleAddToDiary}
          disabled={selectedItems.length === 0 || isSubmitting}
          loading={isSubmitting}
          style={styles.addButton}
        />
      </View>

      {/* Teach Label Bottom Sheet */}
      <TeachLabelBottomSheet
        visible={teachLabelVisible}
        onClose={() => setTeachLabelVisible(false)}
        onSelectFood={handleSelectFood}
        currentLabel={currentTeachLabel}
      />
    </Screen>
  );
};

export default AddMealFromVisionScreen;
