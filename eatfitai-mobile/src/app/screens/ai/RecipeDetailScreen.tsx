// Recipe Detail Screen - hi?n th? chi ti?t c�ng th?c
import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { AppHeader } from '../../../components/ui/AppHeader';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import { foodService } from '../../../services/foodService'; // [NEW]
import { useDiaryStore } from '../../../store/useDiaryStore'; // [NEW]
import type { RootStackParamList } from '../../types';
import type { RecipeDetail } from '../../../types/aiEnhanced';
import type { MealTypeId } from '../../../types'; // [NEW]
import { glassStyles } from '../../../components/ui/GlassCard';
import { AddRecipeToDiarySheet } from '../../../components/recipe/AddRecipeToDiarySheet'; // [NEW]
import Toast from 'react-native-toast-message'; // [NEW]
import Button from '../../../components/Button'; // [NEW]

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
  const glass = glassStyles(isDark);
  const route = useRoute<RouteProps>();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State cho AI-generated instructions
  const [aiInstructions, setAiInstructions] = useState<AiCookingInstructions>({
    steps: [],
    isLoading: false,
  });

  // State cho Add to Diary sheet [NEW]
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
        setError('Kh�ng th? t?i chi ti?t c�ng th?c. Vui l�ng th? l?i.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [route.params.recipeId]);

  // Fetch AI-generated cooking instructions khi recipe load xong
  useEffect(() => {
    if (!recipe || (recipe.instructions && recipe.instructions.length > 0)) {
      return; // Skip n?u d� c� instructions t? DB
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
          error: 'Kh�ng th? t?o hu?ng d?n n?u',
        });
      }
    };
    fetchAiInstructions();
  }, [recipe]);

  // Handler th�m recipe v�o diary [NEW]
  const handleAddToDiary = async (mealTypeId: MealTypeId, servings: number) => {
    if (!recipe) return;

    try {
      setIsAddingToDiary(true);

      // T?o user food item t? recipe
      const formData = new FormData();
      formData.append('foodName', recipe.recipeName);
      formData.append('description', recipe.description || `C�ng th?c: ${recipe.recipeName}`);
      formData.append('caloriesPer100', String(recipe.totalCalories));
      formData.append('proteinPer100', String(recipe.totalProtein));
      formData.append('carbPer100', String(recipe.totalCarbs));
      formData.append('fatPer100', String(recipe.totalFat));
      formData.append('unitType', 'kh?u ph?n');

      const createdItem = await foodService.createUserFoodItem(formData);

      // Th�m v�o diary v?i servings
      const gramsPerServing = 100; // M?c d?nh 1 serving = 100g
      await foodService.addDiaryEntryFromUserFoodItem({
        mealTypeId,
        userFoodItemId: String(createdItem.userFoodItemId),
        grams: gramsPerServing * servings,
        note: `T? c�ng th?c: ${recipe.recipeName}`,
      });

      // Refresh summary
      // ? Invalidate cache d? HomeScreen t? d?ng c?p nh?t
      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });

      Toast.show({
        type: 'success',
        text1: '�� th�m v�o nh?t k�',
        text2: `${recipe.recipeName} (${servings} kh?u ph?n)`,
      });
    } catch (error) {
      console.error('[RecipeDetailScreen] Error adding to diary:', error);
      Toast.show({
        type: 'error',
        text1: 'Th�m th?t b?i',
        text2: 'Vui l�ng th? l?i',
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
            �ang t?i chi ti?t c�ng th?c...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <AppHeader title="Chi ti?t c�ng th?c" subtitle="C� l?i x?y ra" />
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
      <Screen>
        <AppHeader title="Chi ti?t c�ng th?c" subtitle="Kh�ng c� d? li?u" />
        <View style={styles.center}>
          <ThemedText variant="body" color="textSecondary">
            Kh�ng t�m th?y c�ng th?c.
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title={route.params.recipeName} subtitle="Chi ti?t c�ng th?c" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Th�ng tin dinh du?ng
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
              M� t?
            </ThemedText>
            <ThemedText variant="body">{recipe.description}</ThemedText>
          </View>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
            <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              Nguy�n li?u
            </ThemedText>
            {recipe.ingredients.map((ing, i) => (
              <ThemedText
                key={i}
                variant="body"
                style={{ marginBottom: theme.spacing.xs }}
              >
                � {ing.foodName}: {ing.grams}g ({ing.calories} kcal)
              </ThemedText>
            ))}
          </View>
        )}

        {/* Hu?ng d?n n?u - hi?n th? t? DB ho?c AI-generated */}
        <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <ThemedText variant="h4">????? Hu?ng d?n n?u</ThemedText>
            {aiInstructions.cookingTime && (
              <ThemedText variant="caption" color="textSecondary" style={{ marginLeft: theme.spacing.sm }}>
                ?? {aiInstructions.cookingTime}
              </ThemedText>
            )}
          </View>

          {/* Loading state */}
          {aiInstructions.isLoading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <ThemedText variant="body" color="textSecondary" style={{ marginLeft: theme.spacing.sm }}>
                AI dang t?o hu?ng d?n n?u...
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
          {((recipe.instructions && recipe.instructions.length > 0)
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
                <ThemedText
                  variant="caption"
                  weight="700"
                  style={{ color: '#fff' }}
                >
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
            ?? Video Hu?ng D?n
          </ThemedText>

          {recipe.videoUrl ? (
            // C� video URL t? database -> m? tr?c ti?p trong browser
            <Pressable
              onPress={() => {
                Linking.openURL(recipe.videoUrl!);
              }}
              style={({ pressed }) => [
                styles.videoSearchButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 0, 0, 0.08)',
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
                    Xem video hu?ng d?n
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    Nh?n d? xem video n?u m�n n�y
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
            // Kh�ng c� video URL -> hi?n th? n�t t�m tr�n YouTube
            <Pressable
              onPress={() => {
                const searchQuery = encodeURIComponent(`c�ch n?u ${recipe.recipeName}`);
                Linking.openURL(`https://www.youtube.com/results?search_query=${searchQuery}`);
              }}
              style={({ pressed }) => [
                styles.videoSearchButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 0, 0, 0.08)',
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
                    T�m video tr�n YouTube
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    Nh?n d? t�m video "{recipe.recipeName}"
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

        {/* Add to Diary Button [NEW] */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.lg }}>
          <Button
            title="? Th�m v�o nh?t k� h�m nay"
            variant="primary"
            onPress={() => setShowAddToDiarySheet(true)}
            loading={isAddingToDiary}
            style={{ width: '100%' }}
          />
        </View>
      </ScrollView>

      {/* Add to Diary Sheet [NEW] */}
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
    paddingBottom: 32,
  },
  box: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  // Video container cho WebView
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Video search button khi kh�ng c� videoUrl
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
