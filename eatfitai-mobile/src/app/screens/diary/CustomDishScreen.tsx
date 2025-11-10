// Màn hình tạo món ăn thủ công

import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { foodService } from '../../../services/foodService';
import type { RootStackParamList } from '../../types';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { diaryService } from '../../../services/diaryService';
import { MEAL_TYPES, type MealTypeId } from '../../../types';

const FormSchema = z.object({
  name: z.string().trim().min(3, 'Tên món tối thiểu 3 ký tự'),
  description: z.string().trim().max(200, 'Mô tả tối đa 200 ký tự').optional(),
  servingSizeGram: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập khẩu phần (gram)' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000, {
      message: 'Khẩu phần phải > 0 và ≤ 2000',
    }),
  calories: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập calo' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 5000, {
      message: 'Calo phải ≥ 0 và ≤ 5000',
    }),
  protein: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập protein' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500, {
      message: 'Protein phải ≥ 0 và ≤ 500',
    }),
  carbs: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập carb' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500, {
      message: 'Carb phải ≥ 0 và ≤ 500',
    }),
  fat: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập fat' })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 300, {
      message: 'Fat phải ≥ 0 và ≤ 300',
    }),
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
      grams: '100',
      mealType: MEAL_TYPES.LUNCH,
      note: '',
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setIsSubmitting(true);
      try {
        // For now, just create the custom dish and show success
        // The backend API for custom dishes might need to be updated to support direct diary entry
        await foodService.createCustomDish({
          dishName: values.name.trim(),
          description: values.description?.trim() ?? null,
          ingredients: [], // Empty for now, as this is a simple custom dish
        });

        Toast.show({ type: 'success', text1: 'Đã tạo món thủ công thành công', text2: 'Món ăn đã được lưu vào thư viện cá nhân' });
        reset();
        await refreshSummary().catch(() => {});
        navigation.goBack();
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 422) {
          Toast.show({ type: 'error', text1: 'Dữ liệu không hợp lệ', text2: 'Vui lòng kiểm tra thông tin dinh dưỡng' });
        } else if (status >= 500) {
          Toast.show({ type: 'error', text1: 'Lỗi máy chủ', text2: 'Vui lòng thử lại sau' });
        } else if (!navigator.onLine) {
          Toast.show({ type: 'error', text1: 'Không có kết nối mạng', text2: 'Kiểm tra kết nối và thử lại' });
        } else {
          Toast.show({ type: 'error', text1: 'Tạo món thất bại', text2: 'Vui lòng thử lại hoặc liên hệ hỗ trợ' });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigation, refreshSummary, reset],
  );

  return (
    <Screen contentContainerStyle={styles.content}>
      <Card padding="lg" shadow="md">
        <ThemedText variant="h2" style={{ marginBottom: theme.spacing.xs }}>
          Tạo món thủ công
        </ThemedText>
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.lg }}>
          Nhập thông tin dinh dưỡng cho món nhà làm để lưu vào thư viện cá nhân.
        </ThemedText>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput
              label="Tên món"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Ví dụ: Salad gà"
              error={!!errors.name}
              helperText={errors.name?.message}
              required
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput
              label="Mô tả (tùy chọn)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Nguyên liệu chính, ghi chú..."
              multiline
              numberOfLines={3}
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />

        <View style={{ marginTop: theme.spacing.lg }}>
          <ThemedText variant="bodySmall" weight="600" style={{ marginBottom: theme.spacing.sm }}>
            Thông tin dinh dưỡng (cho 100g)
          </ThemedText>
          <View style={[styles.row]}>
            <View style={styles.col}>
              <Controller
                control={control}
                name="servingSizeGram"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Khẩu phần (gram)"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="100"
                    error={!!errors.servingSizeGram}
                    helperText={errors.servingSizeGram?.message}
                  />
                )}
              />
            </View>
            <View style={styles.col}>
              <Controller
                control={control}
                name="calories"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Calo"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="250"
                    error={!!errors.calories}
                    helperText={errors.calories?.message}
                  />
                )}
              />
            </View>
          </View>

          <View style={[styles.row, { marginTop: theme.spacing.md }]}>
            <View style={styles.col}>
              <Controller
                control={control}
                name="protein"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Protein (g)"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="20"
                    error={!!errors.protein}
                    helperText={errors.protein?.message}
                  />
                )}
              />
            </View>
            <View style={styles.col}>
              <Controller
                control={control}
                name="carbs"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Carb (g)"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="15"
                    error={!!errors.carbs}
                    helperText={errors.carbs?.message}
                  />
                )}
              />
            </View>
            <View style={styles.col}>
              <Controller
                control={control}
                name="fat"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Fat (g)"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="10"
                    error={!!errors.fat}
                    helperText={errors.fat?.message}
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={{ marginTop: theme.spacing.xl }}>
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            title={isSubmitting ? 'Đang tạo...' : 'Tạo món ăn'}
          />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
});

export default CustomDishScreen;
