// Man hinh tao mon an thu cong
// Chu thich bang tieng Viet khong dau

import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import Toast from 'react-native-toast-message';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { ThemedText } from '../../../components/ThemedText';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { foodService } from '../../../services/foodService';
import type { RootStackParamList } from '../../types';
import { useDiaryStore } from '../../../store/useDiaryStore';

const FormSchema = z.object({
  name: z.string().trim().min(3, 'Ten mon toi thieu 3 ky tu'),
  description: z.string().trim().max(200, 'Mo ta toi da 200 ky tu').optional(),
  servingSizeGram: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap khau phan (gram)' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000, {
      message: 'Khau phan phai lon hon 0 va nho hon 2000',
    }),
  calories: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap calo' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 5000, {
      message: 'Calo phai lon hon hoac bang 0 va nho hon 5000',
    }),
  protein: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap protein' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500, {
      message: 'Protein phai lon hon hoac bang 0 va nho hon 500',
    }),
  carbs: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap carb' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500, {
      message: 'Carb phai lon hon hoac bang 0 va nho hon 500',
    }),
  fat: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui long nhap fat' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 300, {
      message: 'Fat phai lon hon hoac bang 0 va nho hon 300',
    }),
});

type FormValues = z.infer<typeof FormSchema>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CustomDish'>;

const CustomDishScreen = (): JSX.Element => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const refreshSummary = useDiaryStore((state) => state.refreshSummary);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      description: '',
      servingSizeGram: '100',
      calories: '0',
      protein: '0',
      carbs: '0',
      fat: '0',
    },
  });

  const onSubmit = useCallback(
    (values: FormValues) => {
      setIsSubmitting(true);
      foodService
        .createCustomDish({
          name: values.name.trim(),
          description: values.description?.trim() ?? null,
          servingSizeGram: Number(values.servingSizeGram),
          calories: Number(values.calories),
          protein: Number(values.protein),
          carbs: Number(values.carbs),
          fat: Number(values.fat),
        })
        .then(async () => {
          Toast.show({ type: 'success', text1: 'Da tao mon thu cong' });
          reset();
          await refreshSummary().catch(() => {
            // neu that bai thi bo qua
          });
          navigation.goBack();
        })
        .catch((error: any) => {
          if (error?.response?.status === 422) {
            Toast.show({ type: 'error', text1: 'Du lieu khong hop le' });
          } else {
            Toast.show({ type: 'error', text1: 'Tao mon that bai' });
          }
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [navigation, refreshSummary, reset],
  );

  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}> 
        <ThemedText variant="title">Tao mon thu cong</ThemedText>
        <ThemedText style={styles.hint}>
          Nhap thong tin dinh duong cho mon nha lam de su dung lai trong nhat ky.
        </ThemedText>

        <ThemedText style={styles.label}>Ten mon</ThemedText>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Vi du: Salad ga"
              placeholderTextColor={theme.colors.muted}
            />
          )}
        />
        {errors.name ? <ThemedText style={styles.error}>{errors.name.message}</ThemedText> : null}

        <ThemedText style={styles.label}>Mo ta (tuy chon)</ThemedText>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Nguyen lieu chinh, ghi chu..."
              placeholderTextColor={theme.colors.muted}
              multiline
              numberOfLines={3}
            />
          )}
        />
        {errors.description ? <ThemedText style={styles.error}>{errors.description.message}</ThemedText> : null}

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>Khau phan (gram)</ThemedText>
            <Controller
              control={control}
              name="servingSizeGram"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="100"
                  placeholderTextColor={theme.colors.muted}
                />
              )}
            />
            {errors.servingSizeGram ? (
              <ThemedText style={styles.error}>{errors.servingSizeGram.message}</ThemedText>
            ) : null}
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>Calo</ThemedText>
            <Controller
              control={control}
              name="calories"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="250"
                  placeholderTextColor={theme.colors.muted}
                />
              )}
            />
            {errors.calories ? <ThemedText style={styles.error}>{errors.calories.message}</ThemedText> : null}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>Protein (g)</ThemedText>
            <Controller
              control={control}
              name="protein"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="20"
                  placeholderTextColor={theme.colors.muted}
                />
              )}
            />
            {errors.protein ? <ThemedText style={styles.error}>{errors.protein.message}</ThemedText> : null}
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>Carb (g)</ThemedText>
            <Controller
              control={control}
              name="carbs"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="15"
                  placeholderTextColor={theme.colors.muted}
                />
              )}
            />
            {errors.carbs ? <ThemedText style={styles.error}>{errors.carbs.message}</ThemedText> : null}
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>Fat (g)</ThemedText>
            <Controller
              control={control}
              name="fat"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="10"
                  placeholderTextColor={theme.colors.muted}
                />
              )}
            />
            {errors.fat ? <ThemedText style={styles.error}>{errors.fat.message}</ThemedText> : null}
          </View>
        </View>

        <Pressable
          style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <ThemedText style={styles.submitText}>{isSubmitting ? 'Dang luu...' : 'Tao mon an'}</ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
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
  hint: {
    opacity: 0.7,
  },
  label: {
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  error: {
    color: '#D84343',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  submitButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
});

export default CustomDishScreen;
