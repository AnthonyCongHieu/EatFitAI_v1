// Màn hình Chi tiết món ăn và thêm vào nhật ký

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodDetail } from '../../../services/foodService';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealTypeId } from '../../../types';
import { diaryService } from '../../../services/diaryService';

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
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000, {
      message: 'Số gram phải > 0 và ≤ 2000',
    }),
  mealType: z.number().refine((value) => [1, 2, 3, 4].includes(value), { message: 'Bữa ăn không hợp lệ' }),
  note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
});

type FormValues = z.infer<typeof FormSchema>;

const FoodDetailScreen = (): JSX.Element | null => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const refreshSummary = useDiaryStore((state) => state.refreshSummary);

  const [detail, setDetail] = useState<FoodDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsLoading(true);
    foodService
      .getFoodDetail(route.params.foodId)
      .then((data) => {
        setDetail(data);
        if (data.servingSizeGram && data.servingSizeGram > 0) {
          setValue('grams', String(Math.round(data.servingSizeGram)));
        }
      })
      .catch((error: any) => {
        const status = error?.response?.status;
        if (status === 404) {
          Toast.show({ type: 'error', text1: 'Món ăn không tồn tại', text2: 'Món này có thể đã bị xóa' });
        } else if (status >= 500) {
          Toast.show({ type: 'error', text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' });
        } else if (!navigator.onLine) {
          Toast.show({ type: 'error', text1: 'Không có kết nối mạng', text2: 'Kiểm tra kết nối và thử lại' });
        } else {
          Toast.show({ type: 'error', text1: 'Không tải được chi tiết món', text2: 'Vui lòng thử lại' });
        }
        navigation.goBack();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [navigation, route.params.foodId, setValue]);

  const multiplier = useMemo(() => {
    const gramsNumber = Number(gramsValue);
    const base = detail?.servingSizeGram && detail.servingSizeGram > 0 ? detail.servingSizeGram : 100;
    if (!gramsNumber || !base) return 0;
    return gramsNumber / base;
  }, [detail?.servingSizeGram, gramsValue]);

  const macroValue = useCallback(
    (base?: number | null) => {
      if (!base || multiplier <= 0) return '--';
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
        await foodService.addDiaryEntry({
          foodId: detail.id,
          grams: Number(values.grams),
          mealTypeId: values.mealType as MealTypeId,
          note: values.note ?? undefined,
        });
        Toast.show({ type: 'success', text1: 'Đã thêm món vào nhật ký', text2: 'Tiếp tục theo dõi dinh dưỡng của bạn!' });
        await refreshSummary().catch(() => {});
        navigation.goBack();
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 422) {
          Toast.show({ type: 'error', text1: 'Dữ liệu không hợp lệ', text2: 'Vui lòng kiểm tra số gram và bữa ăn' });
        } else if (status === 404) {
          Toast.show({ type: 'error', text1: 'Món ăn không tồn tại', text2: 'Món này có thể đã bị xóa' });
        } else if (status >= 500) {
          Toast.show({ type: 'error', text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' });
        } else if (!navigator.onLine) {
          Toast.show({ type: 'error', text1: 'Không có kết nối mạng', text2: 'Kiểm tra kết nối và thử lại' });
        } else {
          Toast.show({ type: 'error', text1: 'Thêm món thất bại', text2: 'Vui lòng thử lại hoặc liên hệ hỗ trợ' });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [detail, navigation, refreshSummary],
  );

  if (isLoading) {
    return (
      <Screen contentContainerStyle={styles.loadingContainer}>
        <Card padding="lg" shadow="md">
          <View style={{ alignItems: 'center', padding: theme.spacing.xl }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <ThemedText variant="body" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
              Đang tải chi tiết món ăn...
            </ThemedText>
          </View>
        </Card>
      </Screen>
    );
  }

  if (!detail) return null;

  return (
    <Screen contentContainerStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(theme.animation.normal)}>
        <Card padding="lg" shadow="md">
          <ThemedText variant="h2" style={{ marginBottom: theme.spacing.xs }}>
            {detail.name}
          </ThemedText>
          {detail.brand ? (
            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.xs }}>
              {detail.brand}
            </ThemedText>
          ) : null}
          {detail.description ? (
            <ThemedText variant="bodySmall" color="textSecondary">
              {detail.description}
            </ThemedText>
          ) : null}

          <View style={[styles.infoRow, { marginTop: theme.spacing.lg }]}>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryLight }]}>
              <ThemedText variant="caption" color="primary" weight="600" style={{ textTransform: 'uppercase' }}>
                Lượng tham chiếu
              </ThemedText>
              <ThemedText variant="h4" color="primary">
                {detail.servingSizeGram ? `${detail.servingSizeGram} g` : '100 g'}
              </ThemedText>
            </View>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.secondaryLight }]}>
              <ThemedText variant="caption" color="secondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Năng lượng
              </ThemedText>
              <ThemedText variant="h4" color="secondary">
                {detail.perServingCalories ?? detail.calories ?? '--'} kcal
              </ThemedText>
            </View>
          </View>

          <View style={[styles.macroRow, { marginTop: theme.spacing.md }]}>
            <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
              <ThemedText variant="caption" color="textSecondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Protein
              </ThemedText>
              <ThemedText variant="h4">{detail.perServingProtein ?? detail.protein ? `${(detail.perServingProtein ?? detail.protein).toFixed(1).replace(/\.0$/, '')} g` : '--'}</ThemedText>
            </View>
            <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
              <ThemedText variant="caption" color="textSecondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Carb
              </ThemedText>
              <ThemedText variant="h4">{detail.perServingCarbs ?? detail.carbs ? `${(detail.perServingCarbs ?? detail.carbs).toFixed(1).replace(/\.0$/, '')} g` : '--'}</ThemedText>
            </View>
            <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
              <ThemedText variant="caption" color="textSecondary" weight="600" style={{ textTransform: 'uppercase' }}>
                Fat
              </ThemedText>
              <ThemedText variant="h4">{detail.perServingFat ?? detail.fat ? `${(detail.perServingFat ?? detail.fat).toFixed(1).replace(/\.0$/, '')} g` : '--'}</ThemedText>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(theme.animation.normal).delay(100)}>
        <Card padding="lg" shadow="md">
          <ThemedText variant="h3" style={{ marginBottom: theme.spacing.lg }}>
            Thêm vào nhật ký
          </ThemedText>

          <Controller
            control={control}
            name="grams"
            render={({ field: { onChange, onBlur, value } }) => (
              <ThemedTextInput
                label="Số gram"
                keyboardType="numeric"
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

          <View style={{ marginTop: theme.spacing.md }}>
            <ThemedText variant="bodySmall" weight="600">
              Bữa ăn
            </ThemedText>
            <View style={[styles.mealRow, { marginTop: theme.spacing.sm }]}>
              {MEAL_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn bữa ăn ${option.label}`}
                  accessibilityState={{ selected: mealTypeValue === option.value }}
                  hitSlop={8}
                  onPress={() => setValue('mealType', option.value)}
                  style={[
                    styles.mealChip,
                    {
                      backgroundColor: mealTypeValue === option.value ? theme.colors.primary : 'transparent',
                      borderColor: theme.colors.primary,
                    },
                  ]}
                >
                  <ThemedText
                    variant="button"
                    style={{
                      color: mealTypeValue === option.value ? '#fff' : theme.colors.text,
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {errors.mealType && (
              <ThemedText variant="bodySmall" color="danger" style={{ marginTop: theme.spacing.xs }}>
                {errors.mealType.message}
              </ThemedText>
            )}
          </View>

          <Controller
            control={control}
            name="note"
            render={({ field: { onChange, onBlur, value } }) => (
              <ThemedTextInput
                label="Ghi chú (tùy chọn)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="VD: giảm bớt nước sốt"
                multiline
                numberOfLines={3}
                error={!!errors.note}
                helperText={errors.note?.message}
              />
            )}
          />

          <View style={[styles.previewBox, { backgroundColor: theme.colors.primaryLight, marginTop: theme.spacing.lg }]}>
            <ThemedText variant="body" weight="600" color="primary" style={{ marginBottom: theme.spacing.sm }}>
              Tổng dinh dưỡng cho {gramsValue || '--'} g:
            </ThemedText>
            <ThemedText variant="h3" color="primary" style={{ marginBottom: theme.spacing.xs }}>
              {calorieValue}
            </ThemedText>
            <View style={{ gap: theme.spacing.xs }}>
              <ThemedText variant="body" color="primary">
                Protein: {macroValue(detail.perServingProtein ?? detail.protein)}
              </ThemedText>
              <ThemedText variant="body" color="primary">
                Carb: {macroValue(detail.perServingCarbs ?? detail.carbs)}
              </ThemedText>
              <ThemedText variant="body" color="primary">
                Fat: {macroValue(detail.perServingFat ?? detail.fat)}
              </ThemedText>
            </View>
          </View>

          <View style={{ marginTop: theme.spacing.xl }}>
            <Button
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={handleSubmit(submit)}
              title={isSubmitting ? 'Đang thêm...' : 'Thêm vào nhật ký'}
            />
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16, flexGrow: 1 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoBox: { flex: 1, padding: 16, borderRadius: 12, gap: 8 },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroBox: { flex: 1, padding: 12, borderRadius: 12, gap: 4 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealChip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
  previewBox: { padding: 16, borderRadius: 12 },
});

export default FoodDetailScreen;
