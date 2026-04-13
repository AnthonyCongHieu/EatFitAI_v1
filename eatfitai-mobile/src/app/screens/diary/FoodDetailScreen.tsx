// Màn hình Chi tiết món ăn và thêm vào nhật ký

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodDetail } from '../../../services/foodService';
import { invalidateDiaryQueries } from '../../../services/diaryFlowService';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealTypeId } from '../../../types';
import { handleApiError } from '../../../utils/errorHandler';
import FavoriteButton from '../../../components/FavoriteButton';
import { favoritesService } from '../../../services/favoritesService';
import { TEST_IDS } from '../../../testing/testIds';

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

const FoodDetailScreen = (): React.ReactElement | null => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const selectedDate = route.params.selectedDate;
  const returnToDiaryOnSave = route.params.returnToDiaryOnSave ?? false;

  // Move styles to useMemo to fix hooks order
  const styles = useMemo(
    () =>
      StyleSheet.create({
        loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        content: {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.xl,
          gap: theme.spacing.xxl,
          flexGrow: 1,
        },
        header: {
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        },
        title: {
          marginBottom: theme.spacing.sm,
        },
        infoRow: { flexDirection: 'row', gap: theme.spacing.sm },
        infoBox: {
          flex: 1,
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.card,
          gap: theme.spacing.xs,
        },
        // Hero image container
        imageContainer: {
          width: '100%',
          height: 200,
          borderRadius: theme.borderRadius.card,
          overflow: 'hidden',
          marginBottom: theme.spacing.lg,
          backgroundColor: isDark ? 'rgba(30, 35, 33, 0.6)' : 'rgba(0, 0, 0, 0.05)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        foodImage: {
          width: '100%',
          height: '100%',
        },
        placeholderImage: {
          fontSize: 64,
        },
        // Bug #6 fix: Cải thiện macro box để text không bị lệch
        macroRow: {
          flexDirection: 'row',
          gap: theme.spacing.sm,
          justifyContent: 'space-between',
        },
        macroBox: {
          flex: 1,
          minWidth: 90, // Tăng minWidth để có đủ space
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.card,
          gap: theme.spacing.xs,
          alignItems: 'center',
          justifyContent: 'center', // Center theo chiều dọc
        },
        mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
        mealChip: {
          borderWidth: 1.5,
          borderRadius: 999,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        },
        previewBox: { padding: theme.spacing.lg, borderRadius: theme.borderRadius.card },
        animatedMacroValue: {
          fontSize: theme.typography.bodyLarge.fontSize,
          fontFamily: theme.typography.bodyLarge.fontFamily,
          color: theme.colors.text,
        },
        // Custom header styles (2025 design)
        screenHeader: {
          paddingHorizontal: 16,
          paddingBottom: 12,
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
        },
        headerActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        // Enhanced nutrition cards
        nutritionCard: {
          borderRadius: 20,
          padding: theme.spacing.lg,
          backgroundColor: isDark
            ? 'rgba(20, 27, 45, 0.95)'
            : 'rgba(255, 255, 255, 0.98)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(59, 130, 246, 0.08)',
        },
        macroCard: {
          flex: 1,
          padding: theme.spacing.md,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
        },
      }),
    [theme.mode], // Only depend on theme mode to prevent re-renders on form changes
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    data: detailData,
    isLoading,
    error,
  } = useQuery<FoodDetail | null, unknown>({
    queryKey: ['food-detail', route.params.foodId, route.params.source],
    queryFn: async () => {
      const data = await foodService.getFoodDetail(
        route.params.foodId,
        route.params.source,
      );
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
  const detail = detailData ?? null;

  const { data: isFavorite = false, refetch: refetchFavorite } = useQuery({
    queryKey: ['favorite', route.params.foodId],
    queryFn: () => favoritesService.checkIsFavorite(Number(route.params.foodId)),
    enabled: !!route.params.foodId,
  });

  const toggleFavorite = useCallback(async () => {
    if (!route.params.foodId) return;
    await favoritesService.toggleFavorite(Number(route.params.foodId));
    refetchFavorite();
  }, [route.params.foodId, refetchFavorite]);

  useEffect(() => {
    if (error) {
      handleApiError(error);
      navigation.goBack();
    }
  }, [error, navigation]);

  // Animation values
  const proteinValue = useSharedValue(0);
  const carbsValue = useSharedValue(0);
  const fatValue = useSharedValue(0);
  const caloriesValue = useSharedValue(0);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      grams: '100',
      mealType: MEAL_TYPES.LUNCH,
      note: '',
    },
  });

  const gramsValue = watch('grams');
  const mealTypeValue = watch('mealType');

  useEffect(() => {
    if (detail?.servingSizeGram && detail.servingSizeGram > 0) {
      setValue('grams', String(Math.round(detail.servingSizeGram)));
    }
  }, [detail?.servingSizeGram, setValue]);

  const multiplier = useMemo(() => {
    const gramsNumber = Number(gramsValue);
    const base =
      detail?.servingSizeGram && detail.servingSizeGram > 0
        ? detail.servingSizeGram
        : 100;
    if (!gramsNumber || !base) return 0;
    return gramsNumber / base;
  }, [detail?.servingSizeGram, gramsValue]);

  // Animate values when multiplier changes
  useEffect(() => {
    const protein = (detail?.perServingProtein ?? detail?.protein ?? 0) * multiplier;
    const carbs = (detail?.perServingCarbs ?? detail?.carbs ?? 0) * multiplier;
    const fat = (detail?.perServingFat ?? detail?.fat ?? 0) * multiplier;
    const calories = (detail?.perServingCalories ?? detail?.calories ?? 0) * multiplier;

    proteinValue.value = withTiming(protein, { duration: theme.animation.normal });
    carbsValue.value = withTiming(carbs, { duration: theme.animation.normal });
    fatValue.value = withTiming(fat, { duration: theme.animation.normal });
    caloriesValue.value = withTiming(calories, { duration: theme.animation.normal });
  }, [multiplier, detail, proteinValue, carbsValue, fatValue, caloriesValue]);

  // For nutrition info section - show base values (no multiplier)
  const baseMacroValue = useCallback((base?: number | null) => {
    if (base === null || base === undefined) return '--';
    return `${base.toFixed(1).replace(/\.0$/, '')} g`;
  }, []);

  // For diary preview section - show calculated values with multiplier
  const macroValue = useCallback(
    (base?: number | null) => {
      // Only show '--' when base is null/undefined, 0 is a valid value
      if (base === null || base === undefined || multiplier <= 0) return '--';
      const value = base * multiplier;
      return `${value.toFixed(1).replace(/\.0$/, '')} g`;
    },
    [multiplier],
  );

  const calorieValue = useMemo(() => {
    const base = detail?.perServingCalories ?? detail?.calories ?? 0;
    if (!base || multiplier <= 0) return '--';
    return `${Math.round(base * multiplier)} kcal`;
  }, [detail?.calories, detail?.perServingCalories, multiplier]);

  const submit = useCallback(
    async (values: FormValues) => {
      if (!detail) return;
      setIsSubmitting(true);
      try {
        if (detail.source === 'user') {
          await foodService.addDiaryEntryFromUserFoodItem({
            userFoodItemId: detail.id,
            grams: Number(values.grams),
            mealTypeId: values.mealType as MealTypeId,
            note: values.note ?? undefined,
            eatenDate: selectedDate,
          });
        } else {
          await foodService.addDiaryEntry({
            foodId: detail.id,
            grams: Number(values.grams),
            mealTypeId: values.mealType as MealTypeId,
            note: values.note ?? undefined,
            eatenDate: selectedDate,
          });
        }
        Toast.show({
          type: 'success',
          text1: 'Đã thêm món vào nhật ký',
          text2: 'Tiếp tục theo dõi dinh dưỡng của bạn!',
        });
        await invalidateDiaryQueries(queryClient);
        if (returnToDiaryOnSave && selectedDate) {
          navigation.navigate('MealDiary', { selectedDate });
          return;
        }

        navigation.goBack();
      } catch (err: any) {
        handleApiError(err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [detail, navigation, queryClient, returnToDiaryOnSave, selectedDate],
  );

  if (isLoading) {
    return (
      <Screen contentContainerStyle={styles.loadingContainer}>
        <AppCard>
          <View style={{ alignItems: 'center', padding: theme.spacing.xl }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <ThemedText
              variant="body"
              color="textSecondary"
              style={{ marginTop: theme.spacing.md }}
            >
              Đang tải chi tiết món ăn...
            </ThemedText>
          </View>
        </AppCard>
      </Screen>
    );
  }

  if (!detail) return null;

  // Custom header component (matching EditProfileScreen)
  const renderHeader = () => (
    <View style={[styles.screenHeader, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <ThemedText variant="h3" weight="700" numberOfLines={1}>
            Chi tiết món ăn
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <FavoriteButton isFavorite={isFavorite} onToggle={toggleFavorite} size="md" />
        </View>
      </View>
    </View>
  );

  return (
    <Screen scroll={true} testID={TEST_IDS.foodDetail.screen}>
      {renderHeader()}

      <View style={styles.content}>
        {/* Hero Food Image */}
        <View style={styles.imageContainer}>
          {detail.thumbnail ? (
            <Image
              source={{ uri: detail.thumbnail }}
              style={styles.foodImage}
              resizeMode="cover"
            />
          ) : (
            <ThemedText style={styles.placeholderImage}>???</ThemedText>
          )}
        </View>

        {/* Nutrition Info Card - 2025 Design */}
        <View style={styles.nutritionCard}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: theme.spacing.md,
            }}
          >
            <ThemedText variant="h3" weight="700">
              Thông tin dinh dưỡng
            </ThemedText>
          </View>

          {detail.brand ? (
            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: theme.spacing.xs }}
            >
              {detail.brand}
            </ThemedText>
          ) : null}
          {detail.description ? (
            <ThemedText
              variant="bodySmall"
              color="textSecondary"
              style={{ marginBottom: theme.spacing.md }}
            >
              {detail.description}
            </ThemedText>
          ) : null}

          {/* Serving & Calories Row */}
          <View style={[styles.infoRow, { marginTop: theme.spacing.sm }]}>
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(74, 144, 226, 0.12)'
                    : 'rgba(59, 130, 246, 0.08)',
                  borderWidth: 1,
                  borderColor: isDark
                    ? 'rgba(74, 144, 226, 0.25)'
                    : 'rgba(59, 130, 246, 0.15)',
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="600"
                style={{
                  textTransform: 'uppercase',
                  color: isDark ? '#64B5F6' : '#3B82F6',
                  fontSize: 10,
                }}
              >
                Khẩu phần
              </ThemedText>
              <ThemedText variant="h4" style={{ color: isDark ? '#64B5F6' : '#3B82F6' }}>
                {detail.servingSizeGram ? `${detail.servingSizeGram} g` : '100 g'}
              </ThemedText>
            </View>
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(239, 68, 68, 0.08)',
                  borderWidth: 1,
                  borderColor: isDark
                    ? 'rgba(239, 68, 68, 0.25)'
                    : 'rgba(239, 68, 68, 0.15)',
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="600"
                style={{ textTransform: 'uppercase', color: '#EF4444', fontSize: 10 }}
              >
                Năng lượng
              </ThemedText>
              <ThemedText variant="h4" style={{ color: '#EF4444' }}>
                {detail.perServingCalories ?? detail.calories ?? '--'} kcal
              </ThemedText>
            </View>
          </View>

          {/* Macro Pills Row */}
          <View style={[styles.macroRow, { marginTop: theme.spacing.md }]}>
            <View
              style={[
                styles.macroCard,
                {
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="600"
                style={{ textTransform: 'uppercase', color: '#3B82F6', fontSize: 10 }}
              >
                Đạm
              </ThemedText>
              <ThemedText variant="h4" style={{ color: '#3B82F6' }}>
                {baseMacroValue(detail.perServingProtein ?? detail.protein)}
              </ThemedText>
            </View>
            <View
              style={[
                styles.macroCard,
                {
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.2)',
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="600"
                style={{ textTransform: 'uppercase', color: '#D97706', fontSize: 10 }}
              >
                Tinh bột
              </ThemedText>
              <ThemedText variant="h4" style={{ color: '#D97706' }}>
                {baseMacroValue(detail.perServingCarbs ?? detail.carbs)}
              </ThemedText>
            </View>
            <View
              style={[
                styles.macroCard,
                {
                  backgroundColor: 'rgba(236, 72, 153, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(236, 72, 153, 0.2)',
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="600"
                style={{ textTransform: 'uppercase', color: '#DB2777', fontSize: 10 }}
              >
                Chất béo
              </ThemedText>
              <ThemedText variant="h4" style={{ color: '#DB2777' }}>
                {baseMacroValue(detail.perServingFat ?? detail.fat)}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 40 }}>
        <View style={[styles.nutritionCard, { marginBottom: theme.spacing.lg }]}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: theme.spacing.lg,
            }}
          >
            <ThemedText variant="h3" weight="700">
              Thêm vào nhật ký
            </ThemedText>
          </View>

          <Controller
            control={control}
            name="grams"
            render={({ field: { onChange, onBlur, value } }) => (
              <ThemedTextInput
                testID={TEST_IDS.foodDetail.gramsInput}
                label="Số gram"
                keyboardType="numeric"
                returnKeyType="done"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ví dụ: 150"
                error={!!errors.grams}
                helperText={errors.grams?.message}
                required
              />
            )}
          />

          {/* Meal Type Selection - Grid Layout */}
          <View style={{ marginTop: theme.spacing.lg }}>
            <ThemedText
              variant="bodySmall"
              weight="600"
              style={{ marginBottom: theme.spacing.sm }}
            >
              Chọn bữa ăn
            </ThemedText>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              {MEAL_OPTIONS.map((option) => {
                const isSelected = mealTypeValue === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn bữa ăn ${option.label}`}
                    accessibilityState={{ selected: isSelected }}
                    hitSlop={8}
                    onPress={() => setValue('mealType', option.value)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : isDark
                          ? 'rgba(74, 144, 226, 0.08)'
                          : 'rgba(59, 130, 246, 0.05)',
                      borderColor: isSelected
                        ? theme.colors.primary
                        : isDark
                          ? 'rgba(74, 144, 226, 0.3)'
                          : 'rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <ThemedText
                      variant="button"
                      weight={isSelected ? '700' : '500'}
                      style={{ color: isSelected ? '#FFFFFF' : theme.colors.text }}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {errors.mealType && (
              <ThemedText
                variant="bodySmall"
                color="danger"
                style={{ marginTop: theme.spacing.xs }}
              >
                {errors.mealType.message}
              </ThemedText>
            )}
          </View>

          {/* Note Field */}
          <View style={{ marginTop: theme.spacing.lg }}>
            <Controller
              control={control}
              name="note"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  testID={TEST_IDS.foodDetail.noteInput}
                  label="Ghi chú (tùy chọn)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="VD: giảm bớt nước sốt"
                  multiline
                  numberOfLines={2}
                  error={!!errors.note}
                  helperText={errors.note?.message}
                />
              )}
            />
          </View>

          {/* Preview Box - Premium Design */}
          <View
            style={{
              marginTop: theme.spacing.lg,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark
                ? 'rgba(74, 144, 226, 0.25)'
                : 'rgba(59, 130, 246, 0.15)',
            }}
          >
            {/* Header with gradient */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(74, 144, 226, 0.25)', 'rgba(118, 75, 162, 0.2)']
                  : ['rgba(59, 130, 246, 0.15)', 'rgba(139, 92, 246, 0.1)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: theme.spacing.md,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <ThemedText variant="caption" weight="500" color="textSecondary">
                  Khẩu phần bạn chọn
                </ThemedText>
                <ThemedText variant="h4" weight="700" color="primary">
                  {gramsValue || '--'} gram
                </ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText variant="caption" weight="500" color="textSecondary">
                  Năng lượng
                </ThemedText>
                <ThemedText variant="h3" weight="700" style={{ color: '#EF4444' }}>
                  {calorieValue}
                </ThemedText>
              </View>
            </LinearGradient>

            {/* Macro pills */}
            <View
              style={{
                flexDirection: 'row',
                padding: theme.spacing.md,
                gap: 8,
                backgroundColor: isDark
                  ? 'rgba(20, 27, 45, 0.6)'
                  : 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  variant="caption"
                  weight="600"
                  style={{ color: '#3B82F6', fontSize: 10 }}
                >
                  ĐẠM
                </ThemedText>
                <ThemedText variant="body" weight="700" style={{ color: '#3B82F6' }}>
                  {macroValue(detail.perServingProtein ?? detail.protein)}
                </ThemedText>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  variant="caption"
                  weight="600"
                  style={{ color: '#D97706', fontSize: 10 }}
                >
                  TINH BỘT
                </ThemedText>
                <ThemedText variant="body" weight="700" style={{ color: '#D97706' }}>
                  {macroValue(detail.perServingCarbs ?? detail.carbs)}
                </ThemedText>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(236, 72, 153, 0.12)',
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <ThemedText
                  variant="caption"
                  weight="600"
                  style={{ color: '#DB2777', fontSize: 10 }}
                >
                  CHẤT BÉO
                </ThemedText>
                <ThemedText variant="body" weight="700" style={{ color: '#DB2777' }}>
                  {macroValue(detail.perServingFat ?? detail.fat)}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={{ marginTop: theme.spacing.lg }}>
            <Button
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={handleSubmit(submit)}
              title={isSubmitting ? 'Đang thêm...' : 'Thêm vào nhật ký'}
              testID={TEST_IDS.foodDetail.submitButton}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
};

export default FoodDetailScreen;
