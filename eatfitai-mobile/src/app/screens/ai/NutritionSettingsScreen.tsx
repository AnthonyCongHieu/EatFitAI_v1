// Màn hình Cài đặt dinh dưỡng hợp nhất
// Cho phép xem, chỉnh sửa thủ công và sử dụng AI để gợi ý mục tiêu

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import Button from '../../../components/Button';
import { ThemedText } from '../../../components/ThemedText';
import ThemedTextInput from '../../../components/ThemedTextInput';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { aiService, type NutritionTarget } from '../../../services/aiService';
import {
  handleApiError,
  handleApiErrorWithCustomMessage,
} from '../../../utils/errorHandler';
import type { RootStackParamList } from '../../types';
import { glassStyles } from '../../../components/ui/GlassCard';
import { t } from '../../../i18n/vi';
import { AIExplanationCard } from '../../../components/ai/AIExplanationCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TargetSchema = z.object({
  calories: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 500 && Number(val) <= 10000, {
      message: t('nutrition_settings.validation_calories'),
    }),
  protein: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 10 && Number(val) <= 1000, {
      message: t('nutrition_settings.validation_protein'),
    }),
  carbs: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 10 && Number(val) <= 1000, {
      message: t('nutrition_settings.validation_carbs'),
    }),
  fat: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 10 && Number(val) <= 1000, {
      message: t('nutrition_settings.validation_fat'),
    }),
});

type TargetFormValues = z.infer<typeof TargetSchema>;

const NutritionSettingsScreen = (): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [suggestedTarget, setSuggestedTarget] = useState<NutritionTarget | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TargetFormValues>({
    resolver: zodResolver(TargetSchema),
    defaultValues: {
      calories: '2000',
      protein: '150',
      carbs: '200',
      fat: '60',
    },
  });

  // Fetch current target
  const {
    data: currentTarget,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['nutrition-target'],
    queryFn: aiService.getCurrentNutritionTarget,
  });

  // Update form when data loads
  useEffect(() => {
    if (currentTarget) {
      reset({
        calories: String(Math.round(currentTarget.calories)),
        protein: String(Math.round(currentTarget.protein)),
        carbs: String(Math.round(currentTarget.carbs)),
        fat: String(Math.round(currentTarget.fat)),
      });
    }
  }, [currentTarget, reset]);

  // Handle load error
  useEffect(() => {
    if (error) handleApiError(error);
  }, [error]);

  // AI Suggestion Mutation
  const suggestMutation = useMutation({
    mutationFn: aiService.recalculateNutritionTarget,
    onSuccess: (data) => {
      setSuggestedTarget(data);
    },
    onError: (err) => {
      handleApiErrorWithCustomMessage(err, {
        unknown: {
          text1: t('nutrition_settings.error_suggest'),
          text2: t('nutrition_settings.error_suggest_msg'),
        },
      });
    },
  });

  // Apply Target Mutation
  const applyMutation = useMutation({
    mutationFn: aiService.applyNutritionTarget,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['nutrition-target'] });
      // ⚡ Invalidate home-summary để HomeScreen hiển thị target mới
      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      setIsEditing(false);
      setSuggestedTarget(null);

      // Update form values
      reset({
        calories: String(Math.round(variables.calories)),
        protein: String(Math.round(variables.protein)),
        carbs: String(Math.round(variables.carbs)),
        fat: String(Math.round(variables.fat)),
      });

      Alert.alert(
        t('nutrition_settings.success_title'),
        t('nutrition_settings.success_message'),
      );
    },
    onError: (err) => handleApiError(err),
  });

  const onSaveManual = (values: TargetFormValues) => {
    applyMutation.mutate({
      calories: Number(values.calories),
      protein: Number(values.protein),
      carbs: Number(values.carbs),
      fat: Number(values.fat),
    } as NutritionTarget);
  };

  const onApplySuggestion = () => {
    if (suggestedTarget) {
      applyMutation.mutate(suggestedTarget);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.xl,
    },
    card: {
      ...glass.card,
      padding: 20,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    col: {
      flex: 1,
    },
    macroCard: {
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg,
    },
    suggestionBox: {
      backgroundColor: theme.colors.primaryLight,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
  });

  const renderMacroInput = (
    name: keyof TargetFormValues,
    label: string,
    placeholder: string,
  ) => (
    <View style={styles.col}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value, onBlur } }) => (
          <ThemedTextInput
            label={label}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            keyboardType="numeric"
            returnKeyType="done"
            editable={isEditing}
            error={!!errors[name]}
            style={{
              backgroundColor: isEditing ? theme.colors.background : theme.colors.card,
            }}
          />
        )}
      />
    </View>
  );

  const renderMacroDisplay = (label: string, value: number, unit: string = 'g') => (
    <View style={styles.macroCard}>
      <ThemedText variant="caption" color="textSecondary" weight="600">
        {label}
      </ThemedText>
      <ThemedText variant="h4" color="primary">
        {Math.round(value)}
        <ThemedText variant="caption" color="textSecondary">
          {' '}
          {unit}
        </ThemedText>
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <LinearGradient
        colors={theme.colors.screenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        {/* Custom Header */}
        <View style={{ paddingTop: 60, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
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
            >
              <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
              <ThemedText variant="h3" weight="700">
                {t('nutrition_settings.title')}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Custom Header - centered like EditProfileScreen */}
      <View style={{ paddingTop: 60, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
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
          >
            <ThemedText style={{ fontSize: 18 }}>←</ThemedText>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <ThemedText variant="h3" weight="700">
              {t('nutrition_settings.title')}
            </ThemedText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Target Section */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <ThemedText variant="h3">{t('nutrition_settings.current_target')}</ThemedText>
            </View>
            {!isEditing && (
              <Button
                variant="ghost"
                title={t('nutrition_settings.edit')}
                size="sm"
                onPress={() => setIsEditing(true)}
              />
            )}
          </View>

          {isEditing ? (
            <Animated.View entering={FadeIn} layout={Layout.springify()}>
              <Controller
                control={control}
                name="calories"
                render={({ field: { onChange, value, onBlur } }) => (
                  <ThemedTextInput
                    label={t('nutrition_settings.calories_label')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="2000"
                    keyboardType="numeric"
                    returnKeyType="done"
                    error={!!errors.calories}
                    helperText={errors.calories?.message}
                  />
                )}
              />

              <View style={[styles.row, { marginTop: theme.spacing.md }]}>
                {renderMacroInput(
                  'protein',
                  t('nutrition_settings.protein_label'),
                  '150',
                )}
                {renderMacroInput('carbs', t('nutrition_settings.carbs_label'), '200')}
                {renderMacroInput('fat', t('nutrition_settings.fat_label'), '60')}
              </View>

              <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
                <Button
                  variant="outline"
                  title={t('nutrition_settings.cancel')}
                  onPress={() => {
                    setIsEditing(false);
                    reset();
                  }}
                  style={styles.col}
                />
                <Button
                  variant="primary"
                  title={t('nutrition_settings.save')}
                  onPress={handleSubmit(onSaveManual)}
                  loading={applyMutation.isPending}
                  disabled={applyMutation.isPending}
                  style={styles.col}
                />
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} layout={Layout.springify()}>
              <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
                <ThemedText variant="h1" color="primary">
                  {Math.round(currentTarget?.calories ?? 0)}
                </ThemedText>
                <ThemedText variant="body" color="textSecondary">
                  kcal / ngày
                </ThemedText>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  {renderMacroDisplay('Protein', currentTarget?.protein ?? 0)}
                </View>
                <View style={styles.col}>
                  {renderMacroDisplay('Carbs', currentTarget?.carbs ?? 0)}
                </View>
                <View style={styles.col}>
                  {renderMacroDisplay('Fat', currentTarget?.fat ?? 0)}
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* AI Suggestion Section */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <ThemedText variant="h3" style={{ marginBottom: theme.spacing.sm }}>
            {t('nutrition_settings.ai_section_title')}
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.md }}>
            {t('nutrition_settings.ai_section_subtitle')}
          </ThemedText>

          {!suggestedTarget ? (
            <View>
              <ThemedText
                variant="body"
                color="textSecondary"
                style={{ marginBottom: theme.spacing.lg }}
              >
                {t('nutrition_settings.ai_desc')}
              </ThemedText>
              <Button
                variant="secondary"
                title={t('nutrition_settings.analyze_btn')}
                onPress={() => suggestMutation.mutate()}
                loading={suggestMutation.isPending}
                disabled={suggestMutation.isPending}
                icon={<ThemedText>✨</ThemedText>}
              />
            </View>
          ) : (
            <Animated.View entering={FadeInDown} style={styles.suggestionBox}>
              <ThemedText
                variant="h3"
                color="primary"
                style={{ marginBottom: theme.spacing.sm }}
              >
                {t('nutrition_settings.new_suggestion')}
              </ThemedText>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing.md,
                }}
              >
                <View>
                  <ThemedText variant="caption" color="textSecondary">
                    Calories
                  </ThemedText>
                  <ThemedText variant="h2">
                    {Math.round(suggestedTarget.calories)}
                  </ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText variant="caption" color="textSecondary">
                    {t('nutrition_settings.change_label')}
                  </ThemedText>
                  <ThemedText
                    variant="h3"
                    color={
                      suggestedTarget.calories > (currentTarget?.calories ?? 0)
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {suggestedTarget.calories > (currentTarget?.calories ?? 0) ? '+' : ''}
                    {Math.round(
                      suggestedTarget.calories - (currentTarget?.calories ?? 0),
                    )}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <ThemedText variant="caption">Protein</ThemedText>
                  <ThemedText variant="h4">
                    {Math.round(suggestedTarget.protein)}g
                  </ThemedText>
                </View>
                <View style={styles.col}>
                  <ThemedText variant="caption">Carbs</ThemedText>
                  <ThemedText variant="h4">
                    {Math.round(suggestedTarget.carbs)}g
                  </ThemedText>
                </View>
                <View style={styles.col}>
                  <ThemedText variant="caption">Fat</ThemedText>
                  <ThemedText variant="h4">{Math.round(suggestedTarget.fat)}g</ThemedText>
                </View>
              </View>

              <AIExplanationCard explanation={suggestedTarget.explanation} />

              <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
                <Button
                  variant="outline"
                  title={t('nutrition_settings.skip')}
                  onPress={() => setSuggestedTarget(null)}
                  style={styles.col}
                />
                <Button
                  variant="primary"
                  title={t('nutrition_settings.apply')}
                  onPress={onApplySuggestion}
                  loading={applyMutation.isPending}
                  style={styles.col}
                />
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

export default NutritionSettingsScreen;
