// Man hinh chi tiet mon an va them vao nhat ky
// Chu thich bang tieng Viet khong dau

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';

import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';
import { foodService, type FoodDetail } from '../../../services/foodService';
import { useDiaryStore } from '../../../store/useDiaryStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'FoodDetail'>;

const MEAL_OPTIONS = [
  { value: 'breakfast', label: 'Bua sang' },
  { value: 'lunch', label: 'Bua trua' },
  { value: 'dinner', label: 'Bua toi' },
  { value: 'snack', label: 'An vat' },
] as const;

const FormSchema = z.object({
  grams: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap so gram' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000, {
      message: 'So gram phai lon hon 0 va nho hon 2000',
    }),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  note: z.string().trim().max(200, 'Ghi chu toi da 200 ky tu').optional(),
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
        Toast.show({ type: 'error', text1: 'Khong tai duoc chi tiet mon' });
        navigation.goBack();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [navigation, route.params.foodId, setValue]);

  const multiplier = useMemo(() => {
    const gramsNumber = Number(gramsValue);
    const base = detail?.servingSizeGram && detail.servingSizeGram > 0 ? detail.servingSizeGram : 100;
    if (!gramsNumber || !base) {
      return 0;
    }
    return gramsNumber / base;
  }, [detail?.servingSizeGram, gramsValue]);

  const macroValue = useCallback(
    (base?: number | null) => {
      if (!base || multiplier <= 0) {
        return '--';
      }
      return `${Math.round(base * multiplier)} g`;
    },
    [multiplier],
  );

  const calorieValue = useMemo(() => {
    const base = detail?.perServingCalories ?? detail?.calories ?? 0;
    if (!base || multiplier <= 0) {
      return '--';
    }
    return `${Math.round(base * multiplier)} kcal`;
  }, [detail?.calories, detail?.perServingCalories, multiplier]);

  const submit = useCallback(
    (values: FormValues) => {
      if (!detail) {
        return;
      }
      setIsSubmitting(true);
      foodService
        .addDiaryEntry({
          foodId: detail.id,
          grams: Number(values.grams),
          mealType: values.mealType,
          note: values.note ?? undefined,
        })
        .then(async () => {
          Toast.show({ type: 'success', text1: 'Da them vao nhat ky' });
          await refreshSummary().catch(() => {
            // neu refresh that bai thi khong chan
          });
          navigation.goBack();
        })
        .catch((error: any) => {
          if (error?.response?.status === 422) {
            Toast.show({ type: 'error', text1: 'Du lieu khong hop le' });
          } else {
            Toast.show({ type: 'error', text1: 'Them mon that bai' });
          }
        })
        .finally(() => {
          setIsSubmitting(false);
        });
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

  if (!detail) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}> 
        <ThemedText variant="title">{detail.name}</ThemedText>
        {detail.brand ? <ThemedText style={styles.subtitle}>{detail.brand}</ThemedText> : null}
        {detail.description ? <ThemedText style={styles.subtitle}>{detail.description}</ThemedText> : null}

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <ThemedText style={styles.label}>Luong tham chieu</ThemedText>
            <ThemedText>{detail.servingSizeGram ? `${detail.servingSizeGram} g` : '100 g (mac dinh)'}</ThemedText>
          </View>
          <View style={styles.infoBox}>
            <ThemedText style={styles.label}>Nang luong</ThemedText>
            <ThemedText>{detail.perServingCalories ?? detail.calories ?? '--'} kcal</ThemedText>
          </View>
        </View>

        <View style={styles.macroRow}>
          <View style={styles.macroBox}>
            <ThemedText style={styles.label}>Protein</ThemedText>
            <ThemedText>{detail.perServingProtein ?? detail.protein ?? '--'} g</ThemedText>
          </View>
          <View style={styles.macroBox}>
            <ThemedText style={styles.label}>Carb</ThemedText>
            <ThemedText>{detail.perServingCarbs ?? detail.carbs ?? '--'} g</ThemedText>
          </View>
          <View style={styles.macroBox}>
            <ThemedText style={styles.label}>Fat</ThemedText>
            <ThemedText>{detail.perServingFat ?? detail.fat ?? '--'} g</ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}> 
        <ThemedText variant="subtitle">Them vao nhat ky</ThemedText>

        <ThemedText style={styles.formLabel}>So gram</ThemedText>
        <Controller
          control={control}
          name="grams"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              keyboardType="numeric"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Vi du: 150"
              placeholderTextColor={theme.colors.muted}
            />
          )}
        />
        {errors.grams ? <ThemedText style={styles.error}>{errors.grams.message}</ThemedText> : null}

        <ThemedText style={styles.formLabel}>Bua an</ThemedText>
        <View style={styles.mealRow}>
          {MEAL_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
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
        {errors.mealType ? <ThemedText style={styles.error}>{errors.mealType.message}</ThemedText> : null}

        <ThemedText style={styles.formLabel}>Ghi chu (tuy chon)</ThemedText>
        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.noteInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="VD: giam bot nuoc sot"
              placeholderTextColor={theme.colors.muted}
              multiline
              numberOfLines={3}
            />
          )}
        />
        {errors.note ? <ThemedText style={styles.error}>{errors.note.message}</ThemedText> : null}

        <View style={styles.previewBox}>
          <ThemedText style={styles.previewLabel}>Tong dinh duong cho {gramsValue || '--'} g:</ThemedText>
          <ThemedText>{calorieValue}</ThemedText>
          <ThemedText>Protein: {macroValue(detail.perServingProtein ?? detail.protein)}</ThemedText>
          <ThemedText>Carb: {macroValue(detail.perServingCarbs ?? detail.carbs)}</ThemedText>
          <ThemedText>Fat: {macroValue(detail.perServingFat ?? detail.fat)}</ThemedText>
        </View>

        <Pressable
          style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleSubmit(submit)}
          disabled={isSubmitting}
        >
          <ThemedText style={styles.submitText}>{isSubmitting ? 'Dang them...' : 'Them vao nhat ky'}</ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  subtitle: {
    opacity: 0.7,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7F9F8',
    gap: 4,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7F9F8',
    gap: 4,
  },
  formLabel: {
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  noteInput: {
    textAlignVertical: 'top',
  },
  error: {
    color: '#D84343',
    marginTop: 4,
  },
  mealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  mealChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mealChipText: {
    fontFamily: 'Inter_600SemiBold',
  },
  previewBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0F4F3',
    gap: 4,
  },
  previewLabel: {
    fontFamily: 'Inter_600SemiBold',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
});

export default FoodDetailScreen;

