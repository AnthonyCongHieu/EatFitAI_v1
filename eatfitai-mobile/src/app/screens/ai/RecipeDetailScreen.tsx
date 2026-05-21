import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAppToast } from '../../../utils/showAppToast';

import { ThemedText } from '../../../components/ThemedText';
import { aiService } from '../../../services/aiService';
import { foodService } from '../../../services/foodService';
import { invalidateDiaryQueries } from '../../../services/diaryFlowService';
import { diaryService } from '../../../services/diaryService';
import RecipeVisual from '../../../components/recipe/RecipeVisual';
import {
  buildRecipeIngredientRows,
  formatRecipeSourceLabel,
  hasDetailHeroVisual,
  type IngredientAvailabilityStatus,
} from '../../../components/recipe/recipeVisuals';
import type { RootStackParamList } from '../../types';
import type { RecipeDetail } from '../../../types/aiEnhanced';
import type { MealTypeId } from '../../../types';
import { AddRecipeToDiarySheet } from '../../../components/recipe/AddRecipeToDiarySheet';
import { usePostFirstLogNotificationPrompt } from '../../../hooks/usePostFirstLogNotificationPrompt';
import MoChiScreenState from '../../../features/mochi/MoChiScreenState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecipeDetail'>;

type AiCookingInstructions = {
  prepItems?: string[];
  seasonings?: string[];
  cookingMethod?: string;
  steps: string[];
  cookingTimeMinutes?: number;
  difficulty?: string;
  tips?: string[];
  sourceUrls?: string[];
  youtubeVideo?: RecipeDetail['youtubeVideo'];
  guideStatus?: string;
  isLoading: boolean;
  error?: string;
};

const P = {
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

const DEFAULT_RECIPE_DISCLAIMER =
  'Gợi ý chỉ mang tính tham khảo; không phải khuyến nghị của chuyên gia dinh dưỡng, bác sĩ hoặc đầu bếp chuyên nghiệp.';

const FLOATING_CTA_BOTTOM = 16;
const FLOATING_CTA_HEIGHT = 56;
const SCROLL_BOTTOM_GAP = 48;

const getIngredientStatusMeta = (status: IngredientAvailabilityStatus) => {
  if (status === 'available') {
    return { label: 'Đã có', icon: 'checkmark' as const, tone: P.primary };
  }
  if (status === 'missing') {
    return { label: 'Còn thiếu', icon: 'close' as const, tone: P.danger };
  }
  if (status === 'extra') {
    return { label: 'Chưa dùng trong món', icon: 'add' as const, tone: P.macroC };
  }
  return { label: 'Cần chuẩn bị', icon: 'ellipse' as const, tone: P.onSurfaceVariant };
};





const RecipeDetailScreen = (): React.ReactElement => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { promptIfFirstLog } = usePostFirstLogNotificationPrompt();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInstructions, setAiInstructions] = useState<AiCookingInstructions>({
    steps: [],
    isLoading: false,
  });
  const [showAddToDiarySheet, setShowAddToDiarySheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    setScrolled(y > 20);
  }, []);

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
    if (!recipe) return;

    const fetchAiInstructions = async () => {
      setAiInstructions((prev) => ({
        ...prev,
        prepItems: route.params.prepItems ?? prev.prepItems,
        seasonings: recipe.seasonings ?? prev.seasonings,
        cookingMethod: recipe.cookingMethod ?? prev.cookingMethod,
        steps: recipe.instructions ?? prev.steps,
        sourceUrls: recipe.sourceUrls ?? prev.sourceUrls,
        youtubeVideo: recipe.youtubeVideo ?? prev.youtubeVideo,
        guideStatus: recipe.guideStatus ?? prev.guideStatus,
        isLoading: true,
        error: undefined,
      }));
      try {
        const result = await aiService.getRecipeCookingGuide(recipe.recipeId);
        setAiInstructions({
          prepItems: result.prepItems,
          seasonings: result.seasonings,
          cookingMethod: result.cookingMethod,
          steps: result.steps,
          cookingTimeMinutes: result.cookingTimeMinutes,
          difficulty: result.difficulty,
          tips: result.tips,
          sourceUrls: result.sourceUrls,
          youtubeVideo: result.youtubeVideo,
          guideStatus: result.guideStatus,
          isLoading: false,
        });
      } catch (e) {
        if (recipe.instructions?.length) {
          setAiInstructions((prev) => ({
            ...prev,
            steps: recipe.instructions ?? [],
            seasonings: recipe.seasonings ?? [],
            cookingMethod: recipe.cookingMethod,
            isLoading: false,
            error: undefined,
            guideStatus: recipe.guideStatus ?? 'stored',
          }));
          return;
        }

        try {
          const result = await aiService.getCookingInstructions(
            recipe.recipeName,
            recipe.ingredients || [],
            recipe.description,
          );
          setAiInstructions({
            prepItems: result.prepItems,
            seasonings: result.seasonings,
            cookingMethod: result.cookingMethod,
            steps: result.steps,
            difficulty: result.difficulty,
            isLoading: false,
            guideStatus: 'fallback',
          });
        } catch {
          setAiInstructions({
            steps: [],
            isLoading: false,
            error: 'Không thể tải hướng dẫn nấu',
          });
        }
      }
    };
    fetchAiInstructions();
  }, [recipe]);

  const handleAddToDiary = async (mealTypeId: MealTypeId, servings: number) => {
    if (!recipe) return;
    try {
      const totalGrams = Math.max(1, (recipe.totalGrams || 100) * servings);

      if (route.params.diaryEntryId) {
        await diaryService.updateEntry(route.params.diaryEntryId, {
          grams: totalGrams,
        });
      } else {
        await foodService.addDiaryEntryFromRecipe({
          mealTypeId,
          recipeId: recipe.recipeId,
          grams: totalGrams,
          note: `Từ công thức: ${recipe.recipeName}`,
        });
      }

      await invalidateDiaryQueries(queryClient);
      // A1.3: Notification prompt after first diary log (only for new entries)
      if (!route.params.diaryEntryId) {
        promptIfFirstLog();
      }

      showAppToast({
        type: 'success',
        text1: route.params.diaryEntryId ? 'Đã cập nhật khẩu phần' : 'Đã thêm vào nhật ký',
        text2: `${recipe.recipeName} (${servings} khẩu phần)`,
      });
      setShowAddToDiarySheet(false);
      navigation.goBack();
    } catch (err: any) {
      showAppToast({
        type: 'error',
        text1: 'Thêm thất bại',
        text2: 'Vui lòng thử lại',
      });
    }
  };

  const TopHeader = () => (
    <>
      {/* ═══ Top Gradient Overlay for Header Contrast ═══ */}
      <LinearGradient
        colors={['rgba(5, 7, 13, 0.7)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: insets.top + 80, zIndex: 40 }]}
        pointerEvents="none"
      />

      {/* ═══ Top App Bar ═══ */}
      <View style={[
        S.header,
        { paddingTop: insets.top + 4 },
        scrolled && {
          backgroundColor: P.surface,
          borderBottomWidth: 1,
          borderBottomColor: P.glassBorder,
        }
      ]}>
        <Pressable style={S.iconBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={P.onSurface} />
        </Pressable>
        <ThemedText style={S.headerTitle}>Chi tiết công thức</ThemedText>
        <Pressable style={S.iconBtn} hitSlop={12}>
          <Ionicons name="heart-outline" size={22} color={P.onSurface} />
        </Pressable>
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={S.center}>
        <MoChiScreenState
          mochiEvent="recipe_searching"
          title="Đang tải công thức"
          message="MoChi đang chuẩn bị nguyên liệu và hướng dẫn nấu."
          showSpinner
          variant="screen"
        />
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

  const guideSteps = aiInstructions.steps.length > 0
    ? aiInstructions.steps
    : recipe.instructions ?? [];
  const prepItems = aiInstructions.prepItems?.length
    ? aiInstructions.prepItems
    : route.params.prepItems ?? [];
  const seasonings = aiInstructions.seasonings?.length
    ? aiInstructions.seasonings
    : recipe.seasonings ?? [];
  const cookingMethod = aiInstructions.cookingMethod || recipe.cookingMethod || undefined;
  const availableIngredients = route.params.availableIngredients ?? [];
  const missingIngredients = route.params.missingIngredients ?? [];
  const requiredIngredients = route.params.requiredIngredients?.length
    ? route.params.requiredIngredients
    : recipe.requiredIngredients?.length
      ? recipe.requiredIngredients
      : recipe.ingredients?.map((item) => item.foodName) ?? [];
  const extraIngredients = route.params.extraIngredients?.length
    ? route.params.extraIngredients
    : recipe.extraIngredients ?? [];
  const disclaimer = route.params.disclaimer || recipe.disclaimer || DEFAULT_RECIPE_DISCLAIMER;
  const guideSourceUrls = aiInstructions.sourceUrls?.length
    ? aiInstructions.sourceUrls
    : recipe.sourceUrls ?? [];
  const ingredientRows = buildRecipeIngredientRows({
    recipeName: recipe.recipeName,
    ingredients: recipe.ingredients ?? [],
    availableIngredients,
    missingIngredients,
    extraIngredients,
    requiredIngredients,
  });
  const useHeroVisual = hasDetailHeroVisual(recipe);
  const scrollBottomPadding =
    insets.bottom + FLOATING_CTA_BOTTOM + FLOATING_CTA_HEIGHT + SCROLL_BOTTOM_GAP;
  const youtubeVideo = aiInstructions.youtubeVideo ?? recipe.youtubeVideo ?? null;
  const youtubeUrl = youtubeVideo?.url || recipe.videoUrl;
  const cookingTimeLabel =
    aiInstructions.cookingTimeMinutes || recipe.cookTimeMinutes
      ? `${aiInstructions.cookingTimeMinutes ?? recipe.cookTimeMinutes} phút`
      : null;
  const guideStatusLabel =
    aiInstructions.guideStatus === 'generated'
      ? 'Đã kiểm chứng nguồn'
      : aiInstructions.guideStatus === 'stored'
        ? 'Bản hướng dẫn đã lưu'
        : aiInstructions.guideStatus === 'stale'
          ? 'Bản lưu cần cập nhật'
          : 'Hướng dẫn dự phòng';


  return (
    <View style={S.container}>
      {/* Absolute Add Button at bottom safely above tabs */}
      <Animated.View entering={FadeInUp.delay(500)} style={[S.floatBottomBtn, { bottom: insets.bottom + FLOATING_CTA_BOTTOM }]}>
        <Pressable
          style={S.addBtn}
          onPress={() => setShowAddToDiarySheet(true)}
        >
          <ThemedText style={S.addBtnText}>Thêm vào nhật ký</ThemedText>
        </Pressable>
      </Animated.View>

      <TopHeader />

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {useHeroVisual ? (
          <View style={S.heroContainer}>
            <View style={S.heroImage}>
              <RecipeVisual
                recipe={recipe}
                style={S.heroImage}
                size="medium"
                allowGenericFallback
              />
              <LinearGradient colors={['transparent', P.surface]} style={S.gradientMask} />
            </View>
            <View style={S.heroTextWrap}>
              <ThemedText style={S.heroMainTitle} numberOfLines={3}>{recipe.recipeName}</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {cookingTimeLabel && (
                  <View style={S.badgeWrap}>
                    <Ionicons name="time" size={14} color={P.primary} />
                    <ThemedText style={S.badgeText}>{cookingTimeLabel}</ThemedText>
                  </View>
                )}
                {!!(aiInstructions.difficulty ?? recipe.difficulty) && (
                  <View style={S.badgeWrap}>
                    <Ionicons name="speedometer-outline" size={14} color={P.primary} />
                    <ThemedText style={S.badgeText}>{aiInstructions.difficulty ?? recipe.difficulty}</ThemedText>
                  </View>
                )}
                {!!cookingMethod && (
                  <View style={S.badgeWrap}>
                    <Ionicons name="restaurant-outline" size={14} color={P.primary} />
                    <ThemedText style={S.badgeText}>{cookingMethod}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={[S.compactHero, { paddingTop: insets.top + 88 }]}>
            <ThemedText style={S.compactHeroTitle} numberOfLines={3}>{recipe.recipeName}</ThemedText>
            <View style={S.compactBadgeRow}>
              {cookingTimeLabel && (
                <View style={S.badgeWrap}>
                  <Ionicons name="time" size={14} color={P.primary} />
                  <ThemedText style={S.badgeText}>{cookingTimeLabel}</ThemedText>
                </View>
              )}
              {!!(aiInstructions.difficulty ?? recipe.difficulty) && (
                <View style={S.badgeWrap}>
                  <Ionicons name="speedometer-outline" size={14} color={P.primary} />
                  <ThemedText style={S.badgeText}>{aiInstructions.difficulty ?? recipe.difficulty}</ThemedText>
                </View>
              )}
              {!!cookingMethod && (
                <View style={S.badgeWrap}>
                  <Ionicons name="restaurant-outline" size={14} color={P.primary} />
                  <ThemedText style={S.badgeText}>{cookingMethod}</ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

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

          <Animated.View entering={FadeInDown.delay(150)} style={S.warningCard}>
            <Ionicons name="information-circle-outline" size={18} color={P.onSurfaceVariant} />
            <ThemedText style={S.warningText}>{disclaimer}</ThemedText>
          </Animated.View>

          {/* Description */}
          {recipe.description && (
            <Animated.View entering={FadeInDown.delay(200)} style={S.glassCard}>
              <ThemedText style={S.sectionTitle}>Giới thiệu</ThemedText>
              <ThemedText style={S.bodyText}>{recipe.description}</ThemedText>
            </Animated.View>
          )}

          {/* Ingredients */}
          {ingredientRows.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300)} style={S.glassCard}>
              <ThemedText style={S.sectionTitle}>Nguyên liệu</ThemedText>
              <View style={S.ingredientsWrap}>
                {ingredientRows.map((row) => {
                  const statusMeta = getIngredientStatusMeta(row.status);
                  return (
                    <View key={row.key} style={S.ingredientRow}>
                      <View style={[S.ingredientStatusIcon, { backgroundColor: statusMeta.tone + '22', borderColor: statusMeta.tone + '55' }]}>
                        <Ionicons name={statusMeta.icon} size={12} color={statusMeta.tone} />
                      </View>
                      <View style={S.ingredientNameWrap}>
                        <ThemedText style={S.bodyTextItem}>{row.name}</ThemedText>
                        <ThemedText style={[S.ingredientStatusText, { color: statusMeta.tone }]}>
                          {statusMeta.label}
                        </ThemedText>
                      </View>
                      {typeof row.grams === 'number' && row.grams > 0 && (
                        <ThemedText style={S.bodyTextWeight}>{Math.round(row.grams)}g</ThemedText>
                      )}
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {(prepItems.length > 0 || seasonings.length > 0) && (
            <Animated.View entering={FadeInDown.delay(375)} style={S.glassCard}>
              <View style={S.sideBySideRow}>
                {prepItems.length > 0 && (
                  <View style={S.sideBySideCol}>
                    <View style={S.sideBySideHeader}>
                      <Ionicons name="cut-outline" size={16} color={P.primary} />
                      <ThemedText style={S.sideBySideTitle}>Sơ chế</ThemedText>
                    </View>
                    <View style={S.sideListWrap}>
                      {prepItems.map((item, index) => (
                        <View key={index} style={S.sideRow}>
                          <View style={S.ingDot} />
                          <ThemedText style={S.sideText}>{item}</ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {seasonings.length > 0 && (
                  <View style={[S.sideBySideCol, prepItems.length > 0 && { borderLeftWidth: 1, borderLeftColor: P.glassBorder, paddingLeft: 16 }]}>
                    <View style={S.sideBySideHeader}>
                      <Ionicons name="flame-outline" size={16} color={P.macroC} />
                      <ThemedText style={S.sideBySideTitle}>Gia vị</ThemedText>
                    </View>
                    <View style={S.sideListWrap}>
                      {seasonings.map((item, index) => (
                        <View key={index} style={S.sideRow}>
                          <View style={[S.ingDot, { backgroundColor: P.macroC }]} />
                          <ThemedText style={S.sideText}>{item}</ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Cooking Instructions */}
          <Animated.View entering={FadeInDown.delay(400)} style={S.glassCard}>
            <View style={S.sectionTitleRow}>
              <ThemedText style={S.sectionTitle}>Hướng dẫn nấu</ThemedText>
              <View style={S.statusBadge}>
                <ThemedText style={S.statusBadgeText}>{guideStatusLabel}</ThemedText>
              </View>
            </View>

            {aiInstructions.isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
                <ActivityIndicator size="small" color={P.primary} />
                <ThemedText style={{ marginLeft: 10, color: P.onSurfaceVariant, fontSize: 13 }}>
                  Đang tải hướng dẫn...
                </ThemedText>
              </View>
            ) : aiInstructions.error ? (
              <ThemedText style={{ color: P.danger, fontSize: 13 }}>{aiInstructions.error}</ThemedText>
            ) : (
              <View style={S.stepsWrap}>
                {guideSteps.map((step: string, i: number) => {
                  const isLast = i === guideSteps.length - 1;
                  return (
                    <View key={i} style={S.stepRow}>
                      <View style={S.stepTimelineLeft}>
                        <View style={S.stepNumberWrap}>
                          <ThemedText style={S.stepNumberText}>{i + 1}</ThemedText>
                        </View>
                        {!isLast && <View style={S.stepTimelineLine} />}
                      </View>
                      <ThemedText style={S.stepContentText}>{step}</ThemedText>
                    </View>
                  );
                })}
              </View>
            )}
            {!!aiInstructions.tips?.length && (
              <View style={S.tipsWrap}>
                {aiInstructions.tips.slice(0, 3).map((tip) => (
                  <View key={tip} style={S.tipRow}>
                    <Ionicons name="bulb-outline" size={14} color={P.primary} />
                    <ThemedText style={S.tipText}>{tip}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Video Guide */}
          <Animated.View entering={FadeInDown.delay(500)} style={S.glassCard}>
            <ThemedText style={S.sectionTitle}>Video hướng dẫn</ThemedText>
            {youtubeUrl ? (
              <Pressable
                onPress={() => Linking.openURL(youtubeUrl)}
                style={({ pressed }) => [S.videoBox, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={S.videoIconBg}>
                  <Ionicons name="play" size={24} color="#ff8c8c" />
                </View>
                <View style={S.videoTextWrap}>
                  <ThemedText style={S.videoTitle} numberOfLines={1}>
                    {youtubeVideo?.title || 'Xem video hướng dẫn'}
                  </ThemedText>
                  <ThemedText style={S.videoSub} numberOfLines={1}>
                    {youtubeVideo?.channelTitle || 'Video YouTube đã xác thực cho món này'}
                  </ThemedText>
                </View>
                <Ionicons name="open-outline" size={20} color={P.onSurfaceVariant} />
              </Pressable>
            ) : (
              <View style={S.videoUnavailable}>
                <Ionicons name="alert-circle-outline" size={16} color={P.onSurfaceVariant} />
                <ThemedText style={S.videoUnavailableText}>Chưa có video đã xác thực</ThemedText>
              </View>
            )}
          </Animated.View>

          {guideSourceUrls.length > 0 && (
            <Animated.View entering={FadeInDown.delay(550)} style={S.glassCard}>
              <ThemedText style={S.sectionTitle}>Nguồn tham khảo</ThemedText>
              {guideSourceUrls.slice(0, 3).map((url) => (
                <Pressable key={url} style={S.sourceRow} onPress={() => Linking.openURL(url)}>
                  <Ionicons name="link-outline" size={16} color={P.primary} />
                  <ThemedText style={S.sourceText} numberOfLines={1}>{formatRecipeSourceLabel(url)}</ThemedText>
                  <Ionicons name="open-outline" size={16} color={P.onSurfaceVariant} />
                </Pressable>
              ))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {recipe && (
        <AddRecipeToDiarySheet
          visible={showAddToDiarySheet}
          onClose={() => setShowAddToDiarySheet(false)}
          recipeName={recipe.recipeName}
          nutrition={{ calories: recipe.totalCalories, protein: recipe.totalProtein, carbs: recipe.totalCarbs, fat: recipe.totalFat }}
          onConfirm={handleAddToDiary}
          defaultMealType={route.params.defaultMealType}
          diaryEntryId={route.params.diaryEntryId}
          currentGrams={route.params.currentGrams}
          baseGrams={recipe.totalGrams || 100}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 52,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 18,
    color: P.onSurface,
    letterSpacing: -0.2,
  },

  scrollContent: {},

  heroContainer: { width: '100%', height: 350, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gradientMask: { ...StyleSheet.absoluteFillObject },
  heroTextWrap: {
    position: 'absolute', bottom: 20, left: 24, right: 24, gap: 12,
  },
  heroMainTitle: { fontSize: 32, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface, lineHeight: 40 },
  compactHero: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 14,
  },
  compactHeroTitle: { fontSize: 32, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface, lineHeight: 40 },
  compactBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: P.surfaceContainerHigh,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: P.glassBorder,
  },
  badgeText: { fontSize: 13, fontFamily: 'BeVietnamPro_600SemiBold', color: P.onSurface },

  mainCanvas: { paddingHorizontal: 20, gap: 16 },

  macrosRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 8 },
  macroBox: {
    flex: 1, borderRadius: 16, paddingVertical: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  macroVal: { fontSize: 16, fontFamily: 'BeVietnamPro_700Bold' },
  macroLabel: { fontSize: 11, fontFamily: 'BeVietnamPro_500Medium', color: P.onSurfaceVariant },

  glassCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 24, padding: 20, gap: 12,
    borderWidth: 1, borderColor: P.glassBorder,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'BeVietnamPro_500Medium',
    color: P.onSurfaceVariant,
    lineHeight: 18,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface, marginBottom: 4 },
  statusBadge: {
    backgroundColor: P.primary + '18',
    borderColor: P.primary + '35',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 10, fontFamily: 'BeVietnamPro_700Bold', color: P.primary },
  bodyText: { fontSize: 14, fontFamily: 'BeVietnamPro_400Regular', color: P.onSurfaceVariant, lineHeight: 22 },

  ingredientsWrap: { gap: 10 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.primary },
  ingredientStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  ingredientNameWrap: { flex: 1, gap: 2 },
  bodyTextItem: { flex: 1, fontSize: 14, fontFamily: 'BeVietnamPro_500Medium', color: P.onSurface },
  ingredientStatusText: { fontSize: 11, fontFamily: 'BeVietnamPro_700Bold' },
  bodyTextWeight: { fontSize: 14, fontFamily: 'BeVietnamPro_700Bold', color: P.primary },

  sideBySideRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  sideBySideCol: { flex: 1, gap: 10 },
  sideBySideHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sideBySideTitle: { fontSize: 15, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface },
  sideListWrap: { gap: 8 },
  sideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sideText: { flex: 1, fontSize: 13, fontFamily: 'BeVietnamPro_500Medium', color: P.onSurfaceVariant, lineHeight: 18 },

  stepsWrap: { gap: 24, paddingVertical: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepTimelineLeft: { alignItems: 'center', position: 'relative' },
  stepTimelineLine: {
    position: 'absolute',
    top: 32,
    bottom: -28,
    width: 2,
    backgroundColor: P.primary + '20',
  },
  stepNumberWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: P.primary + '15',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.primary + '35',
    zIndex: 10,
  },
  stepNumberText: { fontSize: 13, fontFamily: 'BeVietnamPro_700Bold', color: P.primary },
  stepContentText: { flex: 1, fontSize: 14, fontFamily: 'BeVietnamPro_500Medium', color: P.onSurfaceVariant, lineHeight: 22 },
  tipsWrap: { gap: 8, paddingTop: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 13, fontFamily: 'BeVietnamPro_500Medium', color: P.onSurfaceVariant, lineHeight: 20 },

  videoBox: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: P.surfaceContainerLowest, padding: 14, borderRadius: 16 },
  videoBoxDisabled: { opacity: 0.72 },
  videoIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  videoTextWrap: { flex: 1 },
  videoTitle: { fontSize: 14, fontFamily: 'BeVietnamPro_700Bold', color: P.onSurface },
  videoSub: { fontSize: 12, fontFamily: 'BeVietnamPro_500Medium', color: P.onSurfaceVariant },
  videoUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  videoUnavailableText: { fontSize: 13, fontFamily: 'BeVietnamPro_600SemiBold', color: P.onSurfaceVariant },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sourceText: { flex: 1, fontSize: 12, fontFamily: 'BeVietnamPro_500Medium', color: P.onSurfaceVariant },

  floatBottomBtn: {
    position: 'absolute', left: 24, right: 24, zIndex: 100,
    shadowColor: P.primary, shadowOpacity: 0.4, shadowRadius: 15, elevation: 15,
  },
  addBtn: {
    backgroundColor: P.primary, borderRadius: 99,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: FLOATING_CTA_HEIGHT,
  },
  addBtnText: { fontSize: 16, fontFamily: 'BeVietnamPro_700Bold', color: P.onPrimary },
});
