import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import Button from '../../../components/Button';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { foodService, type FoodItem } from '../../../services/foodService';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { handleApiError } from '../../../utils/errorHandler';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CommonMealTemplate'>;
type RouteProps = RouteProp<RootStackParamList, 'CommonMealTemplate'>;

type SelectedIngredient = {
  foodItemId: number;
  foodName: string;
  gramsInput: string;
  caloriesPer100g?: number | null;
  proteinPer100g?: number | null;
  carbPer100g?: number | null;
  fatPer100g?: number | null;
};

const SUGGESTION_LIMIT = 12;

const CommonMealTemplateScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const templateId = route.params?.templateId;
  const isEditMode = !!templateId;

  const [dishName, setDishName] = useState('');
  const [description] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const templateQuery = useQuery({
    queryKey: ['common-meal-detail', templateId],
    queryFn: () => foodService.getCommonMealDetail(String(templateId)),
    enabled: isEditMode,
    staleTime: 0,
  });

  useEffect(() => {
    if (!templateQuery.data) {
      return;
    }

    setDishName(templateQuery.data.name);
    setSelectedIngredients(
      templateQuery.data.ingredients.map((ingredient) => ({
        foodItemId: ingredient.foodItemId,
        foodName: ingredient.foodName,
        gramsInput:
          ingredient.grams > 0 && Number.isFinite(ingredient.grams)
            ? String(Math.round(ingredient.grams * 100) / 100)
            : '100',
        caloriesPer100g: ingredient.caloriesPer100g ?? null,
        proteinPer100g: ingredient.proteinPer100g ?? null,
        carbPer100g: ingredient.carbPer100g ?? null,
        fatPer100g: ingredient.fatPer100g ?? null,
      })),
    );
  }, [templateQuery.data]);

  const handleSearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      Toast.show({
        type: 'info',
        text1: 'Nhập tên món cần tìm',
        text2: 'Tìm món trong danh mục để thêm vào tổ hợp.',
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await foodService.searchFoods(trimmed, SUGGESTION_LIMIT);
      setSearchResults(response.items);
    } catch (error) {
      handleApiError(error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectIngredient = useCallback((item: FoodItem) => {
    const foodItemId = Number(item.id);
    if (!Number.isFinite(foodItemId) || foodItemId <= 0) {
      return;
    }

    setSelectedIngredients((current) => {
      if (current.some((ingredient) => ingredient.foodItemId === foodItemId)) {
        return current;
      }

      return [
        ...current,
        {
          foodItemId,
          foodName: item.name,
          gramsInput: '100',
          caloriesPer100g: item.calories ?? null,
          proteinPer100g: item.protein ?? null,
          carbPer100g: item.carbs ?? null,
          fatPer100g: item.fat ?? null,
        },
      ];
    });
  }, []);

  const handleRemoveIngredient = useCallback((foodItemId: number) => {
    setSelectedIngredients((current) =>
      current.filter((ingredient) => ingredient.foodItemId !== foodItemId),
    );
  }, []);

  const handleChangeIngredientGrams = useCallback((foodItemId: number, gramsInput: string) => {
    setSelectedIngredients((current) =>
      current.map((ingredient) =>
        ingredient.foodItemId === foodItemId ? { ...ingredient, gramsInput } : ingredient,
      ),
    );
  }, []);

  const nutritionSummary = useMemo(() => {
    return selectedIngredients.reduce(
      (acc, ingredient) => {
        const grams = Number.parseFloat(ingredient.gramsInput);
        if (!Number.isFinite(grams) || grams <= 0) {
          return acc;
        }

        const factor = grams / 100;
        return {
          grams: acc.grams + grams,
          calories: acc.calories + (ingredient.caloriesPer100g ?? 0) * factor,
          protein: acc.protein + (ingredient.proteinPer100g ?? 0) * factor,
          carbs: acc.carbs + (ingredient.carbPer100g ?? 0) * factor,
          fat: acc.fat + (ingredient.fatPer100g ?? 0) * factor,
        };
      },
      { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [selectedIngredients]);

  const handleSave = useCallback(async () => {
    const normalizedName = dishName.trim();
    if (!normalizedName) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu tên tổ hợp',
        text2: 'Hãy đặt tên để bạn dễ tìm lại về sau.',
      });
      return;
    }

    if (selectedIngredients.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Chưa có món nào',
        text2: 'Thêm ít nhất một món từ danh mục để lưu tổ hợp.',
      });
      return;
    }

    const ingredients = selectedIngredients.map((ingredient) => ({
      foodItemId: ingredient.foodItemId,
      grams: Number.parseFloat(ingredient.gramsInput),
    }));

    if (ingredients.some((ingredient) => !Number.isFinite(ingredient.grams) || ingredient.grams <= 0)) {
      Toast.show({
        type: 'error',
        text1: 'Khối lượng chưa hợp lệ',
        text2: 'Mỗi món cần có số gram lớn hơn 0.',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && templateId) {
        await foodService.updateCommonMeal(String(templateId), {
          dishName: normalizedName,
          description: description.trim(),
          ingredients,
        });
      } else {
        await foodService.createCustomDish({
          dishName: normalizedName,
          description: description.trim(),
          ingredients,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['common-meals'] }),
        queryClient.invalidateQueries({ queryKey: ['common-meal-detail', templateId] }),
      ]);

      Toast.show({
        type: 'success',
        text1: isEditMode ? 'Đã cập nhật tổ hợp món' : 'Đã tạo tổ hợp món',
        text2: normalizedName,
      });
      navigation.goBack();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  }, [description, dishName, isEditMode, navigation, queryClient, selectedIngredients, templateId]);

  const renderIngredientCard = (ingredient: SelectedIngredient) => {
    const grams = Number.parseFloat(ingredient.gramsInput) || 0;
    const factor = grams / 100;

    const cal = Math.round((ingredient.caloriesPer100g ?? 0) * factor);
    const p = Math.round((ingredient.proteinPer100g ?? 0) * factor);
    const c = Math.round((ingredient.carbPer100g ?? 0) * factor);
    const f = Math.round((ingredient.fatPer100g ?? 0) * factor);

    return (
      <View key={ingredient.foodItemId} style={[styles.card, { borderColor: theme.colors.border }]}>
        <View style={styles.ingredientHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText weight="700" style={{ fontSize: 16 }}>{ingredient.foodName}</ThemedText>
            <View style={{ marginTop: 4 }}>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: 4 }}>
                {cal} kcal
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' }} />
                  <ThemedText variant="bodySmall" color="textSecondary">P: {p}g</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f7c052' }} />
                  <ThemedText variant="bodySmall" color="textSecondary">C: {c}g</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fb7185' }} />
                  <ThemedText variant="bodySmall" color="textSecondary">F: {f}g</ThemedText>
                </View>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => handleRemoveIngredient(ingredient.foodItemId)}
            style={styles.iconButton}
            testID={`common-meal-remove-ingredient-${ingredient.foodItemId}`}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          </Pressable>
        </View>

        <View style={styles.gramsRow}>
          <ThemedText variant="bodySmall" color="textSecondary">
            Khối lượng
          </ThemedText>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={(value) => handleChangeIngredientGrams(ingredient.foodItemId, value)}
            selectTextOnFocus={true}
            style={[
              styles.gramsInput,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.card,
              },
            ]}
            testID={`common-meal-grams-input-${ingredient.foodItemId}`}
            value={ingredient.gramsInput}
          />
        </View>
      </View>
    );
  };

  return (
    <SubScreenLayout
      title={isEditMode ? 'Chỉnh sửa tổ hợp món' : 'Tạo tổ hợp món mới'}
      subtitle="Lưu tổ hợp món bạn hay ăn để thêm nhanh"
      keyboardAvoiding
    >
      {templateQuery.isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
          <ThemedText variant="bodySmall" color="textSecondary">
            Đang tải tổ hợp món...
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.formSection}>
            <ThemedTextInput
              label="Tên tổ hợp món"
              onChangeText={setDishName}
              testID="common-meal-name-input"
              value={dishName}
              placeholder="Ví dụ: Lunch Prep ức gà"
              required
            />
          </View>

          <View style={styles.formSection}>
            <ThemedText variant="body" weight="700">
              Thêm món vào tổ hợp
            </ThemedText>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <ThemedTextInput
                  onChangeText={setSearchQuery}
                  placeholder="Tìm món từ danh mục"
                  testID="common-meal-search-input"
                  value={searchQuery}
                />
              </View>
              <Pressable
                onPress={handleSearch}
                style={({ pressed }) => [
                  styles.searchIconBtn,
                  { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                testID="common-meal-search-button"
              >
                {isSearching ? (
                  <ActivityIndicator color="#fff" size={18} />
                ) : (
                  <Ionicons name="search" size={18} color="#fff" />
                )}
              </Pressable>
            </View>

            {searchResults.length > 0 ? (
              <View style={styles.resultsList}>
                {searchResults.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectIngredient(item)}
                    style={[styles.card, { borderColor: theme.colors.border }]}
                    testID={`common-meal-search-result-${item.id}`}
                  >
                    <View style={styles.searchResultRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText weight="600">{item.name}</ThemedText>
                        <ThemedText variant="bodySmall" color="textSecondary">
                          {Math.round(item.calories ?? 0)} kcal / 100g
                        </ThemedText>
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.formSection}>
            <View style={styles.summaryHeader}>
              <ThemedText variant="body" weight="700">
                Món đã chọn
              </ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary">
                {selectedIngredients.length} món
              </ThemedText>
            </View>

            {selectedIngredients.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: theme.colors.border }]}>
                <ThemedText align="center" color="textSecondary">
                  Chưa có món nào trong tổ hợp này.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.resultsList}>{selectedIngredients.map(renderIngredientCard)}</View>
            )}
          </View>

          <View
            style={[
              styles.summaryCard,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
            ]}
          >
            <ThemedText variant="body" weight="700">
              Tổng ước tính
            </ThemedText>
            <View style={styles.summaryGrid}>
              <View>
                <ThemedText variant="bodySmall" color="textSecondary">
                  Khẩu phần
                </ThemedText>
                <ThemedText weight="700">{Math.round(nutritionSummary.grams)}g</ThemedText>
              </View>
              <View>
                <ThemedText variant="bodySmall" color="textSecondary">
                  Calo
                </ThemedText>
                <ThemedText weight="700">{Math.round(nutritionSummary.calories)} kcal</ThemedText>
              </View>
              <View>
                <ThemedText variant="bodySmall" color="textSecondary">
                  Protein
                </ThemedText>
                <ThemedText weight="700">{Math.round(nutritionSummary.protein)}g</ThemedText>
              </View>
              <View>
                <ThemedText variant="bodySmall" color="textSecondary">
                  Carb
                </ThemedText>
                <ThemedText weight="700">{Math.round(nutritionSummary.carbs)}g</ThemedText>
              </View>
              <View>
                <ThemedText variant="bodySmall" color="textSecondary">
                  Fat
                </ThemedText>
                <ThemedText weight="700">{Math.round(nutritionSummary.fat)}g</ThemedText>
              </View>
            </View>
          </View>

          <Button
            loading={isSaving}
            onPress={handleSave}
            testID="common-meal-save-button"
            title={isEditMode ? 'Lưu thay đổi' : 'Tạo tổ hợp món'}
          />
        </>
      )}
    </SubScreenLayout>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  formSection: {
    gap: 12,
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsList: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  gramsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  gramsInput: {
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'right',
    fontSize: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});

export default CommonMealTemplateScreen;
