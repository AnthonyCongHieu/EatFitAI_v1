import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Screen from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService } from '../../../services/aiService';
import type { RootStackParamList } from '../../types';
import type { RecipeSuggestion } from '../../../types/aiEnhanced';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecipeSuggestions'>;

const POPULAR_INGREDIENTS = [
  'Trứng',
  'Thịt gà',
  'Thịt bò',
  'Cà chua',
  'Khoai tây',
  'Hành tây',
  'Tỏi',
  'Gạo',
  'Đậu phụ',
];

const P = {
  primary: '#4be277',
  primaryContainer: '#22c55e',
  surface: '#0e1322',
  surfaceContainerLow: '#161b2b',
  surfaceContainerHigh: 'rgba(37, 41, 58, 0.7)',
  surfaceContainerLowest: '#090e1c',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  onPrimary: '#003915',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHeader: 'rgba(22, 27, 43, 0.6)',
  danger: '#ffb4ab',
};

const DUMMY_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDkPxIplDyeONp_vJiPgRP9EW8RoZM3JbhwNM_m-RuN4-VbxdI0wZ7GSo-ZaJC1FiQg0qZAaXoa5bDcNN7yFtfjv0COjoDcA7mV2jJxznij2k8eFuar5HgcugqzCUrUw0DDBN7LHa9PV9WHN7XtXYo16jZpLXq9Yp41P2LoigkRXdviz1dDzRD2ciDCo4kb5d4PxtXlFpLSu6Y9EKlH2nf8ZdRPtV-KBl_Me3V7z0vo6v7Z5kAb8pgQgPy-GW_HNrY3GrbxpKaVAVQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAukILvQNoq71Oq5m173g7C5FBqvtI4EI6F99iYC5D_rxoimx2XLrR-naIwXyc7HU8gwk-lW_RVQcIEB03s0vU-6VN6qLrt3B-sLVM9or1_aHo3vcxXoSLiqM0NHbSpz6x3eqN7hHGNs2ZFFFSYbiuN8OylajF-6_keIerdbIye7Vf49E4WK21rRkzottpDUNOK4OsMS-N1F4XIFvx47oE4MqL-Xn7WTjv7kS4kjZ6I5wFX7BsoKhsLRtaxWz94VwNMuvw6mIAN064",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB3hPK0Hob1eHqbdkBE-ckh0GdR84ek_HNKh1Pl0wKDWHrNshSGfOc6lB38EvpD-FKGK5hvdJWtDO5M7M9s377sx1bEQvuYk24Cv3B52ogRpHPnUMr4--h6JirsfpGJB-PZ8nhx5GTmqj_i7w0VYkHnx5w62gFzhdm3luXM8T2MA6UB_HFl4waKj-sxAaGpX6-Y1xtgGVDcgUTdiFsGivqmp7P69DgEEx75Z1ZSRAzQTX-J4X06yyLd7xANQjxxTLuoNyF5FASMXWg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC1oYs0RykK8I-wEhX1LQnzONtN6EiE1cvMhm5W145lb1jvI8giPgzWHB5khpzmBAqWhHynXB_wBGubDuPqE_Kr46LYUwkaTQfvxBRTMH_1wHv0IdVwIKkQNfrOAB6FMWNXTbPwxrVRMBi2Tl8-BWHpqVI9P39HwRi3PxbmCK5XetFuYsNdcyMe4P-hbbISlEt7vi08RVlOKucOPh4OY4bPfosnfjMju8Qt4jKXoWLgB3cyqT9JbGN0LCSMJcL2xIgewveqIIhDyLw"
];

const RecipeSuggestionsScreen = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>(
    route.params?.recipes ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const featuredRecipe = recipes[0] ?? null;

  async function searchRecipes(overrideIngredients?: string[]) {
    const ingredientsToUse = overrideIngredients ?? ingredients;
    if (ingredientsToUse.length === 0) return;

    setLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const results = await aiService.suggestRecipes(ingredientsToUse);
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

    if ((route.params?.ingredients?.length ?? 0) > 0) {
      void searchRecipes(route.params.ingredients);
    }
  }, [route.params?.recipes, route.params?.ingredients]);

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
    <View style={S.container}>
      {/* ═══ Header ═══ */}
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <View style={S.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={P.primary} />
          </TouchableOpacity>
          <ThemedText style={S.headerTitle}>Gợi ý công thức</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingTop: insets.top + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ Search Section ═══ */}
        <View style={S.searchSection}>
          <View style={S.searchBox}>
            <Ionicons name="search" size={20} color={P.onSurfaceVariant} style={S.searchIcon} />
            <TextInput
              style={S.searchInput}
              placeholder="Nhập nguyên liệu (VD: Thịt gà)..."
              placeholderTextColor={P.onSurfaceVariant}
              value={newIngredient}
              onChangeText={setNewIngredient}
              onSubmitEditing={() => addIngredient()}
            />
            {newIngredient.length > 0 && (
              <TouchableOpacity onPress={() => addIngredient()} style={S.addBtnInside}>
                <Ionicons name="add-circle" size={24} color={P.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ═══ Categories / Ingredients Chips ═══ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.chipsScroll}
          style={S.chipsSection}
        >
          {POPULAR_INGREDIENTS.map((ing) => {
            const isActive = ingredients.includes(ing);
            return (
              <TouchableOpacity
                key={ing}
                onPress={() => toggleIngredient(ing)}
                style={[S.chipBadge, isActive && S.chipBadgeActive]}
              >
                <ThemedText style={[S.chipBadgeText, isActive && S.chipBadgeTextActive]}>
                  {ing}
                </ThemedText>
                {isActive && (
                  <Ionicons name="close" size={14} color={P.onSurface} style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action Button If Ingredients Exist */}
        {ingredients.length > 0 && (
          <TouchableOpacity
            style={S.mainActionBtn}
            onPress={() => searchRecipes()}
            disabled={loading}
          >
            <ThemedText style={S.mainActionBtnText}>
              {loading ? 'Đang tìm...' : 'Khám phá công thức'}
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* ═══ Results Section ═══ */}
        <View style={S.resultsWrap}>
          {loading ? (
            renderSkeleton()
          ) : error ? (
            <View style={S.center}>
              <Ionicons name="alert-circle" size={48} color={P.danger} />
              <ThemedText style={S.errorText}>{error}</ThemedText>
            </View>
          ) : recipes.length === 0 ? (
            <View style={S.centerEmpty}>
              <Ionicons name="restaurant-outline" size={64} color={P.onSurfaceVariant} />
              <ThemedText style={S.emptyText}>
                Hãy nhập nguyên liệu phía trên để{'\n'}chúng tôi lên thực đơn cho bạn!
              </ThemedText>
            </View>
          ) : (
            <>
              {featuredRecipe && (
              <Animated.View entering={FadeInDown.springify()} style={S.featuredCard}>
                <View style={S.featuredContent}>
                  {/* Left Side / Top - Image Space */}
                  <View style={S.featuredImageWrap}>
                    <Image source={{ uri: DUMMY_IMAGES[0] }} style={S.cardImageFull} />
                  </View>
                  {/* Right Side / Bottom - Details */}
                  <View style={S.featuredDetails}>
                    <View style={S.aiBadge}>
                      <Ionicons name="sparkles" size={12} color={P.primary} />
                      <ThemedText style={S.aiBadgeText}>AI RECOMMENDED FOR YOU</ThemedText>
                    </View>
                    <ThemedText style={S.featuredTitle} numberOfLines={2}>
                      {featuredRecipe.recipeName}
                    </ThemedText>
                    <View style={S.tagsRow}>
                      <View style={S.tagSubBadge}>
                        <ThemedText style={S.tagText}>Trùng {recipes[0]?.matchedIngredientsCount}/{recipes[0]?.totalIngredientsCount}</ThemedText>
                      </View>
                      <View style={S.tagSubBadge}>
                        <ThemedText style={S.tagText}>{Math.round(recipes[0]?.matchPercentage || 0)}% Phù hợp</ThemedText>
                      </View>
                    </View>
                    <View style={S.metricsRow}>
                      <View style={S.metric}>
                        <Ionicons name="time-outline" size={14} color={P.onSurfaceVariant} />
                        <ThemedText style={S.metricText}>~20m</ThemedText>
                      </View>
                      <View style={S.metric}>
                        <Ionicons name="flame-outline" size={14} color={P.onSurfaceVariant} />
                        <ThemedText style={S.metricText}>{Math.round(featuredRecipe.totalCalories || 0)} kcal</ThemedText>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={S.viewRecipeBtn}
                      onPress={() => navigation.navigate('RecipeDetail', { recipeId: featuredRecipe.recipeId, recipeName: featuredRecipe.recipeName })}
                    >
                      <ThemedText style={S.viewRecipeBtnText}>Xem Công Thức</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
              )}

              {/* Grid 2 Columns for Explore More */}
              {recipes.length > 1 && (
                <View style={S.exploreSection}>
                  <View style={S.exploreHeader}>
                    <ThemedText style={S.exploreTitle}>Khám phá thêm</ThemedText>
                    <ThemedText style={S.exploreLink}>Xem tất cả</ThemedText>
                  </View>
                  <View style={S.gridContainer}>
                    {recipes.slice(1).map((item, idx) => (
                      <Animated.View
                        key={item.recipeId}
                        entering={FadeInDown.delay((idx + 1) * 100).springify()}
                        style={S.gridItem}
                      >
                        <TouchableOpacity
                          style={S.gridCard}
                          activeOpacity={0.8}
                          onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipeId, recipeName: item.recipeName })}
                        >
                          <View style={S.gridImageWrap}>
                            {/* Cycle through dummy images */}
                            <Image source={{ uri: DUMMY_IMAGES[(idx + 1) % 4] }} style={S.cardImageFull} />
                            <View style={S.glassOverlayTag}>
                              <ThemedText style={S.tagTextSmall}>{Math.round(item.matchPercentage)}% MATCH</ThemedText>
                            </View>
                          </View>
                          <View style={S.gridCardBody}>
                            <ThemedText style={S.gridTitle} numberOfLines={2}>{item.recipeName}</ThemedText>
                            <View style={S.gridMetrics}>
                              <View style={S.metric}>
                                <Ionicons name="time-outline" size={12} color={P.onSurfaceVariant} />
                                <ThemedText style={S.metricTextSmall}>20m</ThemedText>
                              </View>
                              <View style={S.metric}>
                                <Ionicons name="flame-outline" size={12} color={P.primary} />
                                <ThemedText style={S.metricTextSmall}>{Math.round(item.totalCalories)}</ThemedText>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              )}
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
  container: { flex: 1, backgroundColor: P.surface },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    backgroundColor: P.glassHeader,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: P.onSurface },
  scrollContent: { paddingHorizontal: 20 },

  searchSection: { marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: P.glassBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Inter_500Medium', color: P.onSurface },
  addBtnInside: { marginLeft: 8 },

  chipsSection: { marginHorizontal: -20, marginBottom: 24 },
  chipsScroll: { paddingHorizontal: 20, gap: 12 },
  chipBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: P.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipBadgeActive: { backgroundColor: P.primary },
  chipBadgeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: P.onSurfaceVariant },
  chipBadgeTextActive: { color: P.onPrimary },

  mainActionBtn: {
    backgroundColor: P.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: P.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  mainActionBtnText: { fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: P.onPrimary },

  resultsWrap: { minHeight: 400 },

  /* Featured Card */
  featuredCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: P.glassBorder,
    marginBottom: 32,
    shadowColor: P.primary,
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    overflow: 'hidden',
  },
  featuredContent: { flexDirection: 'column' },
  featuredImageWrap: { height: 200, width: '100%', backgroundColor: P.surfaceContainerLow },
  cardImageFull: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredDetails: { padding: 24, gap: 16 },
  aiBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  aiBadgeText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', color: P.primary, letterSpacing: 0.5 },
  featuredTitle: { fontSize: 26, fontFamily: 'Inter_800ExtraBold', color: P.onSurface, lineHeight: 32 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagSubBadge: {
    backgroundColor: P.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#96d59d' },
  metricsRow: { flexDirection: 'row', gap: 24, paddingVertical: 8 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: P.onSurfaceVariant },
  viewRecipeBtn: {
    width: '100%',
    backgroundColor: P.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  viewRecipeBtnText: { fontSize: 15, fontFamily: 'Inter_800ExtraBold', color: P.onPrimary },

  /* Grid Area */
  exploreSection: { gap: 16 },
  exploreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exploreTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: P.onSurfaceVariant },
  exploreLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: P.primary },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '47%' },
  gridCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  gridImageWrap: { height: 130, width: '100%', position: 'relative' },
  glassOverlayTag: {
    position: 'absolute',
    bottom: 10, left: 10,
    backgroundColor: P.primary + 'E6', // translucent primary
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
  },
  tagTextSmall: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', color: P.onPrimary },
  gridCardBody: { padding: 12, gap: 8 },
  gridTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: P.onSurface, lineHeight: 20 },
  gridMetrics: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTextSmall: { fontSize: 11, fontFamily: 'Inter_500Medium', color: P.onSurfaceVariant },

  /* Empty & Loading States */
  centerEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { marginTop: 16, textAlign: 'center', color: P.onSurfaceVariant, fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 22 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  errorText: { marginTop: 12, color: P.danger, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  skeletonWrap: { gap: 16 },
  skeletonCard: { height: 180, borderRadius: 24, backgroundColor: P.surfaceContainerHigh, opacity: 0.5 },
});
