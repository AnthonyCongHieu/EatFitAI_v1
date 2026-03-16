// MÃƒÂ n hÃƒÂ¬nh tÃ¡ÂºÂ¡o mÃƒÂ³n Ã„Æ’n thÃ¡Â»Â§ cÃƒÂ´ng

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../../components/ThemedText';
import Screen from '../../../components/Screen';
import Button from '../../../components/Button';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { foodService } from '../../../services/foodService';
import { invalidateDiaryQueries } from '../../../services/diaryFlowService';
import type { RootStackParamList } from '../../types';
import { MEAL_TYPES } from '../../../types';
import { handleApiError } from '../../../utils/errorHandler';
import { glassStyles } from '../../../components/ui/GlassCard';

const FormSchema = z.object({
  name: z.string().trim().min(3, 'TÃƒÂªn mÃƒÂ³n tÃ¡Â»â€˜i thiÃ¡Â»Æ’u 3 kÃƒÂ½ tÃ¡Â»Â±'),
  description: z.string().trim().max(200, 'MÃƒÂ´ tÃ¡ÂºÂ£ tÃ¡Â»â€˜i Ã„â€˜a 200 kÃƒÂ½ tÃ¡Â»Â±').optional(),
  servingSizeGram: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p khÃ¡ÂºÂ©u phÃ¡ÂºÂ§n (gram)' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000,
      {
        message: 'KhÃ¡ÂºÂ©u phÃ¡ÂºÂ§n phÃ¡ÂºÂ£i > 0 vÃƒÂ  Ã¢â€°Â¤ 2000',
      },
    ),
  calories: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p calo' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 5000,
      {
        message: 'Calo phÃ¡ÂºÂ£i Ã¢â€°Â¥ 0 vÃƒÂ  Ã¢â€°Â¤ 5000',
      },
    ),
  protein: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p protein' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500,
      {
        message: 'Protein phÃ¡ÂºÂ£i Ã¢â€°Â¥ 0 vÃƒÂ  Ã¢â€°Â¤ 500',
      },
    ),
  carbs: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p carb' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 500,
      {
        message: 'Carb phÃ¡ÂºÂ£i Ã¢â€°Â¥ 0 vÃƒÂ  Ã¢â€°Â¤ 500',
      },
    ),
  fat: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p fat' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 300,
      {
        message: 'Fat phÃ¡ÂºÂ£i Ã¢â€°Â¥ 0 vÃƒÂ  Ã¢â€°Â¤ 300',
      },
    ),
  grams: z
    .string()
    .trim()
    .refine((value) => value !== '', { message: 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p sÃ¡Â»â€˜ gram' })
    .refine(
      (value) =>
        !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 2000,
      {
        message: 'SÃ¡Â»â€˜ gram phÃ¡ÂºÂ£i > 0 vÃƒÂ  Ã¢â€°Â¤ 2000',
      },
    ),
  mealType: z
    .number()
    .refine((value) => [1, 2, 3, 4].includes(value), { message: 'BÃ¡Â»Â¯a Ã„Æ’n khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡' }),
  note: z.string().trim().max(200, 'Ghi chÃƒÂº tÃ¡Â»â€˜i Ã„â€˜a 200 kÃƒÂ½ tÃ¡Â»Â±').optional(),
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
        // SÃ¡Â»Â­ dÃ¡Â»Â¥ng UserFoodItems API Ã„â€˜Ã¡Â»Æ’ tÃ¡ÂºÂ¡o mÃƒÂ³n Ã„Æ’n vÃ¡Â»â€ºi thÃƒÂ´ng tin dinh dÃ†Â°Ã¡Â»Â¡ng nhÃ¡ÂºÂ­p tay
        const formData = new FormData();
        formData.append('FoodName', values.name.trim());
        if (values.description) {
          // UserFoodItemDto khÃƒÂ´ng cÃƒÂ³ description, nhÃ†Â°ng ta cÃƒÂ³ thÃ¡Â»Æ’ append vÃƒÂ o note nÃ¡ÂºÂ¿u cÃ¡ÂºÂ§n
          // HiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i API khÃƒÂ´ng hÃ¡Â»â€” trÃ¡Â»Â£ description cho UserFoodItem, ta chÃ¡ÂºÂ¥p nhÃ¡ÂºÂ­n bÃ¡Â»Â qua hoÃ¡ÂºÂ·c chÃ¡Â»Â update API
        }
        formData.append('UnitType', 'g'); // MÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh lÃƒÂ  gram

        // ChuÃ¡ÂºÂ©n hÃƒÂ³a vÃ¡Â»Â 100g
        const servingSize = Number(values.servingSizeGram);
        const factor = 100 / servingSize;

        formData.append('CaloriesPer100', (Number(values.calories) * factor).toFixed(2));
        formData.append('ProteinPer100', (Number(values.protein) * factor).toFixed(2));
        formData.append('CarbPer100', (Number(values.carbs) * factor).toFixed(2));
        formData.append('FatPer100', (Number(values.fat) * factor).toFixed(2));

        await foodService.createUserFoodItem(formData);

        Toast.show({
          type: 'success',
          text1: 'Da tao mon thu cong thanh cong',
          text2: 'Mon an da duoc luu vao thu vien ca nhan',
        });
        reset();
        await invalidateDiaryQueries(queryClient);
      } catch (error: any) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigation, queryClient, reset],
  );

  // Get safe area insets for header
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
        paddingBottom: 4,
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
            <ThemedText style={{ fontSize: 18 }}>Ã¢â€ Â</ThemedText>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <ThemedText style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28 }}>
              MÃƒÂ³n Ã„Æ’n cÃ¡Â»Â§a bÃ¡ÂºÂ¡n
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
                  label="TÃƒÂªn mÃƒÂ³n"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="VÃƒÂ­ dÃ¡Â»Â¥: Salad gÃƒÂ "
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
                  label="MÃƒÂ´ tÃ¡ÂºÂ£ (tÃƒÂ¹y chÃ¡Â»Ân)"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="NguyÃƒÂªn liÃ¡Â»â€¡u chÃƒÂ­nh, ghi chÃƒÂº..."
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
                <ThemedText style={{ fontSize: 16 }}>Ã°Å¸â€œÅ </ThemedText>
                <ThemedText variant="body" weight="600">
                  ThÃƒÂ´ng tin dinh dÃ†Â°Ã¡Â»Â¡ng
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
                        label="Ã¢Å¡â€“Ã¯Â¸Â KhÃ¡ÂºÂ©u phÃ¡ÂºÂ§n (g)"
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
                        label="Ã°Å¸â€Â¥ Calo"
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
                        label="Ã°Å¸â€™Âª Protein"
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
                        label="Ã°Å¸Å’Â¾ Carb"
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
                        label="Ã°Å¸Â§Ë† Fat"
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
                title={isSubmitting ? 'Ã„Âang tÃ¡ÂºÂ¡o...' : 'TÃ¡ÂºÂ¡o mÃƒÂ³n Ã„Æ’n'}
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
