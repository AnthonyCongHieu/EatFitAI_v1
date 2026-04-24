// Food Detail Screen - Emerald Nebula 3D UI

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ImageBackground,
  TextInput,
  ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import type { RootStackParamList } from '../../types';
import { trackEvent } from '../../../services/analytics';
import { foodService, type FoodDetail } from '../../../services/foodService';
import { invalidateDiaryQueries } from '../../../services/diaryFlowService';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealTypeId } from '../../../types';
import { handleApiError } from '../../../utils/errorHandler';
import { favoritesService } from '../../../services/favoritesService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'FoodDetail'>;

const MEAL_OPTIONS = [
  { value: MEAL_TYPES.BREAKFAST, label: MEAL_TYPE_LABELS[MEAL_TYPES.BREAKFAST] },
  { value: MEAL_TYPES.LUNCH, label: MEAL_TYPE_LABELS[MEAL_TYPES.LUNCH] },
  { value: MEAL_TYPES.DINNER, label: MEAL_TYPE_LABELS[MEAL_TYPES.DINNER] },
  { value: MEAL_TYPES.SNACK, label: MEAL_TYPE_LABELS[MEAL_TYPES.SNACK] },
] as const;

const FormSchema = z.object({
  grams: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập số gram' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000,
      {
        message: 'Số gram phải > 0 và <= 2000',
      },
    ),
  mealType: z
    .number()
    .refine((value) => [1, 2, 3, 4].includes(value), { message: 'Bữa ăn không hợp lệ' }),
  note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
});

type FormValues = z.infer<typeof FormSchema>;

/* ═══ Palette ═══ */
const P = {
  primary: '#4be277',
  primaryContainer: '#22c55e',
  surface: '#0e1322',
  surfaceContainer: '#161b2b',
  surfaceContainerHigh: 'rgba(37, 41, 58, 0.7)', // glass effect
  surfaceContainerLowest: '#090e1c',
  onSurface: '#dee1f7',
  onSurfaceVariant: '#bccbb9',
  onPrimary: '#003915',
  glassBorder: 'rgba(255,255,255,0.1)',
  glassHeader: 'rgba(14, 19, 34, 0.4)',

  macroP: '#34d399', // emerald
  macroC: '#38bdf8', // sky
  macroF: '#fbbf24', // amber
};

const FoodDetailScreen = (): React.ReactElement | null => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const selectedDate = route.params.selectedDate;
  const returnToDiaryOnSave = route.params.returnToDiaryOnSave ?? false;
  const foodKey = `${route.params.source ?? 'catalog'}:${route.params.foodId}`;
  const isUserFood = route.params.source === 'user';

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: detail, isLoading, error } = useQuery<FoodDetail | null, unknown>({
    queryKey: ['food-detail', foodKey],
    queryFn: async () => {
      const data = await foodService.getFoodDetail(route.params.foodId, route.params.source);
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: isFavorite = false, refetch: refetchFavorite } = useQuery({
    queryKey: ['favorite', foodKey],
    queryFn: () => favoritesService.checkIsFavorite(Number(route.params.foodId)),
    enabled: !!route.params.foodId && !isUserFood,
  });

  const toggleFavorite = useCallback(async () => {
    if (!route.params.foodId || isUserFood) return;
    await favoritesService.toggleFavorite(Number(route.params.foodId));
    refetchFavorite();
  }, [route.params.foodId, isUserFood, refetchFavorite]);

  useEffect(() => {
    if (error) {
      handleApiError(error);
      navigation.goBack();
    }
  }, [error, navigation]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    trackEvent('food_detail_loaded', {
      flow: 'food_detail',
      step: 'view',
      status: 'loaded',
      metadata: {
        foodId: detail.id,
        source: route.params.source ?? 'catalog',
        foodName: detail.name,
      },
    });
  }, [detail, route.params.source]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      grams: '100',
      mealType: MEAL_TYPES.LUNCH,
      note: '',
    },
  });

  const gramsValue = watch('grams');
  const mealTypeValue = watch('mealType');

  // Initialize grams if servingSizeGram is provided by the API
  useEffect(() => {
    if (detail?.servingSizeGram && detail.servingSizeGram > 0 && gramsValue === '100') {
      setValue('grams', String(Math.round(detail.servingSizeGram)));
    }
  }, [detail?.servingSizeGram, setValue]);

  const multiplier = useMemo(() => {
    const gramsNumber = Number(gramsValue);
    const base = detail?.servingSizeGram && detail.servingSizeGram > 0 ? detail.servingSizeGram : 100;
    if (!gramsNumber || !base) return 0;
    return gramsNumber / base;
  }, [detail?.servingSizeGram, gramsValue]);

  // Derived macros
  const displayProtein = (detail?.perServingProtein ?? detail?.protein ?? 0) * multiplier;
  const displayCarbs = (detail?.perServingCarbs ?? detail?.carbs ?? 0) * multiplier;
  const displayFat = (detail?.perServingFat ?? detail?.fat ?? 0) * multiplier;
  const displayCalories = (detail?.perServingCalories ?? detail?.calories ?? 0) * multiplier;

  const totalMacros = Math.max(displayProtein + displayCarbs + displayFat, 1);

  // Handlers for stepper
  const handleIncrease = () => {
    const current = parseFloat(gramsValue) || 0;
    setValue('grams', String(Math.round(current + 10)));
  };

  const handleDecrease = () => {
    const current = parseFloat(gramsValue) || 0;
    const next = Math.round(current - 10);
    setValue('grams', String(next > 0 ? next : 1));
  };

  const submit = useCallback(async (values: FormValues) => {
    if (!detail) return;
    setIsSubmitting(true);
    try {
      const payload = {
        mealTypeId: values.mealType as MealTypeId,
        grams: Number(values.grams),
        note: values.note ?? undefined,
        eatenDate: selectedDate,
      };

      if (isUserFood) {
        await foodService.addDiaryEntryFromUserFoodItem({
          ...payload,
          userFoodItemId: detail.id,
        });
      } else {
        await foodService.addDiaryEntry({
          ...payload,
          foodId: detail.id,
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Đã thêm món vào nhật ký',
        text2: 'Tiếp tục theo dõi dinh dưỡng của bạn!',
      });
      trackEvent('diary_add_from_food_detail_success', {
        flow: 'food_detail',
        step: 'save',
        status: 'success',
        metadata: {
          foodId: detail.id,
          source: route.params.source ?? 'catalog',
          mealType: values.mealType,
          grams: Number(values.grams),
        },
      });
      await invalidateDiaryQueries(queryClient);
      if (returnToDiaryOnSave && selectedDate) {
        navigation.navigate('MealDiary', { selectedDate });
        return;
      }
      navigation.goBack();
    } catch (err: any) {
      trackEvent('diary_add_from_food_detail_failure', {
        category: 'error',
        flow: 'food_detail',
        step: 'save',
        status: 'failure',
        metadata: {
          foodId: detail.id,
          source: route.params.source ?? 'catalog',
          mealType: values.mealType,
          grams: Number(values.grams),
          message: err?.message,
        },
      });
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [detail, navigation, queryClient, returnToDiaryOnSave, route.params.source, selectedDate]);

  if (isLoading) {
    return (
      <View style={S.loadingContainer}>
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }
  if (!detail) return null;

  return (
    <View style={S.container}>
      {/* ═══ Top App Bar ═══ */}
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={S.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={P.primary} />
        </Pressable>
        <ThemedText style={S.headerTitle}>Chi tiết món ăn</ThemedText>
        {!isUserFood ? (
          <Pressable style={S.iconBtn} onPress={toggleFavorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={P.primary} />
          </Pressable>
        ) : (
          <View style={S.iconBtn} />
        )}
      </View>

      <ScrollView contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ═══ Hero Image ═══ */}
        <View style={S.heroContainer}>
          <ImageBackground
            source={{ uri: detail.thumbnail || 'https://via.placeholder.com/800x600?text=No+Image' }}
            style={S.heroImage}
          >
            <LinearGradient
              colors={['transparent', P.surface]}
              style={S.gradientMask}
            />
          </ImageBackground>
          <View style={S.heroTextWrap}>
            <ThemedText style={S.heroMainTitle} numberOfLines={2}>
              {detail.name}
            </ThemedText>
            {detail.brand && <ThemedText style={S.heroSubTitle}>{detail.brand}</ThemedText>}
          </View>
        </View>

        <View style={S.mainCanvas}>
          {/* ═══ Nutrition Overview Card ═══ */}
          <Animated.View entering={FadeInDown.delay(100)} style={S.glassCard}>
            <View style={S.cardHeader}>
              <ThemedText style={S.cardTitle}>Thông tin dinh dưỡng</ThemedText>
            </View>

            <View style={S.caloriesRow}>
              <View style={S.caloriesValBlock}>
                <ThemedText style={S.caloriesNumber}>{Math.round(displayCalories)}</ThemedText>
                <ThemedText style={S.caloriesUnit}>kcal</ThemedText>
              </View>

              {/* Gram Stepper */}
              <View style={S.stepperBox}>
                <Pressable onPress={handleDecrease} hitSlop={10}>
                  <Ionicons name="remove" size={20} color={P.onSurface} />
                </Pressable>
                <Controller
                  control={control}
                  name="grams"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={S.stepperInputWrapper}>
                      <TextInput
                        style={S.stepperInput}
                        keyboardType="numeric"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        maxLength={5}
                      />
                      <ThemedText style={S.stepperSuffix}>g</ThemedText>
                    </View>
                  )}
                />
                <Pressable onPress={handleIncrease} hitSlop={10}>
                  <Ionicons name="add" size={20} color={P.onSurface} />
                </Pressable>
              </View>
            </View>

            {/* Error Message if Grams invalid */}
            {errors.grams && (
              <ThemedText style={{ color: '#ffb4ab', fontSize: 13, marginTop: -15, marginBottom: 15 }}>
                {errors.grams.message}
              </ThemedText>
            )}

            {/* Macro Breakdown */}
            <View style={S.macrosWrap}>
              {/* Protein */}
              <View style={S.macroItem}>
                <View style={S.macroHeader}>
                  <View style={S.macroNameBox}>
                    <View style={[S.macroDot, { backgroundColor: P.macroP }]} />
                    <ThemedText style={S.macroName}>Chất đạm</ThemedText>
                  </View>
                  <ThemedText style={[S.macroNumber, { color: P.macroP }]}>{displayProtein.toFixed(1)}g</ThemedText>
                </View>
                <View style={S.barTrack}>
                  <View style={[S.barFill, { backgroundColor: P.macroP, width: `${(displayProtein / totalMacros) * 100}%` }]} />
                </View>
              </View>

              {/* Carbs */}
              <View style={S.macroItem}>
                <View style={S.macroHeader}>
                  <View style={S.macroNameBox}>
                    <View style={[S.macroDot, { backgroundColor: P.macroC }]} />
                    <ThemedText style={S.macroName}>Tinh bột</ThemedText>
                  </View>
                  <ThemedText style={[S.macroNumber, { color: P.macroC }]}>{displayCarbs.toFixed(1)}g</ThemedText>
                </View>
                <View style={S.barTrack}>
                  <View style={[S.barFill, { backgroundColor: P.macroC, width: `${(displayCarbs / totalMacros) * 100}%` }]} />
                </View>
              </View>

              {/* Fat */}
              <View style={S.macroItem}>
                <View style={S.macroHeader}>
                  <View style={S.macroNameBox}>
                    <View style={[S.macroDot, { backgroundColor: P.macroF }]} />
                    <ThemedText style={S.macroName}>Chất béo</ThemedText>
                  </View>
                  <ThemedText style={[S.macroNumber, { color: P.macroF }]}>{displayFat.toFixed(1)}g</ThemedText>
                </View>
                <View style={S.barTrack}>
                  <View style={[S.barFill, { backgroundColor: P.macroF, width: `${(displayFat / totalMacros) * 100}%` }]} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ═══ Meal Selector ═══ */}
          <Animated.View entering={FadeInDown.delay(200)} style={S.mealSection}>
            <ThemedText style={S.mealSectionTitle}>THÊM VÀO BỮA NÀO?</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.mealScroll}>
              {MEAL_OPTIONS.map((opt) => {
                const isActive = mealTypeValue === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setValue('mealType', opt.value)}
                    style={[S.mealChip, isActive && S.mealChipActive]}
                  >
                    <ThemedText style={[S.mealChipText, isActive && S.mealChipTextActive]}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══ Sticky Bottom Action ═══ */}
      <View style={S.bottomActions}>
        <Pressable
          style={({ pressed }) => [S.submitBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          onPress={handleSubmit(submit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={P.onPrimary} />
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color={P.onPrimary} />
              <ThemedText style={S.submitText}>Thêm vào Nhật ký</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

/* ═══ Styles ═══ */
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.surface },
  loadingContainer: { flex: 1, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: P.glassHeader,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 27, 43, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: P.primary,
  },

  scrollContent: { paddingBottom: 100 },

  heroContainer: {
    height: 380,
    width: '100%',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  gradientMask: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '60%',
  },
  heroTextWrap: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  heroMainTitle: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
    lineHeight: 40,
    paddingTop: 8,
  },
  heroSubTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: P.onSurfaceVariant,
  },

  mainCanvas: {
    marginTop: -30,
    paddingHorizontal: 16,
    gap: 30,
  },
  glassCard: {
    backgroundColor: P.surfaceContainerHigh,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: P.onSurface,
  },
  serveLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: P.onSurfaceVariant,
  },

  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 35,
  },
  caloriesValBlock: { flexDirection: 'row', alignItems: 'baseline' },
  caloriesNumber: {
    fontSize: 60,
    fontFamily: 'Inter_800ExtraBold',
    color: P.primary,
    letterSpacing: -2,
    lineHeight: 65,
  },
  caloriesUnit: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: P.primary,
    marginLeft: 8,
  },

  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 27, 43, 0.6)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: P.glassBorder,
    gap: 16,
  },
  stepperInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperInput: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
    minWidth: 35,
    textAlign: 'center',
  },
  stepperSuffix: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },

  macrosWrap: { gap: 20 },
  macroItem: { gap: 8 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  macroNameBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroName: { fontSize: 13, fontFamily: 'Inter_700Bold', color: P.onSurface },
  macroNumber: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  barTrack: {
    height: 8,
    width: '100%',
    backgroundColor: P.surfaceContainerLowest,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },

  mealSection: { gap: 16 },
  mealSectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    color: P.onSurfaceVariant,
    paddingHorizontal: 8,
  },
  mealScroll: { gap: 8, paddingBottom: 10 },
  mealChip: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 27, 43, 0.6)',
    borderWidth: 1,
    borderColor: P.glassBorder,
  },
  mealChipActive: {
    backgroundColor: P.primary + '20',
    borderColor: P.primary + '50',
  },
  mealChipText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: P.onSurfaceVariant },
  mealChipTextActive: { color: P.primary },

  bottomActions: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingBottom: 35,
    paddingTop: 16,
    backgroundColor: P.surface + 'F0',
    zIndex: 100,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: P.primary,
    borderRadius: 20,
    shadowColor: P.primary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  submitText: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: P.onPrimary,
  },
});

export default FoodDetailScreen;
