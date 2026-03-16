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
import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import type { MealTypeId } from '../../../types';
import type { MappedFoodItem } from '../../../types/ai';
import type { FoodItem } from '../../../services/foodService';
import { aiService } from '../../../services/aiService';
import {
  addItemsToTodayDiary,
  invalidateDiaryQueries,
} from '../../../services/diaryFlowService';
import { handleApiErrorWithCustomMessage } from '../../../utils/errorHandler';
import { translateIngredient } from '../../../utils/translate';
import { TEST_IDS } from '../../../testing/testIds';

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
      mealType: 2, // Default to lunch
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
    // Warn if an item is not matched yet, but still allow selection
    if (!targetItem.item.isMatched && !targetItem.selected) {
      Toast.show({
        type: 'info',
        text1: 'L\u01b0u \u00fd',
        text2: 'M\u00f3n n\u00e0y ch\u01b0a \u0111\u01b0\u1ee3c x\u00e1c nh\u1eadn, c\u00f3 th\u1ec3 thi\u1ebfu th\u00f4ng tin dinh d\u01b0\u1ee1ng',
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
        text1: '\u0110\u00e3 d\u1ea1y AI',
        text2: `"${currentTeachLabel}" -> ${foodItem.name}`,
      });

      // Refresh the detection result after teaching the label
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
        server_error: { text1: 'L\u1ed7i', text2: 'M\u00e1y ch\u1ee7 g\u1eb7p s\u1ef1 c\u1ed1' },
        network_error: { text1: 'Kh\u00f4ng c\u00f3 k\u1ebft n\u1ed1i', text2: 'Ki\u1ec3m tra m\u1ea1ng' },
        unknown: { text1: 'L\u1ed7i', text2: 'Kh\u00f4ng th\u1ec3 d\u1ea1y AI' },
      });
    }
  };

  const handleAddToDiary = async () => {
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const mealType = selectedItems[0]?.mealType ?? 2;

      const items = selectedItems.map((d) => ({
        foodItemId: d.item.foodItemId!,
        grams: d.grams,
      }));

      await addItemsToTodayDiary(items, { mealTypeId: mealType });

      Toast.show({
        type: 'success',
        text1: 'Th\u00e0nh c\u00f4ng',
        text2: `\u0110\u00e3 th\u00eam ${selectedItems.length} m\u00f3n v\u00e0o nh\u1eadt k\u00fd`,
      });
      await invalidateDiaryQueries(queryClient);
      navigation.goBack();
    } catch (err) {
      handleApiErrorWithCustomMessage(err, {
        server_error: { text1: 'L\u1ed7i', text2: 'M\u00e1y ch\u1ee7 g\u1eb7p s\u1ef1 c\u1ed1' },
        network_error: { text1: 'Kh\u00f4ng c\u00f3 k\u1ebft n\u1ed1i', text2: 'Ki\u1ec3m tra m\u1ea1ng' },
        unknown: { text1: 'L\u1ed7i', text2: 'Kh\u00f4ng th\u1ec3 th\u00eam v\u00e0o nh\u1eadt k\u00fd' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the best Vietnamese display name
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
              {'Ch\u1ecdn m\u00f3n \u0111\u00fang'}
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
    <Screen style={styles.container} scroll={false} testID={TEST_IDS.visionAddMeal.screen}>
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
              {'AI nh\u1eadn di\u1ec7n '}{detectionItems.length}{' m\u00f3n'}
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
                    {'\u0110\u00e3 nh\u1eadn di\u1ec7n ('}{matchedItems.length}{')'}
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
                    {'C\u1ea7n x\u00e1c nh\u1eadn ('}{unmatchedItems.length}{')'}
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
            {'S\u1ebd th\u00eam: '}<ThemedText variant="body" weight="700" color="primary">{selectedItems.length}</ThemedText> {'m\u00f3n'}
          </ThemedText>
          <ThemedText variant="body" color="textSecondary">
            <ThemedText variant="body" weight="700">{Math.round(totalCalories)}</ThemedText> kcal
          </ThemedText>
        </View>
        <Button
          variant="primary"
          title={isSubmitting ? '\u0110ang th\u00eam...' : 'Th\u00eam v\u00e0o nh\u1eadt k\u00fd'}
          onPress={handleAddToDiary}
          disabled={selectedItems.length === 0 || isSubmitting}
          loading={isSubmitting}
          style={styles.addButton}
          testID={TEST_IDS.visionAddMeal.confirmButton}
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
