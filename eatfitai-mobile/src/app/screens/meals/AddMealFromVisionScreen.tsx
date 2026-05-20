import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dimensions,
  Image,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { showAppToast } from '../../../utils/showAppToast';

import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import Screen from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { FoodPickerBottomSheet } from '../../../components/ui/FoodPickerBottomSheet';
import { TeachLabelBottomSheet } from '../../../components/ui/TeachLabelBottomSheet';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { MEAL_TYPES, type MealTypeId } from '../../../types';
import type { MappedFoodItem } from '../../../types/ai';
import type { FoodItem } from '../../../services/foodService';
import { aiService, type TeachLabelRequest } from '../../../services/aiService';
import {
  addItemsToTodayDiary,
  invalidateDiaryQueries,
  getSuggestedMealType,
} from '../../../services/diaryFlowService';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { getVisionFoodDisplayName } from '../../../utils/translate';
import {
  buildVisionReviewItems,
  calculateVisionReviewCalories,
  clampVisionGrams,
  getDefaultVisionGrams,
  getVisionReviewSaveBlocker,
  type VisionReviewItem,
} from '../../../utils/visionReview';
import { TEST_IDS } from '../../../testing/testIds';
import { usePostFirstLogNotificationPrompt } from '../../../hooks/usePostFirstLogNotificationPrompt';
import MoChiInlineNotice from '../../../features/mochi/MoChiInlineNotice';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddMealFromVision'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MEAL_TYPE_OPTIONS: { id: MealTypeId; label: string }[] = [
  { id: MEAL_TYPES.BREAKFAST, label: 'Sáng' },
  { id: MEAL_TYPES.LUNCH, label: 'Trưa' },
  { id: MEAL_TYPES.DINNER, label: 'Tối' },
  { id: MEAL_TYPES.SNACK, label: 'Snack' },
];

const AddMealFromVisionScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { promptIfFirstLog } = usePostFirstLogNotificationPrompt();

  const { imageUri, result, initialGrams } = route.params;

  const [detectionItems, setDetectionItems] = useState<VisionReviewItem[]>(() => {
    const items = buildVisionReviewItems(result.items);
    if (initialGrams !== undefined && items.length > 0 && items[0]) {
      items[0].grams = initialGrams;
    }
    return items;
  });
  const [selectedMealType, setSelectedMealType] = useState<MealTypeId>(() => getSuggestedMealType(new Date()));
  const [teachLabelVisible, setTeachLabelVisible] = useState(false);
  const [currentTeachItem, setCurrentTeachItem] = useState<MappedFoodItem | null>(null);
  const [currentTeachIndex, setCurrentTeachIndex] = useState<number | null>(null);
  const [replacePickerVisible, setReplacePickerVisible] = useState(false);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSavedMoChi, setShowSavedMoChi] = useState(false);

  const selectedItems = useMemo(
    () => detectionItems.filter((detection) => detection.selected),
    [detectionItems],
  );

  const totalCalories = useMemo(
    () => calculateVisionReviewCalories(detectionItems),
    [detectionItems],
  );

  const indexedDetectionItems = useMemo(
    () => detectionItems.map((detection, index) => ({ detection, index })),
    [detectionItems],
  );
  const matchedItems = indexedDetectionItems.filter(
    ({ detection }) => detection.item.isMatched,
  );
  const unmatchedItems = indexedDetectionItems.filter(
    ({ detection }) => !detection.item.isMatched,
  );

  const currentReplaceQuery = useMemo(() => {
    if (replaceTargetIndex === null) {
      return '';
    }

    const target = detectionItems[replaceTargetIndex];
    if (!target) {
      return '';
    }

    return getVisionFoodDisplayName(target.item);
  }, [detectionItems, replaceTargetIndex]);

  const getDisplayName = useCallback((item: MappedFoodItem) => {
    return getVisionFoodDisplayName(item);
  }, []);

  const updateDetectionItem = useCallback(
    (index: number, updater: (current: VisionReviewItem) => VisionReviewItem) => {
      setDetectionItems((previous) =>
        previous.map((item, currentIndex) =>
          currentIndex === index ? updater(item) : item,
        ),
      );
    },
    [],
  );

  const handleToggleSelect = useCallback(
    (index: number) => {
      const target = detectionItems[index];
      if (!target) {
        return;
      }

      if (!target.item.isMatched && !target.selected) {
        showAppToast({
          type: 'info',
          text1: 'Cần xác nhận món',
          text2: 'Hãy Tìm kiếm món để xác nhận trước khi lưu.',
          visibilityTime: 2200,
        });
      }

      updateDetectionItem(index, (current) => ({
        ...current,
        selected: !current.selected,
      }));
    },
    [detectionItems, updateDetectionItem],
  );

  const handleAdjustGrams = useCallback(
    (index: number, delta: number) => {
      updateDetectionItem(index, (current) => ({
        ...current,
        grams: clampVisionGrams(current.grams + delta),
      }));
    },
    [updateDetectionItem],
  );

  const openTeachLabelSheet = useCallback((item: MappedFoodItem, index: number) => {
    setCurrentTeachItem(item);
    setCurrentTeachIndex(index);
    InteractionManager.runAfterInteractions(() => {
      setTeachLabelVisible(true);
    });
  }, []);

  const closeTeachLabelSheet = useCallback(() => {
    setTeachLabelVisible(false);
    setCurrentTeachItem(null);
    setCurrentTeachIndex(null);
  }, []);

  const closeReplacePicker = useCallback(() => {
    setReplacePickerVisible(false);
    setReplaceTargetIndex(null);
  }, []);

  const handleTeachLabel = useCallback(
    async (foodItem: FoodItem) => {
      if (!currentTeachItem || currentTeachIndex === null) {
        throw new Error('No teach label item selected');
      }

      if (foodItem.source === 'user') {
        showAppToast({
          type: 'info',
          text1: 'Chọn món trong thư viện',
          text2: 'Dạy AI cần món catalog để lưu mapping dùng chung.',
        });
        return;
      }

      const foodItemId = Number.parseInt(foodItem.id, 10);
      if (Number.isNaN(foodItemId)) {
        throw new Error('Invalid food item id');
      }

      const previousReviewItem = detectionItems[currentTeachIndex];
      if (!previousReviewItem) {
        throw new Error('Teach label item no longer exists');
      }

      const optimisticReviewItem: VisionReviewItem = {
        ...previousReviewItem,
        selected: true,
        grams:
          previousReviewItem.grams > 0
            ? previousReviewItem.grams
            : getDefaultVisionGrams(previousReviewItem.item),
        item: {
          ...previousReviewItem.item,
          source: 'catalog',
          foodItemId,
          userFoodItemId: null,
          foodName: foodItem.name,
          caloriesPer100g: foodItem.calories ?? previousReviewItem.item.caloriesPer100g ?? 0,
          proteinPer100g: foodItem.protein ?? previousReviewItem.item.proteinPer100g ?? 0,
          carbPer100g: foodItem.carbs ?? previousReviewItem.item.carbPer100g ?? 0,
          fatPer100g: foodItem.fat ?? previousReviewItem.item.fatPer100g ?? 0,
          thumbNail: foodItem.thumbnail ?? previousReviewItem.item.thumbNail ?? null,
          isMatched: true,
        },
      };

      updateDetectionItem(currentTeachIndex, () => optimisticReviewItem);
      closeTeachLabelSheet();

      try {
        const request: TeachLabelRequest = {
          label: currentTeachItem.label,
          foodItemId,
          detectedConfidence: currentTeachItem.confidence,
          selectedFoodName: foodItem.name,
          source: 'vision_add_meal',
          clientTimestamp: new Date().toISOString(),
        };

        await aiService.teachLabel(request);

        showAppToast({
          type: 'success',
          text1: 'Đã dạy AI',
          text2: `"${currentTeachItem.label}" -> ${foodItem.name}`,
        });
      } catch (error) {
        updateDetectionItem(currentTeachIndex, () => previousReviewItem);
        handleApiErrorWithCustomMessage(error, {
          server_error: { text1: 'Lỗi', text2: 'Máy chủ gặp sự cố' },
          network_error: { text1: 'Không có kết nối', text2: 'Kiểm tra mạng và thử lại' },
          unknown: { text1: 'Lỗi', text2: 'Không thể dạy AI lúc này' },
        });
      }
    },
    [
      closeTeachLabelSheet,
      currentTeachIndex,
      currentTeachItem,
      detectionItems,
      updateDetectionItem,
    ],
  );

  const handleReplaceFood = useCallback(
    async (foodItem: FoodItem) => {
      if (replaceTargetIndex === null) {
        throw new Error('No replace target selected');
      }

      const selectedFoodId = Number.parseInt(foodItem.id, 10);
      if (Number.isNaN(selectedFoodId)) {
        throw new Error('Invalid food item id');
      }

      const isUserFood = foodItem.source === 'user';
      updateDetectionItem(replaceTargetIndex, (current) => ({
        ...current,
        selected: true,
        item: {
          ...current.item,
          source: isUserFood ? 'user' : 'catalog',
          foodItemId: isUserFood ? null : selectedFoodId,
          userFoodItemId: isUserFood ? selectedFoodId : null,
          foodName: foodItem.name,
          caloriesPer100g: foodItem.calories ?? current.item.caloriesPer100g ?? 0,
          proteinPer100g: foodItem.protein ?? current.item.proteinPer100g ?? 0,
          carbPer100g: foodItem.carbs ?? current.item.carbPer100g ?? 0,
          fatPer100g: foodItem.fat ?? current.item.fatPer100g ?? 0,
          thumbNail: foodItem.thumbnail ?? current.item.thumbNail ?? null,
          isMatched: true,
        },
      }));

      closeReplacePicker();
      showAppToast({
        type: 'success',
        text1: 'Đã thay món',
        text2: foodItem.name,
      });
    },
    [closeReplacePicker, replaceTargetIndex, updateDetectionItem],
  );

  const handleAddToDiary = useCallback(async () => {
    if (selectedItems.length === 0) {
      showAppToast({
        type: 'info',
        text1: 'Chưa chọn món nào',
        text2: 'Vui lòng chọn ít nhất 1 món, hoặc dùng "Tìm kiếm món" cho món chưa rõ.',
      });
      return;
    }

    const saveBlocker = getVisionReviewSaveBlocker(selectedItems);
    if (saveBlocker) {
      showAppToast({
        type: 'info',
        text1: 'Còn món cần sửa',
        text2: saveBlocker,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addItemsToTodayDiary(
        selectedItems.map((detection) => {
          const userFoodItemId = Number(detection.item.userFoodItemId);
          if (detection.item.source === 'user' || userFoodItemId > 0) {
            return {
              source: 'user' as const,
              userFoodItemId,
              grams: detection.grams,
            };
          }

          return {
            source: 'catalog' as const,
            foodItemId: Number(detection.item.foodItemId),
            grams: detection.grams,
          };
        }),
        { mealTypeId: selectedMealType },
      );

      showAppToast({
        type: 'success',
        text1: 'Đã thêm vào nhật ký',
        text2: `${selectedItems.length} món - ${Math.round(totalCalories)} kcal`,
      });

      setShowSavedMoChi(true);
      await invalidateDiaryQueries(queryClient);
      // A1.3: Notification prompt after first diary log
      promptIfFirstLog();
      navigation.navigate('AppTabs', { screen: 'MealDiary' });
    } catch (error) {
      handleApiErrorWithCustomMessage(error, {
        server_error: { text1: 'Lỗi', text2: 'Máy chủ gặp sự cố' },
        network_error: { text1: 'Không có kết nối', text2: 'Kiểm tra mạng và thử lại' },
        unknown: { text1: 'Lỗi', text2: 'Không thể thêm vào nhật ký' },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [navigation, queryClient, selectedItems, selectedMealType, totalCalories]);

  const renderFoodItem = (detection: VisionReviewItem, index: number) => {
    const displayName = getDisplayName(detection.item);
    const calories = Math.round(
      ((detection.item.caloriesPer100g ?? 0) * detection.grams) / 100,
    );
    const protein = Math.round(
      ((detection.item.proteinPer100g ?? 0) * detection.grams) / 100,
    );
    const carbs = Math.round(
      ((detection.item.carbPer100g ?? 0) * detection.grams) / 100,
    );
    const fat = Math.round(
      ((detection.item.fatPer100g ?? 0) * detection.grams) / 100,
    );
    const confidence = Math.round((detection.item.confidence ?? 0) * 100);
    const isMatched = detection.item.isMatched;

    return (
      <View
        key={`${detection.item.label}-${index}`}
        style={[
          styles.foodCard,
          {
            backgroundColor: detection.selected
              ? theme.colors.primary + '12'
              : theme.colors.card,
            borderColor: detection.selected ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        <Pressable style={styles.foodHeader} onPress={() => handleToggleSelect(index)}>
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
            {detection.selected ? <Icon name="checkmark" size="sm" color="card" /> : null}
          </View>

          <View style={styles.foodInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <ThemedText variant="body" weight="700" numberOfLines={1} style={{ flex: 1, paddingRight: 8 }}>
                {displayName}
              </ThemedText>
              <View
                style={[
                  styles.metaBadge,
                  {
                    backgroundColor: isMatched
                      ? theme.colors.success + '18'
                      : theme.colors.warning + '18',
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  weight="600"
                  style={{
                    color: isMatched ? theme.colors.success : theme.colors.warning,
                  }}
                >
                  {isMatched ? `${confidence}%` : 'Cần review'}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.metaRow, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="caption" color="textSecondary">
                  {calories} kcal / {detection.grams}g
                </ThemedText>
                <ThemedText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  P: {protein}g · C: {carbs}g · F: {fat}g
                </ThemedText>
              </View>

              <View style={[styles.gramsControl, { borderColor: theme.colors.border, marginTop: 0 }]}>
                <Pressable
                  onPressIn={(event) => {
                    event.stopPropagation();
                  }}
                  onPress={(event) => {
                    event.stopPropagation();
                    handleAdjustGrams(index, -25);
                  }}
                  style={styles.gramsButton}
                  testID={`${TEST_IDS.visionAddMeal.decreaseGramsButton}-${index}`}
                >
                  <ThemedText variant="body" weight="700">
                    -
                  </ThemedText>
                </Pressable>
                <ThemedText variant="bodySmall" weight="700">
                  {detection.grams}g
                </ThemedText>
                <Pressable
                  onPressIn={(event) => {
                    event.stopPropagation();
                  }}
                  onPress={(event) => {
                    event.stopPropagation();
                    handleAdjustGrams(index, 25);
                  }}
                  style={styles.gramsButton}
                  testID={`${TEST_IDS.visionAddMeal.increaseGramsButton}-${index}`}
                >
                  <ThemedText variant="body" weight="700">
                    +
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {!isMatched ? (
              <View style={{ marginTop: 12 }}>
                <Pressable
                  onPressIn={(event) => {
                    event.stopPropagation();
                  }}
                  onPress={(event) => {
                    event.stopPropagation();
                    openTeachLabelSheet(detection.item, index);
                  }}
                  style={[
                    styles.actionChip,
                    {
                      backgroundColor: theme.colors.warning + '14',
                      borderColor: theme.colors.warning + '35',
                      alignSelf: 'flex-start',
                    },
                  ]}
                >
                  <Icon name="search-outline" size="xs" color="warning" />
                  <ThemedText
                    variant="caption"
                    weight="600"
                    color="warning"
                    style={{ marginLeft: 4 }}
                  >
                    Tìm kiếm món
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <Screen
      style={styles.container}
      scroll={false}
      testID={TEST_IDS.visionAddMeal.screen}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          <View style={styles.imageOverlay}>
            <Icon name="scan-outline" size="sm" color="card" />
            <ThemedText variant="bodySmall" style={{ color: '#fff', marginLeft: 6 }}>
              Xác nhận món ăn · {detectionItems.length} món
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.reviewHint,
            {
              backgroundColor:
                theme.mode === 'dark'
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'rgba(34, 197, 94, 0.08)',
              borderColor:
                theme.mode === 'dark'
                  ? 'rgba(34, 197, 94, 0.28)'
                  : 'rgba(34, 197, 94, 0.16)',
            },
          ]}
        >
          <ThemedText variant="bodySmall" color="textSecondary">
            Vui lòng kiểm tra lại thông tin, điều chỉnh khối lượng hoặc thêm bớt các món và chọn bữa ăn trước khi lưu vào nhật ký.
          </ThemedText>
        </View>

        {showSavedMoChi && (
          <MoChiInlineNotice mochiEvent="meal_logged" routeName="AddMealFromVision" compact />
        )}

        {matchedItems.length > 0 ? (
          <>
            <View style={styles.sectionTitle}>
              <ThemedText variant="h4" weight="700">
                Các món nhận diện được ({matchedItems.length})
              </ThemedText>
            </View>
            {matchedItems.map(({ detection, index }) =>
              renderFoodItem(detection, index),
            )}
          </>
        ) : null}

        {unmatchedItems.length > 0 ? (
          <>
            <View style={styles.sectionTitle}>
              <ThemedText variant="h4" weight="700" color="warning">
                Cần xác nhận ({unmatchedItems.length})
              </ThemedText>
            </View>
            {unmatchedItems.map(({ detection, index }) =>
              renderFoodItem(detection, index),
            )}
          </>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.mealTypeRow}>
          {MEAL_TYPE_OPTIONS.map((option) => {
            const selected = option.id === selectedMealType;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelectedMealType(option.id)}
                style={[
                  styles.mealTypeChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primary
                      : theme.colors.background,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                testID={
                  option.id === MEAL_TYPES.BREAKFAST
                    ? TEST_IDS.visionAddMeal.mealTypeBreakfastButton
                    : option.id === MEAL_TYPES.LUNCH
                      ? TEST_IDS.visionAddMeal.mealTypeLunchButton
                      : option.id === MEAL_TYPES.DINNER
                        ? TEST_IDS.visionAddMeal.mealTypeDinnerButton
                        : TEST_IDS.visionAddMeal.mealTypeSnackButton
                }
              >
                <ThemedText
                  variant="caption"
                  weight="700"
                  style={{ color: selected ? '#fff' : theme.colors.textSecondary }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summaryRow}>
          <ThemedText variant="body" color="textSecondary">
            Đã chọn:{' '}
            <ThemedText variant="body" weight="700" color="primary">
              {selectedItems.length}
            </ThemedText>{' '}
            món
          </ThemedText>
          <ThemedText variant="body" color="textSecondary">
            <ThemedText variant="body" weight="700">
              {Math.round(totalCalories)}
            </ThemedText>{' '}
            kcal
          </ThemedText>
        </View>

        <Button
          variant="primary"
          title={isSubmitting ? 'Đang lưu...' : 'Lưu vào nhật ký'}
          onPress={handleAddToDiary}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={styles.addButton}
          testID={TEST_IDS.visionAddMeal.confirmButton}
        />
      </View>

      <TeachLabelBottomSheet
        visible={teachLabelVisible}
        onClose={closeTeachLabelSheet}
        onSelectFood={handleTeachLabel}
        currentLabel={currentTeachItem?.label ?? ''}
      />

      <FoodPickerBottomSheet
        visible={replacePickerVisible}
        onClose={closeReplacePicker}
        onSelectFood={handleReplaceFood}
        initialQuery={currentReplaceQuery}
        title="Đổi món bằng Search"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 170,
  },
  imageSection: {
    position: 'relative',
    width: SCREEN_WIDTH - 32,
    height: 150,
    marginHorizontal: 16,
    marginTop: 10,
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewHint: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  foodCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  foodInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  gramsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minWidth: 118,
    justifyContent: 'space-between',
  },
  gramsButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickPortionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickPortionChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.22)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mealTypeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
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

export default AddMealFromVisionScreen;
