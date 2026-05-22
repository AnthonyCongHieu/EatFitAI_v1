import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  type ViewStyle,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import MoChiInlineNotice from '../../../features/mochi/MoChiInlineNotice';
import AppImage from '../../../components/ui/AppImage';
import { aiService, buildRecipeSuggestionRequest } from '../../../services/aiService';
import { sanitizeFoodImageUrl } from '../../../utils/imageHelpers';
import type { RootStackParamList } from '../../types';
import type { RecipeSuggestion } from '../../../types/aiEnhanced';
import { useEN } from '../../../theme/emeraldNebula';
import { useUserPreferenceStore } from '../../../store/useUserPreferenceStore';
import { filterRecipesByPreferences } from '../../../utils/foodPreferenceFilter';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecipeSuggestions'>;
type SortMode = 'best' | 'fast' | 'protein' | 'missing';





const P_STATIC = {
  primary: '#4be277',
  primaryContainer: '#22c55e',
  surface: '#05070d',
  surfaceContainerLow: '#0f1625',
  surfaceContainerHigh: 'rgba(37, 41, 58, 0.7)',
  surfaceContainerLowest: '#090e1c',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#b7c4d9',
  onPrimary: '#003915',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHeader: 'rgba(22, 27, 43, 0.6)',
  danger: '#ff8c8c',
  macroC: '#f7c052',
  macroP: '#34d399',
  macroF: '#f87171',
};

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'best', label: 'Phù hợp nhất' },
  { key: 'fast', label: 'Nhanh' },
  { key: 'protein', label: 'Giàu đạm' },
];

const selectRecipeImageUrl = (
  recipe: RecipeSuggestion,
  size: 'thumb' | 'medium' = 'medium',
): string | null => {
  const raw =
    size === 'medium'
      ? recipe.imageVariants?.mediumUrl ?? recipe.imageUrl
      : recipe.imageVariants?.thumbUrl ?? recipe.imageUrl;
  return sanitizeFoodImageUrl(raw, size);
};

const getRecipeTimeLabel = (recipe: RecipeSuggestion): string =>
  recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes} phút` : 'Chưa rõ';

const getSuitableMeals = (recipeName: string, calories: number): string[] => {
  const name = recipeName.toLowerCase();
  const meals: string[] = [];

  // Breakfast indicators:
  const isBreakfast =
    name.includes('bún') ||
    name.includes('phở') ||
    name.includes('hủ tiếu') ||
    name.includes('mì') ||
    name.includes('miến') ||
    name.includes('cháo') ||
    name.includes('bánh mì') ||
    name.includes('xôi') ||
    name.includes('trứng') ||
    name.includes('pancake') ||
    name.includes('ngũ cốc') ||
    name.includes('oatmeal') ||
    name.includes('bánh cuốn') ||
    name.includes('bánh giò') ||
    name.includes('smoothie') ||
    name.includes('sinh tố');

  // Snack indicators:
  const isSnack =
    (name.includes('chè') ||
      name.includes('bánh ngọt') ||
      name.includes('sữa chua') ||
      name.includes('yogurt') ||
      name.includes('trái cây') ||
      name.includes('hạt') ||
      name.includes('salad')) &&
    calories < 250;

  // Lunch/Dinner indicators:
  const isLunchDinner =
    name.includes('cơm') ||
    name.includes('kho') ||
    name.includes('xào') ||
    name.includes('lẩu') ||
    name.includes('canh') ||
    name.includes('sườn') ||
    name.includes('cá') ||
    name.includes('thịt') ||
    name.includes('gà') ||
    name.includes('bò') ||
    name.includes('heo') ||
    name.includes('tôm') ||
    name.includes('mực') ||
    name.includes('đậu hũ') ||
    name.includes('tempeh') ||
    name.includes('cà ri') ||
    name.includes('curry') ||
    name.includes('nướng') ||
    calories >= 300;

  if (isBreakfast) {
    meals.push('Bữa sáng');
  }

  if (isLunchDinner) {
    meals.push('Bữa trưa');
    meals.push('Bữa tối');
  }

  if (isSnack && meals.length === 0) {
    meals.push('Bữa phụ');
  }

  // Fallback if nothing matched:
  if (meals.length === 0) {
    if (calories < 200) {
      meals.push('Bữa phụ');
    } else if (calories < 400) {
      meals.push('Bữa sáng');
      meals.push('Bữa trưa');
    } else {
      meals.push('Bữa trưa');
      meals.push('Bữa tối');
    }
  }

  return meals;
};

const getPrimaryReason = (recipe: RecipeSuggestion): string => {
  if (recipe.scoreReasons?.length) {
    const firstReason = recipe.scoreReasons[0]!;
    if (
      firstReason !== 'Gợi ý món phù hợp cho hôm nay' &&
      firstReason !== 'Dựa trên nguyên liệu đã chọn' &&
      !firstReason.startsWith('Khớp ')
    ) {
      return firstReason;
    }
  }

  const meals = getSuitableMeals(recipe.recipeName, recipe.totalCalories);
  if (meals.length === 1) {
    return `Phù hợp nhất cho ${meals[0]!.toLowerCase()}`;
  }
  if (meals.includes('Bữa trưa') && meals.includes('Bữa tối')) {
    if (meals.includes('Bữa sáng')) {
      return 'Thích hợp cho tất cả các bữa chính';
    }
    return 'Gợi ý tốt cho bữa trưa hoặc bữa tối';
  }
  return `Phù hợp cho ${meals.map((m) => m.toLowerCase()).join(' và ')}`;
};

const getRecipeBadgeLabel = (recipe: RecipeSuggestion): string => {
  if (recipe.canCookNow) return 'Nấu ngay';
  const missingCount = recipe.missingIngredients?.length ?? recipe.missingIngredientCount ?? 0;
  if (missingCount > 0) {
    return `Thiếu ${missingCount} nguyên liệu`;
  }

  const matchValue = Math.round(recipe.matchPercentage || recipe.matchScore || 0);
  return `Phù hợp ${matchValue}%`;
};

const RecipeImage = ({
  recipe,
  style,
}: {
  recipe: RecipeSuggestion;
  style: ViewStyle;
}): React.ReactElement => {
  const imageUrl = selectRecipeImageUrl(recipe, 'medium');
  if (!imageUrl) {
    return (
      <View style={[style, S.imageFallback]}>
        <Ionicons name="restaurant-outline" size={34} color={P_STATIC.onSurfaceVariant} />
      </View>
    );
  }

  return (
    <AppImage
      source={{ uri: imageUrl }}
      style={style}
      fallbackEmoji="🍽️"
      showPlaceholder
    />
  );
};

const RecipeSuggestionsScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const ingredientInputRef = useRef<TextInput>(null);
  const EN = useEN();
  const P = {
    ...P_STATIC,
    primary: EN.primary,
    primaryContainer: EN.primaryContainer,
    surface: EN.bg,
    surfaceContainerLow: EN.surfaceLow,
    surfaceContainerHigh: EN.surfaceHigh,
    surfaceContainerLowest: EN.surfaceLow,
    onSurface: EN.onSurface,
    onSurfaceVariant: EN.onSurfaceVariant,
    glassBorder: EN.glassBorder,
    glassHeader: EN.glassBg,
    danger: EN.danger,
    macroC: P_STATIC.macroC,
    macroP: P_STATIC.macroP,
    macroF: P_STATIC.macroF,
  };

  const { preferences, fetchPreferences } = useUserPreferenceStore();

  useEffect(() => {
    if (!preferences) {
      void fetchPreferences();
    }
  }, [preferences, fetchPreferences]);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>(
    route.params?.recipes ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const requestedMode = route.params?.mode ?? (ingredients.length > 0 ? 'ingredient_combo' : 'auto');
  const isDailyRecommendation = requestedMode === 'daily_recommendation';

  const filteredRecipes = useMemo(() => {
    return filterRecipesByPreferences(recipes, preferences).recipes;
  }, [recipes, preferences]);

  const displayedRecipes = useMemo(() => {
    const sorted = [...filteredRecipes];
    sorted.sort((a, b) => {
      if (sortMode === 'fast') {
        return (a.cookTimeMinutes ?? 999) - (b.cookTimeMinutes ?? 999);
      }
      if (sortMode === 'protein') {
        return (b.totalProtein ?? 0) - (a.totalProtein ?? 0);
      }
      if (sortMode === 'missing') {
        return (a.missingIngredientCount ?? 999) - (b.missingIngredientCount ?? 999);
      }
      return (b.matchScore ?? b.matchPercentage ?? 0) - (a.matchScore ?? a.matchPercentage ?? 0);
    });
    return sorted;
  }, [filteredRecipes, sortMode]);
  const groupedSections = useMemo(() => {
    if (isDailyRecommendation) {
      return [
        {
          key: 'dailyRecommendation',
          title: 'Gợi ý hôm nay',
          items: displayedRecipes,
        },
      ];
    }

    return [
      {
        key: 'readyNow',
        title: 'Nấu ngay',
        items: displayedRecipes.filter((recipe) => recipe.suggestionGroup === 'readyNow'),
      },
      {
        key: 'needsMore',
        title: 'Cần mua thêm',
        items: displayedRecipes.filter((recipe) => recipe.suggestionGroup !== 'readyNow'),
      },
    ].filter((section) => section.items.length > 0);
  }, [displayedRecipes, isDailyRecommendation]);

  async function searchRecipes(overrideIngredients?: string[]) {
    const ingredientsToUse = overrideIngredients ?? ingredients;

    setLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const routeHints = route.params?.ingredientHints ?? [];
      const ingredientHints = ingredientsToUse.map((name) => {
        const existing = routeHints.find(
          (hint) => (hint.name ?? '').toLowerCase() === name.toLowerCase(),
        );
        return existing ?? { name, confidence: null, foodItemId: null };
      });
      const results = await aiService.suggestRecipesEnhanced(buildRecipeSuggestionRequest({
        ingredients: ingredientsToUse,
        mode: route.params?.mode,
        availableFoodItemIds: route.params?.availableFoodItemIds,
        ingredientHints,
        maxResults: 12,
      }));
      setRecipes(results);
      if (results.length === 0) {
        setError('Không tìm thấy công thức nào phù hợp.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tìm công thức');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (route.params?.ingredients) {
      setIngredients(route.params.ingredients);
    }
  }, [route.params?.ingredients]);

  useEffect(() => {
    if (route.params?.recipes?.length) {
      setRecipes(route.params.recipes);
      setError(null);
      setLoading(false);
      return;
    }

    if ((route.params?.ingredients?.length ?? 0) > 0 || route.params?.mode === 'daily_recommendation') {
      void searchRecipes(route.params.ingredients);
    }
  }, [route.params?.recipes, route.params?.ingredients, route.params?.availableFoodItemIds, route.params?.ingredientHints, route.params?.mode]);

  const addIngredient = (ing?: string) => {
    const val = (ing ?? newIngredient).trim();
    if (val && !ingredients.includes(val)) {
      setIngredients([...ingredients, val]);
    }
    if (!ing) setNewIngredient('');
  };

  const toggleIngredient = (ing: string) => {
    if (ingredients.includes(ing)) {
      setIngredients(ingredients.filter((i) => i !== ing));
    } else {
      addIngredient(ing);
    }
  };

  const openRecipeDetail = (recipe: RecipeSuggestion) => {
    navigation.navigate('RecipeDetail', {
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      availableIngredients: recipe.availableIngredients,
      missingIngredients: recipe.missingIngredients,
      extraIngredients: recipe.extraIngredients,
      requiredIngredients: recipe.requiredIngredients,
      prepItems: recipe.prepItems,
      disclaimer: recipe.disclaimer,
    });
  };

  const renderRecipeGrid = (items: RecipeSuggestion[]) => (
    <View style={S.gridContainer}>
      {items.map((item, idx) => (
        <Animated.View
          key={item.recipeId}
          entering={FadeInDown.delay((idx + 1) * 100).springify()}
          style={S.gridItem}
        >
          <TouchableOpacity
            style={[S.gridCard, { backgroundColor: P.surfaceContainerHigh, borderColor: P.glassBorder }]}
            activeOpacity={0.8}
            onPress={() => openRecipeDetail(item)}
          >
            <View style={S.gridImageFrame}>
              <RecipeImage recipe={item} style={S.gridImageWrap} />
              <View style={S.glassOverlayTag}>
                <ThemedText style={S.tagTextSmall}>
                  {getRecipeBadgeLabel(item)}
                </ThemedText>
              </View>
            </View>
            <View style={S.gridCardBody}>
              <ThemedText style={[S.gridTitle, { color: P.onSurface }]} numberOfLines={2}>{item.recipeName}</ThemedText>
              <ThemedText style={[S.gridReason, { color: P.onSurfaceVariant }]} numberOfLines={2}>{getPrimaryReason(item)}</ThemedText>
              
              {/* Nutrition boxes matching detail screen style but smaller */}
              <View style={S.macrosRow}>
                <View style={[S.macroBox, { backgroundColor: P.primary + '15', borderColor: P.primary + '40' }]}>
                  <ThemedText style={[S.macroVal, { color: P.primary }]}>{Math.round(item.totalCalories)}</ThemedText>
                  <ThemedText style={S.macroLabel}>Kcal</ThemedText>
                </View>
                <View style={[S.macroBox, { backgroundColor: P.macroP + '15', borderColor: P.macroP + '40' }]}>
                  <ThemedText style={[S.macroVal, { color: P.macroP }]}>{Math.round(item.totalProtein)}g</ThemedText>
                  <ThemedText style={S.macroLabel}>Đạm</ThemedText>
                </View>
                <View style={[S.macroBox, { backgroundColor: P.macroC + '15', borderColor: P.macroC + '40' }]}>
                  <ThemedText style={[S.macroVal, { color: P.macroC }]}>{Math.round(item.totalCarbs)}g</ThemedText>
                  <ThemedText style={S.macroLabel}>Carb</ThemedText>
                </View>
                <View style={[S.macroBox, { backgroundColor: P.macroF + '15', borderColor: P.macroF + '40' }]}>
                  <ThemedText style={[S.macroVal, { color: P.macroF }]}>{Math.round(item.totalFat)}g</ThemedText>
                  <ThemedText style={S.macroLabel}>Béo</ThemedText>
                </View>
              </View>

              <View style={S.gridMetrics}>
                <View style={S.metric}>
                  <Ionicons name="time-outline" size={12} color={P.onSurfaceVariant} />
                  <ThemedText style={S.metricTextSmall}>{getRecipeTimeLabel(item)}</ThemedText>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );

  const renderSkeleton = () => (
    <View style={S.skeletonWrap}>
      {[1, 2, 3].map((key) => (
        <Animated.View
          key={key}
          style={S.skeletonCard}
          entering={FadeInDown.delay(key * 100)}
          exiting={FadeOut}
        />
      ))}
    </View>
  );

  return (
    <View style={[S.container, { backgroundColor: P.surface }]}>
      {/* ═══ Header ═══ */}
      <View
        pointerEvents="box-none"
        style={[S.header, { paddingTop: insets.top + 4, backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.glassBorder }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.iconBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={P.onSurface} />
        </TouchableOpacity>
        <ThemedText style={S.headerTitle}>
          {isDailyRecommendation ? 'Hôm nay nên ăn gì' : 'Gợi ý công thức'}
        </ThemedText>
        <View style={S.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingTop: insets.top + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* ═══ Search Section ═══ */}
        <View style={S.searchSection}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => ingredientInputRef.current?.focus()}
            style={[S.searchBox, { backgroundColor: P.surfaceContainerLowest, borderColor: P.glassBorder }]}
          >
            <Ionicons name="search" size={20} color={P.onSurfaceVariant} style={S.searchIcon} />
            <TextInput
              ref={ingredientInputRef}
              style={[S.searchInput, { color: P.onSurface }]}
              placeholder="Nhập nguyên liệu (VD: Thịt gà)"
              placeholderTextColor={P.onSurfaceVariant}
              value={newIngredient}
              onChangeText={setNewIngredient}
              onSubmitEditing={() => addIngredient()}
              returnKeyType="done"
              testID="recipe-ingredient-input"
            />
            {newIngredient.length > 0 && (
              <TouchableOpacity onPress={() => addIngredient()} style={S.addBtnInside}>
                <Ionicons name="add-circle" size={24} color={P.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>


        {/* ═══ Selected Ingredients Chips ═══ */}
        {ingredients.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.chipsScroll}
            style={S.chipsSection}
          >
            {ingredients.map((ing) => (
              <TouchableOpacity
                key={ing}
                onPress={() => toggleIngredient(ing)}
                style={[S.chipBadge, S.chipBadgeActive]}
              >
                <ThemedText style={[S.chipBadgeText, S.chipBadgeTextActive]}>
                  {ing}
                </ThemedText>
                <Ionicons name="close" size={14} color={P.onPrimary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={S.mainActionBtn}
          onPress={() => searchRecipes()}
          disabled={loading}
        >
          <ThemedText style={S.mainActionBtnText}>
            {loading ? 'Đang tìm...' : isDailyRecommendation ? 'Gợi ý món hôm nay' : 'Tìm kiếm công thức'}
          </ThemedText>
        </TouchableOpacity>

        {/* ═══ Results Section ═══ */}
        <View style={S.resultsWrap}>
          {loading ? (
            renderSkeleton()
          ) : error ? (
            <View style={S.center}>
              <MoChiInlineNotice mochiEvent="recipe_error" routeName="RecipeSuggestions" compact />
            </View>
          ) : recipes.length === 0 ? (
            <View style={S.centerEmpty}>
              <MoChiInlineNotice mochiEvent="recipe_empty" routeName="RecipeSuggestions" compact />
            </View>
          ) : (
            <>
              <MoChiInlineNotice mochiEvent="recipe_success" routeName="RecipeSuggestions" compact />
              <View style={S.sortChipsSection}>
                {SORT_OPTIONS.map((option) => {
                  const active = sortMode === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[S.sortChip, active && S.sortChipActive]}
                      onPress={() => setSortMode(option.key)}
                    >
                      <ThemedText style={[S.sortChipText, active && S.sortChipTextActive]}>
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {groupedSections.map((section) => (
                <View key={section.key} style={S.groupSection}>
                  <View style={S.exploreHeader}>
                    <ThemedText style={[S.exploreTitle, { color: P.onSurfaceVariant }]}>{section.title}</ThemedText>
                    <ThemedText style={[S.exploreLink, { color: P.primary }]}>{section.items.length} món</ThemedText>
                  </View>
                  {renderRecipeGrid(section.items)}
                </View>
              ))}
            </>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

export default RecipeSuggestionsScreen;

/* ═══ Styles ═══ */
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P_STATIC.surface },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 52,
    paddingTop: 4,
    paddingBottom: 10,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'BeVietnamPro_700Bold', fontSize: 18, color: P_STATIC.onSurface, letterSpacing: -0.2 },
  scrollContent: { paddingHorizontal: 20 },

  searchSection: { marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P_STATIC.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: P_STATIC.glassBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P_STATIC.onSurface,
    paddingVertical: 0,
  },
  addBtnInside: { marginLeft: 8 },

  chipsSection: { marginHorizontal: -20, marginBottom: 24 },
  chipsScroll: { paddingHorizontal: 20, gap: 12 },
  chipBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: P_STATIC.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipBadgeActive: { backgroundColor: P_STATIC.primary },
  chipBadgeText: { fontSize: 13, fontFamily: 'BeVietnamPro_600SemiBold', color: P_STATIC.onSurfaceVariant },
  chipBadgeTextActive: { color: P_STATIC.onPrimary },

  mainActionBtn: {
    backgroundColor: P_STATIC.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: P_STATIC.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  mainActionBtnText: { fontSize: 16, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.onPrimary },

  resultsWrap: {},
  sortChipsSection: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 16,
    gap: 8,
  },
  sortChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: P_STATIC.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: P_STATIC.glassBorder,
  },
  sortChipActive: {
    backgroundColor: P_STATIC.primary,
    borderColor: P_STATIC.primary,
  },
  sortChipText: { fontSize: 12, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.onSurfaceVariant },
  sortChipTextActive: { color: P_STATIC.onPrimary },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P_STATIC.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: P_STATIC.glassBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P_STATIC.onSurfaceVariant,
    lineHeight: 18,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P_STATIC.surfaceContainerLow,
  },

  /* Featured Card */
  featuredCard: {
    backgroundColor: P_STATIC.surfaceContainerHigh,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: P_STATIC.glassBorder,
    marginBottom: 32,
    shadowColor: P_STATIC.primary,
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    overflow: 'hidden',
  },
  featuredContent: { flexDirection: 'column' },
  featuredImageWrap: { height: 200, width: '100%', backgroundColor: P_STATIC.surfaceContainerLow },
  cardImageFull: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredDetails: { padding: 24, gap: 16 },
  aiBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P_STATIC.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  aiBadgeText: { fontSize: 10, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.primary, letterSpacing: 0.5 },
  featuredTitle: { fontSize: 26, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.onSurface, lineHeight: 32 },
  reasonText: { fontSize: 13, fontFamily: 'BeVietnamPro_500Medium', color: P_STATIC.onSurfaceVariant, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagSubBadge: {
    backgroundColor: P_STATIC.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: { fontSize: 11, fontFamily: 'BeVietnamPro_600SemiBold', color: '#96d59d' },
  metricsRow: { flexDirection: 'row', gap: 24, paddingVertical: 8 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: { fontSize: 13, fontFamily: 'BeVietnamPro_500Medium', color: P_STATIC.onSurfaceVariant },
  viewRecipeBtn: {
    width: '100%',
    backgroundColor: P_STATIC.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  viewRecipeBtnText: { fontSize: 15, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.onPrimary },

  /* Grid Area */
  groupSection: { gap: 16, marginBottom: 24 },
  exploreSection: { gap: 16 },
  exploreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exploreTitle: { fontSize: 18, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.onSurfaceVariant },
  exploreLink: { fontSize: 13, fontFamily: 'BeVietnamPro_600SemiBold', color: P_STATIC.primary },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '47%' },
  gridCard: {
    backgroundColor: P_STATIC.surfaceContainerHigh,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P_STATIC.glassBorder,
  },
  gridImageFrame: { height: 130, width: '100%', position: 'relative', backgroundColor: P_STATIC.surfaceContainerLow },
  gridImageWrap: { height: '100%', width: '100%' },
  glassOverlayTag: {
    position: 'absolute',
    bottom: 10, left: 10,
    backgroundColor: P_STATIC.primary + 'E6', // translucent primary
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
  },
  tagTextSmall: { fontSize: 9, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.onPrimary },
  gridCardBody: { padding: 12, gap: 8 },
  macrosRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  macroBox: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  macroVal: {
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  macroLabel: {
    fontSize: 8,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  gridTitle: { fontSize: 14, fontFamily: 'BeVietnamPro_700Bold', color: P_STATIC.onSurface, lineHeight: 20 },
  gridReason: { fontSize: 11, fontFamily: 'BeVietnamPro_500Medium', color: P_STATIC.onSurfaceVariant, lineHeight: 16 },
  gridMetrics: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTextSmall: { fontSize: 11, fontFamily: 'BeVietnamPro_500Medium', color: P_STATIC.onSurfaceVariant },

  /* Empty & Loading States */
  centerEmpty: { alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 16 },
  emptyText: { marginTop: 16, textAlign: 'center', color: P_STATIC.onSurfaceVariant, fontSize: 14, fontFamily: 'BeVietnamPro_500Medium', lineHeight: 22 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 16 },
  errorText: { marginTop: 12, color: P_STATIC.danger, fontFamily: 'BeVietnamPro_600SemiBold', textAlign: 'center' },
  skeletonWrap: { gap: 16 },
  skeletonCard: { height: 180, borderRadius: 24, backgroundColor: P_STATIC.surfaceContainerHigh, opacity: 0.5 },
});
