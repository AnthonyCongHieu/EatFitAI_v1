// Recipe detail screen
import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import { foodService } from '../../../services/foodService';
import { invalidateDiaryQueries } from '../../../services/diaryFlowService';
import type { RootStackParamList } from '../../types';
import type { RecipeDetail } from '../../../types/aiEnhanced';
import type { MealTypeId } from '../../../types';
import { AddRecipeToDiarySheet } from '../../../components/recipe/AddRecipeToDiarySheet';
import Toast from 'react-native-toast-message';
import Button from '../../../components/Button';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecipeDetail'>;

// Type cho AI-generated instructions
type AiCookingInstructions = {
  steps: string[];
  cookingTime?: string;
  difficulty?: string;
  isLoading: boolean;
  error?: string;
};

const RecipeDetailScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State cho AI-generated instructions
  const [aiInstructions, setAiInstructions] = useState<AiCookingInstructions>({
    steps: [],
    isLoading: false,
  });

  // State cho Add to Diary sheet
  const [showAddToDiarySheet, setShowAddToDiarySheet] = useState(false);
  const [isAddingToDiary, setIsAddingToDiary] = useState(false);
  const queryClient = useQueryClient();

  // Load recipe detail
  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await aiService.getRecipeDetail(route.params.recipeId);
        setRecipe(data);
      } catch (e) {
        if (__DEV__) {
          console.error('[RecipeDetailScreen] Error loading recipe:', e);
        }
        setError('Không thể tải chi tiết công thức. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [route.params.recipeId]);

  // Fetch AI-generated cooking instructions khi recipe load xong
  useEffect(() => {
    if (!recipe || (recipe.instructions && recipe.instructions.length > 0)) {
      return; // Skip if instructions already exist in the DB payload
    }

    const fetchAiInstructions = async () => {
      setAiInstructions((prev) => ({ ...prev, isLoading: true, error: undefined }));
      try {
        const result = await aiService.getCookingInstructions(
          recipe.recipeName,
          recipe.ingredients || [],
          recipe.description,
        );
        setAiInstructions({
          steps: result.steps,
          cookingTime: result.cookingTime,
          difficulty: result.difficulty,
          isLoading: false,
        });
      } catch (e) {
        if (__DEV__) {
          console.error('[RecipeDetailScreen] Error fetching AI instructions:', e);
        }
        setAiInstructions({
          steps: [],
          isLoading: false,
          error: 'Không thể tạo hướng dẫn nấu',
        });
      }
    };
    fetchAiInstructions();
  }, [recipe]);

  // Add the current recipe to the diary
  const handleAddToDiary = async (mealTypeId: MealTypeId, servings: number) => {
    if (!recipe) return;

    try {
      setIsAddingToDiary(true);

      // Create a user food item from the recipe
      const formData = new FormData();
      formData.append('foodName', recipe.recipeName);
      formData.append(
        'description',
        recipe.description || `Công thức: ${recipe.recipeName}`,
      );
      formData.append('caloriesPer100', String(recipe.totalCalories ?? 0));
      formData.append('proteinPer100', String(recipe.totalProtein ?? 0));
      formData.append('carbPer100', String(recipe.totalCarbs ?? 0));
      formData.append('fatPer100', String(recipe.totalFat ?? 0));
      formData.append('unitType', 'g');

      console.log('[RecipeDetailScreen] Creating UserFoodItem with:', {
        foodName: recipe.recipeName,
        calories: recipe.totalCalories,
        protein: recipe.totalProtein,
        carbs: recipe.totalCarbs,
        fat: recipe.totalFat,
      });

      const createdItem = await foodService.createUserFoodItem(formData);
      console.log('[RecipeDetailScreen] Created UserFoodItem:', createdItem);

      // Add the recipe into the diary using servings
      const gramsPerServing = 100; // Default: 1 serving = 100g
      const totalGrams = gramsPerServing * servings;
      const ratio = totalGrams / 100; // Scale nutrition by grams

      const diaryPayload = {
        mealTypeId,
        userFoodItemId: String(createdItem.userFoodItemId),
        grams: totalGrams,
        calories: Number((recipe.totalCalories ?? 0) * ratio) || 0,
        protein: Number((recipe.totalProtein ?? 0) * ratio) || 0,
        carb: Number((recipe.totalCarbs ?? 0) * ratio) || 0,
        fat: Number((recipe.totalFat ?? 0) * ratio) || 0,
        note: `Từ công thức: ${recipe.recipeName}`,
      };
      console.log('[RecipeDetailScreen] Adding to diary with:', diaryPayload);

      await foodService.addDiaryEntryFromUserFoodItem(diaryPayload);
      await invalidateDiaryQueries(queryClient);

      Toast.show({
        type: 'success',
        text1: 'Đã thêm vào nhật ký',
        text2: `${recipe.recipeName} (${servings} khẩu phần)`,
      });
    } catch (err: any) {
      console.error('[RecipeDetailScreen] Error adding to diary:', err);
      console.error('[RecipeDetailScreen] Error details:', err?.response?.data);
      Toast.show({
        type: 'error',
        text1: 'Thêm thất bại',
        text2: err?.response?.data?.message || 'Vui lòng thử lại',
      });
    } finally {
      setIsAddingToDiary(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <ThemedText
            variant="body"
            color="textSecondary"
            style={{ marginTop: theme.spacing.md }}
          >
            {'Đang tải chi tiết công thức...'}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  // Custom header component (matching EditProfileScreen)
  const renderHeader = (title: string) => (
    <View style={customStyles.screenHeader}>
      <View style={customStyles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={customStyles.backButton}
        >
          <ThemedText style={{ fontSize: 18 }}>{'<'}</ThemedText>
        </TouchableOpacity>
        <View style={customStyles.headerTitles}>
          <ThemedText variant="h3" weight="700" numberOfLines={1}>
            {title}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  // Custom styles for header
  const customStyles = StyleSheet.create({
    screenHeader: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitles: {
      flex: 1,
      alignItems: 'center',
      marginRight: 40,
    },
  });

  if (error) {
    return (
      <Screen scroll={false}>
        {renderHeader('Chi tiết công thức')}
        <View style={styles.center}>
          <ThemedText variant="body" color="danger" style={{ textAlign: 'center' }}>
            {error}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (!recipe) {
    return (
      <Screen scroll={false}>
        {renderHeader('Chi tiết công thức')}
        <View style={styles.center}>
          <ThemedText variant="body" color="textSecondary">
            {'Không tìm thấy công thức.'}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      {renderHeader(route.params.recipeName)}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            {'Thông tin dinh dưỡng'}
          </ThemedText>
          <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
            Calories: {recipe.totalCalories} kcal
          </ThemedText>
          <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
            Protein: {recipe.totalProtein} g
          </ThemedText>
          <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
            Carbs: {recipe.totalCarbs} g
          </ThemedText>
          <ThemedText variant="body" style={{ marginBottom: theme.spacing.xs }}>
            Fat: {recipe.totalFat} g
          </ThemedText>
        </View>

        {recipe.description && (
          <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
            <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              {'Mô tả'}
            </ThemedText>
            <ThemedText variant="body">{recipe.description}</ThemedText>
          </View>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
            <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              {'Nguyên liệu'}
            </ThemedText>
            {recipe.ingredients.map((ing, i) => (
              <ThemedText
                key={i}
                variant="body"
                style={{ marginBottom: theme.spacing.xs }}
              >
                {'-'} {ing.foodName}: {ing.grams}g ({ing.calories} kcal)
              </ThemedText>
            ))}
          </View>
        )}

        {/* Cooking instructions from DB or AI fallback */}
        <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <ThemedText variant="h4">{'Hướng dẫn nấu'}</ThemedText>
            {aiInstructions.cookingTime && (
              <ThemedText
                variant="caption"
                color="textSecondary"
                style={{ marginLeft: theme.spacing.sm }}
              >
                {'Thời gian: '}
                {aiInstructions.cookingTime}
              </ThemedText>
            )}
          </View>

          {/* Loading state */}
          {aiInstructions.isLoading && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: theme.spacing.md,
              }}
            >
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <ThemedText
                variant="body"
                color="textSecondary"
                style={{ marginLeft: theme.spacing.sm }}
              >
                {'AI đang tạo hướng dẫn nấu...'}
              </ThemedText>
            </View>
          )}

          {/* Error state */}
          {aiInstructions.error && !aiInstructions.isLoading && (
            <ThemedText variant="body" color="danger">
              {aiInstructions.error}
            </ThemedText>
          )}

          {/* Render steps */}
          {(recipe.instructions && recipe.instructions.length > 0
            ? recipe.instructions
            : aiInstructions.steps
          ).map((step: string, i: number) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                marginBottom: theme.spacing.sm,
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: theme.spacing.sm,
                  marginTop: 2,
                }}
              >
                <ThemedText variant="caption" weight="700" style={{ color: '#fff' }}>
                  {i + 1}
                </ThemedText>
              </View>
              <ThemedText variant="body" style={{ flex: 1 }}>
                {step}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Video Tutorial Section */}
        <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            {'Video hướng dẫn'}
          </ThemedText>

          {recipe.videoUrl ? (
            // Open the recipe video URL directly in the browser
            <Pressable
              onPress={() => {
                Linking.openURL(recipe.videoUrl!);
              }}
              style={({ pressed }) => [
                styles.videoSearchButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 0, 0, 0.15)'
                    : 'rgba(255, 0, 0, 0.08)',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.videoCardContent}>
                <View style={styles.videoIconContainer}>
                  <Ionicons name="play-circle" size={40} color="#FF0000" />
                </View>
                <View style={styles.videoTextContainer}>
                  <ThemedText variant="bodySmall" weight="600">
                    {'Xem video hướng dẫn'}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {'Nhấn để xem video nấu món này'}
                  </ThemedText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </View>
            </Pressable>
          ) : (
            // No video URL: fall back to a YouTube search
            <Pressable
              onPress={() => {
                const searchQuery = encodeURIComponent(`cách nấu ${recipe.recipeName} `);
                Linking.openURL(
                  `https://www.youtube.com/results?search_query=${searchQuery}`,
                );
              }}
              style={({ pressed }) => [
                styles.videoSearchButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 0, 0, 0.15)'
                    : 'rgba(255, 0, 0, 0.08)',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.videoCardContent}>
                <View style={styles.videoIconContainer}>
                  <Ionicons name="logo-youtube" size={40} color="#FF0000" />
                </View>
                <View style={styles.videoTextContainer}>
                  <ThemedText variant="bodySmall" weight="600">
                    {'Tìm video trên YouTube'}
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {'Nhấn để tìm video "'}
                    {recipe.recipeName}
                    {'"'}
                  </ThemedText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </View>
            </Pressable>
          )}
        </View>

        {/* Add to diary button */}
        <View
          style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.lg }}
        >
          <Button
            title="Thêm vào nhật ký hôm nay"
            variant="primary"
            onPress={() => setShowAddToDiarySheet(true)}
            loading={isAddingToDiary}
            style={{ width: '100%' }}
          />
        </View>
      </ScrollView>

      {/* Add to diary sheet */}
      {recipe && (
        <AddRecipeToDiarySheet
          visible={showAddToDiarySheet}
          onClose={() => setShowAddToDiarySheet(false)}
          recipeName={recipe.recipeName}
          nutrition={{
            calories: recipe.totalCalories,
            protein: recipe.totalProtein,
            carbs: recipe.totalCarbs,
            fat: recipe.totalFat,
          }}
          onConfirm={handleAddToDiary}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 120, // Extra space to scroll past the button
  },
  box: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  // Video search button when no videoUrl is available
  videoSearchButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.2)',
  },
  videoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  videoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTextContainer: {
    flex: 1,
    gap: 2,
  },
  // Nutrition info grid
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});

export default RecipeDetailScreen;
