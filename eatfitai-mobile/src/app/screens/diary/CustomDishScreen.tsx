import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { z } from 'zod';

import Button from '../../../components/Button';
import Screen from '../../../components/Screen';
import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { glassStyles } from '../../../components/ui/GlassCard';
import { invalidateDiaryQueries } from '../../../services/diaryFlowService';
import { foodService } from '../../../services/foodService';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { handleApiError } from '../../../utils/errorHandler';
import type { RootStackParamList } from '../../types';

const formSchema = z.object({
  name: z.string().trim().min(3, 'Tên món tối thiểu 3 ký tự'),
  description: z.string().trim().max(200, 'Mô tả tối đa 200 ký tự').optional(),
  servingSizeGram: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập khẩu phần (gram)' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000,
      {
        message: 'Khẩu phần phải > 0 và ≤ 2000',
      },
    ),
  calories: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập calo' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 5000,
      {
        message: 'Calo phải ≥ 0 và ≤ 5000',
      },
    ),
  protein: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập protein' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500,
      {
        message: 'Protein phải ≥ 0 và ≤ 500',
      },
    ),
  carbs: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập carb' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500,
      {
        message: 'Carb phải ≥ 0 và ≤ 500',
      },
    ),
  fat: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập fat' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 300,
      {
        message: 'Fat phải ≥ 0 và ≤ 300',
      },
    ),
});

type FormValues = z.infer<typeof formSchema>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CustomDish'>;

const CustomDishScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
    async (values: FormValues) => {
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('FoodName', values.name.trim());
        formData.append('UnitType', 'g');

        const servingSize = Number(values.servingSizeGram);
        const factor = 100 / servingSize;

        formData.append('CaloriesPer100', (Number(values.calories) * factor).toFixed(2));
        formData.append('ProteinPer100', (Number(values.protein) * factor).toFixed(2));
        formData.append('CarbPer100', (Number(values.carbs) * factor).toFixed(2));
        formData.append('FatPer100', (Number(values.fat) * factor).toFixed(2));

        await foodService.createUserFoodItem(formData);

        Toast.show({
          type: 'success',
          text1: 'Đã lưu món nhập tay',
          text2: 'Món ăn đã được thêm vào thư viện cá nhân.',
        });

        reset();
        await invalidateDiaryQueries(queryClient);
        navigation.goBack();
      } catch (error: any) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigation, queryClient, reset],
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={theme.colors.screenGradient}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={8}
          >
            <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <ThemedText
              style={{
                fontSize: 20,
                fontWeight: '700',
                letterSpacing: 0,
                lineHeight: 28,
              }}
            >
              Món nhập tay
            </ThemedText>
          </View>
        </View>
      </View>

      <Screen contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <View style={[glass.card, { padding: 16 }]}>
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
                  label="Ghi chú (tùy chọn)"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Nguyên liệu chính hoặc cách bạn muốn nhớ món này"
                  multiline
                  numberOfLines={2}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />

            <View
              style={{
                marginTop: theme.spacing.md,
                backgroundColor: isDark
                  ? 'rgba(74, 144, 226, 0.08)'
                  : 'rgba(59, 130, 246, 0.04)',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: isDark
                  ? 'rgba(74, 144, 226, 0.15)'
                  : 'rgba(59, 130, 246, 0.08)',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <ThemedText style={{ fontSize: 16 }}>📊</ThemedText>
                <ThemedText variant="body" weight="600">
                  Giá trị dinh dưỡng cho món nhập tay
                </ThemedText>
              </View>

              <View style={[styles.row, { marginBottom: 12 }]}>
                <View style={styles.col}>
                  <Controller
                    control={control}
                    name="servingSizeGram"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <ThemedTextInput
                        label="Khẩu phần (g)"
                        keyboardType="numeric"
                        returnKeyType="done"
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
                        returnKeyType="done"
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

              <View style={styles.row}>
                <View style={styles.col}>
                  <Controller
                    control={control}
                    name="protein"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <ThemedTextInput
                        label="Protein"
                        keyboardType="numeric"
                        returnKeyType="done"
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
                        label="Carb"
                        keyboardType="numeric"
                        returnKeyType="done"
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
                        label="Fat"
                        keyboardType="numeric"
                        returnKeyType="done"
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

            <View style={{ marginTop: theme.spacing.lg }}>
              <Button
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
                onPress={handleSubmit(onSubmit)}
                title={isSubmitting ? 'Đang lưu...' : 'Lưu món nhập tay'}
              />
            </View>
          </View>
        </Animated.View>
      </Screen>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { padding: 12, paddingTop: 12, gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
});

export default CustomDishScreen;
