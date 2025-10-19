// MÃ n hÃ¬nh Chi tiáº¿t mÃ³n Äƒn vÃ  thÃªm vÃ o nháº­t kÃ½

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodDetail } from '../../../services/foodService';
import { useDiaryStore } from '../../../store/useDiaryStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'FoodDetail'>;

const MEAL_OPTIONS = [
  { value: 'breakfast', label: 'Bá»¯a sÃ¡ng' },
  { value: 'lunch', label: 'Bá»¯a trÆ°a' },
  { value: 'dinner', label: 'Bá»¯a tá»‘i' },
  { value: 'snack', label: 'Ä‚n váº·t' },
] as const;

const FormSchema = z.object({
  grams: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lÃ²ng nháº­p sá»‘ gram' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000, {
      message: 'Sá»‘ gram pháº£i > 0 vÃ  â‰¤ 2000',
    }),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  note: z.string().trim().max(200, 'Ghi chÃº tá»‘i Ä‘a 200 kÃ½ tá»±').optional(),
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
      mealType: 'lunch',
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
      .catch(() => {
        Toast.show({ type: 'error', text1: 'KhÃ´ng táº£i Ä‘Æ°á»£c chi tiáº¿t mÃ³n' });
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
      return `${Math.round(base * multiplier)} g`;
    },
    [multiplier],
  );

  const calorieValue = useMemo(() => {
    const base = detail?.perServingCalories ?? detail?.calories ?? 0;
    if (!base || multiplier <= 0) return '--';
    return `${Math.round(base * multiplier)} kcal`;
  }, [detail?.calories, detail?.perServingCalories, multiplier]);

  const submit = useCallback(
    (values: FormValues) => {
      if (!detail) return;
      setIsSubmitting(true);
      foodService
        .addDiaryEntry({
          foodId: detail.id,
          grams: Number(values.grams),
          mealType: values.mealType,
          note: values.note ?? undefined,
        })
        .then(async () => {
          Toast.show({ type: 'success', text1: 'ÄÃ£ thÃªm vÃ o nháº­t kÃ½' });
          await refreshSummary().catch(() => {});
          navigation.goBack();
        })
        .catch((error: any) => {
          if (error?.response?.status === 422) {
            Toast.show({ type: 'error', text1: 'Dá»¯ liá»‡u khÃ´ng há»£p lá»‡' });
          } else {
            Toast.show({ type: 'error', text1: 'ThÃªm mÃ³n tháº¥t báº¡i' });
          }
        })
        .finally(() => setIsSubmitting(false));
    },
    [detail, navigation, refreshSummary],
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!detail) return null;

  return (
    <Screen contentContainerStyle={styles.content}>
      <Card>
        <ThemedText variant="title">{detail.name}</ThemedText>
        {detail.brand ? <ThemedText style={styles.subtitle}>{detail.brand}</ThemedText> : null}
        {detail.description ? <ThemedText style={styles.subtitle}>{detail.description}</ThemedText> : null}

        <View style={styles.infoRow}>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
            <ThemedText style={styles.label}>LÆ°á»£ng tham chiáº¿u</ThemedText>
            <ThemedText>{detail.servingSizeGram ? `${detail.servingSizeGram} g` : '100 g (máº·c Ä‘á»‹nh)'}</ThemedText>
          </View>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
            <ThemedText style={styles.label}>NÄƒng lÆ°á»£ng</ThemedText>
            <ThemedText>{detail.perServingCalories ?? detail.calories ?? '--'} kcal</ThemedText>
          </View>
        </View>

        <View style={styles.macroRow}>
          <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
            <ThemedText style={styles.label}>Protein</ThemedText>
            <ThemedText>{detail.perServingProtein ?? detail.protein ?? '--'} g</ThemedText>
          </View>
          <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
            <ThemedText style={styles.label}>Carb</ThemedText>
            <ThemedText>{detail.perServingCarbs ?? detail.carbs ?? '--'} g</ThemedText>
          </View>
          <View style={[styles.macroBox, { backgroundColor: theme.colors.background }]}>
            <ThemedText style={styles.label}>Fat</ThemedText>
            <ThemedText>{detail.perServingFat ?? detail.fat ?? '--'} g</ThemedText>
          </View>
        </View>
      </Card>

      <Card>
        <ThemedText variant="subtitle">ThÃªm vÃ o nháº­t kÃ½</ThemedText>

        <ThemedText style={styles.formLabel}>Sá»‘ gram</ThemedText>
        <Controller
          control={control}
          name="grams"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput keyboardType="numeric" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="VÃ­ dá»¥: 150" error={!!errors.grams} />
          )}
        />
        {errors.grams ? (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.grams.message}
          </ThemedText>
        ) : null}

        <ThemedText style={styles.formLabel}>Bá»¯a Äƒn</ThemedText>
        <View style={styles.mealRow}>
          {MEAL_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Chọn bữa ăn ${option.label}`}
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
                style={[
                  styles.mealChipText,
                  { color: mealTypeValue === option.value ? '#fff' : theme.colors.text },
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        {errors.mealType ? (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.mealType.message}
          </ThemedText>
        ) : null}

        <ThemedText style={styles.formLabel}>Ghi chÃº (tuá»³ chá»n)</ThemedText>
        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="VD: giáº£m bá»›t nÆ°á»›c sá»‘t" multiline numberOfLines={3} />
          )}
        />
        {errors.note ? (
          <ThemedText style={[styles.error, { color: theme.colors.danger ?? '#E53935' }]}>
            {errors.note.message}
          </ThemedText>
        ) : null}

        <View style={[styles.previewBox, { backgroundColor: theme.colors.background }]}>
          <ThemedText style={styles.previewLabel}>Tá»•ng dinh dÆ°á»¡ng cho {gramsValue || '--'} g:</ThemedText>
          <ThemedText>{calorieValue}</ThemedText>
          <ThemedText>Protein: {macroValue(detail.perServingProtein ?? detail.protein)}</ThemedText>
          <ThemedText>Carb: {macroValue(detail.perServingCarbs ?? detail.carbs)}</ThemedText>
          <ThemedText>Fat: {macroValue(detail.perServingFat ?? detail.fat)}</ThemedText>
        </View>

        <Button variant="primary" disabled={isSubmitting} onPress={handleSubmit(submit)}>
          <ThemedText style={styles.submitText}>{isSubmitting ? 'Äang thÃªm...' : 'ThÃªm vÃ o nháº­t kÃ½'}</ThemedText>
        </Button>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16, flexGrow: 1 },
  subtitle: { opacity: 0.7 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoBox: { flex: 1, padding: 12, borderRadius: 12, gap: 4 },
  label: { fontSize: 13, opacity: 0.7 },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroBox: { flex: 1, padding: 12, borderRadius: 12, gap: 4 },
  formLabel: { marginTop: 4 },
  error: { marginTop: 4 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  mealChip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  mealChipText: { fontFamily: 'Inter_600SemiBold' },
  previewBox: { marginTop: 16, padding: 12, borderRadius: 12, gap: 4 },
  previewLabel: { fontFamily: 'Inter_600SemiBold' },
  submitText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
});

export default FoodDetailScreen;

