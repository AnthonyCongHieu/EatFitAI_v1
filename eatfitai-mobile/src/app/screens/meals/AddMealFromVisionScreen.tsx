import React, { useState, useMemo, useCallback } from 'react';
import { Image, StyleSheet, View, FlatList, ListRenderItem } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import Screen from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/Skeleton';
import { AiDetectionCard } from '../../../components/ui/AiDetectionCard';
import { TeachLabelBottomSheet } from '../../../components/ui/TeachLabelBottomSheet';
import { AiSummaryBar } from '../../../components/ui/AiSummaryBar';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import type { MealTypeId } from '../../../types';
import type { VisionDetectResult, MappedFoodItem } from '../../../types/ai';
import type { FoodItem } from '../../../services/foodService';
import { aiService } from '../../../services/aiService';
import { mealService } from '../../../services/mealService';
import { useDiaryStore } from '../../../store/useDiaryStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddMealFromVision'>;

type DetectionItem = {
  item: MappedFoodItem;
  selected: boolean;
  grams: number;
  mealType: MealTypeId;
};

const AddMealFromVisionScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const refreshSummary = useDiaryStore((s) => s.refreshSummary);

  const { imageUri, result } = route.params;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionItems, setDetectionItems] = useState<DetectionItem[]>(() =>
    result.items.map((item) => ({
      item,
      selected: item.isMatched,
      grams: 100,
      mealType: 2, // Default to lunch
    }))
  );
  const [teachLabelVisible, setTeachLabelVisible] = useState(false);
  const [currentTeachLabel, setCurrentTeachLabel] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchedItems = useMemo(
    () => detectionItems.filter((d) => d.item.isMatched),
    [detectionItems]
  );

  const unmatchedItems = useMemo(
    () => detectionItems.filter((d) => !d.item.isMatched),
    [detectionItems]
  );

  const selectedItems = useMemo(
    () => detectionItems.filter((d) => d.selected),
    [detectionItems]
  );

  const totalCalories = useMemo(() => {
    return selectedItems.reduce((sum, d) => {
      const caloriesPer100g = d.item.caloriesPer100g ?? 0;
      return sum + (caloriesPer100g * d.grams) / 100;
    }, 0);
  }, [selectedItems]);

  const handleSelectionChange = useCallback((index: number, selected: boolean) => {
    setDetectionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected } : item))
    );
  }, []);

  const handleGramsChange = useCallback((index: number, grams: number) => {
    setDetectionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, grams } : item))
    );
  }, []);

  const handleMealTypeChange = useCallback((index: number, mealType: MealTypeId) => {
    setDetectionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, mealType } : item))
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

      // Refresh detection results
      setLoading(true);
      const refreshedResult = await aiService.detectFoodByImage(imageUri);
      setDetectionItems(
        refreshedResult.items.map((item) => ({
          item,
          selected: item.isMatched,
          grams: 100,
          mealType: 2,
        }))
      );
      setLoading(false);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể dạy AI. Vui lòng thử lại.',
      });
    }
  };

  const handleAddToDiary = async () => {
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const date = new Date().toISOString().split('T')[0]!;
      const mealType = selectedItems[0]?.mealType ?? 2; // Use meal type from first selected item, default to lunch

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

      await refreshSummary();
      navigation.goBack();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể thêm vào nhật ký. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetectionCard: ListRenderItem<DetectionItem> = useCallback(({ item: detection, index }) => (
    <AiDetectionCard
      item={detection.item}
      selected={detection.selected}
      grams={detection.grams}
      mealType={detection.mealType}
      onSelectionChange={(selected) => handleSelectionChange(index, selected)}
      onGramsChange={(grams) => handleGramsChange(index, grams)}
      onMealTypeChange={(mealType) => handleMealTypeChange(index, mealType)}
      onTeachLabel={() => handleTeachLabel(detection.item.label)}
    />
  ), [handleSelectionChange, handleGramsChange, handleMealTypeChange, handleTeachLabel]);

  const keyExtractor = useCallback((item: DetectionItem, index: number) =>
    `${item.item.label}-${index}`, []);

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <Skeleton height={120} style={{ borderRadius: 12 }} />
        </View>
      ))}
    </View>
  );

  if (error) {
    return (
      <Screen>
        <EmptyState
          title="Không thể tải kết quả từ AI. Thử lại."
          description="Đã xảy ra lỗi khi xử lý ảnh. Vui lòng thử chụp lại hoặc liên hệ hỗ trợ."
          icon="alert-triangle"
          action={
            <View style={styles.errorActions}>
              {/* Add retry button if needed */}
            </View>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      {/* Image Preview */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        <View style={styles.overlay}>
          <ThemedText style={styles.overlayText}>
            AI nhận diện {detectionItems.length} món
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.scrollView}>
          {renderSkeleton()}
        </View>
      ) : (
        <FlatList
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Gợi ý của AI */}
              {matchedItems.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader title="Gợi ý của AI" />
                </View>
              )}
            </>
          }
          data={matchedItems}
          keyExtractor={keyExtractor}
          renderItem={renderDetectionCard}
          ListFooterComponent={
            <>
              {/* Cần xác nhận */}
              {unmatchedItems.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader title="Cần xác nhận" />
                  {unmatchedItems.map((detection, index) => (
                    <AiDetectionCard
                      key={`${detection.item.label}-${detectionItems.indexOf(detection)}`}
                      item={detection.item}
                      selected={detection.selected}
                      grams={detection.grams}
                      mealType={detection.mealType}
                      onSelectionChange={(selected) => handleSelectionChange(detectionItems.indexOf(detection), selected)}
                      onGramsChange={(grams) => handleGramsChange(detectionItems.indexOf(detection), grams)}
                      onMealTypeChange={(mealType) => handleMealTypeChange(detectionItems.indexOf(detection), mealType)}
                      onTeachLabel={() => handleTeachLabel(detection.item.label)}
                    />
                  ))}
                </View>
              )}
            </>
          }
        />
      )}

      {/* Summary Bar */}
      <AiSummaryBar
        selectedCount={selectedItems.length}
        totalCalories={Math.round(totalCalories)}
        mealType={selectedItems[0]?.mealType ?? 2}
        onAddToDiary={handleAddToDiary}
        disabled={selectedItems.length === 0 || isSubmitting}
      />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    marginBottom: 12,
  },
  errorActions: {
    // Add error action buttons if needed
  },
});

export default AddMealFromVisionScreen;
