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
import { ThemedText } from '../../../components/ThemedText';
import { ThemedTextInput } from '../../../components/ThemedTextInput';
import Button from '../../../components/Button';
import { AppCard } from '../../../components/ui/AppCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { RecipeSuggestion } from '../../../types/aiEnhanced';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const RecipeSuggestionsScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();

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
    screenHeader: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(59, 130, 246, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(74, 144, 226, 0.25)' : 'rgba(59, 130, 246, 0.15)',
    },
    headerTitles: {
      flex: 1,
    },
    content: {
      flex: 1,
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
      padding: 0,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.colors.card,
      ...theme.shadows.md,
    },
    cardContent: {
      padding: 16,
    },
    recipeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    recipeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    recipeEmoji: {
      fontSize: 24,
    },
    matchBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    nutritionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      gap: 8,
    },
    nutritionPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
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
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.recipeTitleRow}>
                <ThemedText style={styles.recipeEmoji}>🍲</ThemedText>
                <ThemedText variant="h4" weight="700" numberOfLines={2} style={{ flex: 1 }}>
                  {item.recipeName}
                </ThemedText>
              </View>
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
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.15)', padding: 10, borderRadius: 10 }}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={theme.colors.warning}
              />
              <ThemedText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                Thiếu: {item.missingIngredients.join(', ')}
              </ThemedText>
            </View>
          )}

          <View style={styles.nutritionRow}>
            <View style={[styles.nutritionPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <ThemedText variant="caption" style={{ color: '#EF4444', fontWeight: '600' }}>
                {Math.round(item.totalCalories)}
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary" style={{ fontSize: 10 }}>
                kcal
              </ThemedText>
            </View>
            <View style={[styles.nutritionPill, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <ThemedText variant="caption" style={{ color: '#3B82F6', fontWeight: '600' }}>
                {Math.round(item.totalProtein)}g
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary" style={{ fontSize: 10 }}>
                Đạm
              </ThemedText>
            </View>
            <View style={[styles.nutritionPill, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <ThemedText variant="caption" style={{ color: '#D97706', fontWeight: '600' }}>
                {Math.round(item.totalCarbs)}g
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary" style={{ fontSize: 10 }}>
                Carb
              </ThemedText>
            </View>
            <View style={[styles.nutritionPill, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <ThemedText variant="caption" style={{ color: '#DB2777', fontWeight: '600' }}>
                {Math.round(item.totalFat)}g
              </ThemedText>
              <ThemedText variant="caption" color="textSecondary" style={{ fontSize: 10 }}>
                Béo
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
    <Screen style={styles.container} scroll={false}>
      {/* Custom Header */}
      <View style={[styles.screenHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <ThemedText variant="h3" weight="700">
              🍳 Gợi ý món ăn
            </ThemedText>
            <ThemedText variant="caption" color="textSecondary">
              Tìm công thức từ nguyên liệu có sẵn
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
      </ScrollView>
    </Screen>
  );
};

export default RecipeSuggestionsScreen;
