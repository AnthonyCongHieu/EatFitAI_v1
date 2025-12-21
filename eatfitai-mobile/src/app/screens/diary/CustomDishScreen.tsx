// Màn hình tạo món ăn thủ công

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import { AppCard } from '../../../components/ui/AppCard';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { foodService } from '../../../services/foodService';
import type { RootStackParamList } from '../../types';
import { useDiaryStore } from '../../../store/useDiaryStore';
import { MEAL_TYPES } from '../../../types';
import { handleApiError } from '../../../utils/errorHandler';
import { glassStyles } from '../../../components/ui/GlassCard';

const FormSchema = z.object({
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
  grams: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lòng nhập số gram' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000,
      {
        message: 'Số gram phải > 0 và ≤ 2000',
      },
    ),
  mealType: z
    .number()
    .refine((value) => [1, 2, 3, 4].includes(value), { message: 'Bữa ăn không hợp lệ' }),
  note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
});

type FormValues = z.infer<typeof FormSchema>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CustomDish'>;

const CustomDishScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
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
        // Sử dụng UserFoodItems API để tạo món ăn với thông tin dinh dưỡng nhập tay
        const formData = new FormData();
        formData.append('FoodName', values.name.trim());
        if (values.description) {
          // UserFoodItemDto không có description, nhưng ta có thể append vào note nếu cần
          // Hiện tại API không hỗ trợ description cho UserFoodItem, ta chấp nhận bỏ qua hoặc chờ update API
        }
        formData.append('UnitType', 'g'); // Mặc định là gram

        // Chuẩn hóa về 100g
        const servingSize = Number(values.servingSizeGram);
        const factor = 100 / servingSize;

        formData.append('CaloriesPer100', (Number(values.calories) * factor).toFixed(2));
        formData.append('ProteinPer100', (Number(values.protein) * factor).toFixed(2));
        formData.append('CarbPer100', (Number(values.carbs) * factor).toFixed(2));
        formData.append('FatPer100', (Number(values.fat) * factor).toFixed(2));

        await foodService.createUserFoodItem(formData);

        Toast.show({
          type: 'success',
          text1: 'Đã tạo món thủ công thành công',
          text2: 'Món ăn đã được lưu vào thư viện cá nhân',
        });
        reset();
        // ⚡ Invalidate cache để HomeScreen tự động cập nhật
        queryClient.invalidateQueries({ queryKey: ['home-summary'] });
        queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
        navigation.goBack();
      } catch (error: any) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigation, queryClient, reset],
  );

  // Get safe area insets for header
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  const { Pressable } = require('react-native');
  const { Ionicons } = require('@expo/vector-icons');
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={theme.colors.screenGradient}
        style={StyleSheet.absoluteFill}
      />

      {/* Header - centered title like EditProfileScreen */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 4
      }}>
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
            <ThemedText style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28 }}>
              Món ăn của bạn
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
                  label="Mô tả (tùy chọn)"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Nguyên liệu chính, ghi chú..."
                  multiline
                  numberOfLines={2}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />

            {/* Nutrition Section with modern card style */}
            <View style={{
              marginTop: theme.spacing.md,
              backgroundColor: isDark ? 'rgba(74, 144, 226, 0.08)' : 'rgba(59, 130, 246, 0.04)',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(59, 130, 246, 0.08)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <ThemedText style={{ fontSize: 16 }}>📊</ThemedText>
                <ThemedText variant="body" weight="600">
                  Thông tin dinh dưỡng
                </ThemedText>
              </View>

              {/* Serving + Calories row */}
              <View style={[styles.row, { marginBottom: 12 }]}>
                <View style={styles.col}>
                  <Controller
                    control={control}
                    name="servingSizeGram"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <ThemedTextInput
                        label="⚖️ Khẩu phần (g)"
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
                        label="🔥 Calo"
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

              {/* Macros row */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Controller
                    control={control}
                    name="protein"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <ThemedTextInput
                        label="💪 Protein"
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
                        label="🌾 Carb"
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
                        label="🧈 Fat"
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
                title={isSubmitting ? 'Đang tạo...' : 'Tạo món ăn'}
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
