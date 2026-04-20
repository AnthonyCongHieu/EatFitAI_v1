import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
  ImageBackground,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecipeDetail'>;

type AiCookingInstructions = {
  steps: string[];
  cookingTime?: string;
  difficulty?: string;
  isLoading: boolean;
  error?: string;
};

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
  macroC: '#fbbf24',
  macroP: '#34d399',
  macroF: '#f87171',
};

const DUMMY_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDkPxIplDyeONp_vJiPgRP9EW8RoZM3JbhwNM_m-RuN4-VbxdI0wZ7GSo-ZaJC1FiQg0qZAaXoa5bDcNN7yFtfjv0COjoDcA7mV2jJxznij2k8eFuar5HgcugqzCUrUw0DDBN7LHa9PV9WHN7XtXYo16jZpLXq9Yp41P2LoigkRXdviz1dDzRD2ciDCo4kb5d4PxtXlFpLSu6Y9EKlH2nf8ZdRPtV-KBl_Me3V7z0vo6v7Z5kAb8pgQgPy-GW_HNrY3GrbxpKaVAVQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAukILvQNoq71Oq5m173g7C5FBqvtI4EI6F99iYC5D_rxoimx2XLrR-naIwXyc7HU8gwk-lW_RVQcIEB03s0vU-6VN6qLrt3B-sLVM9or1_aHo3vcxXoSLiqM0NHbSpz6x3eqN7hHGNs2ZFFFSYbiuN8OylajF-6_keIerdbIye7Vf49E4WK21rRkzottpDUNOK4OsMS-N1F4XIFvx47oE4MqL-Xn7WTjv7kS4kjZ6I5wFX7BsoKhsLRtaxWz94VwNMuvw6mIAN064",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB3hPK0Hob1eHqbdkBE-ckh0GdR84ek_HNKh1Pl0wKDWHrNshSGfOc6lB38EvpD-FKGK5hvdJWtDO5M7M9s377sx1bEQvuYk24Cv3B52ogRpHPnUMr4--h6JirsfpGJB-PZ8nhx5GTmqj_i7w0VYkHnx5w62gFzhdm3luXM8T2MA6UB_HFl4waKj-sxAaGpX6-Y1xtgGVDcgUTdiFsGivqmp7P69DgEEx75Z1ZSRAzQTX-J4X06yyLd7xANQjxxTLuoNyF5FASMXWg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC1oYs0RykK8I-wEhX1LQnzONtN6EiE1cvMhm5W145lb1jvI8giPgzWHB5khpzmBAqWhHynXB_wBGubDuPqE_Kr46LYUwkaTQfvxBRTMH_1wHv0IdVwIKkQNfrOAB6FMWNXTbPwxrVRMBi2Tl8-BWHpqVI9P39HwRi3PxbmCK5XetFuYsNdcyMe4P-hbbISlEt7vi08RVlOKucOPh4OY4bPfosnfjMju8Qt4jKXoWLgB3cyqT9JbGN0LCSMJcL2xIgewveqIIhDyLw"
];

const RecipeDetailScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInstructions, setAiInstructions] = useState<AiCookingInstructions>({
    steps: [],
    isLoading: false,
  });
  const [showAddToDiarySheet, setShowAddToDiarySheet] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await aiService.getRecipeDetail(route.params.recipeId);
        setRecipe(data);
      } catch (e) {
        setError('Không thể tải chi tiết công thức. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [route.params.recipeId]);

  useEffect(() => {
    if (!recipe || (recipe.instructions && recipe.instructions.length > 0)) return;

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
        setAiInstructions({
          steps: [],
          isLoading: false,
          error: 'Không thể tạo hướng dẫn nấu',
        });
      }
    };
    fetchAiInstructions();
  }, [recipe]);

  const handleAddToDiary = async (mealTypeId: MealTypeId, servings: number) => {
    if (!recipe) return;
    try {
      const formData = new FormData();
      formData.append('foodName', recipe.recipeName);
      formData.append('description', recipe.description || `Công thức: ${recipe.recipeName}`);
      formData.append('caloriesPer100', String(recipe.totalCalories ?? 0));
      formData.append('proteinPer100', String(recipe.totalProtein ?? 0));
      formData.append('carbPer100', String(recipe.totalCarbs ?? 0));
      formData.append('fatPer100', String(recipe.totalFat ?? 0));
      formData.append('unitType', 'g');

      const createdItem = await foodService.createUserFoodItem(formData);
      const totalGrams = 100 * servings;
      const ratio = totalGrams / 100;

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

      await foodService.addDiaryEntryFromUserFoodItem(diaryPayload);
      await invalidateDiaryQueries(queryClient);

      Toast.show({
        type: 'success',
        text1: 'Đã thêm vào nhật ký',
        text2: `${recipe.recipeName} (${servings} khẩu phần)`,
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Thêm thất bại',
        text2: 'Vui lòng thử lại',
      });
    }
  };

  const TopHeader = () => (
    <View style={[S.header, { paddingTop: insets.top + 10 }]}>
      <Pressable style={S.iconBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={P.onSurface} />
      </Pressable>
      <Pressable style={S.iconBtn}>
        <Ionicons name="heart-outline" size={24} color={P.onSurface} />
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={S.center}>
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={S.container}>
        <TopHeader />
        <View style={S.center}>
          <ThemedText style={{ color: P.danger }}>{error || 'Không tìm thấy công thức.'}</ThemedText>
        </View>
      </View>
    );
  }

  const imageIdx = Math.abs((route.params.recipeId || 0)) % DUMMY_IMAGES.length;

  return (
    <View style={S.container}>
      {/* Absolute Add Button at bottom safely above tabs */}
      <Animated.View entering={FadeInUp.delay(500)} style={[S.floatBottomBtn, { bottom: insets.bottom + 20 }]}>
        <Pressable
          style={S.addBtn}
          onPress={() => setShowAddToDiarySheet(true)}
        >
          <ThemedText style={S.addBtnText}>Thêm vào nhật ký</ThemedText>
          <Ionicons name="add" size={24} color={P.onPrimary} />
        </Pressable>
      </Animated.View>

      <TopHeader />

      <ScrollView contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={S.heroContainer}>
          <ImageBackground source={{ uri: DUMMY_IMAGES[imageIdx] }} style={S.heroImage}>
            <LinearGradient colors={['transparent', P.surface]} style={S.gradientMask} />
          </ImageBackground>
          <View style={S.heroTextWrap}>
            <ThemedText style={S.heroMainTitle} numberOfLines={3}>{recipe.recipeName}</ThemedText>
            {aiInstructions.cookingTime && (
              <View style={S.badgeWrap}>
                <Ionicons name="time" size={14} color={P.primary} />
                <ThemedText style={S.badgeText}>{aiInstructions.cookingTime}</ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={S.mainCanvas}>
          {/* Nutrition Row */}
          <Animated.View entering={FadeInDown.delay(100)} style={S.macrosRow}>
            <View style={[S.macroBox, { backgroundColor: P.primary + '15', borderColor: P.primary + '40' }]}>
              <ThemedText style={[S.macroVal, { color: P.primary }]}>{Math.round(recipe.totalCalories!)}</ThemedText>
              <ThemedText style={S.macroLabel}>Kcal</ThemedText>
            </View>
            <View style={[S.macroBox, { backgroundColor: P.macroP + '15', borderColor: P.macroP + '40' }]}>
              <ThemedText style={[S.macroVal, { color: P.macroP }]}>{Math.round(recipe.totalProtein!)}g</ThemedText>
              <ThemedText style={S.macroLabel}>Đạm</ThemedText>
            </View>
            <View style={[S.macroBox, { backgroundColor: P.macroC + '15', borderColor: P.macroC + '40' }]}>
              <ThemedText style={[S.macroVal, { color: P.macroC }]}>{Math.round(recipe.totalCarbs!)}g</ThemedText>
              <ThemedText style={S.macroLabel}>Carb</ThemedText>
            </View>
            <View style={[S.macroBox, { backgroundColor: P.macroF + '15', borderColor: P.macroF + '40' }]}>
              <ThemedText style={[S.macroVal, { color: P.macroF }]}>{Math.round(recipe.totalFat!)}g</ThemedText>
              <ThemedText style={S.macroLabel}>Béo</ThemedText>
            </View>
          </Animated.View>

          {/* Description */}
          {recipe.description && (
            <Animated.View entering={FadeInDown.delay(200)} style={S.glassCard}>
              <ThemedText style={S.sectionTitle}>Giới thiệu</ThemedText>
              <ThemedText style={S.bodyText}>{recipe.description}</ThemedText>
            </Animated.View>
          )}

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300)} style={S.glassCard}>
              <ThemedText style={S.sectionTitle}>Nguyên liệu</ThemedText>
              <View style={S.ingredientsWrap}>
                {recipe.ingredients.map((ing, i) => (
                  <View key={i} style={S.ingredientRow}>
                    <View style={S.ingDot} />
                    <ThemedText style={S.bodyTextItem}>{ing.foodName}</ThemedText>
                    <ThemedText style={S.bodyTextWeight}>{ing.grams}g</ThemedText>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Cooking Instructions */}
          <Animated.View entering={FadeInDown.delay(400)} style={S.glassCard}>
            <ThemedText style={S.sectionTitle}>Hướng dẫn nấu</ThemedText>
            
            {aiInstructions.isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
                <ActivityIndicator size="small" color={P.primary} />
                <ThemedText style={{ marginLeft: 10, color: P.onSurfaceVariant, fontSize: 13 }}>
                  AI đang viết công thức...
                </ThemedText>
              </View>
            ) : aiInstructions.error ? (
              <ThemedText style={{ color: P.danger, fontSize: 13 }}>{aiInstructions.error}</ThemedText>
            ) : (
              <View style={S.stepsWrap}>
                {(recipe.instructions?.length ? recipe.instructions : aiInstructions.steps).map((step: string, i: number) => (
                  <View key={i} style={S.stepRow}>
                    <View style={S.stepNumberWrap}>
                      <ThemedText style={S.stepNumberText}>{i + 1}</ThemedText>
                    </View>
                    <ThemedText style={S.stepContentText}>{step}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Video Guide */}
          <Animated.View entering={FadeInDown.delay(500)} style={S.glassCard}>
            <ThemedText style={S.sectionTitle}>Video hướng dẫn</ThemedText>
            <Pressable
              onPress={() => Linking.openURL(recipe.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`cách nấu ${recipe.recipeName}`)}`)}
              style={({ pressed }) => [S.videoBox, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={S.videoIconBg}>
                <Ionicons name="play" size={24} color="#ef4444" />
              </View>
              <View style={S.videoTextWrap}>
                <ThemedText style={S.videoTitle}>{recipe.videoUrl ? 'Xem video hướng dẫn' : 'Tìm video trên YouTube'}</ThemedText>
                <ThemedText style={S.videoSub}>Học cách nấu trực quan</ThemedText>
              </View>
              <Ionicons name="open-outline" size={20} color={P.onSurfaceVariant} />
            </Pressable>
          </Animated.View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {recipe && (
        <AddRecipeToDiarySheet
          visible={showAddToDiarySheet}
          onClose={() => setShowAddToDiarySheet(false)}
          recipeName={recipe.recipeName}
          nutrition={{ calories: recipe.totalCalories, protein: recipe.totalProtein, carbs: recipe.totalCarbs, fat: recipe.totalFat }}
          onConfirm={handleAddToDiary}
        />
      )}
    </View>
  );
};

export default RecipeDetailScreen;

/* ═══ Styles ═══ */
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.surface },
  center: { flex: 1, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 15,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: P.glassHeader,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: P.glassBorder,
  },

  scrollContent: { paddingBottom: 60 },
  
  heroContainer: { width: '100%', height: 350, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gradientMask: { ...StyleSheet.absoluteFillObject },
  heroTextWrap: {
    position: 'absolute', bottom: 20, left: 24, right: 24, gap: 12
  },
  heroMainTitle: { fontSize: 32, fontFamily: 'Inter_800ExtraBold', color: P.onSurface, lineHeight: 40 },
  badgeWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: P.surfaceContainerHigh,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: P.glassBorder
  },
  badgeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: P.onSurface },

  mainCanvas: { paddingHorizontal: 20, gap: 16 },

  macrosRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 8 },
  macroBox: {
    flex: 1, borderRadius: 16, paddingVertical: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 2
  },
  macroVal: { fontSize: 16, fontFamily: 'Inter_800ExtraBold' },
  macroLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: P.onSurfaceVariant },

  glassCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24, padding: 20, gap: 12,
    borderWidth: 1, borderColor: P.glassBorder,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: P.onSurface, marginBottom: 4 },
  bodyText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: P.onSurfaceVariant, lineHeight: 22 },

  ingredientsWrap: { gap: 10 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.primary },
  bodyTextItem: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: P.onSurface },
  bodyTextWeight: { fontSize: 14, fontFamily: 'Inter_700Bold', color: P.primary },

  stepsWrap: { gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumberWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: P.primary + '20',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.primary + '40',
    marginTop: 2
  },
  stepNumberText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: P.primary },
  stepContentText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: P.onSurfaceVariant, lineHeight: 22 },

  videoBox: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: P.surfaceContainerLowest, padding: 14, borderRadius: 16 },
  videoIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  videoTextWrap: { flex: 1 },
  videoTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: P.onSurface },
  videoSub: { fontSize: 12, fontFamily: 'Inter_500Medium', color: P.onSurfaceVariant },

  floatBottomBtn: {
    position: 'absolute', left: 24, right: 24, zIndex: 100,
    shadowColor: P.primary, shadowOpacity: 0.4, shadowRadius: 15, elevation: 15,
  },
  addBtn: {
    backgroundColor: P.primary, borderRadius: 99,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18,
  },
  addBtnText: { fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: P.onPrimary },
});
