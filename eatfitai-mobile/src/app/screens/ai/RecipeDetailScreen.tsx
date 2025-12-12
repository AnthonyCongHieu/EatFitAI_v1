// Recipe Detail Screen - hiển thị chi tiết công thức
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { RecipeDetail } from '../../../types/aiEnhanced';
import { glassStyles } from '../../../components/ui/GlassCard';

type RouteProps = RouteProp<RootStackParamList, 'RecipeDetail'>;

// Type cho AI-generated instructions
type AiCookingInstructions = {
  steps: string[];
  cookingTime?: string;
  difficulty?: string;
  isLoading: boolean;
  error?: string;
};

const RecipeDetailScreen = (): JSX.Element => {
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
      return; // Skip nếu đã có instructions từ DB
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
            Đang tải chi tiết công thức...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Chi tiết công thức" subtitle="Có lỗi xảy ra" />
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
        <ScreenHeader title="Chi tiết công thức" subtitle="Không có dữ liệu" />
        <View style={styles.center}>
          <ThemedText variant="body" color="textSecondary">
            Không tìm thấy công thức.
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={route.params.recipeName} subtitle="Chi tiết công thức" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
          <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
            Thông tin dinh dưỡng
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
              Mô tả
            </ThemedText>
            <ThemedText variant="body">{recipe.description}</ThemedText>
          </View>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
            <ThemedText variant="h4" style={{ marginBottom: theme.spacing.sm }}>
              Nguyên liệu
            </ThemedText>
            {recipe.ingredients.map((ing, i) => (
              <ThemedText
                key={i}
                variant="body"
                style={{ marginBottom: theme.spacing.xs }}
              >
                • {ing.foodName}: {ing.grams}g ({ing.calories} kcal)
              </ThemedText>
            ))}
          </View>
        )}

        {/* Hướng dẫn nấu - hiển thị từ DB hoặc AI-generated */}
        <View style={[styles.box, { backgroundColor: theme.colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <ThemedText variant="h4">👨‍🍳 Hướng dẫn nấu</ThemedText>
            {aiInstructions.cookingTime && (
              <ThemedText variant="caption" color="textSecondary" style={{ marginLeft: theme.spacing.sm }}>
                ⏱️ {aiInstructions.cookingTime}
              </ThemedText>
            )}
          </View>

          {/* Loading state */}
          {aiInstructions.isLoading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <ThemedText variant="body" color="textSecondary" style={{ marginLeft: theme.spacing.sm }}>
                AI đang tạo hướng dẫn nấu...
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
            🎬 Video Hướng Dẫn
          </ThemedText>

          {recipe.videoUrl ? (
            // Có video URL từ database -> mở trực tiếp trong browser
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
                    Xem video hướng dẫn
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    Nhấn để xem video nấu món này
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
            // Không có video URL -> hiển thị nút tìm trên YouTube
            <Pressable
              onPress={() => {
                const searchQuery = encodeURIComponent(`cách nấu ${recipe.recipeName}`);
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
                    Tìm video trên YouTube
                  </ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    Nhấn để tìm video "{recipe.recipeName}"
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
      </ScrollView>
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
  // Video search button khi không có videoUrl
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
