import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout, FadeOut } from 'react-native-reanimated';

import Screen from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ThemedText } from '../../../components/ThemedText';
import { ThemedTextInput } from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { AppCard } from '../../../components/ui/AppCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { RecipeSuggestion } from '../../../types/aiEnhanced';
import { glassStyles } from '../../../components/ui/GlassCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecipeSuggestions'>;

const POPULAR_INGREDIENTS = [
  'Trứng',
  'Thịt gà',
  'Thịt bò',
  'Cà chua',
  'Khoai tây',
  'Cà rốt',
  'Hành tây',
  'Tỏi',
  'Gạo',
  'Mì',
  'Đậu phụ',
];

const RecipeSuggestionsScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.ingredients) {
      setIngredients(route.params.ingredients);
    }
  }, [route.params?.ingredients]);

  const addIngredient = (ing: string) => {
    const trimmed = ing.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
    }
    setNewIngredient('');
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter((i) => i !== ing));
  };

  const searchRecipes = async () => {
    if (ingredients.length === 0) return;

    setLoading(true);
    setError(null);
    setRecipes([]); // Clear previous results to show loading skeleton
    try {
      const results = await aiService.suggestRecipesEnhanced({
        availableIngredients: ingredients,
        maxResults: 10,
        minMatchedIngredients: 1,
      });
      setRecipes(results);
      if (results.length === 0) {
        setError('Không tìm thấy công thức nào phù hợp.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tìm công thức');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
    },
    inputSection: {
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.card,
      marginBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    inputContainer: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
    },
    sectionLabel: {
      marginBottom: theme.spacing.sm,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    suggestionChip: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    recipeCard: {
      marginBottom: theme.spacing.md,
      padding: 0, // Reset padding for custom layout
      overflow: 'hidden',
      borderWidth: 0,
      ...theme.shadows.md,
    },
    cardContent: {
      padding: theme.spacing.md,
    },
    recipeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    matchBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.sm,
    },
    nutritionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    nutritionItem: {
      alignItems: 'center',
    },
    missingIngredients: {
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
      fontSize: 13,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    skeletonCard: {
      height: 160,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      marginBottom: theme.spacing.md,
      opacity: 0.5,
    },
  });

  const renderRecipeItem = ({
    item,
    index,
  }: {
    item: RecipeSuggestion;
    index: number;
  }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      layout={Layout.springify()}
    >
      <AppCard
        style={styles.recipeCard}
        onPress={() =>
          navigation.navigate('RecipeDetail', {
            recipeId: item.recipeId,
            recipeName: item.recipeName,
          })
        }
      >
        <View style={styles.cardContent}>
          <View style={styles.recipeHeader}>
            <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
              <ThemedText variant="h3" color="primary">
                {item.recipeName}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary">
                Có {item.matchedIngredientsCount}/{item.totalIngredientsCount} nguyên liệu
              </ThemedText>
            </View>
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.matchBadge}
            >
              <ThemedText variant="caption" style={{ color: '#FFF', fontWeight: 'bold' }}>
                {Math.round(item.matchPercentage)}%
              </ThemedText>
            </LinearGradient>
          </View>

          {item.missingIngredients.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={theme.colors.warning}
                style={{ marginTop: 2 }}
              />
              <ThemedText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                Thiếu: {item.missingIngredients.join(', ')}
              </ThemedText>
            </View>
          )}

          <View style={styles.nutritionRow}>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Calo
              </ThemedText>
              <ThemedText variant="bodySmall" weight="600">
                {Math.round(item.totalCalories)}
              </ThemedText>
            </View>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Đạm
              </ThemedText>
              <ThemedText variant="bodySmall" weight="600">
                {Math.round(item.totalProtein)}g
              </ThemedText>
            </View>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Carb
              </ThemedText>
              <ThemedText variant="bodySmall" weight="600">
                {Math.round(item.totalCarbs)}g
              </ThemedText>
            </View>
            <View style={styles.nutritionItem}>
              <ThemedText variant="caption" color="textSecondary">
                Béo
              </ThemedText>
              <ThemedText variant="bodySmall" weight="600">
                {Math.round(item.totalFat)}g
              </ThemedText>
            </View>
          </View>
        </View>
      </AppCard>
    </Animated.View>
  );

  const renderSkeleton = () => (
    <View>
      {[1, 2, 3].map((key) => (
        <Animated.View
          key={key}
          style={styles.skeletonCard}
          entering={FadeInDown.delay(key * 100)}
          exiting={FadeOut}
        />
      ))}
    </View>
  );

  return (
    <Screen style={styles.container}>
      <ScreenHeader title="Gợi ý món ăn" subtitle="Tìm công thức từ nguyên liệu có sẵn" />

      <View style={styles.content}>
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <View style={styles.input}>
              <ThemedTextInput
                placeholder="Nhập nguyên liệu..."
                value={newIngredient}
                onChangeText={setNewIngredient}
                onSubmitEditing={() => addIngredient(newIngredient)}
              />
            </View>
            <View style={{ width: 80 }}>
              <Button
                title="Thêm"
                onPress={() => addIngredient(newIngredient)}
                variant="secondary"
                size="sm"
              />
            </View>
          </View>

          {ingredients.length > 0 ? (
            <View style={{ marginBottom: theme.spacing.md }}>
              <ThemedText style={styles.sectionLabel}>Đã chọn:</ThemedText>
              <View style={styles.chipsContainer}>
                {ingredients.map((ing, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.chip}
                    onPress={() => removeIngredient(ing)}
                  >
                    <ThemedText variant="caption" color="primary" weight="600">
                      {ing}
                    </ThemedText>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <ThemedText
              variant="caption"
              color="textSecondary"
              style={{ marginBottom: theme.spacing.md, fontStyle: 'italic' }}
            >
              Chưa có nguyên liệu nào được chọn
            </ThemedText>
          )}

          <View>
            <ThemedText style={styles.sectionLabel}>Gợi ý nhanh:</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {POPULAR_INGREDIENTS.filter((i) => !ingredients.includes(i)).map(
                (ing, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => addIngredient(ing)}
                  >
                    <ThemedText variant="caption">{ing}</ThemedText>
                    <Ionicons
                      name="add"
                      size={14}
                      color={theme.colors.textSecondary}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </View>
        </View>

        <Button
          title="Tìm công thức ngay"
          onPress={searchRecipes}
          disabled={ingredients.length === 0 || loading}
          variant="primary"
          style={{ marginBottom: theme.spacing.lg, ...theme.shadows.md }}
        />

        {loading ? (
          renderSkeleton()
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle" size={48} color={theme.colors.danger} />
            <ThemedText color="danger" style={{ marginTop: 8 }}>
              {error}
            </ThemedText>
          </View>
        ) : recipes.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="restaurant-outline" size={64} color={theme.colors.border} />
            <ThemedText
              color="textSecondary"
              style={{ marginTop: 16, textAlign: 'center' }}
            >
              Hãy thêm nguyên liệu và nhấn tìm kiếm{'\n'}để nhận gợi ý món ăn ngon!
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={searchRecipes}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            {recipes.map((item, index) => (
              <View key={item.recipeId}>{renderRecipeItem({ item, index })}</View>
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
};

export default RecipeSuggestionsScreen;
